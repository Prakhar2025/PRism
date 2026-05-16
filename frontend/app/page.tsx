'use client'

import { useState, useEffect } from 'react'
import { useAnalysis } from '@/hooks/useAnalysis'
import MergeReadiness from '@/components/MergeReadiness'
import AttentionScoreMap from '@/components/AttentionScoreMap'
import ReviewBrief from '@/components/ReviewBrief'
import RiskPanel from '@/components/RiskPanel'
import SmellDetector from '@/components/SmellDetector'
import ReviewerMatch from '@/components/ReviewerMatch'

const EXAMPLE_PRS = [
  'https://github.com/vercel/next.js/pull/62368',
  'https://github.com/facebook/react/pull/28000',
  'https://github.com/microsoft/vscode/pull/180000',
]

const LOADING_MESSAGES = [
  'Parsing dependency graph...',
  'Computing risk scores...',
  'Analyzing attention patterns...',
  'Detecting code smells...',
  'Matching reviewers...',
  'Generating brief...',
]

const MOCK_DATA = {
  pr_url: 'https://github.com/vercel/next.js/pull/62368',
  pr_title: 'feat: authentication middleware refactor — HS256 to RS256',
  merge_readiness: {
    status: 'YELLOW',
    blocking: ['auth/jwt.go (AS=0.84) has 0 review comments'],
    warnings: ['Friday 5:17pm merge risk'],
    passing: ['CI passing', '2 approvals', 'No dependency CVEs'],
  },
  attention_scores: [
    {
      filename: 'auth/middleware.go',
      score: 0.91,
      interval: 0.04,
      label: 'CRITICAL',
      reasons: ['JWT validation pattern', '14 dependents', '61% bug-fix rate'],
      reviewer_action: 'Review line by line.',
    },
    {
      filename: 'auth/jwt.go',
      score: 0.84,
      interval: 0.06,
      label: 'CRITICAL',
      reasons: ['CVE-adjacent pattern', '8 dependents'],
      reviewer_action: 'Review line by line.',
    },
    {
      filename: 'services/user/handler.go',
      score: 0.52,
      interval: 0.12,
      label: 'MEDIUM',
      reasons: ['Moderate dependencies'],
      reviewer_action: 'Normal review.',
    },
    {
      filename: 'utils/logger.go',
      score: 0.11,
      interval: 0.08,
      label: 'SKIP',
      reasons: ['Logging format only'],
      reviewer_action: 'Approve after confirming intent.',
    },
    {
      filename: 'docs/auth.md',
      score: 0.02,
      interval: 0.01,
      label: 'SKIP',
      reasons: ['Documentation update'],
      reviewer_action: 'Approve after confirming intent.',
    },
  ],
  risk_intelligence: {
    security: {
      score: 0.88,
      label: 'CRITICAL',
      explanation:
        'JWT validation logic modified. Algorithm confusion attack surface.',
      patterns_found: [
        'JWT parse without algorithm check',
        'Authentication middleware change',
      ],
    },
    blast_radius: {
      score: 0.91,
      label: 'CRITICAL',
      explanation:
        'auth/middleware.go imported by 14 files across 6 services.',
      direct_dependents: 14,
      transitive_dependents: 31,
      services_affected: 6,
    },
    dependency: {
      score: 0.12,
      label: 'MINIMAL',
      explanation: 'No new dependencies added.',
      vulnerabilities: [],
    },
    architectural: {
      score: 0.45,
      label: 'MEDIUM',
      explanation: '2 files bypass repository layer with direct SQL.',
      issues: [
        'Direct SQL in handler layer',
        'Bypasses UserRepository abstraction',
      ],
    },
  },
  review_brief: {
    change_summary:
      'This PR migrates JWT signing from HS256 to RS256 to eliminate shared-secret distribution risk across services.',
    focus_areas:
      'auth/middleware.go and auth/jwt.go require line-by-line review. Verify key rotation logic and all 6 downstream services accept the new token format.',
    tradeoffs_made:
      'RS256 adds ~2ms CPU overhead per request vs HS256. Accepted to eliminate shared-secret rotation requiring 6 simultaneous service deployments.',
    what_to_skip:
      'utils/logger.go only adds structured log fields. docs/auth.md reflects new token format only.',
    open_questions:
      'Has key rotation been tested in staging? Are any mobile clients caching JWT validation locally?',
  },
  pr_smells: {
    smells_detected: 2,
    smells: [
      {
        type: 'God PR',
        severity: 'HIGH',
        message: 'Touches auth, services, and docs — 3 functional domains',
      },
      {
        type: 'Friday Merge Risk',
        severity: 'MEDIUM',
        message: 'Friday 5:17pm — incident rate 3x higher',
      },
    ],
    recommendation: 'Consider splitting auth changes from docs updates',
  },
  reviewer_matching: {
    reviewers: [
      {
        username: 'sarah_k',
        score: 8,
        reason: 'Committed to auth/middleware.go 3 times in last 6 months',
        last_activity_days: 12,
      },
      {
        username: 'james_m',
        score: 6,
        reason: 'Committed to auth/jwt.go recently — JWT expertise',
        last_activity_days: 28,
      },
    ],
  },
}

export default function Home() {
  const { state, data, error, analyze } = useAnalysis()
  const [prUrl, setPrUrl] = useState('')
  const [messageIndex, setMessageIndex] = useState(0)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    if (state === 'loading') {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [state])

  const handleAnalyze = () => {
    if (prUrl.trim()) {
      if (useMockData) {
        setTimeout(() => {
          analyze(prUrl)
        }, 2000)
      } else {
        analyze(prUrl)
      }
    }
  }

  const displayData = useMockData && state === 'success' ? MOCK_DATA : data

  if (state === 'idle' || state === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '640px', width: '100%' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
            PR Intelligence, mathematically.
          </h1>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '32px', fontSize: '15px' }}>
            Analyze pull requests with dependency graphs, risk scoring, and attention-based review prioritization.
          </p>

          {error && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: 'var(--red)', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="https://github.com/owner/repo/pull/123"
              style={{
                width: '100%',
                height: '52px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0 120px 0 16px',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button
              onClick={handleAnalyze}
              style={{
                position: 'absolute',
                right: '6px',
                top: '6px',
                height: '40px',
                padding: '0 20px',
                background: 'var(--brand)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Analyze
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {EXAMPLE_PRS.map((url) => (
              <button
                key={url}
                onClick={() => setPrUrl(url)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                {url.split('/').slice(-3).join('/')}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useMockData}
                onChange={(e) => setUseMockData(e.target.checked)}
              />
              Use mock data for demo
            </label>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '40px' }}>
          <input
            type="text"
            value={prUrl}
            disabled
            style={{
              width: '100%',
              height: '40px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0 16px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ marginBottom: '24px' }}>
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="4"
              strokeDasharray="226"
              strokeDashoffset="56"
              strokeLinecap="round"
              style={{
                animation: 'spin 1.5s linear infinite',
              }}
            />
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {LOADING_MESSAGES[messageIndex]}
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  if (state === 'success' && displayData) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div style={{ height: '56px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <input
            type="text"
            value={displayData.pr_url}
            readOnly
            style={{
              flex: 1,
              maxWidth: '640px',
              height: '36px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0 12px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <MergeReadiness data={displayData.merge_readiness} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '20px', marginBottom: '20px' }}>
            <ReviewBrief data={displayData.review_brief} />
            <AttentionScoreMap data={displayData.attention_scores} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <RiskPanel data={displayData.risk_intelligence} />
            <SmellDetector data={displayData.pr_smells} />
            <ReviewerMatch data={displayData.reviewer_matching} />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Made with Bob
