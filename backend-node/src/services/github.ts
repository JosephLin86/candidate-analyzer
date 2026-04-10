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

export async function getCommitActivity(owner:string, repo:string) {
    const response = await axios.get(
        `${BASE_URL}/repos/${owner}/${repo}/stats/commit_activity`,
        { headers }
    )
    return response.data
}

export async function getContributorStats(owner: string, repo: string) {
    const response = await axios.get(
        `${BASE_URL}/repo/${owner}/${repo}/stats/contributors`,
        { headers }
    )
    return response.data
}