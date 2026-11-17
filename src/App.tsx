import { useEffect, useMemo, useRef, useState } from 'react'
import { people } from './data'
import { api } from './api'
import { loadPhotos, resetPhotos, savePhotos } from './storage'
import type { MatchStatus, Person, Photo, View } from './types'
import './App.css'

const maxUploadBytes = 3 * 1024 * 1024

function PhotoArt({ photo }: { photo: Photo }) {
  if (photo.imageUrl) return <img className="photo-image" src={photo.imageUrl} alt={photo.title} />

  return <div className="photo-art" style={{ backgroundColor: photo.color }} aria-label={`${photo.title} illustration`}>
    <span className="art-sun" />
    <span className="art-hill art-hill-one" />
    <span className="art-hill art-hill-two" />
    <span className="art-person art-person-one" />
    <span className="art-person art-person-two" />
  </div>
}

function PersonAvatar({ person, small = false }: { person: Person; small?: boolean }) {
  return <span className={small ? 'avatar avatar-small' : 'avatar'} style={{ backgroundColor: person.color }}>{person.initials}</span>
}

function App() {
  const [view, setView] = useState<View>('library')
  const [photos, setPhotos] = useState<Photo[]>(loadPhotos)
  const [selectedPersonId, setSelectedPersonId] = useState('jamie')
  const [libraryPersonId, setLibraryPersonId] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting')
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const fileInput = useRef<HTMLInputElement>(null)

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? people[0]
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? null
  const findMatches = photos.filter((photo) => getMatchStatus(photo, selectedPerson.id) === 'confirmed')
  const reviewMatches = photos.filter((photo) => getMatchStatus(photo, selectedPerson.id) === 'review')
  const visibleLibraryPhotos = useMemo(() => photos.filter((photo) => {
    const titleMatches = photo.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
    const personMatches = libraryPersonId === 'all' || getMatchStatus(photo, libraryPersonId) === 'confirmed'
    return titleMatches && personMatches
  }), [photos, searchTerm, libraryPersonId])

  useEffect(() => {
    if (!savePhotos(photos)) {
      const timeout = window.setTimeout(() => setToast('Your browser storage is full; recent changes may not persist.'), 0)
      return () => window.clearTimeout(timeout)
    }
  }, [photos])

  useEffect(() => {
    let cancelled = false
    api.listPhotos()
      .then((serverPhotos) => {
        if (!cancelled) {
          setPhotos(serverPhotos)
          setBackendStatus('connected')
        }
      })
      .catch(() => { if (!cancelled) setBackendStatus('offline') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.getConsent(selectedPersonId)
      .then((consent) => { if (!cancelled) setConsents((current) => ({ ...current, [consent.personId]: consent.approved })) })
      .catch(() => { if (!cancelled) setBackendStatus('offline') })
    return () => { cancelled = true }
  }, [selectedPersonId])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3400)
    return () => window.clearTimeout(timeout)
  }, [toast])

  function navigate(nextView: View) {
    setView(nextView)
    setSelectedPhotoId(null)
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setToast('Please choose an image file.')
      return
    }
    if (file.size > maxUploadBytes) {
      setToast('Choose an image smaller than 3 MB for this browser-only demo.')
      return
    }

    const imageUrl = await readFileAsDataUrl(file)
    const newPhoto: Photo = {
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, '') || 'Untitled photo',
      date: 'Just now',
      color: '#91a9cf',
      imageUrl,
      matches: [],
    }
    setPhotos((currentPhotos) => [newPhoto, ...currentPhotos])
    setSelectedPhotoId(newPhoto.id)
    try {
      await api.createPhoto(newPhoto)
      setBackendStatus('connected')
      setToast('Photo saved to your local Luma database.')
    } catch {
      setBackendStatus('offline')
      setToast('Photo added in browser-only mode. Start the API to save it to SQLite.')
    }
  }

  function reviewMatch(photoId: string, status: MatchStatus) {
    if (!consents[selectedPerson.id]) {
      setToast(`${selectedPerson.name} must consent before review decisions are saved.`)
      return
    }
    setPhotos((currentPhotos) => currentPhotos.map((photo) => {
      if (photo.id !== photoId) return photo
      return {
        ...photo,
        matches: photo.matches.map((match) => match.personId === selectedPerson.id ? { ...match, status } : match),
      }
    }))
    void api.updateMatch(photoId, selectedPerson.id, status).then(() => setBackendStatus('connected')).catch(() => { setBackendStatus('offline'); setToast('Review saved only in this browser. Start the API to save it to SQLite.') })
    setToast(status === 'confirmed' ? `Added to ${selectedPerson.name}'s photos.` : status === 'rejected' ? 'Removed from this person’s photos.' : 'Kept in the review queue.')
  }

  async function changeConsent(approved: boolean) {
    try {
      const consent = await api.updateConsent(selectedPerson.id, approved)
      setConsents((current) => ({ ...current, [consent.personId]: consent.approved }))
      setBackendStatus('connected')
      setToast(approved ? `${selectedPerson.name}'s consent was recorded.` : `${selectedPerson.name}'s consent was withdrawn.`)
    } catch {
      setBackendStatus('offline')
      setToast('Start the local API to record consent.')
    }
  }

  async function resetLocalData() {
    if (!window.confirm('Reset all locally saved photos and review decisions? This cannot be undone.')) return
    try {
      await api.resetPhotos()
      setPhotos(await api.listPhotos())
      setBackendStatus('connected')
    } catch {
      setPhotos(resetPhotos())
      setBackendStatus('offline')
    }
    setSelectedPhotoId(null)
    setToast('Local Luma data was reset.')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => navigate('library')} aria-label="Open Luma library"><span className="brand-mark">◌</span> Luma</button>
      <nav className="main-nav" aria-label="Main navigation">
        <NavButton active={view === 'library'} icon="▦" label="Library" onClick={() => navigate('library')} />
        <NavButton active={view === 'find'} icon="⌕" label="Find my photos" onClick={() => navigate('find')} />
        <NavButton active={view === 'people'} icon="◉" label="People" onClick={() => navigate('people')} />
      </nav>
      <div className="sidebar-bottom">
        <NavButton active={view === 'privacy'} icon="⌁" label="Privacy & data" onClick={() => navigate('privacy')} />
        <p className="local-note">Local MVP<br />Nothing leaves this browser.</p>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <label className="global-search"><span>⌕</span><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); if (view !== 'library') navigate('library') }} placeholder="Search your library" /></label>
        <input ref={fileInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => { void handleUpload(event.target.files?.[0]); event.target.value = '' }} />
        <span className={backendStatus === 'connected' ? 'connection-status online' : 'connection-status'}>{backendStatus === 'connected' ? 'API connected' : backendStatus === 'connecting' ? 'Connecting…' : 'Offline mode'}</span>
        <button className="primary-button" type="button" onClick={() => fileInput.current?.click()}>+ Upload photos</button>
      </header>

      <section className="workspace">
        {view === 'library' && <LibraryView photos={visibleLibraryPhotos} totalPhotos={photos.length} selectedPhotoId={selectedPhotoId} selectedPersonId={libraryPersonId} searchTerm={searchTerm} onSelectPhoto={setSelectedPhotoId} onSelectPerson={setLibraryPersonId} />}
        {view === 'find' && <FindView person={selectedPerson} consented={Boolean(consents[selectedPerson.id])} findMatches={findMatches} reviewMatches={reviewMatches} onSelectPerson={setSelectedPersonId} onReview={reviewMatch} onConsentChange={(approved) => { void changeConsent(approved) }} />}
        {view === 'people' && <PeopleView photos={photos} onChoosePerson={(personId) => { setSelectedPersonId(personId); navigate('find') }} />}
        {view === 'privacy' && <PrivacyView photoCount={photos.length} backendStatus={backendStatus} onReset={() => { void resetLocalData() }} />}
      </section>
    </main>

    {selectedPhoto && <PhotoDetails photo={selectedPhoto} onClose={() => setSelectedPhotoId(null)} />}
    {toast && <p className="toast" role="status">{toast}</p>}
  </div>
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-button nav-active' : 'nav-button'} type="button" onClick={onClick}><span>{icon}</span>{label}</button>
}

function LibraryView({ photos, totalPhotos, selectedPhotoId, selectedPersonId, searchTerm, onSelectPhoto, onSelectPerson }: { photos: Photo[]; totalPhotos: number; selectedPhotoId: string | null; selectedPersonId: string; searchTerm: string; onSelectPhoto: (id: string) => void; onSelectPerson: (id: string) => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">PERSONAL LIBRARY</p><h1>{selectedPersonId === 'all' ? 'All photos' : `${personName(selectedPersonId)}’s photos`}</h1><p>Search, browse, and manage your local photo collection.</p></div><span className="count-badge">{photos.length} of {totalPhotos}</span></div>
    <div className="filter-row"><span className="filter-label">Show</span><button className={selectedPersonId === 'all' ? 'filter-pill active' : 'filter-pill'} onClick={() => onSelectPerson('all')} type="button">Everyone</button>{people.map((person) => <button className={selectedPersonId === person.id ? 'filter-pill active' : 'filter-pill'} onClick={() => onSelectPerson(person.id)} key={person.id} type="button">{person.name}</button>)}</div>
    {photos.length ? <div className="photo-grid">{photos.map((photo) => <PhotoCard photo={photo} key={photo.id} selected={photo.id === selectedPhotoId} onClick={() => onSelectPhoto(photo.id)} />)}</div> : <EmptyState title="No photos found" text={searchTerm ? `Nothing matches “${searchTerm}”. Try another search.` : 'Upload a photo to start your local library.'} />}
  </>
}

function FindView({ person, consented, findMatches, reviewMatches, onSelectPerson, onReview, onConsentChange }: { person: Person; consented: boolean; findMatches: Photo[]; reviewMatches: Photo[]; onSelectPerson: (personId: string) => void; onReview: (photoId: string, status: MatchStatus) => void; onConsentChange: (approved: boolean) => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">FIND MY PHOTOS</p><h1>Photos of {person.name}</h1><p>Confirmed matches are separate from uncertain candidates, so you stay in control.</p></div><PersonAvatar person={person} /></div>
    <div className="person-picker" aria-label="Choose a person">{people.map((item) => <button className={item.id === person.id ? 'person-option selected-person' : 'person-option'} type="button" key={item.id} onClick={() => onSelectPerson(item.id)}><PersonAvatar person={item} small /><span>{item.name}</span></button>)}</div>
    {!consented && <section className="consent-card"><span>⌁</span><div><p className="eyebrow">CONSENT REQUIRED</p><h2>Enable {person.name}’s demo results?</h2><p>This local MVP uses sample labels only. A real product must record clear approval before biometric processing or face search.</p><button className="primary-button small-button" type="button" onClick={() => onConsentChange(true)}>I consent to demo matching</button></div></section>}
    <section className="match-summary"><div><span className="summary-number">{findMatches.length}</span><span>confirmed photos</span></div><div><span className="summary-number">{reviewMatches.length}</span><span>needs review</span></div><p>Matching is simulated in this local MVP. No face recognition runs on your images.</p></section>
    <h2 className="section-title">Confirmed photos</h2>
    {findMatches.length ? <div className="photo-grid">{findMatches.map((photo) => <PhotoCard photo={photo} key={photo.id} onClick={() => undefined} />)}</div> : <EmptyState title="No confirmed matches yet" text="Review possible matches or add tagged photos later." />}
    <h2 className="section-title review-title">Needs your review</h2>
    {reviewMatches.length ? <div className="review-grid">{reviewMatches.map((photo) => <article className="review-card" key={photo.id}><div className="review-art"><PhotoArt photo={photo} /><span className="face-box" /></div><div className="review-copy"><p className="eyebrow">POSSIBLE MATCH · {Math.round(getConfidence(photo, person.id) * 100)}%</p><h3>Is this {person.name}?</h3><p>Confirming adds it to this person’s results. Rejecting removes the suggestion.</p><div className="review-actions"><button className="primary-button small-button" type="button" disabled={!consented} onClick={() => onReview(photo.id, 'confirmed')}>Yes, it’s me</button><button className="secondary-button" type="button" disabled={!consented} onClick={() => onReview(photo.id, 'rejected')}>Not me</button><button className="text-button" type="button" disabled={!consented} onClick={() => onReview(photo.id, 'review')}>Not sure</button></div></div></article>)}</div> : <EmptyState title="You’re all caught up" text="There are no uncertain candidates for this person." />}
    {consented && <button className="withdraw-button" type="button" onClick={() => onConsentChange(false)}>Withdraw {person.name}’s consent</button>}
  </>
}

function PeopleView({ photos, onChoosePerson }: { photos: Photo[]; onChoosePerson: (personId: string) => void }) {
  return <><div className="page-heading"><div><p className="eyebrow">PEOPLE</p><h1>People in your library</h1><p>Open a person to see confirmed photos and review possible matches.</p></div></div><div className="people-grid">{people.map((person) => { const confirmed = photos.filter((photo) => getMatchStatus(photo, person.id) === 'confirmed').length; const review = photos.filter((photo) => getMatchStatus(photo, person.id) === 'review').length; return <button type="button" className="person-card" key={person.id} onClick={() => onChoosePerson(person.id)}><PersonAvatar person={person} /><strong>{person.name}</strong><span>{confirmed} confirmed · {review} review</span><small>Open photos →</small></button> })}</div></>
}

function PrivacyView({ photoCount, backendStatus, onReset }: { photoCount: number; backendStatus: 'connecting' | 'connected' | 'offline'; onReset: () => void }) {
  const storageDescription = backendStatus === 'connected' ? `${photoCount} photos and review decisions are stored in your local Luma SQLite database, with a browser backup for offline use.` : `${photoCount} photos and review decisions are stored in this browser until the local API is running.`
  return <><div className="page-heading"><div><p className="eyebrow">PRIVACY & DATA</p><h1>You stay in control</h1><p>This learning build is local-only: it does not send images to an external service.</p></div></div><div className="privacy-grid"><article className="privacy-card"><span>◎</span><h2>{backendStatus === 'connected' ? 'Local database' : 'Offline storage'}</h2><p>{storageDescription}</p></article><article className="privacy-card"><span>◌</span><h2>No face model</h2><p>Current match labels are sample data. Uploaded image pixels are not processed by an AI model.</p></article><article className="privacy-card danger-card"><span>⌫</span><h2>Reset local data</h2><p>Erase uploaded images, demo decisions, and library changes from this browser and local database.</p><button className="danger-button" type="button" onClick={onReset}>Reset all local data</button></article></div></>
}

function PhotoCard({ photo, selected, onClick }: { photo: Photo; selected?: boolean; onClick: () => void }) {
  const confirmedPeople = photo.matches.filter((match) => match.status === 'confirmed').map((match) => personName(match.personId))
  return <button className={selected ? 'photo-card selected-photo' : 'photo-card'} type="button" onClick={onClick}><PhotoArt photo={photo} /><div className="photo-meta"><div><strong>{photo.title}</strong><small>{photo.date}</small></div><span className="photo-count">{confirmedPeople.length || '—'}</span></div><p className="photo-people">{confirmedPeople.length ? confirmedPeople.join(', ') : 'Unsorted'}</p></button>
}

function PhotoDetails({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const peopleInPhoto = photo.matches.filter((match) => match.status === 'confirmed').map((match) => personName(match.personId))
  return <aside className="details-panel" aria-label="Photo details"><button className="close-button" type="button" onClick={onClose}>×</button><PhotoArt photo={photo} /><div className="details-content"><p className="eyebrow">PHOTO DETAILS</p><h2>{photo.title}</h2><p className="details-date">{photo.date}</p><h3>People</h3><p>{peopleInPhoto.length ? peopleInPhoto.join(', ') : 'No confirmed people yet'}</p><p className="details-note">Photo matching is simulated in this local demo.</p></div></aside>
}

function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>◌</span><h2>{title}</h2><p>{text}</p></div> }

function getMatchStatus(photo: Photo, personId: string) { return photo.matches.find((match) => match.personId === personId)?.status }
function getConfidence(photo: Photo, personId: string) { return photo.matches.find((match) => match.personId === personId)?.confidence ?? 0 }
function personName(personId: string) { return people.find((person) => person.id === personId)?.name ?? 'Unknown' }

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

export default App
