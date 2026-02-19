import type { ErrorCode, ValidationResult } from '../types/classifier'

export const MAX_UPLOAD_MB = 10
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
export const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.webp'
const MAX_URL_EXTRACTION_DEPTH = 4
const MAX_CANDIDATE_COUNT = 48

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const WRAPPER_PARAM_KEYS = [
  'mediaurl',
  'imgurl',
  'imageurl',
  'image_url',
  'image',
  'img',
  'url',
  'u',
  'r',
  'redirect',
  'redirect_url',
  'redirecturl',
  'target',
  'destination',
  'dest',
  'src',
  'source',
  'media',
  'photo',
  'picture',
  'original',
]
const WRAPPER_PARAM_KEY_SET = new Set(WRAPPER_PARAM_KEYS)
const IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|heic|heif|jfif|jpe?g|png|svg|webp)(?:$|[/?#])/i
const IMAGE_FORMAT_HINTS = ['avif', 'bmp', 'gif', 'heic', 'heif', 'jfif', 'jpg', 'jpeg', 'png', 'svg', 'webp']
const HTTP_URL_IN_TEXT_PATTERN = /https?:\/\/[^\s"'<>]+/gi
const WWW_URL_IN_TEXT_PATTERN = /\bwww\.[^\s"'<>]+/gi
const MARKDOWN_LINK_PATTERN = /\[[^[\]]*]\(([^)]+)\)/gi
const HTML_ATTR_URL_PATTERN =
  /\b(?:src|href|content|data-src|data-original|data-image)\s*=\s*["']([^"']+)["']/gi
const CSS_URL_PATTERN = /url\(([^)]+)\)/gi
const JSON_URL_FIELD_PATTERN =
  /"(?:url|src|image|image_url|imageUrl|thumbnail|thumbnailUrl)"\s*:\s*"([^"]+)"/gi
const SRCSET_VALUE_PATTERN = /\bsrcset\s*=\s*["']([^"']+)["']/gi
const EMBEDDED_URL_PATTERN = /(?:https?:\/\/|www\.|https?%3A%2F%2F)/i

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_type: 'Please upload JPG, PNG, or WEBP images only.',
  file_too_large: 'Image exceeds 10MB. Choose a smaller file.',
  invalid_url: 'Enter a valid absolute image URL (http/https).',
  cors_blocked: 'This URL blocks browser access (CORS). Upload the image directly instead.',
  image_load_failed: 'Could not load image from this source. Try another image.',
  classification_failed: 'Model prediction failed. Refresh and try again.',
}

export const createValidationError = (errorCode: ErrorCode): ValidationResult => ({
  ok: false,
  errorCode,
  message: ERROR_MESSAGES[errorCode],
})

const collectPatternMatches = (
  source: string,
  pattern: RegExp,
  groupIndex = 0,
): string[] => {
  const matches: string[] = []
  const matcher = new RegExp(pattern.source, pattern.flags)
  let match: RegExpExecArray | null = matcher.exec(source)

  while (match) {
    const value = match[groupIndex] ?? match[0]
    if (value) {
      matches.push(value)
    }

    match = matcher.exec(source)
  }

  return matches
}

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const sanitizeInputValue = (value: string): string =>
  decodeHtmlEntities(value)
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')

const normalizeCandidateToken = (value: string): string =>
  sanitizeInputValue(value)
    .replace(/^["'`([{<\s]+/, '')
    .replace(/[>"'`)\]}.,;!?\s]+$/, '')

const splitSrcsetUrls = (srcset: string): string[] =>
  srcset
    .split(',')
    .map((entry) => normalizeCandidateToken((entry.trim().split(/\s+/)[0] ?? '').trim()))
    .filter(Boolean)

const extractInlineUrlCandidates = (value: string): string[] => {
  const source = sanitizeInputValue(value)
  if (!source) {
    return []
  }

  const candidates = new Set<string>()
  const pushCandidate = (candidate: string) => {
    if (candidates.size >= MAX_CANDIDATE_COUNT) {
      return
    }

    const normalizedCandidate = normalizeCandidateToken(candidate)
    if (normalizedCandidate) {
      candidates.add(normalizedCandidate)
    }
  }

  pushCandidate(source)

  collectPatternMatches(source, HTML_ATTR_URL_PATTERN, 1).forEach(pushCandidate)
  collectPatternMatches(source, CSS_URL_PATTERN, 1).forEach(pushCandidate)
  collectPatternMatches(source, JSON_URL_FIELD_PATTERN, 1).forEach(pushCandidate)
  collectPatternMatches(source, MARKDOWN_LINK_PATTERN, 1).forEach((candidate) => {
    const markdownUrl = candidate.trim().split(/\s+/)[0] ?? candidate
    pushCandidate(markdownUrl)
  })
  collectPatternMatches(source, SRCSET_VALUE_PATTERN, 1).forEach((srcset) => {
    splitSrcsetUrls(srcset).forEach(pushCandidate)
  })
  collectPatternMatches(source, HTTP_URL_IN_TEXT_PATTERN).forEach(pushCandidate)
  collectPatternMatches(source, WWW_URL_IN_TEXT_PATTERN).forEach(pushCandidate)

  return Array.from(candidates)
}

const ensureProtocol = (value: string): string => {
  if (value.startsWith('//')) {
    return `https:${value}`
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    return value
  }

  if (/^www\./i.test(value)) {
    return `https://${value}`
  }

  if (/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:[/:?#]|$)/.test(value)) {
    return `https://${value}`
  }

  return value
}

const parseHttpUrl = (value: string): URL | null => {
  const candidates = extractInlineUrlCandidates(value)
  for (const candidate of candidates) {
    try {
      const parsedUrl = new URL(ensureProtocol(candidate))
      const isHttp = parsedUrl.protocol === 'http:'
      const isHttps = parsedUrl.protocol === 'https:'
      if (isHttp || isHttps) {
        return parsedUrl
      }
    } catch {
      // Keep trying additional extracted candidates.
    }
  }

  return null
}

const buildParamCandidates = (value: string): string[] => {
  const queue = [value]
  const candidates = new Set<string>()

  while (queue.length > 0 && candidates.size < MAX_CANDIDATE_COUNT) {
    const current = normalizeCandidateToken(queue.shift() ?? '')
    if (!current || candidates.has(current)) {
      continue
    }

    candidates.add(current)

    for (const decodeInput of [current, current.replace(/\+/g, '%20')]) {
      try {
        const decoded = decodeURIComponent(decodeInput)
        const normalizedDecoded = normalizeCandidateToken(decoded)
        if (normalizedDecoded && !candidates.has(normalizedDecoded)) {
          queue.push(normalizedDecoded)
        }
      } catch {
        // Ignore values that are not URI-encoded.
      }
    }
  }

  return Array.from(candidates)
}

const looksLikeImageUrl = (url: URL): boolean => {
  if (IMAGE_EXTENSION_PATTERN.test(url.pathname)) {
    return true
  }

  for (const key of ['fm', 'format', 'ext', 'mime', 'type']) {
    const value = url.searchParams.get(key)
    if (!value) {
      continue
    }

    const lowerValue = value.toLowerCase()
    if (IMAGE_FORMAT_HINTS.some((hint) => lowerValue.includes(hint))) {
      return true
    }
  }

  return false
}

const normalizeKnownImageHostUrl = (url: URL): URL => {
  const hostname = url.hostname.toLowerCase()
  const isWikiFamilyHost =
    hostname === 'commons.wikimedia.org' ||
    hostname.endsWith('.wikimedia.org') ||
    hostname.endsWith('.wikipedia.org')

  if (!isWikiFamilyHost) {
    return url
  }

  const decodedPathname = decodeURIComponent(url.pathname)
  const filePathMatch = decodedPathname.match(/^\/wiki\/Special:FilePath\/(.+)$/i)
  const filePageMatch = decodedPathname.match(/^\/wiki\/File:(.+)$/i)
  const fileTitle = (filePathMatch?.[1] ?? filePageMatch?.[1] ?? '').trim()

  if (!fileTitle) {
    return url
  }

  const normalizedTitle = encodeURIComponent(fileTitle.replace(/\s+/g, '_')).replace(/%2F/gi, '/')
  return new URL(`/wiki/Special:FilePath/${normalizedTitle}`, url.origin)
}

const collectSearchLikeParams = (url: URL): URLSearchParams[] => {
  const params = [url.searchParams]
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash

  if (!hash) {
    return params
  }

  const hashQuery = hash.startsWith('?') ? hash.slice(1) : hash
  if (/[=&]/.test(hashQuery)) {
    params.push(new URLSearchParams(hashQuery))
  }

  return params
}

const collectNestedCandidates = (url: URL): string[] => {
  const prioritized: string[] = []
  const fallback: string[] = []
  const seen = new Set<string>()
  const pushCandidates = (bucket: string[], value: string) => {
    for (const candidate of buildParamCandidates(value)) {
      if (seen.size >= MAX_CANDIDATE_COUNT) {
        return
      }

      if (seen.has(candidate)) {
        continue
      }

      seen.add(candidate)
      bucket.push(candidate)
    }
  }

  for (const params of collectSearchLikeParams(url)) {
    for (const [rawKey, rawValue] of params.entries()) {
      const key = rawKey.toLowerCase()
      if (WRAPPER_PARAM_KEY_SET.has(key)) {
        pushCandidates(prioritized, rawValue)
        continue
      }

      if (EMBEDDED_URL_PATTERN.test(rawValue) || IMAGE_EXTENSION_PATTERN.test(rawValue)) {
        pushCandidates(fallback, rawValue)
      }
    }
  }

  extractInlineUrlCandidates(url.hash).forEach((candidate) => {
    pushCandidates(fallback, candidate)
  })
  extractInlineUrlCandidates(url.pathname).forEach((candidate) => {
    pushCandidates(fallback, candidate)
  })

  return [...prioritized, ...fallback]
}

const resolveImageUrl = (
  candidate: string,
  depth: number,
  visited: Set<string>,
): { url: URL | null; extractedFromWrapper: boolean } => {
  if (depth > MAX_URL_EXTRACTION_DEPTH) {
    return { url: null, extractedFromWrapper: false }
  }

  const parsedUrl = parseHttpUrl(candidate)
  if (!parsedUrl) {
    return { url: null, extractedFromWrapper: false }
  }

  const canonicalUrl = parsedUrl.toString()
  if (visited.has(canonicalUrl)) {
    return { url: parsedUrl, extractedFromWrapper: false }
  }

  visited.add(canonicalUrl)

  for (const nestedCandidate of collectNestedCandidates(parsedUrl)) {
    const resolvedCandidate = resolveImageUrl(nestedCandidate, depth + 1, visited)
    if (!resolvedCandidate.url) {
      continue
    }

    const nestedUrl = resolvedCandidate.url
    if (nestedUrl.toString() === canonicalUrl) {
      continue
    }

    const hostChanged = nestedUrl.hostname !== parsedUrl.hostname
    if (hostChanged || looksLikeImageUrl(nestedUrl) || resolvedCandidate.extractedFromWrapper) {
      return { url: nestedUrl, extractedFromWrapper: true }
    }
  }

  return { url: parsedUrl, extractedFromWrapper: false }
}

const buildInputCandidates = (value: string): string[] => {
  const candidates = new Set<string>()
  const pushCandidate = (candidate: string) => {
    if (candidates.size >= MAX_CANDIDATE_COUNT) {
      return
    }

    const normalizedCandidate = normalizeCandidateToken(candidate)
    if (normalizedCandidate) {
      candidates.add(normalizedCandidate)
    }
  }

  pushCandidate(value)
  extractInlineUrlCandidates(value).forEach(pushCandidate)

  for (const candidate of Array.from(candidates)) {
    buildParamCandidates(candidate).forEach(pushCandidate)
  }

  return Array.from(candidates)
}

export interface PreparedImageUrl {
  normalizedUrl: string | null
  validation: ValidationResult
  extractedFromWrapper: boolean
}

export const prepareImageUrl = (rawInput: string): PreparedImageUrl => {
  const cleanedInput = sanitizeInputValue(rawInput)
  if (!cleanedInput) {
    return {
      normalizedUrl: null,
      validation: createValidationError('invalid_url'),
      extractedFromWrapper: false,
    }
  }

  let fallback: { url: URL; extractedFromWrapper: boolean } | null = null
  for (const candidate of buildInputCandidates(cleanedInput)) {
    const resolved = resolveImageUrl(candidate, 0, new Set<string>())
    if (!resolved.url) {
      continue
    }

    const normalizedResolvedUrl = normalizeKnownImageHostUrl(resolved.url)
    const extractedFromWrapper =
      resolved.extractedFromWrapper ||
      candidate !== cleanedInput ||
      normalizedResolvedUrl.toString() !== resolved.url.toString()

    if (looksLikeImageUrl(normalizedResolvedUrl)) {
      return {
        normalizedUrl: normalizedResolvedUrl.toString(),
        validation: { ok: true },
        extractedFromWrapper,
      }
    }

    if (!fallback) {
      fallback = {
        url: normalizedResolvedUrl,
        extractedFromWrapper,
      }
    }
  }

  if (!fallback) {
    return {
      normalizedUrl: null,
      validation: createValidationError('invalid_url'),
      extractedFromWrapper: false,
    }
  }

  return {
    normalizedUrl: fallback.url.toString(),
    validation: { ok: true },
    extractedFromWrapper: fallback.extractedFromWrapper,
  }
}

export const validateFile = (file: File): ValidationResult => {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return createValidationError('invalid_type')
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return createValidationError('file_too_large')
  }

  return { ok: true }
}

export const validateImageUrl = (url: string): ValidationResult => {
  return prepareImageUrl(url).validation
}
