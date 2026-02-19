interface ImagePreviewProps {
  previewUrl: string
  onLoad: (loadedUrl: string) => void
  onError: () => void
}

function ImagePreview({ previewUrl, onLoad, onError }: ImagePreviewProps) {
  if (!previewUrl) {
    return (
      <div className="preview-shell preview-empty">
        <p className="preview-empty-title">Image Preview</p>
        <p>Add an image to see its preview here.</p>
      </div>
    )
  }

  return (
    <figure className="preview-shell">
      <div className="preview-media">
        <img
          key={previewUrl}
          src={previewUrl}
          alt="Selected image for classification"
          className="preview-image"
          onLoad={(event) => onLoad(event.currentTarget.currentSrc || event.currentTarget.src)}
          onError={onError}
        />
      </div>
      <figcaption className="preview-caption">Preview ready</figcaption>
    </figure>
  )
}

export default ImagePreview
