import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detectorPromise

// Loaded once and reused; the kiosk calls this on startup so the first employee doesn't wait.
export function getDetector() {
  if (!detectorPromise) {
    detectorPromise = create().catch(e => {
      detectorPromise = null
      throw e
    })
  }
  return detectorPromise
}

async function create() {
  const fileset = await FilesetResolver.forVisionTasks(WASM)
  const options = delegate => ({
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.6,
  })
  try {
    return await FaceDetector.createFromOptions(fileset, options('GPU'))
  } catch {
    return FaceDetector.createFromOptions(fileset, options('CPU'))
  }
}
