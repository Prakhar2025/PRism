'use client'

interface Reviewer {
  username: string
  score: number
  reason: string
  last_activity_days: number
}

interface ReviewerMatchProps {
  data: {
    reviewers: Reviewer[]
  }
}

export default function ReviewerMatch({ data }: ReviewerMatchProps) {
  if (!data || !data.reviewers || data.reviewers.length === 0) return null

  // Generate deterministic color from username
  const getAvatarColor = (username: string) => {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      'var(--brand)',
      'var(--red)',
      'var(--orange)',
      'var(--yellow)',
      'var(--green)',
      'var(--blue)',
    ]
    return colors[Math.abs(hash) % colors.length]
  }

  // Normalize score to 0-100% relative to highest reviewer score
  const maxScore = Math.max(...data.reviewers.map(r => r.score), 1)

  const formatActivity = (days: number) => {
    if (days === 0) return 'Active today'
    if (days === 1) return 'Active yesterday'
    if (days < 30) return `Active ${days}d ago`
    if (days < 365) return `Active ${Math.floor(days / 30)}mo ago`
    return `Active ${Math.floor(days / 365)}y ago`
  }

  const getInitials = (username: string) => {
    const parts = username.split(/[_\-.]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return username.slice(0, 2).toUpperCase()
  }

  return (
    <div className="card">
      <div className="section-label" style={{ marginBottom: '16px' }}>
        REVIEWER MATCHING
      </div>

      {/* Reviewer List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.reviewers.map((reviewer) => {
          const avatarColor = getAvatarColor(reviewer.username)
          const initials = getInitials(reviewer.username)

          return (
            <div
              key={reviewer.username}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                transition: 'all 150ms ease',
              }}
            >
              {/* Top Row: Avatar + Username + Score */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                {/* Avatar Circle */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'var(--font-mono), monospace',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Username */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontFamily: 'var(--font-mono), monospace',
                      marginBottom: '2px',
                    }}
                  >
                    {reviewer.username}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-3)',
                    }}
                  >
                    {formatActivity(reviewer.last_activity_days)}
                  </div>
                </div>

                {/* Score */}
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono), monospace',
                    color: avatarColor,
                  }}
                >
                  {reviewer.score}
                </div>
              </div>

              {/* Score Bar */}
              <div
                style={{
                  height: '4px',
                  background: 'var(--bg-3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '10px',
                }}
              >
                <div
                  className="fill-bar"
                  style={{
                    height: '100%',
                    background: avatarColor,
                    width: `${Math.min(100, (reviewer.score / maxScore) * 100)}%`,
                  }}
                />
              </div>

              {/* Reason */}
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                }}
              >
                {reviewer.reason}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Note */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: 'var(--bg-3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-3)',
          lineHeight: 1.5,
        }}
      >
        Scores based on commit history, file ownership, and recent activity
      </div>
    </div>
  )
}

// Made with Bob
