import { samplePhotos } from './data'
import type { Photo } from './types'

const storageKey = 'luma-local-photos-v1'

export function loadPhotos(): Photo[] {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) as Photo[] : samplePhotos
  } catch {
    return samplePhotos
  }
}

export function savePhotos(photos: Photo[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(photos))
    return true
  } catch {
    return false
  }
}

export function resetPhotos(): Photo[] {
  localStorage.removeItem(storageKey)
  return samplePhotos
}
