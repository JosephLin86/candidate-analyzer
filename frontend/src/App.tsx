import { useState } from 'react'
import IntakePage from './pages/IntakePage'
import ResultsPage from './pages/ResultsPage'

export type AnalysisResult = any

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {!result ? (
        <IntakePage onResult={setResult} loading={loading} setLoading={setLoading} />
      ) : (
        <ResultsPage result={result} onReset={() => setResult(null)} />
      )}
    </div>
  )
}

export default App
