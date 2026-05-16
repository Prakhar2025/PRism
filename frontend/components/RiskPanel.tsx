'use client'

import { useState } from 'react'

interface RiskDimension {
  score: number
  label: string
  explanation: string
}

interface RiskPanelProps {
  data: {
    security: RiskDimension
    blast_radius: RiskDimension
    dependency: RiskDimension
    architectural: RiskDimension
  }
}

export default function RiskPanel({ data }: RiskPanelProps) {
  if (!data) {
    return null
  }

  const [expanded, setExpanded] = useState<string | null>(null)

  const dimensions = [
    { key: 'security', title: 'Security Risk', data: data.security },
    { key: 'blast_radius', title: 'Blast Radius', data: data.blast_radius },
    { key: 'dependency', title: 'Dependency Risk', data: data.dependency },
    { key: 'architectural', title: 'Architectural Risk', data: data.architectural },
  ]

  const getColor = (label: string) => {
    const colors = {
      CRITICAL: 'var(--critical)',
      HIGH: 'var(--high)',
      MEDIUM: 'var(--medium)',
      LOW: 'var(--low)',
      MINIMAL: 'var(--skip)',
    }
    return colors[label as keyof typeof colors] || 'var(--border)'
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
        Risk Intelligence
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {dimensions.map((dim) => (
          <div
            key={dim.key}
            className="card"
            style={{
              padding: '16px',
              background: 'var(--surface-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {dim.title}
              </span>
              <span className={`badge-${dim.data.label.toLowerCase()}`}>
                {dim.data.label}
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--border)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: `${dim.data.score * 100}%`,
                  height: '100%',
                  background: getColor(dim.data.label),
                }}
              />
            </div>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                display: '-webkit-box',
                WebkitLineClamp: expanded === dim.key ? 'unset' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {dim.data.explanation}
            </p>

            {dim.data.explanation.length > 100 && (
              <button
                onClick={() => setExpanded(expanded === dim.key ? null : dim.key)}
                style={{
                  marginTop: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--brand)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {expanded === dim.key ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Made with Bob
