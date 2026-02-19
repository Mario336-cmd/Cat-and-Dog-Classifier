interface HeroProps {
  imageUrl: string
  onImageLoad: (imageUrl: string) => void
  onImageError: (imageUrl: string) => void
}

function Hero({ imageUrl, onImageLoad, onImageError }: HeroProps) {
  return (
    <section className="section-card hero">
      <div className="hero-layout">
        <div className="hero-content">
          <p className="hero-kicker">COMPUTER VISION</p>
          <h1>Cat and Dog Image Classifier</h1>
          <p className="hero-copy">
            This website is an interactive showcase of a Convolutional Neural Network (CNN)-based
            computer vision model that classifies images as Cats or Dogs. Users can upload photos
            from their device or paste public online image links, and the app will return a
            real-time prediction along with a model confidence score.
          </p>
        </div>

        {imageUrl ? (
          <figure className="hero-image-shell" aria-hidden="true">
            <img
              key={imageUrl}
              className="hero-image hero-image-animated"
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onLoad={() => onImageLoad(imageUrl)}
              onError={() => onImageError(imageUrl)}
            />
          </figure>
        ) : null}
      </div>
    </section>
  )
}

export default Hero
