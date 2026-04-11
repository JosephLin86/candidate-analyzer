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
  engineeringLevel: 'new-grad' | 'junior' | 'mid' | 'senior' | 'staff'
  engineeringLevelReason: string
  reasons: string[]
}

interface SkillAlignmentResult {
  alignments: {
    skill: string
    evidence: 'strong' | 'moderate' | 'weak' | 'none'
    reason: string
  }[]
}

export interface ParsedResume {
  name: string | null
  skills: string[]
  experience: {
    company: string
    role: string
    durationYears: number | null
  }[]
  education: {
    degree: string
    school: string
  }[]
  totalYearsExperience: number | null
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const prompt = `You are a resume parser. Extract structured information from this resume text.

Resume:
${resumeText.slice(0, 3000)}

Return JSON only, no other text:
{
  "name": "<candidate full name or null if not found>",
  "skills": ["<skill1>", "<skill2>"],
  "experience": [
    {
      "company": "<company name>",
      "role": "<job title>",
      "durationYears": <number or null>
    }
  ],
  "education": [
    {
      "degree": "<degree name>",
      "school": "<school name>"
    }
  ],
  "totalYearsExperience": <total years or null>
}

Rules:
- skills should include programming languages, frameworks, tools, and technologies only
- do not include soft skills like "communication" or "teamwork"
- durationYears should be a number like 2.5, or null if unclear
- if a field is not found, use null for strings and [] for arrays`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      name: null,
      skills: [],
      experience: [],
      education: [],
      totalYearsExperience: null
    }
  }
}

export async function assessRepoDepth(repo: RepoMetadata): Promise<DepthAssessment> {
  const prompt = `You are a senior engineering manager evaluating a GitHub repository to assess the engineering level of its author.

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
  "engineeringLevel": "<new-grad|junior|mid|senior|staff>",
  "engineeringLevelReason": "<one specific sentence explaining why>",
  "reasons": [<2-3 specific reasons for your scores>]
}

Engineering level guidance:
- new-grad: tutorial-style code, no architecture, basic CRUD, simple Todo/Weather apps, no error handling, no tests
- junior: real app but simple architecture, some structure, basic error handling, maybe 1-2 real features
- mid: proper separation of concerns, multiple services/layers, real error handling, some tests, meaningful commit history showing debugging and iteration
- senior: sophisticated architecture, design patterns, performance considerations, comprehensive error handling, CI/CD, tests, security awareness, complex problem solving
- staff: distributed systems, scalability concerns, technical leadership signals, complex abstractions, framework-level thinking

Depth score guidance (0-30):
- 0-9: new-grad level
- 10-17: junior level
- 18-23: mid level
- 24-30: senior to staff level

Originality score guidance (0-30):
- 0-9: copied template or tutorial
- 10-17: modified starter significantly
- 18-23: original problem, standard implementation
- 24-30: novel solution to a real problem

Strong signals of seniority: proper error boundaries, retry logic, caching strategy, auth implementation, database optimization, WebSocket handling, queue systems, custom algorithms, performance profiling signals in commits
Red flags for junior: commit messages like "fix", "update", "test", tutorial repo names, no error handling in deps, no env config, flat file structure`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      depthScore: 15,
      originalityScore: 15,
      engineeringLevel: 'junior',
      engineeringLevelReason: 'Could not assess',
      reasons: ['Could not assess']
    }
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

- Use your knowledge of the ecosystem to recognize alternative package names 
— mongoose means MongoDB, pg means PostgreSQL, pymysql means MySQL, ioredis means Redis, socket.io means WebSockets, 
@angular/core means Angular, react-native means React Native, and so on for all technologies

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
  parsedResume: ParsedResume,
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

  const resumeClaimedSkills = parsedResume.skills.join(', ') || 'none listed'
  const githubConfirmedSkills = strongSkills.join(', ') || 'none confirmed'
  const missingEvidence = parsedResume.skills
    .filter(s => weakSkills.some(w => w.toLowerCase() === s.toLowerCase()))
    .join(', ') || 'none'

  const engineeringLevels = topRepos
    .map(r => r.engineeringLevel)
    .filter(Boolean)

  const prompt = `You are a technical recruiter assistant. Write a concise 3-4 sentence candidate summary for a recruiter.

Candidate: ${candidateName}
Overall score: ${overallScore}/100
Years of experience: ${parsedResume.totalYearsExperience ?? 'unknown'}
Skills claimed on resume: ${resumeClaimedSkills}
Skills confirmed by GitHub: ${githubConfirmedSkills}
Skills claimed but not confirmed by GitHub: ${missingEvidence}
Engineering levels detected across repos: ${engineeringLevels.join(', ') || 'unknown'}
Top repos: ${topRepos.map(r => `${r.repoName} (${r.engineeringLevel || 'unknown'})`).join(', ')}
${jobPosting ? `Job context: ${jobPosting.slice(0, 500)}` : ''}

Rules:
- Be specific, reference actual repo names and skills
- Mention the engineering level signal — is this new-grad, junior, mid, or senior work?
- Highlight where GitHub confirms resume claims and where it does not
- Do not use generic phrases like "strong candidate" or "great fit"
- Mention both strengths and gaps
- Write for a recruiter who needs to decide whether to move forward`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}