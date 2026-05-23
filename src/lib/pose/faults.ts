import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { PoseFrame, SwingWindow } from './swing';

export type Verdict = 'ok' | 'moderate' | 'large';

export interface HeadMovementResult {
	verdict: Verdict;
	/** Lateral travel of the head, normalized by shoulder width (0.1 = 10% of shoulder width). */
	ratio: number;
	/** One-sentence plain-English explanation tied to the verdict. */
	explanation: string;
}

export interface FaultResults {
	headMovement: HeadMovementResult | null;
}

// MediaPipe 33-point landmark indices used here.
const NOSE = 0;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

// Measure head movement from address to impact (approximated by the motion-energy peak).
// Post-impact rotation naturally moves the head, so including the follow-through would
// flag every normal swing.
const HEAD_OK = 0.1;
const HEAD_MODERATE = 0.2;

function visible(lm: NormalizedLandmark | undefined): boolean {
	if (!lm) return false;
	const v = lm.visibility;
	return v === undefined || v > 0.5;
}

export function detectHeadMovement(
	frames: PoseFrame[],
	window: SwingWindow
): HeadMovementResult | null {
	const slice = frames.filter((f) => f.t >= window.start && f.t <= window.peak);
	if (slice.length < 4) return null;

	let minX = Infinity;
	let maxX = -Infinity;
	let shoulderSum = 0;
	let shoulderCount = 0;

	for (const frame of slice) {
		const nose = frame.landmarks[NOSE];
		const ls = frame.landmarks[LEFT_SHOULDER];
		const rs = frame.landmarks[RIGHT_SHOULDER];
		if (visible(nose)) {
			if (nose!.x < minX) minX = nose!.x;
			if (nose!.x > maxX) maxX = nose!.x;
		}
		if (visible(ls) && visible(rs)) {
			const dx = ls!.x - rs!.x;
			const dy = ls!.y - rs!.y;
			shoulderSum += Math.sqrt(dx * dx + dy * dy);
			shoulderCount++;
		}
	}

	if (minX === Infinity || maxX === -Infinity || shoulderCount === 0) return null;
	const shoulderWidth = shoulderSum / shoulderCount;
	if (shoulderWidth < 0.02) return null; // implausible — pose not reliable

	const ratio = (maxX - minX) / shoulderWidth;

	let verdict: Verdict;
	let explanation: string;
	if (ratio < HEAD_OK) {
		verdict = 'ok';
		explanation = 'Head stayed steady from address through impact — good stability.';
	} else if (ratio < HEAD_MODERATE) {
		verdict = 'moderate';
		explanation = 'Some lateral head movement before impact. A little sway is normal; watch it.';
	} else {
		verdict = 'large';
		explanation = 'Noticeable head sway before impact. Try anchoring your head over the ball.';
	}

	return { verdict, ratio, explanation };
}

export function detectFaults(frames: PoseFrame[], window: SwingWindow): FaultResults {
	return {
		headMovement: detectHeadMovement(frames, window)
	};
}
