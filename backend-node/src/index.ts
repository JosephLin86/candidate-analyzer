import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import analyzeRouter from './routes/analyze'



const app = express()
app.use(cors())
app.use(express.json())
app.use('/analyze', analyzeRouter)

app.get('/health', (req, res) => {
    res.json({status: 'ok' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})