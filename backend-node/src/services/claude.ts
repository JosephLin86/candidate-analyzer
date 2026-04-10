import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

interface RepoMetadata {
  name: string
  description: string
  commitMessages: string[]
  commitCount: number
  repoAgeInDays: number
  dependencies: string[]
  fileStructure: string[]
  languages: string[]
}

interface DepthAssessment {
  depthScore: number
  originalityScore: number
  reasons: string[]
}

interface SkillAlignmentResult {
  alignments: {
    skill: string
    evidence: 'strong' | 'moderate' | 'weak' | 'none'
    reason: string
  }[]
}

export async function assessRepoDepth(repo: RepoMetadata): Promise<DepthAssessment> {
  const prompt = `You are evaluating a software engineering candidate's GitHub repository for project depth and originality.

Repository: "${repo.name}"
Description: ${repo.description || 'none'}
Repo age: ${repo.repoAgeInDays} days old
Total commits: ${repo.commitCount}
Dependencies: ${repo.dependencies.join(', ') || 'none'}
File structure: ${repo.fileStructure.join(', ') || 'none'}
Last 20 commit messages: ${repo.commitMessages.join(' | ') || 'none'}

Assess this repository and return JSON only, no other text:
{
  "depthScore": <0-30>,
  "originalityScore": <0-30>,
  "reasons": [<2-3 specific reasons for your scores>]
}

Scoring guidance for depthScore (0-30):
- 0-9: obvious tutorial (todo app, weather app, basic CRUD, very few commits, no dependencies)
- 10-19: moderate complexity (real app but not sophisticated, some structure)
- 20-30: genuine engineering depth (meaningful commit history, real architecture, testing, CI/CD signals)

Scoring guidance for originalityScore (0-30):
- 0-9: copied starter template with minimal changes
- 10-19: modified starter significantly or built on boilerplate with real additions
- 20-30: original architecture, clearly not a clone, unique problem being solved

Strong signals of depth: testing setup, CI/CD config, meaningful commit messages showing debugging and iteration, many diverse dependencies, long commit history spread over months
Red flags: commit messages like "update", "fix", "asdf", "initial commit", very few commits, no dependencies, flat file structure, repo name like "todo-app" or "weather-app"`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { depthScore: 15, originalityScore: 15, reasons: ['Could not assess'] }
  }
}

export async function assessSkillAlignmentAllRepos(
  repos: RepoMetadata[],
  jobSkills: string[]
): Promise<SkillAlignmentResult[]> {
  const repoSummaries = repos.map(repo => `
Repository: "${repo.name}"
  Programming languages: ${repo.languages.join(', ') || 'none'}
  Dependencies: ${repo.dependencies.join(', ') || 'none'}
  File structure: ${repo.fileStructure.join(', ') || 'none'}`
  ).join('\n')

  const prompt = `You are evaluating whether GitHub repositories demonstrate specific technical skills required by a job posting.

Job requires these skills: ${jobSkills.join(', ')}

${repoSummaries}

CRITICAL DISTINCTION — you must follow this exactly:
- Programming languages (TypeScript, JavaScript, Python, CSS, HTML, Go, Rust) → look in "Programming languages"
- Frameworks and libraries (React, Vue, Next.js, Express, Tailwind, Django, FastAPI, PostgreSQL) → look in "Dependencies"
- Never look for React, Tailwind, or any framework in the languages field — they will not be there
- Never look for TypeScript or Python in the dependencies field — they will not be there

Return JSON only, no other text. One entry per repository in the same order as provided:
[
  {
    "repoName": "<repo name>",
    "alignments": [
      {
        "skill": "<skill name>",
        "evidence": "<strong|moderate|weak|none>",
        "reason": "<one specific reason referencing exactly where you found the evidence>"
      }
    ]
  }
]

Evidence level guidance:
- strong: skill directly found in the correct field
- moderate: skill inferred from closely related tools
- weak: minor indirect signal only
- none: no evidence found`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const results = JSON.parse(clean)
    return results.map((r: any) => ({ alignments: r.alignments }))
  } catch {
    return repos.map(() => ({
      alignments: jobSkills.map(skill => ({
        skill,
        evidence: 'none' as const,
        reason: 'Could not assess'
      }))
    }))
  }
}

export async function generateAlignmentNarrative(
  candidateName: string,
  topRepos: any[],
  overallScore: number,
  skillAlignments: SkillAlignmentResult[],
  jobPosting?: string
): Promise<string> {
  const strongSkills = skillAlignments
    .flatMap(s => s.alignments)
    .filter(a => a.evidence === 'strong')
    .map(a => a.skill)

  const weakSkills = skillAlignments
    .flatMap(s => s.alignments)
    .filter(a => a.evidence === 'weak' || a.evidence === 'none')
    .map(a => a.skill)

  const prompt = `You are a technical recruiter assistant. Write a concise 3-4 sentence candidate summary for a recruiter.

Candidate: ${candidateName}
Overall score: ${overallScore}/100
Top repos: ${topRepos.map(r => r.repoName).join(', ')}
Strong evidence for: ${strongSkills.join(', ') || 'none identified'}
Weak or no evidence for: ${weakSkills.join(', ') || 'none'}
${jobPosting ? `Job context: ${jobPosting.slice(0, 500)}` : ''}

Rules:
- Be specific, reference actual repo names and skills
- Do not use generic phrases like "strong candidate" or "great fit"
- Mention both strengths and gaps
- Focus on what the GitHub evidence actually shows
- Write for a recruiter who needs to decide whether to move forward`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}