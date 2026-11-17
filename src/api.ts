import type { MatchStatus, Photo } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!response.ok) throw new Error(`Request failed with ${response.status}`)
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const api = {
  listPhotos: () => request<Photo[]>('/api/photos'),
  createPhoto: (photo: Photo) => request<Photo>('/api/photos', { method: 'POST', body: JSON.stringify(photo) }),
  updateMatch: (photoId: string, personId: string, status: MatchStatus) => request<Photo>(`/api/photos/${photoId}/matches/${personId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getConsent: (personId: string) => request<{ personId: string; approved: boolean }>(`/api/consent/${personId}`),
  updateConsent: (personId: string, approved: boolean) => request<{ personId: string; approved: boolean }>(`/api/consent/${personId}`, { method: 'PUT', body: JSON.stringify({ approved }) }),
  resetPhotos: () => request<void>('/api/photos', { method: 'DELETE' }),
}
