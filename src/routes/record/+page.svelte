<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		requestCamera,
		stopStream,
		SwingRecorder,
		type FacingMode
	} from '$lib/camera/capture';
	import { loadPoseLandmarker, drawPose } from '$lib/pose/detector';
	import { findSwingWindow, type PoseFrame, type SwingWindow } from '$lib/pose/swing';
	import { detectFaults, type FaultResults } from '$lib/pose/faults';

	type Phase = 'idle' | 'preview' | 'recording' | 'analyzing' | 'playback' | 'denied' | 'error';
	type PoseState = 'idle' | 'loading' | 'ready' | 'failed';

	const MAX_SECONDS = 30;

	let phase: Phase = $state('idle');
	let errorMsg: string = $state('');
	let facing: FacingMode = $state('environment');
	let previewEl: HTMLVideoElement | undefined = $state();
	let playbackEl: HTMLVideoElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let stream: MediaStream | null = null;
	let recorder: SwingRecorder | null = null;
	let blob = $state<Blob | null>(null);
	let blobUrl: string = $state('');
	let elapsed: number = $state(0);
	let timer: number | null = null;
	let poseState: PoseState = $state('idle');
	let poseError: string = $state('');
	let analysisProgress: number = $state(0);
	let analysisError: string = $state('');
	let swingWindow = $state<SwingWindow | null>(null);
	let faults = $state<FaultResults | null>(null);

	$effect(() => {
		if (previewEl && stream && (phase === 'preview' || phase === 'recording')) {
			previewEl.srcObject = stream;
		}
	});

	$effect(() => {
		if (phase !== 'playback' || !playbackEl || !canvasEl) return;

		const video = playbackEl;
		const canvas = canvasEl;
		let cancelled = false;
		poseState = 'loading';
		poseError = '';

		const detectAndDraw = (timestamp?: number) => {
			if (cancelled || !video.videoWidth) return;
			const ts =
				typeof timestamp === 'number' && timestamp > 0
					? timestamp
					: performance.now();
			const lm = landmarkerRef;
			if (!lm) return;
			const result = lm.detectForVideo(video, ts);
			drawPose(canvas, result.landmarks[0], video.videoWidth, video.videoHeight);
		};

		const onSeeked = () => detectAndDraw();
		const frameLoop = () => {
			if (cancelled) return;
			detectAndDraw();
			if (!video.paused && !video.ended) {
				video.requestVideoFrameCallback(frameLoop);
			}
		};
		const onPlay = () => video.requestVideoFrameCallback(frameLoop);

		(async () => {
			try {
				landmarkerRef = await loadPoseLandmarker();
				if (cancelled) return;
				poseState = 'ready';
				video.addEventListener('seeked', onSeeked);
				video.addEventListener('play', onPlay);
				// Initial draw for the paused first frame.
				if (video.readyState >= 2) detectAndDraw();
				else video.addEventListener('loadeddata', () => detectAndDraw(), { once: true });
			} catch (err) {
				poseState = 'failed';
				poseError = (err as Error).message || 'Could not load pose model.';
			}
		})();

		return () => {
			cancelled = true;
			video.removeEventListener('seeked', onSeeked);
			video.removeEventListener('play', onPlay);
		};
	});

	let landmarkerRef: Awaited<ReturnType<typeof loadPoseLandmarker>> | null = null;

	$effect(() => {
		if (phase !== 'playback' || !playbackEl || !swingWindow) return;
		const v = playbackEl;
		const w = swingWindow;
		const seekToStart = () => {
			v.currentTime = w.start;
		};
		const guardEnd = () => {
			if (v.currentTime >= w.end && !v.paused) {
				v.pause();
			}
		};
		if (v.readyState >= 1) seekToStart();
		else v.addEventListener('loadedmetadata', seekToStart, { once: true });
		v.addEventListener('timeupdate', guardEnd);
		return () => {
			v.removeEventListener('loadedmetadata', seekToStart);
			v.removeEventListener('timeupdate', guardEnd);
		};
	});

	async function startPreview() {
		errorMsg = '';
		try {
			stream = await requestCamera(facing);
			phase = 'preview';
		} catch (err) {
			const e = err as DOMException;
			if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
				phase = 'denied';
			} else if (e.name === 'NotFoundError') {
				phase = 'error';
				errorMsg = 'No camera found on this device.';
			} else {
				phase = 'error';
				errorMsg = e.message || 'Could not access the camera.';
			}
		}
	}

	function startRecording() {
		if (!stream) return;
		recorder = new SwingRecorder(stream);
		recorder.start();
		phase = 'recording';
		elapsed = 0;
		const startedAt = performance.now();
		timer = window.setInterval(() => {
			elapsed = (performance.now() - startedAt) / 1000;
			if (elapsed >= MAX_SECONDS) stopRecording();
		}, 100);
	}

	async function stopRecording() {
		if (!recorder) return;
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
		blob = await recorder.stop();
		if (blobUrl) URL.revokeObjectURL(blobUrl);
		blobUrl = URL.createObjectURL(blob);
		stopStream(stream);
		stream = null;
		phase = 'analyzing';
		analysisProgress = 0;
		analysisError = '';
		swingWindow = null;
		faults = null;
		try {
			const result = await analyzeSwing(blob, (pct) => {
				analysisProgress = pct;
			});
			swingWindow = result.window;
			faults = result.faults;
		} catch (err) {
			analysisError = (err as Error).message || 'Swing analysis failed.';
		}
		phase = 'playback';
	}

	async function analyzeSwing(
		clip: Blob,
		onProgress: (pct: number) => void
	): Promise<{ window: SwingWindow | null; faults: FaultResults | null }> {
		const video = document.createElement('video');
		const url = URL.createObjectURL(clip);
		video.src = url;
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		// iOS sometimes refuses to play a detached video. Park it offscreen so it
		// is part of the document but invisible.
		video.style.position = 'fixed';
		video.style.left = '-9999px';
		video.style.top = '0';
		video.style.width = '1px';
		video.style.height = '1px';
		document.body.appendChild(video);

		try {
			await new Promise<void>((resolve, reject) => {
				video.addEventListener('loadedmetadata', () => resolve(), { once: true });
				video.addEventListener(
					'error',
					() => reject(new Error('Could not load video for analysis.')),
					{ once: true }
				);
			});

			const lm = await loadPoseLandmarker();
			const frames: PoseFrame[] = [];
			const duration = video.duration || 1;

			await new Promise<void>((resolve, reject) => {
				const onFrame: VideoFrameRequestCallback = (now, meta) => {
					try {
						const result = lm.detectForVideo(video, now);
						if (result.landmarks[0]) {
							frames.push({ t: meta.mediaTime, landmarks: result.landmarks[0] });
						}
						onProgress(Math.min(100, (meta.mediaTime / duration) * 100));
						if (!video.ended) {
							video.requestVideoFrameCallback(onFrame);
						}
					} catch (err) {
						reject(err);
					}
				};
				video.addEventListener('ended', () => resolve(), { once: true });
				video.addEventListener(
					'error',
					() => reject(new Error('Video error during analysis.')),
					{ once: true }
				);
				video.requestVideoFrameCallback(onFrame);
				video.play().catch(reject);
			});

			onProgress(100);
			const window = findSwingWindow(frames);
			const fr = window ? detectFaults(frames, window) : null;
			return { window, faults: fr };
		} finally {
			document.body.removeChild(video);
			URL.revokeObjectURL(url);
		}
	}

	function playSwingOnly() {
		if (!playbackEl || !swingWindow) return;
		playbackEl.currentTime = swingWindow.start;
		void playbackEl.play();
	}

	async function recordAnother() {
		if (blobUrl) URL.revokeObjectURL(blobUrl);
		blobUrl = '';
		blob = null;
		elapsed = 0;
		swingWindow = null;
		faults = null;
		analysisProgress = 0;
		await startPreview();
	}

	async function switchCamera() {
		facing = facing === 'environment' ? 'user' : 'environment';
		stopStream(stream);
		stream = null;
		await startPreview();
	}

	onDestroy(() => {
		stopStream(stream);
		if (timer !== null) clearInterval(timer);
		if (blobUrl) URL.revokeObjectURL(blobUrl);
	});

	const blobSizeMb = $derived(blob ? (blob.size / 1024 / 1024).toFixed(2) : '0.00');
	const swingDuration = $derived(
		swingWindow ? (swingWindow.end - swingWindow.start).toFixed(2) : '0.00'
	);
</script>

<svelte:head>
	<title>Record · Golf</title>
</svelte:head>

<a class="back" href="/">← Home</a>
<h1>Record swing</h1>

{#if phase === 'idle'}
	<div class="panel">
		<p>Prop your phone up so it sees you face-on or down-the-line, then tap start.</p>
		<button class="btn primary" onclick={startPreview}>Start camera</button>
		<p class="hint">Your iPhone will ask for camera permission. Tap "Allow."</p>
	</div>
{:else if phase === 'preview' || phase === 'recording'}
	<div class="video-wrap">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={previewEl} autoplay muted playsinline></video>
		{#if phase === 'recording'}
			<div class="rec-badge">● REC {elapsed.toFixed(1)}s</div>
		{/if}
	</div>
	<div class="controls">
		{#if phase === 'preview'}
			<button class="btn secondary" onclick={switchCamera}>Switch camera</button>
			<button class="btn primary big" onclick={startRecording}>● Record</button>
		{:else}
			<button class="btn primary big stop" onclick={stopRecording}>■ Stop</button>
		{/if}
	</div>
	{#if phase === 'recording' && elapsed > MAX_SECONDS - 5}
		<p class="hint">Auto-stops at {MAX_SECONDS}s</p>
	{/if}
{:else if phase === 'analyzing'}
	<div class="panel analyzing">
		<div class="spinner" aria-hidden="true"></div>
		<h2>Analyzing swing…</h2>
		<div class="progress-bar">
			<div class="progress-fill" style:width="{analysisProgress}%"></div>
		</div>
		<p class="hint">Finding the swing window in your clip.</p>
	</div>
{:else if phase === 'playback'}
	<div class="video-wrap playback">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={playbackEl} src={blobUrl} controls playsinline></video>
		<canvas bind:this={canvasEl} class="pose-canvas"></canvas>
		{#if poseState === 'loading'}
			<div class="pose-badge">Loading pose model…</div>
		{:else if poseState === 'failed'}
			<div class="pose-badge error">Pose load failed: {poseError}</div>
		{:else if poseState === 'ready'}
			<div class="pose-badge ok">Pose ready</div>
		{/if}
	</div>
	{#if swingWindow}
		<div class="swing-info">
			<div class="swing-row">
				<span class="swing-label">Swing detected</span>
				<span class="swing-conf" data-conf={swingWindow.confidence}>{swingWindow.confidence}</span>
			</div>
			<div class="swing-times">
				{swingWindow.start.toFixed(2)}s → {swingWindow.end.toFixed(2)}s
				<span class="muted">({swingDuration}s)</span>
			</div>
		</div>
		{#if faults?.headMovement}
			<div class="fault-card" data-verdict={faults.headMovement.verdict}>
				<div class="fault-row">
					<span class="fault-name">Head movement</span>
					<span class="fault-verdict" data-verdict={faults.headMovement.verdict}>
						{faults.headMovement.verdict}
					</span>
				</div>
				<p class="fault-explain">{faults.headMovement.explanation}</p>
				<p class="fault-metric">
					Lateral travel: {(faults.headMovement.ratio * 100).toFixed(0)}% of shoulder width
				</p>
			</div>
		{/if}
	{:else if analysisError}
		<div class="panel error subtle">
			<strong>Swing analysis failed:</strong> {analysisError}
		</div>
	{:else}
		<div class="panel subtle">
			<strong>No clear swing detected.</strong> Try recording with the phone more stable and more
			pre-swing stillness so the algorithm can find the "address" position.
		</div>
	{/if}
	<dl class="info">
		<dt>Duration</dt>
		<dd>{elapsed.toFixed(1)}s</dd>
		<dt>Size</dt>
		<dd>{blobSizeMb} MB</dd>
		<dt>Format</dt>
		<dd>{blob?.type || 'unknown'}</dd>
	</dl>
	<div class="controls">
		{#if swingWindow}
			<button class="btn secondary" onclick={playSwingOnly}>▶ Play swing</button>
		{/if}
		<button class="btn primary" onclick={recordAnother}>Record another</button>
	</div>
	<p class="hint">Play or scrub to see the skeleton track your motion.</p>
{:else if phase === 'denied'}
	<div class="panel error">
		<h2>Camera access denied</h2>
		<p>To record swings, this app needs camera access. On iPhone:</p>
		<ol>
			<li>Open <strong>Settings → Safari → Camera</strong></li>
			<li>Set <strong>Camera</strong> to <strong>Allow</strong></li>
			<li>Come back here and tap <strong>Try again</strong></li>
		</ol>
		<button class="btn primary" onclick={startPreview}>Try again</button>
	</div>
{:else if phase === 'error'}
	<div class="panel error">
		<h2>Camera error</h2>
		<p>{errorMsg}</p>
		<button class="btn primary" onclick={startPreview}>Try again</button>
	</div>
{/if}

<style>
	.back {
		display: inline-block;
		padding: 4px 0;
		color: rgba(255, 255, 255, 0.75);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back:active {
		opacity: 0.6;
	}
	h1 {
		font-size: 1.8rem;
		margin: 8px 0 16px;
		letter-spacing: -0.02em;
	}

	.panel {
		padding: 20px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
	}
	.panel.error {
		background: rgba(180, 50, 50, 0.18);
		border-color: rgba(255, 120, 120, 0.4);
	}
	.panel p,
	.panel ol {
		margin: 0 0 14px;
		line-height: 1.45;
	}
	.panel ol {
		padding-left: 1.2em;
	}
	.panel ol li {
		margin-bottom: 6px;
	}
	.hint {
		font-size: 0.85rem;
		opacity: 0.65;
		text-align: center;
		margin: 12px 0 0;
	}

	.video-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 9 / 16;
		background: #000;
		border-radius: 14px;
		overflow: hidden;
		margin-bottom: 16px;
	}
	.video-wrap video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.video-wrap.playback video {
		object-fit: contain;
		background: #000;
	}
	.pose-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		object-fit: contain;
	}
	.pose-badge {
		position: absolute;
		top: 12px;
		right: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.pose-badge.ok {
		background: rgba(0, 150, 80, 0.7);
	}
	.pose-badge.error {
		background: rgba(200, 50, 50, 0.85);
		max-width: 70%;
		word-break: break-word;
	}
	.rec-badge {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(200, 40, 40, 0.85);
		color: #fff;
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.controls {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		appearance: none;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 12px 18px;
		border-radius: 999px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		min-width: 120px;
	}
	.btn:active {
		transform: scale(0.97);
	}
	.btn.primary {
		background: #fff;
		color: #0f6b30;
		border-color: #fff;
	}
	.btn.primary.big {
		padding: 16px 28px;
		font-size: 1.1rem;
		min-width: 160px;
	}
	.btn.primary.stop {
		background: #d23838;
		color: #fff;
		border-color: #d23838;
	}
	.btn.secondary {
		background: transparent;
	}

	.info {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 14px;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 10px;
		margin-bottom: 16px;
		font-size: 0.9rem;
	}
	.info dt {
		opacity: 0.65;
	}
	.info dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
		word-break: break-all;
	}

	.analyzing {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 14px;
	}
	.analyzing h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}
	.spinner {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.18);
		border-top-color: #fff;
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.progress-bar {
		width: 100%;
		height: 6px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: #fff;
		border-radius: 999px;
		transition: width 80ms linear;
	}

	.swing-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		background: rgba(0, 200, 120, 0.16);
		border: 1px solid rgba(0, 200, 120, 0.4);
		border-radius: 10px;
		margin-bottom: 14px;
	}
	.swing-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.swing-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.85;
	}
	.swing-conf {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 3px 8px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
	}
	.swing-conf[data-conf='high'] {
		background: rgba(0, 230, 118, 0.35);
	}
	.swing-conf[data-conf='medium'] {
		background: rgba(255, 200, 60, 0.3);
	}
	.swing-conf[data-conf='low'] {
		background: rgba(255, 80, 80, 0.3);
	}
	.swing-times {
		font-size: 1.05rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.swing-times .muted {
		font-weight: 400;
		opacity: 0.7;
		margin-left: 6px;
	}
	.panel.subtle {
		padding: 12px 14px;
		font-size: 0.85rem;
		margin-bottom: 14px;
	}

	.fault-card {
		padding: 12px 14px;
		border-radius: 10px;
		margin-bottom: 14px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
	}
	.fault-card[data-verdict='ok'] {
		background: rgba(0, 200, 120, 0.14);
		border-color: rgba(0, 200, 120, 0.4);
	}
	.fault-card[data-verdict='moderate'] {
		background: rgba(255, 180, 50, 0.14);
		border-color: rgba(255, 180, 50, 0.45);
	}
	.fault-card[data-verdict='large'] {
		background: rgba(220, 60, 60, 0.16);
		border-color: rgba(255, 110, 110, 0.5);
	}
	.fault-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 6px;
	}
	.fault-name {
		font-size: 0.95rem;
		font-weight: 600;
	}
	.fault-verdict {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
	}
	.fault-verdict[data-verdict='ok'] {
		background: rgba(0, 230, 118, 0.4);
	}
	.fault-verdict[data-verdict='moderate'] {
		background: rgba(255, 200, 60, 0.4);
	}
	.fault-verdict[data-verdict='large'] {
		background: rgba(255, 100, 100, 0.45);
	}
	.fault-explain {
		margin: 0 0 4px;
		font-size: 0.9rem;
		line-height: 1.4;
		opacity: 0.92;
	}
	.fault-metric {
		margin: 0;
		font-size: 0.78rem;
		opacity: 0.65;
		font-variant-numeric: tabular-nums;
	}
</style>
