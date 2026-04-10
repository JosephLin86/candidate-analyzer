import { Router } from 'express'
import { getRepos } from '../services/github'

const router = Router()

router.post('/', async(req, res) => {
    try{
        const { githubUsername } = req.body

        if(!githubUsername) {
            return res.status(400).json({ error: 'githubUsername is required' })
        }
        const repos = await getRepos(githubUsername)
        res.json({ repos })
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch GitHub data'})

    }
} )

export default router