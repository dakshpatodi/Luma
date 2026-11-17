import type { Person, Photo } from './types'

export const people: Person[] = [
  { id: 'jamie', name: 'Jamie', initials: 'JD', color: '#d17661' },
  { id: 'priya', name: 'Priya', initials: 'PS', color: '#9074be' },
  { id: 'alex', name: 'Alex', initials: 'AK', color: '#518b85' },
]

export const samplePhotos: Photo[] = [
  { id: 'market', title: 'Sunday market', date: 'Sep 22', color: '#d58a62', matches: [{ personId: 'jamie', confidence: 0.98, status: 'confirmed' }, { personId: 'priya', confidence: 0.96, status: 'confirmed' }] },
  { id: 'dinner', title: 'Rooftop dinner', date: 'Sep 18', color: '#6f968e', matches: [{ personId: 'jamie', confidence: 0.97, status: 'confirmed' }, { personId: 'alex', confidence: 0.95, status: 'confirmed' }] },
  { id: 'trail', title: 'Hill trail', date: 'Sep 15', color: '#7198b8', matches: [{ personId: 'priya', confidence: 0.96, status: 'confirmed' }] },
  { id: 'meetup', title: 'Design meetup', date: 'Sep 12', color: '#917aa5', matches: [{ personId: 'jamie', confidence: 0.84, status: 'review' }, { personId: 'alex', confidence: 0.93, status: 'confirmed' }] },
  { id: 'coffee', title: 'Coffee walk', date: 'Sep 2', color: '#a87558', matches: [{ personId: 'alex', confidence: 0.91, status: 'confirmed' }] },
  { id: 'picnic', title: 'Park picnic', date: 'Aug 28', color: '#81a96e', matches: [{ personId: 'jamie', confidence: 0.82, status: 'review' }, { personId: 'priya', confidence: 0.92, status: 'confirmed' }] },
  { id: 'studio', title: 'Studio afternoon', date: 'Aug 21', color: '#bc9e7a', matches: [{ personId: 'jamie', confidence: 0.94, status: 'confirmed' }] },
  { id: 'concert', title: 'Courtyard concert', date: 'Aug 16', color: '#6e779a', matches: [{ personId: 'priya', confidence: 0.81, status: 'review' }] },
]
