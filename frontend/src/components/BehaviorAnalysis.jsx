import { useState } from 'react'
import { flushSync } from 'react-dom'
import styles from './BehaviorAnalysis.module.css'

const API_BASE = 'http://localhost:8000'
const EVIDENCE_COLORS = {
  Strong: '#ff00cc',
  Moderate: '#b44fff',
  Weak: '#00d4ff',
}

function TraitCard({ trait }) {
  const color = EVIDENCE_COLORS[trait.evidence_level] || '#6666aa'
  return (
    <div className={styles.traitCard} style={{ '--c': color }}>
      <div className={styles.traitHeader}>
        <span className={styles.traitName}>{trait.trait}</span>
        <span className={styles.traitBadge}>{trait.evidence_level}</span>
      </div>
      <div className={styles.confidenceBar}>
        <div className={styles.confidenceFill} style={{ width: `${trait.confidence}%`, background: color }} />
        <span className={styles.confidenceLabel}>{trait.confidence}%</span>
      </div>
      <p className={styles.reasoning}>{trait.reasoning}</p>
    </div>
  )
}

function ParticipantResult({ result }) {
  const [open, setOpen] = useState(true)

  if (result.status === 'insufficient_data' || result.status === 'parse_error') {
    return (
      <div className={styles.resultCard}>
        <div className={styles.resultHeader}>
          <span className={styles.participantName}>{result.participant}</span>
          <span className={styles.statusError}>⚠ {result.status}</span>
        </div>
        <p className={styles.errorText}>{result.error}</p>
      </div>
    )
  }

  const { analysis } = result
  const traits = analysis?.identified_traits || []
  const style  = analysis?.communication_style || {}

  return (
    <div className={styles.resultCard}>
      <button className={styles.resultHeader} onClick={() => setOpen(o => !o)}>
        <div>
          <span className={styles.participantName}>{result.participant}</span>
          <span className={styles.msgCount}>{result.message_count} messages analyzed</span>
        </div>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.resultBody}>
          {analysis?.overall_summary && (
            <p className={styles.summary}>{analysis.overall_summary}</p>
          )}

          {Object.keys(style).length > 0 && (
            <div className={styles.commStyle}>
              <div className={styles.commLabel}>Communication Style</div>
              <div className={styles.commGrid}>
                {Object.entries(style).map(([k, v]) => v && (
                  <div key={k} className={styles.commItem}>
                    <span className={styles.commKey}>{k.replace(/_/g, ' ')}</span>
                    <span className={styles.commVal}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {traits.length > 0 && (
            <div className={styles.traitsGrid}>
              {traits.map(t => <TraitCard key={t.trait} trait={t} />)}
            </div>
          )}

          {analysis?.insufficient_evidence?.length > 0 && (
            <div className={styles.insufficient}>
              <span className={styles.insufficientLabel}>Insufficient evidence for:</span>
              {analysis.insufficient_evidence.map(t => (
                <span key={t} className={styles.insufficientTag}>{t}</span>
              ))}
            </div>
          )}

          {analysis?.risk_flags?.length > 0 && (
            <div className={styles.riskFlags}>
              {analysis.risk_flags.map(f => (
                <span key={f} className={styles.riskTag}>⚠ {f}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Progress panel ─────────────────────────────────────────────────────────

function ProgressPanel({ progress, items }) {
  const pct = progress?.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  return (
    <div className={styles.progressPanel}>
      <div className={styles.progressHeader}>
        <div>
          <div className={styles.progressTitle}>
            {!progress && (
              <><span className={styles.miniSpinner} /> Connecting to Ollama...</>
            )}
            {progress && progress.current && (
              <>Analyzing <span className={styles.progressName}>{progress.current}</span>...</>
            )}
            {progress && !progress.current && progress.total > 0 && (
              <>All {progress.total} participants complete ✓</>
            )}
            {progress && !progress.current && progress.total === 0 && (
              <>Preparing agent runs...</>
            )}
          </div>
          {progress && (
            <div className={styles.progressMeta}>
              {progress.completed} of {progress.total} participants complete
              {progress.model && <> · model: {progress.model}</>}
            </div>
          )}
        </div>
        {progress && (
          <div className={styles.progressPct}>{pct}%</div>
        )}
      </div>

      {progress && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.progressList}>
          {items.map(item => (
            <div
              key={item.name}
              className={[
                styles.progressItem,
                item.status === 'running' ? styles.statusRunning : '',
                item.status === 'done'    ? styles.statusDone    : '',
                item.status === 'error'   ? styles.statusError   : '',
                item.status === 'pending' ? styles.statusPending : '',
              ].join(' ')}
            >
              <span className={styles.progressIcon}>
                {item.status === 'done'    && '✓'}
                {item.status === 'running' && <span className={styles.miniSpinner} />}
                {item.status === 'error'   && '✕'}
                {item.status === 'pending' && '○'}
              </span>
              <span className={styles.progressItemName}>{item.name}</span>
              <span className={styles.progressItemStatus}>
                {item.status === 'running' && 'Agent running...'}
                {item.status === 'done'    && 'Complete'}
                {item.status === 'error'   && 'Failed'}
                {item.status === 'pending' && 'Waiting'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Stream reader ──────────────────────────────────────────────────────────

async function consumeStream(response, onEvent) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // Force a React re-render for every single event so the UI updates live
      flushSync(() => onEvent(JSON.parse(trimmed)))
    }
  }

  if (buffer.trim()) {
    flushSync(() => onEvent(JSON.parse(buffer.trim())))
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export default function BehaviorAnalysis({ sessionId, participants }) {
  const [loading,       setLoading]       = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [results,       setResults]       = useState([])
  const [error,         setError]         = useState(null)
  const [progress,      setProgress]      = useState(null)
  const [progressItems, setProgressItems] = useState([])

  const runAnalysis = async (participant = null) => {
    if (!sessionId) {
      setError('No session found. Please re-upload your chat.')
      return
    }

    // Show the progress panel immediately on click — before the first byte arrives
    setLoading(true)
    setError(null)
    setSelected(participant)
    setResults([])
    setProgress(null)      // null = "connecting" state
    setProgressItems([])

    try {
      const res = await fetch(`${API_BASE}/analyze-behavior/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionId, participant }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }

      let streamError = null

      await consumeStream(res, (event) => {
        switch (event.type) {
          case 'start':
            setProgress({ total: event.total, completed: 0, current: null, model: event.model })
            setProgressItems(event.participants.map(name => ({ name, status: 'pending' })))
            break

          case 'running':
            setProgress(prev => ({ ...prev, current: event.participant, completed: event.index - 1 }))
            setProgressItems(prev =>
              prev.map(item => item.name === event.participant ? { ...item, status: 'running' } : item)
            )
            break

          case 'result':
            setResults(prev => [...prev, event.result])
            setProgress(prev => ({ ...prev, completed: (prev?.completed ?? 0) + 1 }))
            setProgressItems(prev =>
              prev.map(item =>
                item.name === event.result.participant
                  ? { ...item, status: event.result.status === 'success' ? 'done' : 'error' }
                  : item
              )
            )
            break

          case 'done':
            setProgress(prev => ({
              ...prev,
              total: event.participants_analyzed,
              completed: event.participants_analyzed,
              current: null,
            }))
            break

          case 'error':
            streamError = new Error(event.detail)
            break
        }
      })

      if (streamError) throw streamError

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionId) return null

  return (
    <section className={styles.section}>
      <div className={styles.sectionLabel}>AI BEHAVIOR ANALYSIS</div>
      <h2 className={styles.title}>
        Participant <span className={styles.hl}>Trait</span> Insights
      </h2>
      <p className={styles.sub}>
        Powered by Ollama · 50 random messages per person (8+ words) · Runs locally
      </p>

      <div className={styles.controls}>
        <button
          className={styles.analyzeAllBtn}
          onClick={() => runAnalysis(null)}
          disabled={loading}
        >
          {loading && !selected
            ? <><span className={styles.spinner} />Analyzing all participants...</>
            : <>🧠 Analyze All Participants</>
          }
        </button>

        <div className={styles.participantBtns}>
          {participants?.map(p => (
            <button
              key={p.name}
              className={[styles.partBtn, selected === p.name ? styles.partBtnActive : ''].join(' ')}
              onClick={() => runAnalysis(p.name)}
              disabled={loading}
            >
              {loading && selected === p.name ? 'Analyzing...' : p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Always visible while loading — even before first stream event */}
      {loading && <ProgressPanel progress={progress} items={progressItems} />}

      {error && <div className={styles.errorMsg}>⚠ {error}</div>}

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map(r => <ParticipantResult key={r.participant} result={r} />)}
        </div>
      )}
    </section>
  )
}
