import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface PoseFrame {
	t: number; // seconds in video time
	landmarks: NormalizedLandmark[];
}

export interface SwingWindow {
	start: number; // seconds, swing address (just before motion begins)
	end: number; // seconds, swing finish (just after motion settles)
	peak: number; // seconds, frame of max motion (~impact)
	confidence: 'low' | 'medium' | 'high';
}

// MediaPipe 33-point pose landmark indices
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

function dist2D(a: NormalizedLandmark | undefined, b: NormalizedLandmark | undefined): number {
	if (!a || !b) return 0;
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Per-frame motion energy: how much the wrists moved since the previous frame,
 * normalized by shoulder width so it's scale-invariant (works whether the golfer
 * is close to or far from the camera).
 */
export function computeMotionEnergy(frames: PoseFrame[]): number[] {
	if (frames.length < 2) return new Array(frames.length).fill(0);
	const energy: number[] = [0];
	for (let i = 1; i < frames.length; i++) {
		const prev = frames[i - 1].landmarks;
		const curr = frames[i].landmarks;
		if (!prev || !curr) {
			energy.push(0);
			continue;
		}
		const wristMove = dist2D(prev[LEFT_WRIST], curr[LEFT_WRIST]) + dist2D(prev[RIGHT_WRIST], curr[RIGHT_WRIST]);
		const shoulderWidth = dist2D(curr[LEFT_SHOULDER], curr[RIGHT_SHOULDER]) || 0.001;
		energy.push(wristMove / shoulderWidth);
	}
	return energy;
}

function smooth(arr: number[], radius: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < arr.length; i++) {
		let sum = 0;
		let count = 0;
		const lo = Math.max(0, i - radius);
		const hi = Math.min(arr.length - 1, i + radius);
		for (let j = lo; j <= hi; j++) {
			sum += arr[j];
			count++;
		}
		out.push(sum / count);
	}
	return out;
}

const SWING_THRESHOLD_RATIO = 0.15; // "still" if energy below 15% of peak
const STILL_FRAMES_REQUIRED = 3;
const BUFFER_SECONDS = 0.2;

export function findSwingWindow(frames: PoseFrame[]): SwingWindow | null {
	if (frames.length < 8) return null;

	const energy = computeMotionEnergy(frames);
	const smoothed = smooth(energy, 2);

	let peakIdx = 0;
	let peakVal = 0;
	for (let i = 0; i < smoothed.length; i++) {
		if (smoothed[i] > peakVal) {
			peakVal = smoothed[i];
			peakIdx = i;
		}
	}
	if (peakVal === 0) return null;

	const threshold = peakVal * SWING_THRESHOLD_RATIO;

	let startIdx = 0;
	let stillRun = 0;
	for (let i = peakIdx; i >= 0; i--) {
		if (smoothed[i] < threshold) {
			stillRun++;
			if (stillRun >= STILL_FRAMES_REQUIRED) {
				startIdx = i;
				break;
			}
		} else {
			stillRun = 0;
		}
	}

	let endIdx = smoothed.length - 1;
	stillRun = 0;
	for (let i = peakIdx; i < smoothed.length; i++) {
		if (smoothed[i] < threshold) {
			stillRun++;
			if (stillRun >= STILL_FRAMES_REQUIRED) {
				endIdx = i;
				break;
			}
		} else {
			stillRun = 0;
		}
	}

	const firstT = frames[0].t;
	const lastT = frames[frames.length - 1].t;
	const start = Math.max(firstT, frames[startIdx].t - BUFFER_SECONDS);
	const end = Math.min(lastT, frames[endIdx].t + BUFFER_SECONDS);
	const peak = frames[peakIdx].t;

	const sorted = [...smoothed].sort((a, b) => a - b);
	const median = sorted[Math.floor(sorted.length / 2)] || 0.0001;
	const ratio = peakVal / median;
	let confidence: SwingWindow['confidence'];
	if (ratio > 30) confidence = 'high';
	else if (ratio > 10) confidence = 'medium';
	else confidence = 'low';

	if (end - start < 0.3) return null; // sanity check — real swings take >0.3s

	return { start, end, peak, confidence };
}
