import type { ClassifierStatus, PredictionResult } from '../types/classifier'

interface ResultPanelProps {
  status: ClassifierStatus
  result: PredictionResult | null
}

function ResultPanel({ status, result }: ResultPanelProps) {
  const isClassifying = status === 'classifying'

  if (!result) {
    return (
      <section className="result-shell result-empty" aria-live="polite">
        <h3>Prediction</h3>
        <p>
          {isClassifying ? 'Running classification...' : 'Classification results will appear here.'}
        </p>
      </section>
    )
  }

  const probabilityText = `${result.probabilityPercent.toFixed(1)}%`
  const resultTone =
    result.label === 'Cat' ? 'result-cat' : result.label === 'Dog' ? 'result-dog' : 'result-unknown'
  const displayLabel = result.label === 'Unknown' ? 'Not a Cat or Dog' : result.label
  const helperText =
    result.label === 'Unknown' ? 'Please try an image of a cat or dog.' : null

  return (
    <section className={`result-shell ${resultTone}`} aria-live="polite">
      <p className="result-heading">Prediction Results</p>
      <p className="result-value">{displayLabel}</p>
      {helperText ? <p className="result-meta">{helperText}</p> : null}

      <div className="confidence-row">
        <div className="confidence-meta">
          <span>Model Confidence</span>
          <strong>{probabilityText}</strong>
        </div>
        <div className="confidence-track" aria-hidden="true">
          <span
            className="confidence-fill"
            style={{ width: `${Math.min(Math.max(result.probabilityPercent, 0), 100)}%` }}
          />
        </div>
      </div>

      <p className="result-meta">
        {isClassifying
          ? 'Updating prediction...'
          : `Result generated at ${new Date(result.timestamp).toLocaleTimeString([], { hour12: false })}`}
      </p>
    </section>
  )
}

export default ResultPanel
