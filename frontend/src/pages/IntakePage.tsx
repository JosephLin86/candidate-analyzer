import { useState, useRef, DragEvent } from 'react'
import axios from 'axios'


interface Props {
  onResult: (result: any) => void
  loading: boolean
  setLoading: (v: boolean) => void
}

export default function IntakePage({ onResult, loading, setLoading }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [jobPosting, setJobPosting] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') setFile(dropped)
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Please upload a resume PDF'); return }
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      if (jobPosting) formData.append('jobPosting', jobPosting)
      const { data } = await axios.post('http://localhost:3001/analyze', formData)
      onResult(data)
    } catch {
      setError('Analysis failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="grain" />

      {/* Header */}
      <header style={{
        padding: '24px 48px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--brown-700)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--brown-800)' }}>
          Candidate Analyzer
        </span>
      </header>

      {/* Main */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
      }}>
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: 'var(--brown-900)', lineHeight: 1.1, marginBottom: 16 }}>
            Verify candidates with<br />
            <span style={{ color: 'var(--brown-500)' }}>evidence, not intuition.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Cross-reference resume claims against real GitHub activity.
            See engineering level signals backed by actual code.
          </p>
        </div>

        <div className="fade-up-2" style={{ width: '100%', maxWidth: 620 }}>

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--brown-500)' : file ? 'var(--brown-400)' : 'var(--border)'}`,
              borderRadius: 16,
              padding: '40px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--brown-50)' : file ? '#FFF9F0' : 'var(--bg-card)',
              transition: 'all 0.2s ease',
              marginBottom: 16,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
            {file ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <p style={{ fontWeight: 500, color: 'var(--brown-700)', marginBottom: 4 }}>{file.name}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to change</p>
              </>
            ) : (
              <>
                <div style={{
                  width: 48, height: 48,
                  background: 'var(--brown-100)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brown-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Drop resume PDF here
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</p>
              </>
            )}
          </div>

          {/* Job posting */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 8,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Job Posting <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              placeholder="Paste the job description here to get role-specific skill alignment scores..."
              rows={5}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--bg-card)',
                fontSize: 14,
                color: 'var(--text-primary)',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
                lineHeight: 1.6,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brown-400)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <p style={{ color: '#C0392B', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>{error}</p>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              border: 'none',
              background: loading ? 'var(--brown-400)' : 'var(--brown-700)',
              color: 'var(--cream)',
              fontSize: 16,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'background 0.2s, transform 0.1s',
              fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--brown-800)' }}
            onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--brown-700)' }}
            onMouseDown={(e) => { if (!loading) (e.target as HTMLButtonElement).style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { (e.target as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Analyzing candidate...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Analyze Candidate
              </>
            )}
          </button>

          {/* Trust signals */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap',
          }}>
            {['GitHub verified', 'Evidence-based scoring', 'Engineering level detection'].map(label => (
              <span key={label} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brown-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
