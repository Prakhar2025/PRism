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
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [showSkip, setShowSkip] = useState(false)

  const skipFiles = data.filter((f) => f.label === 'SKIP')
  const visibleFiles = showSkip ? data : data.filter((f) => f.label !== 'SKIP')

  const getBorderColor = (label: string) => {
    const colors = {
      CRITICAL: 'var(--critical)',
      HIGH: 'var(--high)',
      MEDIUM: 'var(--medium)',
      LOW: 'var(--low)',
      SKIP: 'var(--skip)',
    }
    return colors[label as keyof typeof colors] || 'var(--border)'
  }

  const truncatePath = (path: string) => {
    const parts = path.split('/')
    if (parts.length > 2) {
      return '.../' + parts.slice(-2).join('/')
    }
    return path
  }

  return (
    <div className="card">
      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '16px',
        }}
      >
        Attention Scores
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visibleFiles.map((file) => (
          <div key={file.filename}>
            <div
              onClick={() =>
                setExpandedFile(expandedFile === file.filename ? null : file.filename)
              }
              style={{
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderLeft: `3px solid ${getBorderColor(file.label)}`,
                borderRadius: '0 var(--radius) var(--radius) 0',
                background: expandedFile === file.filename ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (expandedFile !== file.filename) {
                  e.currentTarget.style.background = 'var(--surface-2)'
                }
              }}
              onMouseLeave={(e) => {
                if (expandedFile !== file.filename) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '13px',
                  color: 'var(--text)',
                  maxWidth: '45ch',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={file.filename}
              >
                {truncatePath(file.filename)}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {file.score.toFixed(2)} ± {file.interval.toFixed(2)}
                </span>
                <span className={`badge-${file.label.toLowerCase()}`}>{file.label}</span>
              </div>
            </div>

            {expandedFile === file.filename && (
              <div
                style={{
                  padding: '12px 16px 12px 28px',
                  background: 'var(--surface-2)',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  marginBottom: '4px',
                }}
              >
                {file.reasons.map((reason, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginBottom: i < file.reasons.length - 1 ? '4px' : 0,
                    }}
                  >
                    • {reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {skipFiles.length > 0 && (
        <button
          onClick={() => setShowSkip(!showSkip)}
          style={{
            marginTop: '12px',
            width: '100%',
            padding: '8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          {showSkip ? '↑' : '↓'} {skipFiles.length} files safe to skip
        </button>
      )}
    </div>
  )
}

// Made with Bob
