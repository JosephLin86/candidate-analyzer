import { useState } from 'react'

interface Props {
  result: any
  onReset: () => void
}

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  'new-grad': { bg: '#FFF3CD', text: '#856404', border: '#FFE082' },
  'junior':   { bg: '#FDE8D8', text: '#8B3A00', border: '#FFBC8B' },
  'mid':      { bg: '#D4EDDA', text: '#155724', border: '#A8D5B5' },
  'senior':   { bg: '#CCE5FF', text: '#004085', border: '#99CAFF' },
  'staff':    { bg: '#E2D9F3', text: '#4B0082', border: '#C4B0E8' },
}

const evidenceConfig: Record<string, { label: string; bg: string; text: string }> = {
  strong:   { label: 'Strong',   bg: '#D8F3DC', text: '#2D6A4F' },
  moderate: { label: 'Moderate', bg: '#FFF3CD', text: '#A07020' },
  weak:     { label: 'Weak',     bg: '#FFE8D6', text: '#8B4513' },
  none:     { label: 'None',     bg: '#F0F0F0', text: '#6B6B6B' },
}

function ScoreRing({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1)
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--brown-300)" strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, fontWeight: 500, fill: 'var(--cream)' }}>
        {score}
      </text>
    </svg>
  )
}

function MiniScoreBar({ value, max, color = 'var(--brown-500)' }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ height: 6, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function LevelBadge({ level }: { level: string }) {
  const c = levelColors[level] || levelColors['junior']
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      textTransform: 'capitalize', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {level}
    </span>
  )
}

function EvidenceBadge({ evidence }: { evidence: string }) {
  const c = evidenceConfig[evidence] || evidenceConfig['none']
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text, letterSpacing: '0.04em' }}>
      {c.label}
    </span>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--brown-700)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brown-500)', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function inferSignalTags(repo: any): string[] {
  const tags: string[] = []
  const reasons = (repo.depthReasons || []).join(' ').toLowerCase()
  const deps = (repo.breakdown?.dependencyCount || 0)
  if (reasons.includes('full-stack') || (reasons.includes('frontend') && reasons.includes('backend'))) tags.push('Full-stack')
  if (reasons.includes('real-time') || reasons.includes('websocket') || reasons.includes('socket')) tags.push('Real-time')
  if (reasons.includes('api') || reasons.includes('github api') || reasons.includes('claude api')) tags.push('API-heavy')
  if (reasons.includes('auth') || reasons.includes('jwt') || reasons.includes('authentication')) tags.push('Auth')
  if (reasons.includes('ai') || reasons.includes('claude') || reasons.includes('ml') || reasons.includes('llm')) tags.push('AI-integrated')
  if (reasons.includes('aws') || reasons.includes('s3') || reasons.includes('cloud')) tags.push('Cloud')
  if (reasons.includes('database') || reasons.includes('mongodb') || reasons.includes('postgres') || reasons.includes('sql')) tags.push('Database')
  if (deps > 10) tags.push('Multi-service')
  if (reasons.includes('pipeline')) tags.push('Pipeline')
  if (reasons.includes('distributed') || reasons.includes('queue') || reasons.includes('tcp')) tags.push('Systems')
  return tags.slice(0, 4)
}

function inferConcerns(repo: any): string[] {
  const concerns: string[] = []
  const reasons = (repo.depthReasons || []).join(' ').toLowerCase()
  const level = repo.engineeringLevel
  if (reasons.includes('debugging') || reasons.includes('reactive') || reasons.includes('bug')) concerns.push('Debugging-heavy commit patterns')
  if (!repo.breakdown?.hasTests) concerns.push('No test suite detected')
  if (!repo.breakdown?.hasCI) concerns.push('No CI/CD pipeline')
  if (repo.breakdown?.commitConsistency < 1) concerns.push('Inconsistent commit activity')
  if (level === 'new-grad' || level === 'junior') concerns.push('Limited architectural complexity')
  return concerns.slice(0, 2)
}

function RepoCard({ repo, githubUsername }: { repo: any; githubUsername: string }) {
  const [expanded, setExpanded] = useState(false)
  const signalTags = inferSignalTags(repo)
  const concerns = inferConcerns(repo)
  const levelColor = levelColors[repo.engineeringLevel] || levelColors['junior']

  return (
    <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)',
      borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <a href={`https://github.com/${githubUsername}/${repo.repoName}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 17, fontFamily: 'Playfair Display, serif', color: 'var(--brown-800)',
              textDecoration: 'none', cursor: 'pointer', display: 'block', marginBottom: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--brown-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--brown-800)'}>
            {repo.repoName}
          </a>
          <LevelBadge level={repo.engineeringLevel} />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 32, fontWeight: 500,
            color: levelColor.text, lineHeight: 1 }}>{repo.totalScore}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>score</div>
        </div>
      </div>
      {signalTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {signalTags.map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5,
              background: 'var(--brown-100)', color: 'var(--brown-700)',
              border: '1px solid var(--brown-200)', fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <ScoreBar label="Depth" value={repo.depthScore} max={30} />
        <ScoreBar label="Originality" value={repo.originalityScore} max={30} />
      </div>
      <div style={{ marginBottom: concerns.length > 0 ? 10 : 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.07em', marginBottom: 6 }}>Key strengths</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(expanded ? repo.depthReasons : repo.depthReasons?.slice(0, 2))?.map((reason: string, j: number) => (
            <div key={j} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#2D6A4F', flexShrink: 0, fontSize: 12, marginTop: 1 }}>+</span>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                overflow: expanded ? 'visible' : 'hidden',
                display: expanded ? 'block' : '-webkit-box',
                WebkitLineClamp: expanded ? 'unset' : 2,
                WebkitBoxOrient: 'vertical' as any }}>{reason}</p>
            </div>
          ))}
        </div>
      </div>
      {concerns.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.07em', marginBottom: 6 }}>Concerns</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {concerns.map((concern, j) => (
              <div key={j} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#C0392B', flexShrink: 0, fontSize: 12, marginTop: 1 }}>−</span>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{concern}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {repo.skillAlignment?.alignments?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 12,
          borderTop: '1px solid var(--border)' }}>
          {repo.skillAlignment.alignments.map((a: any) => (
            <div key={a.skill} style={{ display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 6, background: 'var(--bg)',
              border: '1px solid var(--border)', fontSize: 11 }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.skill}</span>
              <EvidenceBadge evidence={a.evidence} />
            </div>
          ))}
        </div>
      )}
      {repo.depthReasons?.length > 2 && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ marginTop: 10, fontSize: 12, color: 'var(--brown-500)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
          {expanded ? '↑ Show less' : `↓ Show ${repo.depthReasons.length - 2} more`}
        </button>
      )}
    </div>
  )
}

function ScoringModal({ onClose }: { onClose: () => void }) {
  const githubItems = [
    { label: 'Claude depth score', pts: '0–30', desc: 'Architecture quality, commit patterns, real problem solving vs tutorial following' },
    { label: 'Claude originality score', pts: '0–30', desc: 'Did the candidate build something real? Novel ideas score high, cloned templates score low' },
    { label: 'Language + framework match', pts: '0–18', desc: 'How well the repo stack matches the job posting requirements' },
    { label: 'Tests + CI/CD', pts: '0–9', desc: 'Evidence of engineering best practices' },
    { label: 'Repo age + commit consistency', pts: '0–6', desc: 'Sustained work over time — low weight tiebreaker only' },
  ]
  const resumeItems = [
    { label: 'Company tier', pts: 'weighted', desc: 'Tier 1 (FAANG, OpenAI, Stripe) scores highest. Tier 2 (Series B+, major banks) is strong. Tier 3 (unknown startups) is moderate' },
    { label: 'Role relevance', pts: 'weighted', desc: 'SWE, ML Eng, Data Eng score highest. Adjacent roles (data analyst, research) score partially. Non-technical roles score low' },
    { label: 'Duration + progression', pts: 'weighted', desc: 'Longer tenures score higher. Career progression (from unknown to FAANG) shows growth' },
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 20,
        padding: '32px 36px', maxWidth: 560, width: '100%', maxHeight: '80vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--brown-900)' }}>
            How scoring works
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>GitHub signal</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--brown-700)' }}>60 pts</span>
          </div>
          {githubItems.map(item => (
            <div key={item.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--brown-600)' }}>{item.pts} pts</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Resume signal</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--brown-700)' }}>40 pts</span>
          </div>
          {resumeItems.map(item => (
            <div key={item.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--brown-600)' }}>{item.pts}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--brown-50)', border: '1px solid var(--brown-200)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Note:</strong> Scores reflect publicly available GitHub activity only.
            Candidates who work primarily in private repos, contribute to company codebases,
            or are early in their career may score lower than their actual ability warrants.
            Use this as a signal, not a verdict.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage({ result, onReset }: Props) {
  const [showScoring, setShowScoring] = useState(false)

  const { candidateName, overallScore, overallEngineeringLevel, narrative,
    linkedinUrl, parsedResume, resumeScore, githubScore, topRepos,
    jobSkillsDetected, totalReposAnalyzed } = result

  const effectiveGithubScore = githubScore ?? overallScore
  const effectiveResumeScore = resumeScore ?? null

  const githubLevel = topRepos[0]?.engineeringLevel || 'unknown'
  const resumeLevel = effectiveResumeScore?.level || 'new-grad'
  const levelOrder = ['new-grad', 'junior', 'mid', 'senior', 'staff']
  const githubIdx = levelOrder.indexOf(githubLevel)
  const resumeIdx = levelOrder.indexOf(resumeLevel)
  const alignmentDiff = githubIdx - resumeIdx
  const alignmentInsight = alignmentDiff >= 2
    ? 'GitHub shows stronger technical depth than experience suggests — possible self-taught or project-heavy candidate.'
    : alignmentDiff <= -2
    ? 'Strong professional experience, but public GitHub activity is lighter — may work primarily in private repos.'
    : 'GitHub activity and professional experience are broadly aligned.'

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="grain" />

      {showScoring && <ScoringModal onClose={() => setShowScoring(false)} />}

      <header style={{ padding: '14px 40px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: 'var(--brown-700)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 600, color: 'var(--brown-800)' }}>
            Candidate Analyzer
          </span>
        </div>
        <button onClick={onReset} style={{ padding: '7px 16px', borderRadius: 8,
          border: '1.5px solid var(--border)', background: 'transparent', fontSize: 13,
          color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--brown-50)'; e.currentTarget.style.borderColor = 'var(--brown-400)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          ← New analysis
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px' }}>

        {/* Hero */}
        <div className="fade-up" style={{ background: 'var(--brown-800)', borderRadius: 20,
          padding: '32px 40px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ScoreRing score={overallScore} />
            <div>
              <h1 style={{ fontSize: 30, color: 'var(--cream)', marginBottom: 8 }}>{candidateName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <LevelBadge level={overallEngineeringLevel} />
                <span style={{ fontSize: 12, color: 'var(--brown-200)' }}>{totalReposAnalyzed} repos analyzed</span>
                {jobSkillsDetected?.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--brown-200)' }}>· {jobSkillsDetected.length} skills matched</span>
                )}
              </div>

              <button
                onClick={() => setShowScoring(true)}
                style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'var(--cream)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                How is this score calculated?
              </button>


            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '9px 18px', borderRadius: 10, background: '#0A66C2', color: 'white',
                  fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex',
                  alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </a>
            )}
            <a href={`https://github.com/${result.githubUsername}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '9px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                color: 'var(--cream)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cream)">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="fade-up-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '18px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score breakdown</span>
            <button onClick={() => setShowScoring(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                color: 'var(--brown-500)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              How scoring works
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>GitHub signal</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--brown-700)' }}>{effectiveGithubScore}/60</span>
              </div>
              <MiniScoreBar value={effectiveGithubScore} max={60} color="var(--brown-600)" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Code quality · depth · originality</p>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Resume signal</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--brown-700)' }}>{effectiveResumeScore?.score ?? '—'}/40</span>
              </div>
              <MiniScoreBar value={effectiveResumeScore?.score ?? 0} max={40} color="#2D6A4F" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Experience · companies · progression</p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="fade-up-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'DM Sans, sans-serif' }}>
            Recruiter summary
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{narrative}</p>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* LEFT — repos */}
          <div>
            <h2 className="fade-up-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
              GitHub repositories
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {topRepos.map((repo: any, i: number) => (
                <div key={repo.repoName} className={`fade-up-${i + 2}`}>
                  <RepoCard repo={repo} githubUsername={result.githubUsername} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — sticky sidebar */}
          <div style={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Level signals */}
            <div className="fade-up-2" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>Level signals</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>GitHub code</span>
                  <LevelBadge level={githubLevel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Experience</span>
                  <LevelBadge level={resumeLevel} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8, background: 'var(--brown-50)', border: '1px solid var(--brown-200)' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall</span>
                  <LevelBadge level={overallEngineeringLevel} />
                </div>
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8,
                background: alignmentDiff >= 2 ? '#D8F3DC' : alignmentDiff <= -2 ? '#FFF3CD' : 'var(--bg)',
                border: `1px solid ${alignmentDiff >= 2 ? '#A8D5B5' : alignmentDiff <= -2 ? '#FFE082' : 'var(--border)'}` }}>
                <p style={{ fontSize: 11, fontWeight: 600,
                  color: alignmentDiff >= 2 ? '#2D6A4F' : alignmentDiff <= -2 ? '#A07020' : 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  Alignment with GitHub
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alignmentInsight}</p>
              </div>
            </div>

            {/* Experience summary */}
            {effectiveResumeScore && (
              <div className="fade-up-2" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>Experience summary</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <LevelBadge level={effectiveResumeScore.level} />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 500, color: 'var(--brown-700)' }}>
                    {effectiveResumeScore.score}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/40</span>
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', borderRadius: 99, background: '#2D6A4F',
                    width: `${(effectiveResumeScore.score / 40) * 100}%`, transition: 'width 0.8s ease' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                  {effectiveResumeScore.companySummary}
                </p>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.07em', marginBottom: 6 }}>Signals</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {effectiveResumeScore.reasons?.map((reason: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 7 }}>
                      <span style={{ color: 'var(--brown-400)', flexShrink: 0, fontSize: 12 }}>—</span>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reason}</p>
                    </div>
                  ))}
                </div>
                {effectiveResumeScore.experienceAssessments?.map((exp: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{exp.role}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{exp.company}</p>
                      </div>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500,
                        color: 'var(--brown-700)', flexShrink: 0 }}>{exp.score}/10</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: exp.tier === 'tier-1' ? '#D8F3DC' : exp.tier === 'tier-2' ? '#FFF3CD' : '#F0F0F0',
                      color: exp.tier === 'tier-1' ? '#2D6A4F' : exp.tier === 'tier-2' ? '#A07020' : '#6B6B6B',
                      display: 'inline-block', marginBottom: 6 }}>{exp.tierLabel}</span>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{exp.reason}</p>
                  </div>
                ))}
                {parsedResume?.education?.map((edu: any, i: number) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{edu.school}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{edu.degree}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Claimed skills */}
            {parsedResume?.skills?.length > 0 && (
              <div className="fade-up-3" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>Claimed skills</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {parsedResume.skills.map((skill: string) => (
                    <span key={skill} style={{ padding: '3px 8px', borderRadius: 5,
                      background: 'var(--brown-50)', border: '1px solid var(--brown-200)',
                      fontSize: 11, color: 'var(--brown-700)', fontWeight: 500 }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Job skill match */}
            {jobSkillsDetected?.length > 0 && (
              <div className="fade-up-3" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: 12, fontFamily: 'DM Sans, sans-serif' }}>Job skill match</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {jobSkillsDetected.map((skill: string) => {
                    const bestEvidence = topRepos.reduce((best: string, repo: any) => {
                      const a = repo.skillAlignment?.alignments?.find((al: any) => al.skill === skill)
                      const order = ['strong', 'moderate', 'weak', 'none']
                      return order.indexOf(a?.evidence) < order.indexOf(best) ? a?.evidence : best
                    }, 'none')
                    return (
                      <div key={skill} style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '7px 10px', borderRadius: 7,
                        background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{skill}</span>
                        <EvidenceBadge evidence={bestEvidence} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating feedback button */}
      <a href="https://docs.google.com/forms/d/e/1FAIpQLSdZaQnu6_hkJ1TZvb-nHVNWytDkkWKZvSvuDTYWPZu197yrnw/viewform"
        target="_blank" rel="noopener noreferrer"
        style={{ position: 'fixed', bottom: 28, right: 28, display: 'flex', alignItems: 'center',
          gap: 8, padding: '10px 18px', borderRadius: 99, background: 'var(--brown-700)',
          color: 'var(--cream)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', zIndex: 999 }}
        onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--brown-800)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={(e: any) => { e.currentTarget.style.background = 'var(--brown-700)'; e.currentTarget.style.transform = 'translateY(0)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Give feedback
      </a>
    </div>
  )
}