import {
	PoseLandmarker,
	FilesetResolver,
	DrawingUtils,
	type NormalizedLandmark
} from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const MODEL_URL =
	'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

let landmarker: PoseLandmarker | null = null;
let loadingPromise: Promise<PoseLandmarker> | null = null;

export async function loadPoseLandmarker(): Promise<PoseLandmarker> {
	if (landmarker) return landmarker;
	if (loadingPromise) return loadingPromise;

	loadingPromise = (async () => {
		const vision = await FilesetResolver.forVisionTasks(WASM_URL);
		const lm = await PoseLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: MODEL_URL,
				delegate: 'GPU'
			},
			runningMode: 'VIDEO',
			numPoses: 1,
			minPoseDetectionConfidence: 0.5,
			minPosePresenceConfidence: 0.5,
			minTrackingConfidence: 0.5
		});
		landmarker = lm;
		return lm;
	})();

	return loadingPromise;
}

export function drawPose(
	canvas: HTMLCanvasElement,
	landmarks: NormalizedLandmark[] | undefined,
	videoWidth: number,
	videoHeight: number
): void {
	// Match canvas backing-store to the video's intrinsic resolution so
	// landmark coordinates (which are 0..1 in video space) map correctly.
	if (canvas.width !== videoWidth) canvas.width = videoWidth;
	if (canvas.height !== videoHeight) canvas.height = videoHeight;

	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!landmarks || landmarks.length === 0) return;

	const drawingUtils = new DrawingUtils(ctx);
	drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
		color: '#00e676',
		lineWidth: Math.max(2, videoWidth / 320)
	});
	drawingUtils.drawLandmarks(landmarks, {
		color: '#ffffff',
		fillColor: '#00e676',
		radius: Math.max(2, videoWidth / 400),
		lineWidth: 1
	});
}
