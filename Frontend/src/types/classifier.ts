export type InputSource = 'upload' | 'url'

export type ClassifierStatus = 'idle' | 'ready' | 'classifying' | 'success' | 'error'

export type ErrorCode =
  | 'invalid_type'
  | 'file_too_large'
  | 'invalid_url'
  | 'cors_blocked'
  | 'image_load_failed'
  | 'classification_failed'

export type PredictionLabel = 'Cat' | 'Dog' | 'Unknown'

export interface PredictionResult {
  label: PredictionLabel
  probabilityPercent: number
  timestamp: number
}

export interface ValidationResult {
  ok: boolean
  errorCode?: ErrorCode
  message?: string
}

export interface AppState {
  source: InputSource
  status: ClassifierStatus
  selectedFile: File | null
  imageUrl: string
  previewUrl: string
  resolvedPreviewUrl: string
  previewSource: InputSource | null
  result: PredictionResult | null
  error: ValidationResult | null
}
