'use client'

import { useState } from 'react'

interface AttentionScore {
  filename: string
  score: number
  interval: number
  label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SKIP'
  reasons: string[]
  reviewer_action: string
}

interface AttentionScoreMapProps {
  data: AttentionScore[]
}

export default function AttentionScoreMap({ data }: AttentionScoreMapProps) {
  if (!data) return null

  const nonSkipFiles = data.filter((f) => f.label !== 'SKIP')
  // If ALL files are SKIP-level, show them all — otherwise the panel looks empty
  const [showSkip, setShowSkip] = useState(nonSkipFiles.length === 0)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const filteredData = showSkip ? data : nonSkipFiles

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename)
    } else {
      newExpanded.add(filename)
    }
    setExpandedFiles(newExpanded)
  }

  const labelConfig = {
    CRITICAL: { color: 'var(--red)', bg: 'var(--red-bg)', border: 'var(--red)' },
    HIGH: { color: 'var(--high)', bg: 'var(--high-bg)', border: 'var(--high)' },
    MEDIUM: { color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'var(--yellow)' },
    LOW: { color: 'var(--brand)', bg: 'var(--low-bg)', border: 'var(--brand)' },
    SKIP: { color: 'var(--text-3)', bg: 'var(--bg-3)', border: 'var(--border)' },
  }

  // Show last 2 path segments — never cut the actual filename, only the prefix
  const formatFilename = (fullPath: string) => {
    const parts = fullPath.split('/')
    if (parts.length <= 2) return { prefix: '', name: fullPath }
    const name = parts[parts.length - 1]
    const parent = parts[parts.length - 2]
    return { prefix: '…/', name: `${parent}/${name}` }
  }

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div className="section-label">ATTENTION SCORE MAP</div>
        <button
          onClick={() => setShowSkip(!showSkip)}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '12px',
            color: 'var(--text-3)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-2)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          {showSkip ? 'Hide' : 'Show'} SKIP files
        </button>
      </div>

      {/* File List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filteredData.map((file) => {
          const config = labelConfig[file.label]
          const isExpanded = expandedFiles.has(file.filename)

          return (
            <div key={file.filename}>
              {/* File Row */}
              <button
                onClick={() => toggleFile(file.filename)}
                style={{
                  width: '100%',
                  background: 'var(--bg-2)',
                  border: 'none',
                  borderLeft: `3px solid ${config.border}`,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background 150ms ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-2)'
                }}
              >
                {/* Left: Filename */}
                <div
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono), monospace',
                    color: 'var(--text)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {(() => {
                    const { prefix, name } = formatFilename(file.filename)
                    return (
                      <>
                        {prefix && (
                          <span style={{ color: 'var(--text-3)' }}>{prefix}</span>
                        )}
                        {name}
                      </>
                    )
                  })()}
                </div>

                {/* Right: Score + Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono), monospace',
                      color: config.color,
                    }}
                  >
                    {file.score.toFixed(2)}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: config.color,
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {file.label}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}
                  >
                    ▼
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  className="slide-down"
                  style={{
                    background: 'var(--bg-3)',
                    borderLeft: `3px solid ${config.border}`,
                    padding: '14px 14px 14px 20px',
                  }}
                >
                  {/* Confidence Interval */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      marginBottom: '10px',
                      fontFamily: 'var(--font-mono), monospace',
                    }}
                  >
                    95% CI: [{(file.score - file.interval).toFixed(2)}, {(file.score + file.interval).toFixed(2)}]
                  </div>

                  {/* Reasons */}
                  <div style={{ marginBottom: '10px' }}>
                    {file.reasons.map((reason, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '13px',
                          color: 'var(--text-2)',
                          marginBottom: '6px',
                          paddingLeft: '12px',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            color: config.color,
                          }}
                        >
                          •
                        </span>
                        {reason}
                      </div>
                    ))}
                  </div>

                  {/* Reviewer Action */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text)',
                      fontWeight: 600,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                    }}
                  >
                    → {file.reviewer_action}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--bg-2)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-mono), monospace',
        }}
      >
        AS(f) = 0.40·R(f) + 0.35·D(f) + 0.25·C(f)
      </div>
    </div>
  )
}

// Made with Bob
