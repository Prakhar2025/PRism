'use client'

import { useState } from 'react'

interface ReviewBriefProps {
  data: {
    change_summary: string
    focus_areas: string
    tradeoffs_made: string
    what_to_skip: string
    open_questions: string
  }
}

export default function ReviewBrief({ data }: ReviewBriefProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['change_summary', 'focus_areas', 'tradeoffs_made', 'what_to_skip', 'open_questions'])
  )

  if (!data) return null

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSections(newExpanded)
  }

  const sections = [
    {
      key: 'change_summary',
      label: 'CHANGE SUMMARY',
      content: data.change_summary,
      accent: 'var(--brand)',
    },
    {
      key: 'focus_areas',
      label: 'FOCUS AREAS',
      content: data.focus_areas,
      accent: 'var(--red)',
    },
    {
      key: 'tradeoffs_made',
      label: 'TRADEOFFS MADE',
      content: data.tradeoffs_made,
      accent: 'var(--yellow)',
    },
    {
      key: 'what_to_skip',
      label: 'WHAT TO SKIP',
      content: data.what_to_skip,
      accent: 'var(--green)',
    },
    {
      key: 'open_questions',
      label: 'OPEN QUESTIONS',
      content: data.open_questions,
      accent: 'var(--orange)',
    },
  ]

  const handleExport = () => {
    const markdown = sections
      .map((section) => `## ${section.label}\n\n${section.content}\n`)
      .join('\n')
    
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'review-brief.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isHeuristicFallback =
    typeof data.change_summary === 'string' &&
    (data.change_summary.toLowerCase().includes('unavailable') ||
      data.change_summary.toLowerCase().includes('heuristic'))

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isHeuristicFallback ? '10px' : '16px',
        }}
      >
        <div className="section-label">REVIEW BRIEF</div>
        <button
          onClick={handleExport}
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
            e.currentTarget.style.borderColor = 'var(--brand)'
            e.currentTarget.style.color = 'var(--brand)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          Export MD
        </button>
      </div>

      {/* Amber banner — only when showing heuristic fallback */}
      {isHeuristicFallback && (
        <div
          style={{
            background: 'var(--yellow-bg)',
            border: '1px solid var(--yellow)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--yellow)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ⚡ AI brief unavailable — showing heuristic analysis
        </div>
      )}

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {sections.filter(s => s.content && String(s.content).trim()).map((section) => {
          const isExpanded = expandedSections.has(section.key)

          return (
            <div key={section.key}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  width: '100%',
                  background: 'var(--bg-2)',
                  border: 'none',
                  borderLeft: `3px solid ${section.accent}`,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: section.accent,
                    letterSpacing: '0.08em',
                  }}
                >
                  {section.label}
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
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div
                  className="slide-down"
                  style={{
                    background: 'var(--bg-3)',
                    borderLeft: `3px solid ${section.accent}`,
                    padding: '16px 14px 16px 20px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {section.content}
                  </div>
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
