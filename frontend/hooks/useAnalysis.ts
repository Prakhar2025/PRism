'use client'

import { useState } from 'react'

type AnalysisState = 'idle' | 'loading' | 'success' | 'error'

interface AnalysisData {
  pr_url: string
  pr_title: string
  merge_readiness: any
  attention_scores: any[]
  risk_intelligence: any
  review_brief: any
  pr_smells: any
  reviewer_matching: any
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>('idle')
  const [data, setData] = useState<AnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (prUrl: string) => {
    setState('loading')
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pr_url: prUrl }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
      setState('success')
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Analysis timed out after 120 seconds')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unknown error occurred')
      }
      setState('error')
    }
  }

  return { state, data, error, analyze }
}

// Made with Bob
