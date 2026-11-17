export type MatchStatus = 'confirmed' | 'review' | 'rejected'

export type FaceMatch = {
  personId: string
  confidence: number
  status: MatchStatus
}

export type Person = {
  id: string
  name: string
  initials: string
  color: string
}

export type Photo = {
  id: string
  title: string
  date: string
  color: string
  imageUrl?: string
  matches: FaceMatch[]
}

export type View = 'library' | 'find' | 'people' | 'privacy'
