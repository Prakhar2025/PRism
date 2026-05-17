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
  { url: 'https://github.com/expressjs/express/pull/5761', label: 'expressjs/express · #5761' },
  { url: 'https://github.com/vercel/next.js/pull/67350', label: 'vercel/next.js · #67350' },
  { url: 'https://github.com/facebook/react/pull/30794', label: 'facebook/react · #30794' },
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

  // IDLE STATE — full landing page
  if (state === 'idle' || state === 'error') {
    const FEATURES = [
      { icon: '🎯', title: 'Attention Score', desc: 'AS(f) = 0.40·R + 0.35·D + 0.25·C — tells you exactly which files need line-by-line review.' },
      { icon: '🔐', title: 'Security Risk', desc: 'AST pattern matching detects JWT issues, SQL injection, eval(), auth bypass patterns.' },
      { icon: '💥', title: 'Blast Radius', desc: 'Graph centrality shows how many services break if a changed file fails.' },
      { icon: '🧠', title: 'Decision Memory', desc: 'Architectural decisions stored permanently. Search why any change was made, forever.' },
      { icon: '👃', title: 'PR Smell Detection', desc: 'Flags God PRs, missing tests, Friday merges before a single reviewer opens the diff.' },
      { icon: '👥', title: 'Reviewer Matching', desc: 'Recommends reviewers by actual commit history on changed files, not random assignment.' },
    ]

    return (
      <>
        <div className="dot-grid" />
        <div className="hero-orb" />
        <div className="hero-orb-2" />
        <div className="hero-orb-3" />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ── Nav ── */}
          <nav style={{ height: '56px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,8,16,0.7)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>PRism</div>
              <div style={{ height: '14px', width: '1px', background: 'var(--border)' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>OPEN SOURCE BETA</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Free · No account required</span>
              <a href="https://github.com/Prakhar2025/PRism" target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 12px', transition: 'all 150ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                ⭐ GitHub
              </a>
            </div>
          </nav>

          {/* ── Hero ── */}
          <section className="hero-section" style={{ display: 'flex', alignItems: 'center', minHeight: 'calc(100vh - 56px)', padding: '60px 32px', maxWidth: '1400px', margin: '0 auto', gap: '48px' }}>

            {/* Left Column */}
            <div className="hero-left" style={{ flex: '0 0 52%', maxWidth: '52%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-2)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '9999px', padding: '4px 14px 4px 6px', marginBottom: '28px', color: 'var(--text-2)', fontSize: '13px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ background: '#f97316', color: '#fff', fontSize: '11px', fontWeight: 800, width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>P</div>
                Built for AI-native engineering
              </div>

              <h1 style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1.1, color: 'var(--text)', marginBottom: '20px', letterSpacing: '-0.02em' }}>
                The intelligence platform<br />
                for <span style={{ background: 'linear-gradient(135deg, #34d399 0%, #2dd4bf 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  code reviews.
                </span>
              </h1>

              <p style={{ fontSize: '17px', color: 'var(--text-2)', lineHeight: 1.65, maxWidth: '480px', marginBottom: '28px' }}>
                Stop guessing which files matter. PRism computes a mathematical attention score for every changed file — so reviewers know exactly where to focus.
              </p>

              <div className="formula-box">
                AS(f) = 0.40·R(f) + 0.35·D(f) + 0.25·C(f)
              </div>

              {error && (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--red)', fontSize: '14px', width: '100%', maxWidth: '520px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '520px', marginBottom: '14px' }}>
                <input
                  type="text" value={prUrl}
                  onChange={e => setPrUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="input-glow"
                  style={{ flex: 1, height: '52px', background: 'rgba(11,15,26,0.8)', border: '1px solid var(--border-2)', borderRadius: '10px', padding: '0 16px', fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--font-mono), monospace' }}
                />
                <button onClick={handleAnalyze}
                  style={{ height: '52px', padding: '0 24px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 150ms ease', boxShadow: '0 0 20px rgba(79,142,247,0.25)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#3d7ae8'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(79,142,247,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(79,142,247,0.25)' }}>
                  Analyze PR →
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '48px' }}>
                {EXAMPLE_PRS.map(pr => (
                  <button key={pr.url} onClick={() => setPrUrl(pr.url)}
                    style={{ background: 'rgba(11,15,26,0.6)', border: '1px solid var(--border)', borderRadius: '9999px', padding: '4px 12px', fontSize: '11px', color: 'var(--text-3)', transition: 'all 150ms ease', fontFamily: 'var(--font-mono), monospace' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}>
                    {pr.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '40px' }}>
                {[{ n: '4M+', l: 'PRs opened daily' }, { n: '2.5hrs', l: 'avg review time' }, { n: '30–40%', l: 'rework from missed context' }].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono), monospace', color: 'var(--text)' }}>{s.n}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column — Animated Preview */}
            <div className="hero-preview" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="preview-card" style={{ width: '100%', maxWidth: '420px' }}>

                {/* Blocked Banner */}
                <div style={{ background: 'rgba(28,10,10,0.9)', borderBottom: '1px solid rgba(248,113,113,0.2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--critical)', flexShrink: 0 }} className="pulse-red" />
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--critical)', letterSpacing: '0.08em' }}>BLOCKED</div>
                  <div style={{ fontSize: '11px', color: 'rgba(248,113,113,0.7)', marginLeft: 4 }}>Security Risk CRITICAL</div>
                </div>

                {/* Attention Score Map */}
                <div style={{ padding: '14px 16px 10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '12px' }}>ATTENTION SCORE MAP</div>

                  {[
                    { f: 'auth/middleware.go', s: '0.91', l: 'CRITICAL', c: 'var(--critical)', bc: 'var(--critical-bg)', pb: 'pb-1' },
                    { f: 'auth/jwt.go',         s: '0.84', l: 'CRITICAL', c: 'var(--critical)', bc: 'var(--critical-bg)', pb: 'pb-2' },
                    { f: 'services/handler.go', s: '0.52', l: 'MEDIUM',   c: 'var(--medium)',   bc: 'var(--medium-bg)',   pb: 'pb-3' },
                  ].map((file, i) => (
                    <div key={file.f} className={`pf pf-${i+1}`} style={{ borderLeft: `2px solid ${file.c}`, paddingLeft: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono), monospace', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{file.f}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono), monospace', color: file.c }}>{file.s}</span>
                          <span className={`badge badge-${file.l.toLowerCase()} ${file.l === 'CRITICAL' ? 'badge-pulse' : ''}`} style={{ fontSize: '9px', padding: '1px 5px' }}>{file.l}</span>
                        </div>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div className={`pb ${file.pb}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk Mini Section */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '10px' }}>RISK INTELLIGENCE</div>
                  {[
                    { l: 'SECURITY', s: '0.88', pb: 'pb-s' },
                    { l: 'BLAST RADIUS', s: '0.91', pb: 'pb-b' },
                  ].map(r => (
                    <div key={r.l} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--critical)', letterSpacing: '0.06em' }}>{r.l}</span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono), monospace', color: 'var(--critical)' }}>{r.s}</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div className={`pb ${r.pb}`} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '8px 16px 12px', fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono), monospace', textAlign: 'center' }}>
                  powered by PRism — AS(f) = 0.40·R + 0.35·D + 0.25·C
                </div>
              </div>
            </div>
          </section>

          {/* ── Ticker ── */}
          <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(6,8,16,0.4)', padding: '16px 0' }}>
            <div className="ticker-wrap">
              <div className="ticker-track">
                {Array(3).fill(['React', 'Next.js', 'Express', 'Python', 'Go', 'Django', 'FastAPI', 'Node.js', 'TypeScript', 'PostgreSQL']).flat().map((item, i) => (
                  <div key={i} className="ticker-item">
                    <span style={{ color: 'var(--brand)', opacity: 0.8 }}>✦</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Features ── */}
          <section style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--brand)', background: 'rgba(79,142,247,0.1)', padding: '4px 12px', borderRadius: '9999px', marginBottom: '16px' }}>CORE PLATFORM</div>
              <h2 style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '16px' }}>Built for scale.</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-2)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
                Every PR is parsed into an AST, mapped into a dependency graph, and analyzed across 6 dimensions of risk in under 30 seconds.
              </p>
            </div>
            
            <div className="features-grid">
              {FEATURES.map(f => (
                <div key={f.title} className="feature-glass-card">
                  <div className="feature-icon-wrap" style={{ background: 'rgba(79,142,247,0.1)', color: 'var(--brand)' }}>
                    {f.icon}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>{f.title}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Comparison Table ── */}
          <section style={{ padding: '100px 32px', maxWidth: '1000px', margin: '0 auto', borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', marginBottom: '52px' }}>
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--brand)', background: 'rgba(79,142,247,0.1)', padding: '4px 12px', borderRadius: '9999px', marginBottom: '16px' }}>WHY PRISM</div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>A new standard for code review</h2>
            </div>
            
            <div style={{ background: 'var(--bg-2)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th>CAPABILITY</th>
                    <th>PRISM</th>
                    <th>GITHUB NATIVE</th>
                    <th>GENERIC AI BOTS</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Attention Scoring (AS)', 'cmp-check', 'cmp-cross', 'cmp-cross'],
                    ['AST Pattern Matching', 'cmp-check', 'cmp-cross', 'cmp-partial'],
                    ['Dependency Blast Radius', 'cmp-check', 'cmp-cross', 'cmp-cross'],
                    ['Architectural Memory', 'cmp-check', 'cmp-cross', 'cmp-cross'],
                    ['PR Smell Detection', 'cmp-check', 'cmp-cross', 'cmp-partial'],
                    ['Line-by-line Comments', 'cmp-cross', 'cmp-check', 'cmp-check'],
                  ].map((row, i) => (
                    <tr key={i}>
                      <td>{row[0]}</td>
                      <td>{row[1] === 'cmp-check' ? <span className="cmp-check">✓</span> : row[1] === 'cmp-cross' ? <span className="cmp-cross">—</span> : <span className="cmp-partial">~</span>}</td>
                      <td>{row[2] === 'cmp-check' ? <span className="cmp-check">✓</span> : row[2] === 'cmp-cross' ? <span className="cmp-cross">—</span> : <span className="cmp-partial">~</span>}</td>
                      <td>{row[3] === 'cmp-check' ? <span className="cmp-check">✓</span> : row[3] === 'cmp-cross' ? <span className="cmp-cross">—</span> : <span className="cmp-partial">~</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── How it Works ── */}
          <section style={{ padding: '100px 32px', maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', marginBottom: '80px' }}>
              <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--brand)', background: 'rgba(79,142,247,0.1)', padding: '4px 12px', borderRadius: '9999px', marginBottom: '16px' }}>WORKFLOW</div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Three steps to intelligent review</h2>
            </div>
            <div className="hiw-grid">
              {[
                { n: '01', t: 'Paste PR URL', d: 'Any public GitHub PR. No install, no signup, no configuration.' },
                { n: '02', t: 'PRism Analyzes', d: 'Fetches diff, parses AST, builds dependency graph, computes 4 risk dimensions in parallel.' },
                { n: '03', t: 'Review Intelligently', d: 'Get attention scores, review brief, risk panel, PR smells, and reviewer recommendations.' },
              ].map(step => (
                <div key={step.n} style={{ textAlign: 'center', padding: '0 24px' }}>
                  <div className="step-num" style={{ margin: '0 auto 24px', background: 'var(--bg-2)', zIndex: 2, position: 'relative' }}>{step.n}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>{step.t}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.6 }}>{step.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA Section ── */}
          <section className="cta-section" style={{ padding: '100px 32px', textAlign: 'center' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
                Stop guessing. Start knowing.
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-2)', maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.6 }}>
                Join engineers reviewing code with mathematical precision. Open source, free forever, no signup required.
              </p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{ height: '52px', padding: '0 32px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, transition: 'all 150ms ease', boxShadow: '0 0 20px rgba(79,142,247,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3d7ae8'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(79,142,247,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(79,142,247,0.25)' }}>
                Analyze a PR now
              </button>
            </div>
          </section>

          {/* ── Footer ── */}
          <footer style={{ padding: '40px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>PRism</div>
              <div style={{ height: '14px', width: '1px', background: 'var(--border)' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>MIT License · Open Source Beta</div>
            </div>
            <a href="https://github.com/Prakhar2025/PRism" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '13px', color: 'var(--text-3)', transition: 'color 150ms ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
              View source on GitHub →
            </a>
          </footer>

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
