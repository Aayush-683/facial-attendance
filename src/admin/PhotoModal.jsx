import { useEffect } from 'react'

export default function PhotoModal({ photo, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!photo) return null
  return (
    <div className="modal" onClick={onClose}>
      <figure className="modal-body" onClick={e => e.stopPropagation()}>
        <img src={photo.url} alt={photo.caption} />
        <figcaption>{photo.caption}</figcaption>
        <button className="btn" onClick={onClose}>Close</button>
      </figure>
    </div>
  )
}
