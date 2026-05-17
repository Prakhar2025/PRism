'use client'

import { useState } from 'react'

interface RiskDimension {
  score: number
  label: string
  explanation: string
  patterns_found?: string[]
  direct_dependents?: number
  transitive_dependents?: number
  services_affected?: number
  vulnerabilities?: any[]
  issues?: string[]
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
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)

  if (!data) return null

  const dimensions = [
    { key: 'security', label: 'SECURITY', data: data.security, color: 'var(--red)' },
    { key: 'blast_radius', label: 'BLAST RADIUS', data: data.blast_radius, color: 'var(--orange)' },
    { key: 'dependency', label: 'DEPENDENCY', data: data.dependency, color: 'var(--yellow)' },
    { key: 'architectural', label: 'ARCHITECTURAL', data: data.architectural, color: 'var(--blue)' },
  ]

  const getLabelColor = (label: string) => {
    if (label === 'CRITICAL') return 'var(--red)'
    if (label === 'HIGH') return 'var(--orange)'
    if (label === 'MEDIUM') return 'var(--yellow)'
    if (label === 'LOW') return 'var(--blue)'
    return 'var(--text-3)'
  }

  return (
    <div className="card">
      <div className="section-label" style={{ marginBottom: '16px' }}>
        RISK INTELLIGENCE
      </div>

      {/* 2x2 Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {dimensions.map((dim) => {
          const isExpanded = expandedDimension === dim.key
          const labelColor = getLabelColor(dim.data.label)

          return (
            <div key={dim.key}>
              {/* Dimension Card */}
              <button
                onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
                style={{
                  width: '100%',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = dim.color
                  e.currentTarget.style.background = 'var(--bg-3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--bg-2)'
                }}
              >
                {/* Label */}
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: dim.color,
                    letterSpacing: '0.08em',
                    marginBottom: '10px',
                  }}
                >
                  {dim.label}
                </div>

                {/* Score */}
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono), monospace',
                    color: labelColor,
                    marginBottom: '8px',
                  }}
                >
                  {dim.data.score.toFixed(2)}
                </div>

                {/* Score Bar */}
                <div
                  style={{
                    height: '4px',
                    background: 'var(--bg-3)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    className="fill-bar"
                    style={{
                      height: '100%',
                      background: labelColor,
                      width: `${dim.data.score * 100}%`,
                    }}
                  />
                </div>

                {/* Label Badge */}
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: labelColor,
                    letterSpacing: '0.05em',
                  }}
                >
                  {dim.data.label}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  className="slide-down"
                  style={{
                    marginTop: '8px',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px',
                  }}
                >
                  {/* Explanation */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      marginBottom: '12px',
                    }}
                  >
                    {dim.data.explanation}
                  </div>

                  {/* Patterns Found */}
                  {dim.data.patterns_found && dim.data.patterns_found.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-3)',
                          letterSpacing: '0.08em',
                          marginBottom: '6px',
                        }}
                      >
                        PATTERNS FOUND
                      </div>
                      {dim.data.patterns_found.map((pattern, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-2)',
                            marginBottom: '4px',
                            paddingLeft: '12px',
                            position: 'relative',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              left: 0,
                              color: dim.color,
                            }}
                          >
                            •
                          </span>
                          {pattern}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Blast Radius Stats */}
                  {dim.key === 'blast_radius' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      {[
                        { label: 'Direct', value: dim.data.direct_dependents },
                        { label: 'Transitive', value: dim.data.transitive_dependents },
                        { label: 'Services', value: dim.data.services_affected },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono), monospace',
                              color: dim.color,
                            }}
                          >
                            {stat.value}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: 'var(--text-3)',
                              marginTop: '2px',
                            }}
                          >
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Architectural Issues */}
                  {dim.data.issues && dim.data.issues.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-3)',
                          letterSpacing: '0.08em',
                          marginBottom: '6px',
                        }}
                      >
                        ISSUES
                      </div>
                      {dim.data.issues.map((issue, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-2)',
                            marginBottom: '4px',
                            paddingLeft: '12px',
                            position: 'relative',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              left: 0,
                              color: dim.color,
                            }}
                          >
                            •
                          </span>
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vulnerabilities */}
                  {dim.data.vulnerabilities && dim.data.vulnerabilities.length > 0 && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--red)',
                        background: 'var(--red-bg)',
                        border: '1px solid var(--red)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                      }}
                    >
                      {dim.data.vulnerabilities.length} vulnerabilities found
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Made with Bob
