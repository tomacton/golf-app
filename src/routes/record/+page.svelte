<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		requestCamera,
		stopStream,
		SwingRecorder,
		type FacingMode
	} from '$lib/camera/capture';

	type Phase = 'idle' | 'preview' | 'recording' | 'playback' | 'denied' | 'error';

	const MAX_SECONDS = 30;

	let phase: Phase = $state('idle');
	let errorMsg: string = $state('');
	let facing: FacingMode = $state('environment');
	let previewEl: HTMLVideoElement | undefined = $state();
	let stream: MediaStream | null = null;
	let recorder: SwingRecorder | null = null;
	let blob = $state<Blob | null>(null);
	let blobUrl: string = $state('');
	let elapsed: number = $state(0);
	let timer: number | null = null;

	$effect(() => {
		if (previewEl && stream && (phase === 'preview' || phase === 'recording')) {
			previewEl.srcObject = stream;
		}
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
		phase = 'playback';
	}

	async function recordAnother() {
		if (blobUrl) URL.revokeObjectURL(blobUrl);
		blobUrl = '';
		blob = null;
		elapsed = 0;
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
{:else if phase === 'playback'}
	<div class="video-wrap">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src={blobUrl} controls playsinline></video>
	</div>
	<dl class="info">
		<dt>Duration</dt>
		<dd>{elapsed.toFixed(1)}s</dd>
		<dt>Size</dt>
		<dd>{blobSizeMb} MB</dd>
		<dt>Format</dt>
		<dd>{blob?.type || 'unknown'}</dd>
	</dl>
	<div class="controls">
		<button class="btn primary" onclick={recordAnother}>Record another</button>
	</div>
	<p class="hint">Saved to memory only — Phase 5 will persist swings to your phone.</p>
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
</style>
