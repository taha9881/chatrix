import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './UploadZone.module.css'

export default function UploadZone() {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const inputRef                  = useRef(null)
  const navigate                  = useNavigate()

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!f.name.endsWith('.zip')) {
      setError('⚠️ Please upload a .zip file exported from WhatsApp.')
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }, [])

  const onDrop     = useCallback((e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0])
  }, [handleFile])
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onInput     = (e) => handleFile(e.target.files[0])
  const reset       = () => { setFile(null); setError(null) }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      localStorage.setItem('chatrix_analytics', JSON.stringify(data))
      navigate('/dashboard')
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className={styles.section} id="upload">
      <div className={styles.inner}>
        <div className={styles.sectionLabel}>STEP 3 — UPLOAD</div>
        <h2 className={styles.heading}>
          Drop your ZIP.{' '}
          <span className={styles.hl}>Watch the magic.</span>
        </h2>
        <p className={styles.sub}>
          Your file never leaves your machine — processed 100% locally.
        </p>

        <div
          className={`${styles.dropZone} ${dragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !file && inputRef.current.click()}
        >
          <div className={styles.dzGlow} />
          <div className={styles.dzContent}>
            {file ? (
              <>
                <div className={styles.fileIcon}>📦</div>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</div>
                <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); reset() }}>
                  ✕ Remove
                </button>
              </>
            ) : (
              <>
                <div className={styles.dzIcon}><span className={styles.dzEmoji}>🗜️</span></div>
                <div className={styles.dzTitle}>Drag &amp; drop your WhatsApp ZIP here</div>
                <div className={styles.dzOr}>— or —</div>
                <div className={styles.dzBrowse}>Click to browse files</div>
                <div className={styles.dzHint}>Accepts .zip files only</div>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={onInput} />
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button
          className={`${styles.uploadBtn} ${!file ? styles.uploadBtnDisabled : ''} ${uploading ? styles.uploading : ''}`}
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          <span className={styles.btnInner}>
            {uploading ? (
              <><span className={styles.spinner} />Analyzing your chat...</>
            ) : (
              <>⚡ Analyze with Chatrix AI</>
            )}
          </span>
          <div className={styles.btnGlow} />
        </button>

        <div className={styles.privacyNote}>
          <span className={styles.lockIcon}>🔐</span>
          <span>
            <strong>Open Source &amp; Privacy First</strong> — No data is sent to any server.
            Your chats are processed entirely on your local machine.
            <a href="https://github.com" target="_blank" rel="noreferrer" className={styles.ghLink}>
              View on GitHub ↗
            </a>
          </span>
        </div>
      </div>
    </section>
  )
}
