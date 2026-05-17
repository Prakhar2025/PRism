'use client'

interface MergeReadinessProps {
  data: {
    status: 'GREEN' | 'YELLOW' | 'RED'
    blocking: string[]
    warnings: string[]
    passing: string[]
  }
}

export default function MergeReadiness({ data }: MergeReadinessProps) {
  if (!data) return null

  const statusConfig = {
    GREEN: {
      bg: 'var(--green-bg)',
      border: 'var(--green)',
      text: 'var(--green)',
      label: 'READY TO MERGE',
    },
    YELLOW: {
      bg: 'var(--yellow-bg)',
      border: 'var(--yellow)',
      text: 'var(--yellow)',
      label: 'MERGE WITH CAUTION',
    },
    RED: {
      bg: 'var(--red-bg)',
      border: 'var(--red)',
      text: 'var(--red)',
      label: 'BLOCKED',
    },
  }

  const config = statusConfig[data.status]

  return (
    <div
      style={{
        background: config.bg,
        borderTop: `3px solid ${config.border}`,
        borderBottom: `1px solid ${config.border}`,
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pulse Animation */}
      {data.status === 'RED' && (
        <div
          className="pulse-ring"
          style={{
            position: 'absolute',
            top: '50%',
            left: '24px',
            transform: 'translateY(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: config.border,
          }}
        />
      )}

      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        {/* Status Label */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: config.text,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            minWidth: '160px',
          }}
        >
          {config.label}
        </div>

        {/* Blocking Items */}
        {data.blocking.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
            {data.blocking.map((item, i) => (
              <div
                key={i}
                className="badge-critical"
                style={{
                  background: 'var(--red-bg)',
                  border: '1px solid var(--red)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'var(--red)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                🚫 {item}
              </div>
            ))}
          </div>
        )}

        {/* Warning Items */}
        {data.warnings.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
            {data.warnings.map((item, i) => (
              <div
                key={i}
                className="badge-high"
                style={{
                  background: 'var(--yellow-bg)',
                  border: '1px solid var(--yellow)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'var(--yellow)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                ⚠️ {item}
              </div>
            ))}
          </div>
        )}

        {/* Passing Items */}
        {data.passing.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
            {data.passing.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--green-bg)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: 'var(--green)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                ✓ {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Made with Bob
