import { useId } from 'react'
import { ACCEPTED_FILE_TYPES, MAX_UPLOAD_MB } from '../lib/validators'

interface UploadInputProps {
  selectedFile: File | null
  onSelectFile: (file: File | null) => void
  disabled?: boolean
}

function UploadInput({ selectedFile, onSelectFile, disabled = false }: UploadInputProps) {
  const inputId = useId()

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] ?? null
    onSelectFile(file)
  }

  return (
    <div className="field-block">
      <label className="field-label" htmlFor={inputId}>
        Upload image
      </label>
      <div className="upload-row">
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="visually-hidden"
          onChange={handleChange}
          disabled={disabled}
        />
        <label
          htmlFor={inputId}
          className={`upload-trigger ${disabled ? 'is-disabled' : ''}`}
          aria-disabled={disabled}
        >
          Choose File
        </label>
        <p className="upload-file-name">{selectedFile?.name ?? 'No file selected'}</p>
      </div>
      <p className="field-help">Accepted: JPG, PNG, WEBP. Max size: {MAX_UPLOAD_MB}MB.</p>
    </div>
  )
}

export default UploadInput
