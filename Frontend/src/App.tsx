import { useEffect, useRef, useState } from 'react'
import DesktopOnlyNotice from './components/DesktopOnlyNotice'
import Hero from './components/Hero'
import ImagePreview from './components/ImagePreview'
import InputSwitcher from './components/InputSwitcher'
import ResultPanel from './components/ResultPanel'
import StatusBanner from './components/StatusBanner'
import UploadInput from './components/UploadInput'
import UrlInput from './components/UrlInput'
import {
  advanceHeroCycle,
  createInitialHeroCycleState,
  ensureHeroImageReady,
  preloadHeroCycleImages,
} from './lib/heroImageCycle'
import { classifyImageBlob, preloadClassifierModel } from './lib/modelClassifier'
import { createValidationError, prepareImageUrl, validateFile } from './lib/validators'
import type { AppState, InputSource } from './types/classifier'

const initialState: AppState = {
  source: 'upload',
  status: 'idle',
  selectedFile: null,
  imageUrl: '',
  previewUrl: '',
  resolvedPreviewUrl: '',
  previewSource: null,
  result: null,
  error: null,
}

const HERO_IMAGE_ROTATE_MS = 6500
const MOBILE_USER_AGENT_PATTERN = /android|iphone|ipad|ipod|mobile|iemobile|opera mini/i

const getRestingStatus = (
  previous: Pick<AppState, 'previewUrl' | 'result'>,
): AppState['status'] => {
  if (previous.result) {
    return 'success'
  }

  return previous.previewUrl ? 'ready' : 'idle'
}

const isMobileLikeDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const smallViewport = window.innerWidth < 1024
  const mobileUserAgent = MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent.toLowerCase())

  return mobileUserAgent || (coarsePointer && smallViewport)
}

function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [isDesktopOnlyBlocked, setIsDesktopOnlyBlocked] = useState<boolean>(() => isMobileLikeDevice())
  const [heroCycle, setHeroCycle] = useState(createInitialHeroCycleState)
  const [isHeroCyclePrimed, setIsHeroCyclePrimed] = useState(false)
  const [loadedHeroImageUrl, setLoadedHeroImageUrl] = useState('')
  const classifyLockRef = useRef(false)

  useEffect(() => {
    const updateDeviceGate = () => {
      setIsDesktopOnlyBlocked(isMobileLikeDevice())
    }

    updateDeviceGate()
    window.addEventListener('resize', updateDeviceGate)
    return () => {
      window.removeEventListener('resize', updateDeviceGate)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    setIsHeroCyclePrimed(false)
    void preloadHeroCycleImages(heroCycle).finally(() => {
      if (!isCancelled) {
        setIsHeroCyclePrimed(true)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [heroCycle.catQueue, heroCycle.dogQueue])

  useEffect(() => {
    if (!isHeroCyclePrimed) {
      return
    }

    if (!heroCycle.currentImage) {
      return
    }

    if (loadedHeroImageUrl !== heroCycle.currentImage) {
      return
    }

    let isCancelled = false
    const currentImage = heroCycle.currentImage

    const timeoutId = window.setTimeout(() => {
      const nextCycle = advanceHeroCycle(heroCycle)
      const applyNextCycle = () => {
        if (isCancelled) {
          return
        }

        setHeroCycle((previous) => {
          if (previous.currentImage !== currentImage) {
            return previous
          }

          return nextCycle
        })
      }

      if (!nextCycle.currentImage || nextCycle.currentImage === currentImage) {
        applyNextCycle()
        return
      }

      void ensureHeroImageReady(nextCycle.currentImage).finally(() => {
        applyNextCycle()
      })
    }, HERO_IMAGE_ROTATE_MS)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [heroCycle, isHeroCyclePrimed, loadedHeroImageUrl])

  useEffect(() => {
    return () => {
      if (state.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.previewUrl)
      }
    }
  }, [state.previewUrl])

  useEffect(() => {
    void preloadClassifierModel().catch(() => {
      // A loading error will be surfaced when classify is requested.
    })
  }, [])

  const isClassifying = state.status === 'classifying'
  const hasPreview = state.previewUrl.length > 0
  const hasResolvedPreview = state.resolvedPreviewUrl.length > 0
  const isPreviewReady =
    state.previewSource === 'upload'
      ? Boolean(state.selectedFile && hasResolvedPreview)
      : state.previewSource === 'url'
        ? Boolean(state.previewUrl && hasResolvedPreview)
        : false
  const isPreviewLoading = hasPreview && !isPreviewReady && state.status !== 'error'
  const canClassify = isPreviewReady && !isClassifying
  const classifyButtonLabel = isClassifying
    ? 'Classifying...'
    : isPreviewLoading
      ? 'Loading Preview...'
    : state.result
      ? 'Classify Again'
      : 'Classify'

  const handleSourceChange = (source: InputSource) => {
    if (state.source === source) {
      return
    }

    setState((previous) => ({
      ...previous,
      source,
      status: previous.status === 'error' ? getRestingStatus(previous) : previous.status,
      error: null,
    }))
  }

  const handleHeroImageLoad = (imageUrl: string) => {
    setLoadedHeroImageUrl(imageUrl)
  }

  const handleHeroImageError = (imageUrl: string) => {
    if (imageUrl !== heroCycle.currentImage) {
      return
    }

    setHeroCycle((previous) => advanceHeroCycle(previous))
  }

  const handleReplaceImage = () => {
    setState((previous) => ({
      ...previous,
      status: 'idle',
      selectedFile: null,
      imageUrl: '',
      previewUrl: '',
      resolvedPreviewUrl: '',
      previewSource: null,
      result: null,
      error: null,
    }))
  }

  const handleUploadSelection = (file: File | null) => {
    if (!file) {
      setState((previous) => ({
        ...previous,
        source: 'upload',
      }))
      return
    }

    const validation = validateFile(file)
    if (!validation.ok) {
      setState((previous) => ({
        ...previous,
        source: 'upload',
        status: 'error',
        error: validation,
      }))
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setState((previous) => ({
      ...previous,
      source: 'upload',
      status: 'ready',
      selectedFile: file,
      previewUrl,
      resolvedPreviewUrl: '',
      previewSource: 'upload',
      result: null,
      error: null,
    }))
  }

  const handleUrlChange = (nextValue: string) => {
    const normalizedInput = nextValue.trim()

    if (!normalizedInput) {
      setState((previous) => ({
        ...previous,
        source: 'url',
        status: getRestingStatus(previous),
        imageUrl: nextValue,
        error: null,
      }))
      return
    }

    const preparedUrl = prepareImageUrl(normalizedInput)
    const normalizedUrl = preparedUrl.normalizedUrl

    if (!preparedUrl.validation.ok || !normalizedUrl) {
      setState((previous) => ({
        ...previous,
        source: 'url',
        status: 'error',
        imageUrl: nextValue,
        error: preparedUrl.validation,
      }))
      return
    }

    setState((previous) => ({
      ...previous,
      source: 'url',
      status: 'ready',
      selectedFile: null,
      imageUrl: normalizedUrl,
      previewUrl: normalizedUrl,
      resolvedPreviewUrl: '',
      previewSource: 'url',
      result: null,
      error: null,
    }))
  }

  const handlePreviewLoad = (loadedUrl: string) => {
    const normalizedLoadedUrl = loadedUrl.trim()
    if (!normalizedLoadedUrl) {
      return
    }

    setState((previous) => {
      if (previous.resolvedPreviewUrl === normalizedLoadedUrl) {
        return previous
      }

      return {
        ...previous,
        resolvedPreviewUrl: normalizedLoadedUrl,
      }
    })
  }

  const handlePreviewError = () => {
    setState((previous) => ({
      ...previous,
      status: 'error',
      resolvedPreviewUrl: '',
      result: null,
      error: createValidationError('image_load_failed'),
    }))
  }

  const handleClassify = async () => {
    if (!canClassify || classifyLockRef.current) {
      return
    }

    classifyLockRef.current = true
    setState((previous) => ({
      ...previous,
      status: 'classifying',
      error: null,
    }))

    try {
      let imageBlob: Blob | null = null

      if (state.previewSource === 'upload' && state.selectedFile) {
        imageBlob = state.selectedFile
      } else if (state.previewSource === 'url' && state.previewUrl) {
        const urlCandidates = Array.from(
          new Set([state.resolvedPreviewUrl, state.previewUrl].filter((url) => url.length > 0)),
        )
        let sawCorsError = false

        for (const candidateUrl of urlCandidates) {
          try {
            const response = await fetch(candidateUrl, {
              mode: 'cors',
              cache: 'no-store',
            })

            if (!response.ok) {
              continue
            }

            imageBlob = await response.blob()
            break
          } catch {
            sawCorsError = true
          }
        }

        if (!imageBlob) {
          setState((previous) => ({
            ...previous,
            status: 'error',
            error: createValidationError(sawCorsError ? 'cors_blocked' : 'image_load_failed'),
          }))
          return
        }
      }

      if (!imageBlob) {
        setState((previous) => ({
          ...previous,
          status: 'error',
          error: createValidationError('image_load_failed'),
        }))
        return
      }

      const prediction = await classifyImageBlob(imageBlob)
      setState((previous) => ({
        ...previous,
        status: 'success',
        result: prediction,
        error: null,
      }))
    } catch {
      setState((previous) => ({
        ...previous,
        status: 'error',
        result: null,
        error: createValidationError('classification_failed'),
      }))
    } finally {
      classifyLockRef.current = false
    }
  }

  if (isDesktopOnlyBlocked) {
    return <DesktopOnlyNotice />
  }

  return (
    <main className="page-shell">
      <Hero
        imageUrl={heroCycle.currentImage}
        onImageLoad={handleHeroImageLoad}
        onImageError={handleHeroImageError}
      />

      <section className="section-card how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-grid">
          <article className="step-card">
            <p className="step-index">01</p>
            <h3>Add Your Image</h3>
            <p>Upload a photo from your device or paste an image URL.</p>
          </article>
          <article className="step-card">
            <p className="step-index">02</p>
            <h3>Check the Preview</h3>
            <p>If the image appears, it is ready to classify.</p>
          </article>
          <article className="step-card">
            <p className="step-index">03</p>
            <h3>Get the Result</h3>
            <p>
              Click Classify to see whether it is a cat or dog.
            </p>
          </article>
        </div>
      </section>

      <section className="section-card workspace">
        <div className="controls-column">
          <h2 className="section-heading">Try Classification</h2>
          <p className="section-subtitle">
            Provide an image from your device or paste an image URL.
          </p>

          <InputSwitcher
            source={state.source}
            onChange={handleSourceChange}
            disabled={isClassifying}
          />

          <div className="input-panel-stack">
            <div
              className={`input-panel input-panel-upload ${
                state.source === 'upload' ? 'is-active' : 'is-inactive'
              }`}
              aria-hidden={state.source !== 'upload'}
            >
              <UploadInput
                selectedFile={state.selectedFile}
                onSelectFile={handleUploadSelection}
                disabled={isClassifying || state.source !== 'upload'}
              />
            </div>

            <div
              className={`input-panel input-panel-url ${
                state.source === 'url' ? 'is-active' : 'is-inactive'
              }`}
              aria-hidden={state.source !== 'url'}
            >
              <UrlInput
                value={state.imageUrl}
                onChange={handleUrlChange}
                disabled={isClassifying || state.source !== 'url'}
              />
            </div>
          </div>

          {state.error?.message ? (
            <StatusBanner tone="error" message={state.error.message} />
          ) : isPreviewLoading ? (
            <StatusBanner tone="info" message="Loading image preview..." />
          ) : null}

          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleClassify}
              disabled={!canClassify}
            >
              {classifyButtonLabel}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={handleReplaceImage}
              disabled={!hasPreview || isClassifying}
            >
              Remove Image
            </button>
          </div>

          <ResultPanel status={state.status} result={state.result} />
        </div>

        <div className="preview-column">
          <ImagePreview
            previewUrl={state.previewUrl}
            onLoad={handlePreviewLoad}
            onError={handlePreviewError}
          />
        </div>
      </section>
    </main>
  )
}

export default App
