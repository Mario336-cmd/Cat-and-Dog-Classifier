interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function UrlInput({ value, onChange, disabled = false }: UrlInputProps) {
  return (
    <div className="field-block">
      <label className="field-label" htmlFor="image-url-input">
        Image URL
      </label>
      <input
        id="image-url-input"
        className="url-input"
        type="text"
        inputMode="url"
        placeholder="https://example.com/cat-or-dog.jpg"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <p className="field-help">
        Paste direct image links, search-result wrapper links, or snippets (Markdown/HTML) that
        contain an image URL. Publicly accessible images work best.
      </p>
    </div>
  )
}

export default UrlInput
