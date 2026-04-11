import { Router } from 'express'
import { getRepos, getFullRepoData } from '../services/github'
import { scoreRepoSignals, getTopRepos } from '../services/scoring'
import multer from 'multer'
import { extractTextFromPDF } from '../services/resume'
import {
  assessRepoDepth,
  assessSkillAlignmentAllRepos,
  generateAlignmentNarrative,
  parseResume,
  ParsedResume
} from '../services/claude'

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
  return commonSkills.filter(skill =>
    new RegExp(`\\b${skill}\\b`, 'i').test(jobPosting)
  )
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

    // Step 1 — extract URLs from resume
    const githubUsername = extractGithubUsername(resumeText)
    const linkedinUrl = extractLinkedinUrl(resumeText)

    if (!githubUsername) {
      return res.status(400).json({ error: 'No GitHub URL found in resume' })
    }
    // Step 2 — extract job skills if posting provided
    const jobSkills = jobPosting ? extractJobSkills(jobPosting) : []

    // Step 3 — fetch repos AND parse resume in parallel
    const [allRepos, parsedResume] = await Promise.all([
      getRepos(githubUsername),
      parseResume(resumeText)
    ])

    // Step 4 — get top repos using dual signal selection
    const topRepos = getTopRepos(allRepos, 6)

    // Step 5 — fetch full data for each top repo in parallel
    const repoDataList = await Promise.all(
      topRepos.map(async (repo: any) => {
        const fullData = await getFullRepoData(githubUsername, repo.name, githubUsername)
        return { repo, fullData }
      })
    )

    // Step 6 — score each repo deterministically
    const scoredRepos = repoDataList.map(({ repo, fullData }) =>
      scoreRepoSignals(
        repo,
        fullData.commitActivity,
        fullData.fileStructure,
        fullData.dependencies,
        jobSkills
      )
    )

    // Step 7 — build repo metadata list for Claude calls
    const repoMetadataList = repoDataList.map(({ repo, fullData }) => ({
      name: repo.name,
      description: repo.description || '',
      commitMessages: fullData.commitMessages,
      commitCount: fullData.commitCount,
      repoAgeInDays: Math.floor(
        (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
      dependencies: fullData.dependencies,
      fileStructure: fullData.fileStructure,
      languages: fullData.languages
    }))

    // Step 8 — depth assessment + skill alignment in parallel
    const [depthAssessments, skillAlignments] = await Promise.all([
      Promise.all(repoMetadataList.map(meta => assessRepoDepth(meta))),
      jobSkills.length > 0
        ? assessSkillAlignmentAllRepos(repoMetadataList, jobSkills)
        : Promise.resolve([])
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
    const overallScore = Math.min(
      Math.round(finalTopRepos.reduce((sum, r) => sum + r.totalScore, 0) / finalTopRepos.length),
      100
    )

    // Step 12 — overall engineering level (most common across top 3)
    const levelOrder = ['new-grad', 'junior', 'mid', 'senior', 'staff']
    const levels = finalTopRepos.map(r => r.engineeringLevel).filter(Boolean)
    const avgLevelIndex = Math.round(
      levels.reduce((sum, l) => sum + levelOrder.indexOf(l), 0) / levels.length
    )
    const overallEngineeringLevel = levelOrder[avgLevelIndex] || 'junior'

    // Step 13 — Claude narrative summary
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
      topRepos: finalTopRepos,
      jobSkillsDetected: jobSkills,
      totalReposAnalyzed: topRepos.length
    })

  } catch (error: any) {
    console.error('FULL ERROR:', error?.message)
    console.error('STACK:', error?.stack)
    res.status(500).json({ error: 'Analysis failed', details: error?.message })
  }
})

export default router