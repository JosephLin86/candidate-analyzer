import { Router } from 'express'
import multer from 'multer'
import { getRepos, getFullRepoData, getReadme } from '../services/github'
import { getShortlist, getTopRepos, scoreRepoSignals } from '../services/scoring'
import {
  assessRepoDepth,
  assessSkillAlignmentAllRepos,
  generateAlignmentNarrative,
  parseResume,
  rankRepos,
  scoreResume,
  ParsedResume,
  ResumeScore
} from '../services/claude'
import { extractTextFromPDF } from '../services/resume'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

function extractGithubUsername(text: string): string | null {
  const match = text.match(/github\.com\/([a-zA-Z0-9-]+)/i)
  return match ? match[1] : null
}

function extractLinkedinUrl(text: string): string | null {
  const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i)
  return match ? `https://www.linkedin.com/in/${match[1]}` : null
}

function extractJobSkills(jobPosting: string): string[] {
  const commonSkills = [
    'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
    'Python', 'Node.js', 'Express', 'FastAPI', 'Django', 'Flask',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform',
    'TailwindCSS', 'CSS', 'HTML', 'Swift', 'Kotlin', 'Golang', 'Rust',
    'Java', 'Spring', 'Ruby', 'Rails', 'C++', 'C#', '.NET'
  ]
  return commonSkills.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(jobPosting)
  })
}

router.post('/', upload.single('resume'), async (req: any, res: any) => {
  try {
    let resumeText = ''

    if (req.file) {
      resumeText = await extractTextFromPDF(req.file.buffer)
    } else if (req.body.resumeText) {
      resumeText = req.body.resumeText
    } else {
      return res.status(400).json({ error: 'Resume PDF or text is required' })
    }

    const jobPosting = req.body.jobPosting || ''

    // Step 1 — extract GitHub username
    let githubUsername = extractGithubUsername(resumeText)
    const linkedinUrl = extractLinkedinUrl(resumeText)

    // If not in resume, check if recruiter provided it manually
    if (!githubUsername && req.body.manualGithub) {
      githubUsername = extractGithubUsername(req.body.manualGithub) 
        || req.body.manualGithub.replace(/.*github\.com\//i, '').split('/')[0].trim()
    }

    if (!githubUsername) {
      return res.status(400).json({ 
        error: 'No GitHub URL found in resume',
        code: 'NO_GITHUB_FOUND'
      })
    }

    const jobSkills = jobPosting ? extractJobSkills(jobPosting) : []

    // Step 2 — fetch all repos + parse resume in parallel
    const [allRepos, parsedResume] = await Promise.all([
      getRepos(githubUsername),
      parseResume(resumeText)
    ])

    // Step 3 — FIRST PASS: metadata shortlist (8-15 repos, removes obvious junk)
    const shortlist = getShortlist(allRepos, 15)

    // Step 4 — SECOND PASS: Claude ranks shortlist and picks best 6
    let selectedRepoNames: string[]
    try {
      selectedRepoNames = await rankRepos(shortlist, jobSkills)
    } catch {
      // Fallback to simple selection if Claude ranking fails
      selectedRepoNames = getTopRepos(shortlist, 6).map((r: any) => r.name)
    }

    // Match selected names back to repo objects
    const selectedRepos = selectedRepoNames
      .map(name => shortlist.find((r: any) => r.name === name))
      .filter(Boolean)
      .slice(0, 6)

    // Step 5 — THIRD PASS: fetch deep data for finalists in parallel
    // Includes dependencies (9 paths), file structure, commit data, AND readme
    const repoDataList = await Promise.all(
      selectedRepos.map(async (repo: any) => {
        const [fullData, readme] = await Promise.all([
          getFullRepoData(githubUsername, repo.name, githubUsername),
          getReadme(githubUsername, repo.name)
        ])
        return { repo, fullData, readme }
      })
    )

    // Step 6 — deterministic scoring
    const scoredRepos = repoDataList.map(({ repo, fullData }) =>
      scoreRepoSignals(
        repo,
        fullData.commitActivity,
        fullData.fileStructure,
        fullData.dependencies,
        jobSkills
      )
    )

    // Step 7 — build metadata list for Claude depth assessment
    // Now includes readme for richer context
    const repoMetadataList = repoDataList.map(({ repo, fullData, readme }) => ({
      name: repo.name,
      description: repo.description || '',
      commitMessages: fullData.commitMessages,
      commitCount: fullData.commitCount,
      repoAgeInDays: Math.floor(
        (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
      dependencies: fullData.dependencies,
      fileStructure: fullData.fileStructure,
      languages: fullData.languages,
      readme
    }))

    // Step 8 — Claude depth assessment + skill alignment in parallel
    const [depthAssessments, skillAlignments, resumeScore] = await Promise.all([
      Promise.all(repoMetadataList.map(meta => assessRepoDepth(meta))),
      jobSkills.length > 0
        ? assessSkillAlignmentAllRepos(repoMetadataList, jobSkills)
        : Promise.resolve([]),
      scoreResume(parsedResume)
    ])

    // Step 9 — combine all scores
    const combinedRepos = scoredRepos.map((scored, i) => ({
      ...scored,
      depthScore: depthAssessments[i].depthScore,
      originalityScore: depthAssessments[i].originalityScore,
      engineeringLevel: depthAssessments[i].engineeringLevel,
      engineeringLevelReason: depthAssessments[i].engineeringLevelReason,
      depthReasons: depthAssessments[i].reasons,
      skillAlignment: skillAlignments[i] || null,
      totalScore: scored.totalScore + depthAssessments[i].depthScore + depthAssessments[i].originalityScore
    }))

    // Step 10 — sort by total score, take top 3
    const finalTopRepos = combinedRepos
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3)

    // Step 11 — overall score out of 100
    // GitHub score — average of top 3 repos, capped at 60
    const githubScore = Math.min(
      Math.round(finalTopRepos.reduce((sum, r) => sum + r.totalScore, 0) / finalTopRepos.length),
      60
    )

    // Resume score — 0-40 from Claude assessment
    // Overall = GitHub (60%) + Resume (40%)
    const overallScore = Math.min(githubScore + resumeScore.score, 100)

    // Step 12 — overall engineering level (average across top 3)
    const levelOrder = ['new-grad', 'junior', 'mid', 'senior', 'staff']
    const githubLevels = finalTopRepos.map(r => r.engineeringLevel).filter(Boolean)
    const avgGithubLevelIndex = Math.round(
      githubLevels.reduce((sum: number, l: string) => sum + levelOrder.indexOf(l), 0) / githubLevels.length
    )
    const resumeLevelIndex = levelOrder.indexOf(resumeScore.level)

    // Blend GitHub and resume level — weight GitHub slightly more
    const blendedLevelIndex = Math.round((avgGithubLevelIndex * 0.6) + (resumeLevelIndex * 0.4))
    const overallEngineeringLevel = levelOrder[Math.min(blendedLevelIndex, 4)] || 'junior'

    // Step 13 — Claude narrative
    const narrative = await generateAlignmentNarrative(
      parsedResume.name || githubUsername,
      finalTopRepos,
      overallScore,
      skillAlignments,
      parsedResume,
      jobPosting
    )

    res.json({
      githubUsername,
      linkedinUrl,
      candidateName: parsedResume.name || githubUsername,
      overallScore,
      overallEngineeringLevel,
      narrative,
      parsedResume,
      resumeScore,          // add this
      githubScore,          // add this so frontend can show breakdown
      topRepos: finalTopRepos,
      jobSkillsDetected: jobSkills,
      totalReposAnalyzed: selectedRepos.length
    })

  } catch (error: any) {
    console.error('FULL ERROR:', error?.message)
    console.error('STACK:', error?.stack)
    res.status(500).json({ error: 'Analysis failed', details: error?.message })
  }
})

export default router