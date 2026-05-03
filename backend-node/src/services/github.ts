import axios from 'axios'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const BASE_URL = 'https://api.github.com'

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json'
}

export async function getRepos(username: string) {
  const response = await axios.get(`${BASE_URL}/users/${username}/repos`, {
    headers,
    params: {
      per_page: 100,
      sort: 'updated'
    }
  })
  return response.data
}

export async function getLanguages(owner: string, repo: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/languages`,
      { headers }
    )
    return Object.keys(response.data)
  } catch {
    return []
  }
}

export async function getFileStructure(owner: string, repo: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/contents/`,
      { headers }
    )
    return response.data.map((f: any) => f.name)
  } catch {
    return []
  }
}

export async function getDependencies(owner: string, repo: string): Promise<string[]> {
  const allDeps: string[] = []

  try {
    // Fetch the full recursive file tree
    const treeResponse = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers }
    )

    // Find all package.json files excluding node_modules
    const packageJsonPaths: string[] = treeResponse.data.tree
      .filter((item: any) =>
        item.type === 'blob' &&
        item.path.endsWith('package.json') &&
        !item.path.includes('node_modules')
      )
      .map((item: any) => item.path)

    // Find all requirements.txt files excluding node_modules
    const requirementsPaths: string[] = treeResponse.data.tree
      .filter((item: any) =>
        item.type === 'blob' &&
        item.path.endsWith('requirements.txt') &&
        !item.path.includes('node_modules')
      )
      .map((item: any) => item.path)

    const allPaths = [...packageJsonPaths, ...requirementsPaths]

    // Fetch each file and extract dependencies
    for (const filePath of allPaths) {
      try {
        const response = await axios.get(
          `${BASE_URL}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers }
        )
        const content = Buffer.from(response.data.content, 'base64').toString()

        if (filePath.endsWith('package.json')) {
          const pkg = JSON.parse(content)
          const deps = [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {})
          ]
          allDeps.push(...deps)
        } else if (filePath.endsWith('requirements.txt')) {
          const deps = content
            .split('\n')
            .filter(Boolean)
            .map((d: string) => d.split('==')[0].trim())
          allDeps.push(...deps)
        }
      } catch {
        // file couldn't be read, skip
      }
    }
  } catch {
    // tree fetch failed, return empty
  }

  return [...new Set(allDeps)]
}

export async function getCommitMessages(owner: string, repo: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/commits`,
      {
        headers,
        params: { per_page: 20 }
      }
    )
    return response.data.map((c: any) => c.commit.message.split('\n')[0])
  } catch {
    return []
  }
}

export async function getCommitActivity(owner: string, repo: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/stats/commit_activity`,
      { headers }
    )
    if (!response.data || response.data.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const retry = await axios.get(
        `${BASE_URL}/repos/${owner}/${repo}/stats/commit_activity`,
        { headers }
      )
      return retry.data || []
    }
    return response.data
  } catch {
    return []
  }
}

export async function getCommitCount(owner: string, repo: string, username: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/contributors`,
      { headers }
    )
    const contributor = response.data.find(
      (c: any) => c.login.toLowerCase() === username.toLowerCase()
    )
    return contributor ? contributor.contributions : 0
  } catch {
    return 0
  }
}

export async function getFullRepoData(owner: string, repo: string, username: string) {
  const [
    languages,
    fileStructure,
    dependencies,
    commitMessages,
    commitActivity,
    commitCount
  ] = await Promise.all([
    getLanguages(owner, repo),
    getFileStructure(owner, repo),
    getDependencies(owner, repo),
    getCommitMessages(owner, repo),
    getCommitActivity(owner, repo),
    getCommitCount(owner, repo, username)
  ])

  return {
    languages,
    fileStructure,
    dependencies,
    commitMessages,
    commitActivity,
    commitCount
  }
}

export async function getReadme(owner: string, repo: string): Promise<string> {
  try {
    const response = await axios.get(
      `${BASE_URL}/repos/${owner}/${repo}/readme`,
      { headers }
    )
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
    return content.slice(0, 1000)
  } catch {
    return ''
  }
}