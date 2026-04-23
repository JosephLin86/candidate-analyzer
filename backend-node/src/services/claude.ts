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
  readme?: string
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

export interface ExperienceAssessment {
  company: string
  role: string
  score: number
  tier: 'tier-1' | 'tier-2' | 'tier-3' | 'irrelevant'
  tierLabel: string
  reason: string
}

export interface ResumeScore {
  score: number
  level: 'new-grad' | 'junior' | 'mid' | 'senior' | 'staff'
  reasons: string[]
  companySummary: string
  experienceAssessments: ExperienceAssessment[]
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
    return { name: null, skills: [], experience: [], education: [], totalYearsExperience: null }
  }
}

export async function rankRepos(repos: any[], jobSkills: string[]): Promise<string[]> {
  const repoSummaries = repos.map(repo => {
    const ageInDays = Math.floor(
      (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    const lifespanDays = Math.floor(
      (new Date(repo.pushed_at).getTime() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return `- name: "${repo.name}"
  description: "${repo.description || 'none'}"
  language: "${repo.language || 'none'}"
  size: ${repo.size}KB
  stars: ${repo.stargazers_count}
  age: ${ageInDays} days old
  active lifespan: ${lifespanDays} days (from creation to last push)
  topics: ${repo.topics?.join(', ') || 'none'}`
  }).join('\n')

  const prompt = `You are a senior engineering manager helping a recruiter choose which GitHub repositories are worth deep analysis for a candidate.

${jobSkills.length > 0 ? `Job requires: ${jobSkills.join(', ')}` : 'No specific job requirements provided.'}

Here are the candidate's repositories:
${repoSummaries}

Pick the best 6 repositories to analyze deeply. Prioritize:
- Real projects with meaningful descriptions and clear purpose
- Projects that show engineering depth (systems, APIs, full-stack apps, ML pipelines)
- Projects relevant to the job requirements if provided
- Repos with longer active lifespan (creation to last push gap) — shows sustained work
- Repos with descriptive names that clearly indicate a real product or tool
- Larger repos tend to have more code and complexity

Deprioritize:
- Course assignments (CS3113, hw1, assignment2, lab3 etc.) — these are homework not real projects
- Tutorial follows or clones (todo app, weather app, basic calculator)
- Truly empty repos (size under 10KB with no description)

Do NOT deprioritize based on:
- Repo age — a new repo can be a serious project
- Repo size — a well-architected project can be small
- Lack of stars — most good personal projects have 0 stars

The name and description are the strongest signals. A repo called "candidate-analyzer" that cross-references resumes against GitHub activity is clearly a real project regardless of age or size.

Return JSON only, no other text:
{
  "selectedRepos": ["repo_name_1", "repo_name_2", "repo_name_3", "repo_name_4", "repo_name_5", "repo_name_6"],
  "reasoning": "<one sentence explaining your selection>"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    console.log('Claude repo ranking reasoning:', result.reasoning)
    return result.selectedRepos || repos.slice(0, 6).map((r: any) => r.name)
  } catch {
    return repos.slice(0, 6).map((r: any) => r.name)
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
${repo.readme ? `README excerpt:\n${repo.readme.slice(0, 800).replace(/[`{}]/g, '')}` : ''}

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
    console.error('assessRepoDepth parse error for', repo.name, ':', text)
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
- Use your knowledge of the ecosystem to recognize alternative package names — mongoose means MongoDB, pg means PostgreSQL, pymysql means MySQL, ioredis means Redis, socket.io means WebSockets, @angular/core means Angular, react-native means React Native, and so on for all technologies

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

  const prompt = `You are a technical recruiter assistant. Write a concise 3-4 sentence candidate summary for a recruiter.

Candidate: ${candidateName}
Overall score: ${overallScore}/100
Years of experience: ${parsedResume.totalYearsExperience ?? 'unknown'}
Skills claimed on resume: ${resumeClaimedSkills}
Skills confirmed by GitHub: ${githubConfirmedSkills}
Skills claimed but not confirmed by GitHub: ${missingEvidence}

Top repos with specific evidence:
${topRepos.map(r => `- ${r.repoName} (${r.engineeringLevel || 'unknown'}): ${r.depthReasons?.[0] || 'no detail available'}
  Engineering level reason: ${r.engineeringLevelReason || 'none'}`).join('\n')}

${jobPosting ? `Job context: ${jobPosting.slice(0, 500)}` : ''}

Rules:
- Reference specific evidence from the repo details above — name actual technical signals like "JWT authentication", "WebSocket implementation", "API integration"
- Mention the engineering level per repo with the specific reason why
- Highlight where GitHub confirms resume claims and where it does not
- Do not use generic phrases like "strong candidate", "great fit", or "solid skills"
- Be direct and evidence-based — a recruiter needs to decide whether to interview this person
- 3-4 sentences maximum`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function scoreResume(parsedResume: ParsedResume): Promise<ResumeScore> {
  if (!parsedResume.experience || parsedResume.experience.length === 0) {
    return {
      score: 0,
      level: 'new-grad',
      reasons: ['No work experience found on resume'],
      companySummary: 'No experience listed',
      experienceAssessments: []
    }
  }

  const experienceSummary = parsedResume.experience.map(e =>
    `- ${e.role} at ${e.company}${e.durationYears ? ` (${e.durationYears} years)` : ''}`
  ).join('\n')

  const prompt = `You are a technical recruiter evaluating the work experience section of a software engineering candidate's resume.

Candidate experience:
${experienceSummary}

Total years of experience: ${parsedResume.totalYearsExperience ?? 'unknown'}
Education: ${parsedResume.education.map(e => `${e.degree} at ${e.school}`).join(', ') || 'none listed'}

Return JSON only, no other text:
{
  "score": <0-40 total>,
  "level": "<new-grad|junior|mid|senior|staff>",
  "reasons": [<2-3 overall reasons>],
  "companySummary": "<one sentence describing the overall experience>",
  "experienceAssessments": [
    {
      "company": "<company name>",
      "role": "<role title>",
      "score": <0-10>,
      "tier": "<tier-1|tier-2|tier-3|irrelevant>",
      "tierLabel": "<e.g. 'Top-tier tech', 'Series B startup', 'Unknown company', 'Non-technical role'>",
      "reason": "<one specific sentence about what this role signals about the candidate>"
    }
  ]
}

CRITICAL — HOW TO CALCULATE THE TOTAL SCORE:
The "score" field (0-40) is a HOLISTIC assessment. It is NOT the sum of individual position scores.
Do NOT add up the per-position scores to get the total. That would be wrong.
The total score uses this scale based on overall experience quality:

- 0-8: No experience or irrelevant roles only
- 9-14: One or two very short internships at unknown companies (less than 6 months total)
- 15-20: Two decent internships at tier-3 companies, OR one strong internship at tier-2
- 21-28: Multiple strong internships, OR 1+ years full-time at a reputable company
- 29-35: Several strong internships at tier-1/tier-2, OR 2+ years full-time progression
- 36-40: Senior full-time at tier-1 companies or exceptional career trajectory

Example to illustrate: A candidate with two 3-month internships at unknown companies
scores 5/10 and 5/10 per position, but their TOTAL score should be around 10-12/40
because their overall experience package is minimal — NOT 10/40 because 5+5=10.
The total must reflect the full picture: duration, progression, company quality, relevance.

Per-position scoring (0-10) — these are INDEPENDENT signals, not components of the total:
- 0-2: irrelevant role or no technical work
- 3-4: minor technical exposure at unknown company
- 5-6: real SWE work at tier-3 or short internship at tier-2
- 7-8: strong internship at tier-2 or full-time at tier-3
- 9-10: internship at tier-1 (FAANG/OpenAI/Stripe etc.) or senior full-time at tier-2

Company tiers:
- Tier 1: Google, Meta, Apple, Amazon, Microsoft, Netflix, OpenAI, Anthropic, Stripe, Coinbase, Airbnb, Uber, etc.
- Tier 2: Well-known startups (Series B+), major banks tech divisions, top consulting firms
- Tier 3: Unknown startups, small companies, research labs
- Irrelevant: Non-technical roles, marketing, sales, operations

Make sure experienceAssessments has one entry per position listed above, in the same order.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      score: 10,
      level: 'new-grad',
      reasons: ['Could not assess experience'],
      companySummary: 'Could not assess',
      experienceAssessments: parsedResume.experience.map(e => ({
        company: e.company,
        role: e.role,
        score: 5,
        tier: 'tier-3' as const,
        tierLabel: 'Unknown company',
        reason: 'Could not assess this position'
      }))
    }
  }
}