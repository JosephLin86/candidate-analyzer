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
  const [manualGithub, setManualGithub] = useState('')
  const [showGithubInput, setShowGithubInput] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') {
      setFile(dropped)
      setShowGithubInput(false)
      setManualGithub('')
    }
  }

  const handleFileChange = (f: File) => {
    setFile(f)
    setShowGithubInput(false)
    setManualGithub('')
    setError('')
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Please upload a resume PDF'); return }
    if (showGithubInput && !manualGithub.trim()) {
      setError("Please enter the candidate's GitHub URL")
      return
    }
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      if (jobPosting) formData.append('jobPosting', jobPosting)
      if (manualGithub.trim()) formData.append('manualGithub', manualGithub.trim())

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/analyze`,
        formData
      )

      console.log('SUCCESS DATA:', data)

      if (data?.code === 'NO_GITHUB_FOUND' || data?.error?.includes?.('GitHub')) {
        setShowGithubInput(true)
        setError('')
        return
      }
      onResult(data)
    } catch (err: any) {
      console.log('FULL ERROR:', err)
      console.log('RESPONSE DATA:', err?.response?.data)

      const code = err?.response?.data?.code
      const detail = err?.response?.data?.details || ''
      const errorMsg = err?.response?.data?.error || ''

      if (
        code === 'NO_GITHUB_FOUND' ||
        detail.includes('No GitHub') ||
        errorMsg.includes('No GitHub')
      ) {
        setShowGithubInput(true)
        setError('')
      } else {
        setError('Analysis failed. Make sure the backend is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="grain" />

      <header style={{ padding: '22px 48px', display: 'flex', alignItems: 'center',
        gap: '12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 32, height: 32, background: 'var(--brown-700)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cream)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: 'var(--brown-800)' }}>
          Candidate Analyzer
        </span>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>

        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
            padding: '6px 14px', borderRadius: 99, background: 'var(--brown-50)',
            border: '1px solid var(--brown-200)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brown-600)"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--brown-700)' }}>
              GitHub-verified candidate intelligence
            </span>
          </div>

          <h1 style={{ fontSize: 46, fontWeight: 700, color: 'var(--brown-900)',
            lineHeight: 1.1, marginBottom: 18 }}>
            Screen engineering candidates<br />
            <span style={{ color: 'var(--brown-500)' }}>with evidence, not guesswork.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 520,
            margin: '0 auto', lineHeight: 1.65 }}>
            Built for CS recruiters. Upload a resume and get a verified breakdown
            of the candidate's real engineering ability — pulled directly from their GitHub.
          </p>
        </div>

        <div className="fade-up-2" style={{ width: '100%', maxWidth: 640 }}>

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${dragging ? 'var(--brown-500)' : file ? 'var(--brown-400)' : 'var(--border)'}`,
              borderRadius: 16, padding: '36px 32px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--brown-50)' : file ? '#FFF9F0' : 'var(--bg-card)',
              transition: 'all 0.2s ease', marginBottom: 14 }}>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
            {file ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <p style={{ fontWeight: 500, color: 'var(--brown-700)', marginBottom: 4 }}>{file.name}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to change</p>
              </>
            ) : (
              <>
                <div style={{ width: 44, height: 44, background: 'var(--brown-100)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brown-600)"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Drop candidate resume PDF here
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</p>
              </>
            )}
          </div>

          {/* GitHub fallback input */}
          {showGithubInput && (
            <div style={{ marginBottom: 14, padding: '16px 18px', borderRadius: 12,
              background: '#FFF9F0', border: '1.5px solid var(--brown-300)',
              animation: 'fadeUp 0.3s ease forwards' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brown-600)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown-700)' }}>
                  No GitHub link found on this resume
                </p>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Please enter the candidate's GitHub profile URL to continue.
                GitHub verification is required for analysis.
              </p>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase',
                letterSpacing: '0.06em' }}>
                GitHub profile URL <span style={{ color: '#C0392B' }}>required</span>
              </label>
              <input
                type="text"
                value={manualGithub}
                onChange={(e) => setManualGithub(e.target.value)}
                placeholder="github.com/username"
                autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'var(--bg-card)',
                  fontSize: 14, color: 'var(--text-primary)', outline: 'none',
                  fontFamily: 'DM Mono, monospace', transition: 'border-color 0.2s',
                  boxSizing: 'border-box' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brown-400)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          )}

          {/* Job posting */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.06em',
              textTransform: 'uppercase' }}>
              Job posting{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400,
                textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                — optional, enables skill alignment scoring
              </span>
            </label>
            <textarea
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              placeholder="Paste the job description here..."
              rows={4}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12,
                border: '1.5px solid var(--border)', background: 'var(--bg-card)',
                fontSize: 14, color: 'var(--text-primary)', resize: 'vertical',
                outline: 'none', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6,
                transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brown-400)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              background: loading ? 'var(--brown-400)' : 'var(--brown-700)',
              color: 'var(--cream)', fontSize: 16, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.2s, transform 0.1s', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brown-800)' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brown-700)' }}
            onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}>
            {loading ? (
              <>
                <span className="spinner" />
                Analyzing candidate...
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Analyze candidate
              </>
            )}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 22, flexWrap: 'wrap' }}>
            {['GitHub verified', 'Engineering level detection', 'Resume cross-reference'].map(label => (
              <span key={label} style={{ fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="var(--brown-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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