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
  { url: 'https://github.com/vercel/next.js/pull/62368', label: 'vercel/next.js · #62368' },
  { url: 'https://github.com/facebook/react/pull/28000', label: 'facebook/react · #28000' },
  { url: 'https://github.com/microsoft/vscode/pull/180000', label: 'microsoft/vscode · #180000' },
]

const LOADING_MESSAGES = [
  'Fetching PR diff and commit history...',
  'Parsing AST with tree-sitter...',
  'Building import dependency graph...',
  'Computing R(f) — Security risk score...',
  'Computing D(f) — Blast radius via graph centrality...',
  'Computing C(f) — Code churn ratio...',
  'Calculating AS(f) = 0.40·R + 0.35·D + 0.25·C...',
  'Scanning dependencies against OSV database...',
  'Detecting PR smell patterns...',
  'Matching reviewers by commit history...',
  'Generating structured review brief...',
]

const MOCK_DATA = {
  pr_url: 'https://github.com/vercel/next.js/pull/62368',
  pr_title: 'feat: authentication middleware refactor — HS256 to RS256',
  merge_readiness: {
    status: 'YELLOW' as const,
    blocking: ['auth/jwt.go (AS=0.84) has 0 review comments'],
    warnings: ['Friday 5:17pm merge risk'],
    passing: ['CI passing', '2 approvals', 'No dependency CVEs'],
  },
  attention_scores: [
    {
      filename: 'auth/middleware.go',
      score: 0.91,
      interval: 0.04,
      label: 'CRITICAL' as const,
      reasons: ['JWT validation pattern', '14 dependents', '61% bug-fix rate'],
      reviewer_action: 'Review line by line.',
    },
    {
      filename: 'auth/jwt.go',
      score: 0.84,
      interval: 0.06,
      label: 'CRITICAL' as const,
      reasons: ['CVE-adjacent pattern', '8 dependents'],
      reviewer_action: 'Review line by line.',
    },
    {
      filename: 'services/user/handler.go',
      score: 0.52,
      interval: 0.12,
      label: 'MEDIUM' as const,
      reasons: ['Moderate dependencies'],
      reviewer_action: 'Normal review.',
    },
    {
      filename: 'utils/logger.go',
      score: 0.11,
      interval: 0.08,
      label: 'SKIP' as const,
      reasons: ['Logging format only'],
      reviewer_action: 'Approve after confirming intent.',
    },
    {
      filename: 'docs/auth.md',
      score: 0.02,
      interval: 0.01,
      label: 'SKIP' as const,
      reasons: ['Documentation update'],
      reviewer_action: 'Approve after confirming intent.',
    },
  ],
  risk_intelligence: {
    security: {
      score: 0.88,
      label: 'CRITICAL',
      explanation: 'JWT validation logic modified. Algorithm confusion attack surface.',
      patterns_found: ['JWT parse without algorithm check', 'Authentication middleware change'],
    },
    blast_radius: {
      score: 0.91,
      label: 'CRITICAL',
      explanation: 'auth/middleware.go imported by 14 files across 6 services.',
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
      issues: ['Direct SQL in handler layer', 'Bypasses UserRepository abstraction'],
    },
  },
  review_brief: {
    change_summary: 'This PR migrates JWT signing from HS256 to RS256 to eliminate shared-secret distribution risk across services.',
    focus_areas: 'auth/middleware.go and auth/jwt.go require line-by-line review. Verify key rotation logic and all 6 downstream services accept the new token format.',
    tradeoffs_made: 'RS256 adds ~2ms CPU overhead per request vs HS256. Accepted to eliminate shared-secret rotation requiring 6 simultaneous service deployments.',
    what_to_skip: 'utils/logger.go only adds structured log fields. docs/auth.md reflects new token format only.',
    open_questions: 'Has key rotation been tested in staging? Are any mobile clients caching JWT validation locally?',
  },
  pr_smells: {
    smells_detected: 2,
    smells: [
      {
        type: 'God PR',
        severity: 'HIGH' as const,
        message: 'Touches auth, services, and docs — 3 functional domains',
      },
      {
        type: 'Friday Merge Risk',
        severity: 'MEDIUM' as const,
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
  const [progress, setProgress] = useState(5)

  useEffect(() => {
    if (state === 'loading') {
      const messageInterval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 2500)
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 85))
      }, 350)

      return () => {
        clearInterval(messageInterval)
        clearInterval(progressInterval)
      }
    } else if (state === 'success') {
      setProgress(100)
      setTimeout(() => setProgress(0), 500)
    }
  }, [state])

  const handleAnalyze = () => {
    if (prUrl.trim()) {
      setProgress(5)
      analyze(prUrl)
    }
  }

  const displayData = data || MOCK_DATA

  // IDLE STATE
  if (state === 'idle' || state === 'error') {
    return (
      <>
        <div className="hero-grid" />
        <div className="hero-glow" />
        
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {/* Nav */}
          <nav style={{
            height: '52px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--brand)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              PRism
            </div>
            <a
              href="https://github.com/Prakhar2025/PRism"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: 'var(--text-3)',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
            >
              GitHub
            </a>
          </nav>

          {/* Hero */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 52px)',
            padding: '20px',
          }}>
            <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
              <h1 style={{
                fontSize: 'var(--text-hero)',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '16px',
              }}>
                <div style={{ color: 'var(--text)' }}>PR Intelligence,</div>
                <div className="shimmer-text">mathematically.</div>
              </h1>

              <p style={{
                fontSize: '16px',
                color: 'var(--text-2)',
                lineHeight: 1.6,
                marginBottom: '32px',
              }}>
                Stop guessing which files matter. PRism computes{' '}
                <span style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--brand)', fontSize: '14px' }}>
                  AS(f) = 0.40·R + 0.35·D + 0.25·C
                </span>
                {' '}for every changed file.
              </p>

              {error && (
                <div style={{
                  background: 'var(--red-bg)',
                  border: '1px solid var(--red)',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px',
                  color: 'var(--red)',
                  fontSize: '14px',
                  textAlign: 'left',
                }}>
                  {error}
                </div>
              )}

              {/* Input Row */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="input-glow"
                  style={{
                    flex: 1,
                    height: '52px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    fontSize: '15px',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono), monospace',
                  }}
                />
                <button
                  onClick={handleAnalyze}
                  style={{
                    height: '52px',
                    padding: '0 24px',
                    background: 'var(--brand)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3d7ae8'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--brand)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  Analyze
                </button>
              </div>

              {/* Example Chips */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '64px' }}>
                {EXAMPLE_PRS.map((pr) => (
                  <button
                    key={pr.url}
                    onClick={() => setPrUrl(pr.url)}
                    style={{
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)'
                      e.currentTarget.style.color = 'var(--text)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text-3)'
                    }}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '48px', justifyContent: 'center' }}>
                {[
                  { number: '4M+', label: 'PRs opened daily' },
                  { number: '2.5hrs', label: 'avg review time' },
                  { number: '30-40%', label: 'rework from missed context' },
                ].map((stat) => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono), monospace',
                      color: 'var(--text)',
                    }}>
                      {stat.number}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-3)',
                      marginTop: '4px',
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // LOADING STATE
  if (state === 'loading') {
    return (
      <>
        {/* Progress Bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'var(--border)',
          zIndex: 100,
        }}>
          <div style={{
            height: '100%',
            background: 'var(--brand)',
            width: `${progress}%`,
            transition: 'width 350ms linear',
          }} />
        </div>

        {/* Nav */}
        <nav style={{
          height: '52px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--brand)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            PRism
          </div>
        </nav>

        {/* Loading Display */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 52px)',
        }}>
          {/* Spinner */}
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: '24px' }}>
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--border)"
              strokeWidth="3"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="3"
              strokeDasharray="126"
              strokeDashoffset="32"
              strokeLinecap="round"
              className="spinner"
            />
          </svg>

          {/* Message */}
          <div style={{
            fontSize: '15px',
            color: 'var(--text-2)',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
            maxWidth: '400px',
            transition: 'opacity 300ms ease',
          }}>
            {LOADING_MESSAGES[messageIndex]}
          </div>
        </div>
      </>
    )
  }

  // SUCCESS STATE
  if (state === 'success' && displayData) {
    return (
      <>
        {/* Progress Bar Fade Out */}
        {progress === 100 && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--brand)',
            zIndex: 100,
            opacity: 0,
            transition: 'opacity 500ms ease',
          }} />
        )}

        {/* Header */}
        <header style={{
          height: '52px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--brand)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            PRism
          </div>
          
          <div style={{
            fontSize: '14px',
            color: 'var(--text-2)',
            maxWidth: '400px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayData.pr_title}
          </div>

          <button
            onClick={() => {
              setPrUrl('')
              window.location.reload()
            }}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              height: '32px',
              padding: '0 14px',
              borderRadius: '6px',
              fontSize: '13px',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-2)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-2)'
            }}
          >
            New Analysis
          </button>
        </header>

        {/* Merge Readiness */}
        <MergeReadiness data={displayData.merge_readiness} />

        {/* Main Content */}
        <main style={{
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: '20px',
          }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ReviewBrief data={displayData.review_brief} />
              <RiskPanel data={displayData.risk_intelligence} />
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <AttentionScoreMap data={displayData.attention_scores} />
              <SmellDetector data={displayData.pr_smells} />
              <ReviewerMatch data={displayData.reviewer_matching} />
            </div>
          </div>
        </main>
      </>
    )
  }

  return null
}

// Made with Bob
