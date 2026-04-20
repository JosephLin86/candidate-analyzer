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
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--brown-100)" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--brown-600)" strokeWidth="7"
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
    <div style={{ height: 8, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function LevelBadge({ level }: { level: string }) {
  const c = levelColors[level] || levelColors['junior']
  return (
    <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      textTransform: 'capitalize', letterSpacing: '0.03em' }}>
      {level}
    </span>
  )
}

function EvidenceBadge({ evidence }: { evidence: string }) {
  const c = evidenceConfig[evidence] || evidenceConfig['none']
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.text, letterSpacing: '0.04em' }}>
      {c.label}
    </span>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--brown-700)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--brown-500)', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function ResultsPage({ result, onReset }: Props) {
  const { candidateName, overallScore, overallEngineeringLevel, narrative,
    linkedinUrl, parsedResume, resumeScore, githubScore, topRepos,
    jobSkillsDetected, totalReposAnalyzed } = result

  const effectiveGithubScore = githubScore ?? overallScore
  const effectiveResumeScore = resumeScore ?? null

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="grain" />

      {/* Top bar */}
      <header style={{ padding: '16px 48px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: 'var(--brown-700)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600, color: 'var(--brown-800)' }}>
            Candidate Analyzer
          </span>
        </div>
        <button onClick={onReset} style={{ padding: '8px 18px', borderRadius: 8,
          border: '1.5px solid var(--border)', background: 'transparent', fontSize: 13,
          color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--brown-50)'; e.currentTarget.style.borderColor = 'var(--brown-400)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          ← New analysis
        </button>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Candidate hero */}
        <div className="fade-up" style={{ background: 'var(--brown-800)', borderRadius: 20,
          padding: '36px 40px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ScoreRing score={overallScore} />
            <div>
              <h1 style={{ fontSize: 32, color: 'var(--cream)', marginBottom: 8 }}>{candidateName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <LevelBadge level={overallEngineeringLevel} />
                <span style={{ fontSize: 13, color: 'var(--brown-200)' }}>{totalReposAnalyzed} repos analyzed</span>
                {jobSkillsDetected?.length > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--brown-200)' }}>· {jobSkillsDetected.length} skills matched</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: 10, background: '#0A66C2', color: 'white',
                  fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'flex',
                  alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </a>
            )}
            <a href={`https://github.com/${result.githubUsername}`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.12)',
                color: 'var(--cream)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--cream)">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="fade-up-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 20, fontFamily: 'DM Sans, sans-serif' }}>
            Score breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* GitHub score */}
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>GitHub signal</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Code quality · project depth · originality</p>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--brown-700)' }}>
                  {effectiveGithubScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/60</span>
                </span>
              </div>
              <MiniScoreBar value={effectiveGithubScore} max={60} color="var(--brown-600)" />
            </div>
            {/* Resume score */}
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>Resume signal</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Experience · companies · progression</p>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--brown-700)' }}>
                  {effectiveResumeScore?.score ?? '—'}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/40</span>
                </span>
              </div>
              <MiniScoreBar value={effectiveResumeScore?.score ?? 0} max={40} color="#2D6A4F" />
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="fade-up-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '28px 32px', marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>
            Recruiter summary
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{narrative}</p>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* GitHub repos */}
            <div>
              <h2 className="fade-up-2" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
                Top repositories
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topRepos.map((repo: any, i: number) => (
                  <div key={repo.repoName} className={`fade-up-${i + 2}`} style={{ background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                          <a href={`https://github.com/${result.githubUsername}/${repo.repoName}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 18, fontFamily: 'Playfair Display, serif', color: 'var(--brown-800)',
                              textDecoration: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--brown-500)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--brown-800)'}>
                            {repo.repoName}
                          </a>
                          <LevelBadge level={repo.engineeringLevel} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {repo.engineeringLevelReason}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 500,
                          color: 'var(--brown-700)', lineHeight: 1 }}>{repo.totalScore}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>total score</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <ScoreBar label="Depth" value={repo.depthScore} max={30} />
                      <ScoreBar label="Originality" value={repo.originalityScore} max={30} />
                    </div>
                    <div style={{ background: 'var(--brown-50)', borderRadius: 10, padding: '14px 16px',
                      marginBottom: repo.skillAlignment ? 16 : 0 }}>
                      {repo.depthReasons?.map((reason: string, j: number) => (
                        <div key={j} style={{ display: 'flex', gap: 10,
                          marginBottom: j < repo.depthReasons.length - 1 ? 8 : 0 }}>
                          <span style={{ color: 'var(--brown-400)', flexShrink: 0, marginTop: 1 }}>—</span>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reason}</p>
                        </div>
                      ))}
                    </div>
                    {repo.skillAlignment?.alignments?.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                        {repo.skillAlignment.alignments.map((a: any) => (
                          <div key={a.skill} style={{ display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px', borderRadius: 8, background: 'var(--bg)',
                            border: '1px solid var(--border)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{a.skill}</span>
                            <EvidenceBadge evidence={a.evidence} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Resume analytics */}
            {effectiveResumeScore && (
              <div>
                <h2 className="fade-up-3" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
                  Experience assessment
                </h2>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <LevelBadge level={effectiveResumeScore.level} />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>experience level</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {effectiveResumeScore.companySummary}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 500,
                        color: 'var(--brown-700)', lineHeight: 1 }}>{effectiveResumeScore.score}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>out of 40</div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Experience score</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--brown-700)' }}>
                        {effectiveResumeScore.score}/40
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--brown-100)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: '#2D6A4F',
                        width: `${(effectiveResumeScore.score / 40) * 100}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>

                  {/* Claude reasoning */}
                  <div style={{ background: 'var(--brown-50)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                    {effectiveResumeScore.reasons?.map((reason: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10,
                        marginBottom: i < effectiveResumeScore.reasons.length - 1 ? 8 : 0 }}>
                        <span style={{ color: 'var(--brown-400)', flexShrink: 0, marginTop: 1 }}>—</span>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{reason}</p>
                      </div>
                    ))}
                  </div>

                  {/* Experience entries */}
                  {parsedResume?.experience?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {parsedResume.experience.map((exp: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', borderRadius: 10, background: 'var(--bg)',
                          border: '1px solid var(--border)' }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>
                              {exp.role}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.company}</p>
                          </div>
                          {exp.durationYears && (
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13,
                              color: 'var(--brown-600)', background: 'var(--brown-50)',
                              padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brown-200)' }}>
                              {exp.durationYears}y
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Engineering level signals */}
            <div className="fade-up-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '22px 24px' }}>
              <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
                Level signals
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>GitHub code</span>
                  <LevelBadge level={topRepos[0]?.engineeringLevel || 'unknown'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Experience</span>
                  <LevelBadge level={effectiveResumeScore?.level || 'new-grad'} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, background: 'var(--brown-50)',
                  border: '1px solid var(--brown-200)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall</span>
                  <LevelBadge level={overallEngineeringLevel} />
                </div>
              </div>
            </div>

            {/* Claimed skills */}
            {parsedResume?.skills?.length > 0 && (
              <div className="fade-up-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>
                  Claimed skills
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parsedResume.skills.map((skill: string) => (
                    <span key={skill} style={{ padding: '4px 10px', borderRadius: 6,
                      background: 'var(--brown-50)', border: '1px solid var(--brown-200)',
                      fontSize: 12, color: 'var(--brown-700)', fontWeight: 500 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {parsedResume?.education?.length > 0 && (
              <div className="fade-up-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>
                  Education
                </h2>
                {parsedResume.education.map((edu: any, i: number) => (
                  <div key={i}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{edu.school}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{edu.degree}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Job skill match */}
            {jobSkillsDetected?.length > 0 && (
              <div className="fade-up-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '22px 24px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: 16, fontFamily: 'DM Sans, sans-serif' }}>
                  Job skill match
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobSkillsDetected.map((skill: string) => {
                    const bestEvidence = topRepos.reduce((best: string, repo: any) => {
                      const a = repo.skillAlignment?.alignments?.find((al: any) => al.skill === skill)
                      const order = ['strong', 'moderate', 'weak', 'none']
                      return order.indexOf(a?.evidence) < order.indexOf(best) ? a?.evidence : best
                    }, 'none')
                    return (
                      <div key={skill} style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8,
                        background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{skill}</span>
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
    </div>
  )
}