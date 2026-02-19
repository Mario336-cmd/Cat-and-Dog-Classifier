export type HeroAnimalType = 'cat' | 'dog'

export interface HeroCycleState {
  catQueue: string[]
  dogQueue: string[]
  catNextIndex: number
  dogNextIndex: number
  currentType: HeroAnimalType | null
  currentImage: string
}

const catImageModules = import.meta.glob('../../Cat and Dog Images/Cats/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const dogImageModules = import.meta.glob('../../Cat and Dog Images/Dogs/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const getSortedImageUrls = (modules: Record<string, string>): string[] =>
  Object.entries(modules)
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([, imageUrl]) => imageUrl)

const getRandomIndex = (maxExclusive: number): number => {
  if (maxExclusive <= 0) {
    return 0
  }

  if (globalThis.crypto?.getRandomValues) {
    const randomBuffer = new Uint32Array(1)
    globalThis.crypto.getRandomValues(randomBuffer)
    return randomBuffer[0] % maxExclusive
  }

  return Math.floor(Math.random() * maxExclusive)
}

const shuffleImages = (images: string[]): string[] => {
  const next = [...images]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1)
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

const takeNextImage = (
  queue: string[],
  nextIndex: number,
): { image: string; nextIndex: number } => {
  if (queue.length === 0) {
    return {
      image: '',
      nextIndex: 0,
    }
  }

  const image = queue[nextIndex % queue.length]
  const incrementedIndex = (nextIndex + 1) % queue.length

  return {
    image,
    nextIndex: incrementedIndex,
  }
}

export const createInitialHeroCycleState = (): HeroCycleState => {
  const catQueue = shuffleImages(getSortedImageUrls(catImageModules))
  const dogQueue = shuffleImages(getSortedImageUrls(dogImageModules))

  const startType: HeroAnimalType = getRandomIndex(2) === 0 ? 'cat' : 'dog'
  const preferredQueue = startType === 'cat' ? catQueue : dogQueue
  const fallbackQueue = startType === 'cat' ? dogQueue : catQueue
  const preferredPick = takeNextImage(preferredQueue, 0)

  if (preferredPick.image) {
    return {
      catQueue,
      dogQueue,
      catNextIndex: startType === 'cat' ? preferredPick.nextIndex : 0,
      dogNextIndex: startType === 'dog' ? preferredPick.nextIndex : 0,
      currentType: startType,
      currentImage: preferredPick.image,
    }
  }

  const fallbackPick = takeNextImage(fallbackQueue, 0)
  const fallbackType: HeroAnimalType = startType === 'cat' ? 'dog' : 'cat'

  return {
    catQueue,
    dogQueue,
    catNextIndex: fallbackType === 'cat' ? fallbackPick.nextIndex : 0,
    dogNextIndex: fallbackType === 'dog' ? fallbackPick.nextIndex : 0,
    currentType: fallbackPick.image ? fallbackType : null,
    currentImage: fallbackPick.image,
  }
}

export const advanceHeroCycle = (previous: HeroCycleState): HeroCycleState => {
  if (!previous.currentType) {
    return previous
  }

  const nextType: HeroAnimalType = previous.currentType === 'cat' ? 'dog' : 'cat'
  const nextQueue = nextType === 'cat' ? previous.catQueue : previous.dogQueue
  const nextIndex = nextType === 'cat' ? previous.catNextIndex : previous.dogNextIndex
  const nextPick = takeNextImage(nextQueue, nextIndex)

  if (nextPick.image) {
    return {
      ...previous,
      currentType: nextType,
      currentImage: nextPick.image,
      catNextIndex: nextType === 'cat' ? nextPick.nextIndex : previous.catNextIndex,
      dogNextIndex: nextType === 'dog' ? nextPick.nextIndex : previous.dogNextIndex,
    }
  }

  const fallbackType: HeroAnimalType = previous.currentType
  const fallbackQueue = fallbackType === 'cat' ? previous.catQueue : previous.dogQueue
  const fallbackIndex = fallbackType === 'cat' ? previous.catNextIndex : previous.dogNextIndex
  const fallbackPick = takeNextImage(fallbackQueue, fallbackIndex)

  if (!fallbackPick.image) {
    return previous
  }

  return {
    ...previous,
    currentType: fallbackType,
    currentImage: fallbackPick.image,
    catNextIndex: fallbackType === 'cat' ? fallbackPick.nextIndex : previous.catNextIndex,
    dogNextIndex: fallbackType === 'dog' ? fallbackPick.nextIndex : previous.dogNextIndex,
  }
}
