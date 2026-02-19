import * as tf from '@tensorflow/tfjs'
import type { PredictionLabel, PredictionResult } from '../types/classifier'

const MODEL_PATH = `${import.meta.env.BASE_URL}model_graph/model.json`
const MODEL_INPUT_SIZE = 224
const UNKNOWN_CLASS_INDEX = 2
const UNKNOWN_CONFIDENCE_THRESHOLD = 0.46
const CLASS_LABELS: readonly PredictionLabel[] = ['Cat', 'Dog', 'Unknown']

let modelPromise: Promise<tf.GraphModel> | null = null

const loadModel = (): Promise<tf.GraphModel> => {
  if (!modelPromise) {
    modelPromise = tf.loadGraphModel(MODEL_PATH)
  }

  return modelPromise
}

const decodeImageBlob = (imageBlob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(imageBlob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to decode image blob.'))
    }
    image.src = objectUrl
  })

const createModelInputTensor = (image: HTMLImageElement): tf.Tensor4D =>
  tf.tidy(() => {
    const imageTensor = tf.browser.fromPixels(image)
    // Center-crop first to avoid strong aspect-ratio distortion (common on mobile camera images).
    const [height, width] = imageTensor.shape
    const cropSize = Math.min(height, width)
    const offsetY = Math.floor((height - cropSize) / 2)
    const offsetX = Math.floor((width - cropSize) / 2)
    const croppedTensor = imageTensor.slice([offsetY, offsetX, 0], [cropSize, cropSize, 3])
    const resizedTensor = tf.image.resizeBilinear(croppedTensor, [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE], true)
    const normalizedTensor = resizedTensor.toFloat().div(255)
    return normalizedTensor.expandDims(0)
  })

const initializeBackend = async (): Promise<void> => {
  if (tf.getBackend() !== 'webgl') {
    try {
      await tf.setBackend('webgl')
    } catch {
      // Keep default backend if WebGL is unavailable.
    }
  }
  await tf.ready()
}

const resolvePrediction = (probabilities: number[]): Pick<PredictionResult, 'label' | 'probabilityPercent'> => {
  if (probabilities.length < 3) {
    throw new Error(`Unexpected model output: received ${probabilities.length} values.`)
  }

  let maxIndex = 0
  for (let index = 1; index < probabilities.length; index += 1) {
    if (probabilities[index] > probabilities[maxIndex]) {
      maxIndex = index
    }
  }

  const maxProbability = probabilities[maxIndex]
  const shouldRejectAsUnknown =
    maxIndex !== UNKNOWN_CLASS_INDEX && maxProbability < UNKNOWN_CONFIDENCE_THRESHOLD
  const resolvedIndex = shouldRejectAsUnknown ? UNKNOWN_CLASS_INDEX : maxIndex

  return {
    label: CLASS_LABELS[resolvedIndex] ?? 'Unknown',
    probabilityPercent: Number((maxProbability * 100).toFixed(1)),
  }
}

export const preloadClassifierModel = async (): Promise<void> => {
  await initializeBackend()
  await loadModel()
}

export const classifyImageBlob = async (imageBlob: Blob): Promise<PredictionResult> => {
  await initializeBackend()
  const model = await loadModel()
  const image = await decodeImageBlob(imageBlob)
  const inputTensor = createModelInputTensor(image)

  let predictionOutput: tf.Tensor | tf.Tensor[] | tf.NamedTensorMap | null = null
  try {
    predictionOutput = model.execute({
      [model.inputs[0]?.name ?? 'input_layer_5']: inputTensor,
    })

    const outputTensor = Array.isArray(predictionOutput)
      ? predictionOutput[0]
      : predictionOutput instanceof tf.Tensor
        ? predictionOutput
        : Object.values(predictionOutput)[0]

    if (!(outputTensor instanceof tf.Tensor)) {
      throw new Error('Model output was not a tensor.')
    }

    const probabilities = Array.from(await outputTensor.data())
    const prediction = resolvePrediction(probabilities)

    return {
      ...prediction,
      timestamp: Date.now(),
    }
  } finally {
    inputTensor.dispose()
    if (predictionOutput) {
      tf.dispose(predictionOutput)
    }
  }
}
