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
  const [openSection, setOpenSection] = useState<string>('change_summary')
  const [copied, setCopied] = useState(false)

  const sections = [
    { key: 'change_summary', title: 'Change Summary', color: 'var(--brand)' },
    { key: 'focus_areas', title: 'Focus Areas', color: 'var(--high)' },
    { key: 'tradeoffs_made', title: 'Tradeoffs Made', color: '#8b5cf6' },
    { key: 'what_to_skip', title: 'What To Skip', color: 'var(--text-muted)' },
    { key: 'open_questions', title: 'Open Questions', color: 'var(--green)' },
  ]

  const copyAsMarkdown = () => {
    const markdown = sections
      .map((section) => {
        const content = data[section.key as keyof typeof data]
        return `## ${section.title}\n\n${content}\n`
      })
      .join('\n')

    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
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
        Review Brief
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sections.map((section) => (
          <div key={section.key}>
            <div
              onClick={() =>
                setOpenSection(openSection === section.key ? '' : section.key)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {section.title}
              </span>
              <span
                style={{
                  fontSize: '18px',
                  color: 'var(--text-muted)',
                  transform: openSection === section.key ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                ›
              </span>
            </div>

            {openSection === section.key && (
              <div
                style={{
                  padding: '16px 0 16px 12px',
                  borderLeft: `3px solid ${section.color}`,
                  marginLeft: '4px',
                  marginBottom: '8px',
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: 'var(--text)',
                  }}
                >
                  {data[section.key as keyof typeof data]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={copyAsMarkdown}
        style={{
          marginTop: '16px',
          width: '100%',
          height: '32px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        {copied ? 'Copied!' : 'Copy as Markdown'}
      </button>
    </div>
  )
}

// Made with Bob
