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
  const getInitials = (username: string) => {
    return username
      .split('_')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
        Suggested Reviewers
      </h3>

      {data.reviewers.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '16px 0' }}>
          No reviewer suggestions available
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.reviewers.map((reviewer) => (
            <div
              key={reviewer.username}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  flexShrink: 0,
                }}
              >
                {getInitials(reviewer.username)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                  @{reviewer.username}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {reviewer.reason}
                </div>
              </div>

              <div
                style={{
                  width: '60px',
                  height: '3px',
                  background: 'var(--border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (reviewer.score / 10) * 100)}%`,
                    height: '100%',
                    background: 'var(--brand)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Made with Bob
