import type { PredictionLabel, PredictionResult } from '../types/classifier'

export const SIMULATED_LATENCY_MS = 700

const randomLabel = (): PredictionLabel => (Math.random() < 0.5 ? 'Cat' : 'Dog')

const randomProbability = (): number => Number((Math.random() * (99 - 55) + 55).toFixed(1))

export const generateMockPrediction = (): PredictionResult => ({
  label: randomLabel(),
  probabilityPercent: randomProbability(),
  timestamp: Date.now(),
})
