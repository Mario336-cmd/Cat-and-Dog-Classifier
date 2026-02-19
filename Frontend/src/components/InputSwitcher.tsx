import type { InputSource } from '../types/classifier'

interface InputSwitcherProps {
  source: InputSource
  onChange: (source: InputSource) => void
  disabled?: boolean
}

const SOURCES: Array<{ value: InputSource; label: string }> = [
  { value: 'upload', label: 'Upload Image' },
  { value: 'url', label: 'Image URL' },
]

function InputSwitcher({ source, onChange, disabled = false }: InputSwitcherProps) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Image source mode">
      {SOURCES.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={source === option.value}
          className={`mode-button ${source === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default InputSwitcher
