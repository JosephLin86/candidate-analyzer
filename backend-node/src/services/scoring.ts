interface RepoScore {
  repoName: string
  totalScore: number
  breakdown: {
    commitConsistency: number
    commitRecency: number
    starsAndForks: number
    repoAge: number
    languageMatch: number
    frameworkMatch: number
    hasTests: boolean
    hasCI: boolean
    dependencyCount: number
  }
  reasons: string[]
}

// FIRST PASS — metadata shortlist
// Goal: remove obvious junk, keep 8-15 candidates for Claude to rank
// Does NOT try to judge quality — just prunes the worst offenders

const JUNK_PATTERNS = [
  /^cs\d{2,4}$/i,
  /^cse\d{2,4}$/i,
  /^eecs\d{2,4}$/i,
  /^ece\d{2,4}$/i,
  /^hw\d+$/i,
  /^assignment\d*$/i,
  /^lab\d+$/i,
  /^test$/i,
  /^temp$/i,
  /^scratch$/i,
  /^untitled$/i,
  /^hello-?world$/i,
]

function isObviousJunk(repo: any): boolean {
  const name = repo.name?.toLowerCase() || ''
  return JUNK_PATTERNS.some(p => p.test(name))
}

export function getShortlist(repos: any[], limit = 15): any[] {
  return repos
    .filter(r => !r.fork)
    .filter(r => !isObviousJunk(r))
    .sort((a, b) => {
      // Primary: stars (hard to fake)
      const starDiff = b.stargazers_count - a.stargazers_count
      if (starDiff !== 0) return starDiff
      // Secondary: recency
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    })
    .slice(0, limit)
}

// Keep getTopRepos as fallback for if Claude ranking fails
export function getTopRepos(repos: any[], limit = 6): any[] {
  return repos
    .filter(r => !r.fork)
    .filter(r => !isObviousJunk(r))
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
    .slice(0, limit)
}

export function scoreRepoSignals(
  repo: any,
  commitActivity: any[],
  fileStructure: string[],
  dependencies: string[],
  jobSkills: string[]
): Omit<RepoScore, 'depthScore' | 'originalityScore'> {
  const reasons: string[] = []
  let totalScore = 0
  const activity = Array.isArray(commitActivity) ? commitActivity : []

  // Stars and forks (0-10)
  const starsAndForks = Math.min((repo.stargazers_count * 2) + repo.forks_count, 10)
  if (repo.stargazers_count > 0) reasons.push(`${repo.stargazers_count} stars`)
  totalScore += starsAndForks

  // Language match vs job skills (0-10)
  const repoLanguage = repo.language?.toLowerCase() || ''
  const languageMatch = jobSkills.some(l =>
    repoLanguage.includes(l.toLowerCase())
  ) ? 10 : 0
  if (languageMatch > 0) reasons.push('Language matches job requirements')
  totalScore += languageMatch

  // Framework match from dependencies (0-8)
  const frameworkMatch = jobSkills.some(l =>
    dependencies.some(d => d.toLowerCase().includes(l.toLowerCase()))
  ) ? 8 : 0
  if (frameworkMatch > 0) reasons.push('Dependencies match job requirements')
  totalScore += frameworkMatch

  // Has tests (0-5)
  const hasTests = fileStructure.some(f =>
    f.includes('test') || f.includes('spec') || f.includes('__tests__')
  )
  if (hasTests) { reasons.push('Has test suite'); totalScore += 5 }

  // Has CI/CD (0-4)
  const hasCI = fileStructure.some(f =>
    f.includes('.github') || f.includes('workflows')
  )
  if (hasCI) { reasons.push('Has CI/CD pipeline'); totalScore += 4 }

  // Repo age (0-4)
  const ageInDays = Math.floor(
    (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  const repoAge = ageInDays > 365 ? 4 : ageInDays > 180 ? 3 : ageInDays > 90 ? 1 : 0
  if (ageInDays > 90) reasons.push(`Repo is ${Math.floor(ageInDays / 30)} months old`)
  totalScore += repoAge

  // Commit recency (0-7)
  const recentWeeks = activity.slice(-8)
  const recentCommits = recentWeeks.reduce((sum: number, w: any) => sum + w.total, 0)
  const commitRecency = recentCommits > 20 ? 7 : recentCommits > 10 ? 5 : recentCommits > 0 ? 3 : 0
  if (recentCommits > 0) reasons.push(`${recentCommits} commits in last 8 weeks`)
  totalScore += commitRecency

  // Commit consistency (0-2) — low weight tiebreaker
  const activeWeeks = activity.filter((w: any) => w.total > 0).length
  const commitConsistency = Math.min(activeWeeks / 52 * 2, 2)
  if (activeWeeks > 10) reasons.push(`Active ${activeWeeks} weeks out of 52`)
  totalScore += commitConsistency

  return {
    repoName: repo.name,
    totalScore,
    breakdown: {
      commitConsistency,
      commitRecency,
      starsAndForks,
      repoAge,
      languageMatch,
      frameworkMatch,
      hasTests,
      hasCI,
      dependencyCount: dependencies.length
    },
    reasons
  }
}