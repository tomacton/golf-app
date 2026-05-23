export type FacingMode = 'environment' | 'user';

export async function requestCamera(facingMode: FacingMode = 'environment'): Promise<MediaStream> {
	return navigator.mediaDevices.getUserMedia({
		video: {
			facingMode,
			frameRate: { ideal: 60 },
			width: { ideal: 1920 },
			height: { ideal: 1080 }
		},
		audio: false
	});
}

export function stopStream(stream: MediaStream | null): void {
	if (!stream) return;
	for (const track of stream.getTracks()) track.stop();
}

// Browsers vary on which container/codec they'll record. Try preferred formats,
// fall back to the browser default. iOS Safari only supports MP4/H.264; Chrome
// on Android prefers WebM/VP9. Both return something usable via the default.
const PREFERRED_TYPES = [
	'video/mp4;codecs=avc1',
	'video/mp4',
	'video/webm;codecs=vp9',
	'video/webm;codecs=vp8',
	'video/webm'
];

export function pickSupportedMimeType(): string {
	if (typeof MediaRecorder === 'undefined') return '';
	for (const t of PREFERRED_TYPES) {
		if (MediaRecorder.isTypeSupported(t)) return t;
	}
	return '';
}

export class SwingRecorder {
	private chunks: Blob[] = [];
	private recorder: MediaRecorder | null = null;
	private resolveStop: ((blob: Blob) => void) | null = null;
	public mimeType: string = '';

	constructor(private stream: MediaStream) {}

	start(): void {
		this.chunks = [];
		const chosen = pickSupportedMimeType();
		try {
			this.recorder = chosen
				? new MediaRecorder(this.stream, { mimeType: chosen })
				: new MediaRecorder(this.stream);
		} catch {
			this.recorder = new MediaRecorder(this.stream);
		}
		this.mimeType = this.recorder.mimeType || chosen || 'video/mp4';
		this.recorder.ondataavailable = (e) => {
			if (e.data.size > 0) this.chunks.push(e.data);
		};
		this.recorder.onstop = () => {
			const blob = new Blob(this.chunks, { type: this.mimeType });
			this.resolveStop?.(blob);
			this.resolveStop = null;
		};
		this.recorder.start();
	}

	stop(): Promise<Blob> {
		return new Promise((resolve) => {
			if (!this.recorder || this.recorder.state === 'inactive') {
				resolve(new Blob(this.chunks, { type: this.mimeType || 'video/mp4' }));
				return;
			}
			this.resolveStop = resolve;
			this.recorder.stop();
		});
	}
}
