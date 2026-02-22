import { useEffect, useRef, useState } from 'react'

interface HeroProps {
  imageUrl: string
  onImageLoad: (imageUrl: string) => void
  onImageError: (imageUrl: string) => void
}

const HERO_CROSSFADE_MS = 620
const HERO_CROSSFADE_SETTLE_MS = 50

function Hero({ imageUrl, onImageLoad, onImageError }: HeroProps) {
  const [baseImageUrl, setBaseImageUrl] = useState(imageUrl)
  const [overlayImageUrl, setOverlayImageUrl] = useState('')
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const overlayImageRef = useRef('')
  const crossfadeTimeoutRef = useRef<number | null>(null)

  const clearCrossfadeTimeout = () => {
    if (crossfadeTimeoutRef.current !== null) {
      window.clearTimeout(crossfadeTimeoutRef.current)
      crossfadeTimeoutRef.current = null
    }
  }

  useEffect(() => {
    if (!imageUrl) {
      clearCrossfadeTimeout()
      overlayImageRef.current = ''
      setBaseImageUrl('')
      setOverlayImageUrl('')
      setIsOverlayVisible(false)
      return
    }

    if (!baseImageUrl) {
      setBaseImageUrl(imageUrl)
      return
    }

    if (imageUrl === baseImageUrl) {
      return
    }

    clearCrossfadeTimeout()
    overlayImageRef.current = imageUrl
    setOverlayImageUrl(imageUrl)
    setIsOverlayVisible(false)
  }, [baseImageUrl, imageUrl])

  useEffect(() => {
    return () => {
      clearCrossfadeTimeout()
    }
  }, [])

  const handleBaseImageLoad = (loadedImageUrl: string) => {
    onImageLoad(loadedImageUrl)
  }

  const handleOverlayImageLoad = (loadedImageUrl: string) => {
    if (!loadedImageUrl || overlayImageRef.current !== loadedImageUrl) {
      return
    }

    onImageLoad(loadedImageUrl)

    requestAnimationFrame(() => {
      if (overlayImageRef.current === loadedImageUrl) {
        setIsOverlayVisible(true)
      }
    })

    clearCrossfadeTimeout()
    crossfadeTimeoutRef.current = window.setTimeout(() => {
      if (overlayImageRef.current !== loadedImageUrl) {
        return
      }

      overlayImageRef.current = ''
      setBaseImageUrl(loadedImageUrl)
      setOverlayImageUrl('')
      setIsOverlayVisible(false)
      crossfadeTimeoutRef.current = null
    }, HERO_CROSSFADE_MS + HERO_CROSSFADE_SETTLE_MS)
  }

  const handleOverlayImageError = (failedImageUrl: string) => {
    if (overlayImageRef.current === failedImageUrl) {
      clearCrossfadeTimeout()
      overlayImageRef.current = ''
      setOverlayImageUrl('')
      setIsOverlayVisible(false)
    }

    onImageError(failedImageUrl)
  }

  const visibleImageUrl = overlayImageUrl || baseImageUrl

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

        {visibleImageUrl ? (
          <figure className="hero-image-shell" aria-hidden="true">
            {baseImageUrl ? (
              <img
                className="hero-image hero-image-base"
                src={baseImageUrl}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => handleBaseImageLoad(baseImageUrl)}
                onError={() => onImageError(baseImageUrl)}
              />
            ) : null}

            {overlayImageUrl ? (
              <img
                className={`hero-image hero-image-overlay ${isOverlayVisible ? 'is-visible' : ''}`}
                src={overlayImageUrl}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => handleOverlayImageLoad(overlayImageUrl)}
                onError={() => handleOverlayImageError(overlayImageUrl)}
              />
            ) : null}

          </figure>
        ) : null}
      </div>
    </section>
  )
}

export default Hero
