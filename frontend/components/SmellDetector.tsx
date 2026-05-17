'use client'

interface Smell {
  type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
}

interface SmellDetectorProps {
  data: {
    smells_detected: number
    smells: Smell[]
    recommendation: string
  }
}

export default function SmellDetector({ data }: SmellDetectorProps) {
  if (!data) return null

  const severityConfig = {
    HIGH: { color: 'var(--red)', bg: 'var(--red-bg)', border: 'var(--red)' },
    MEDIUM: { color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'var(--yellow)' },
    LOW: { color: 'var(--blue)', bg: 'var(--blue-bg)', border: 'var(--blue)' },
  }

  // Clean state - no smells
  if (data.smells_detected === 0) {
    return (
      <div className="card">
        <div className="section-label" style={{ marginBottom: '16px' }}>
          PR SMELL DETECTOR
        </div>
        <div
          style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              marginBottom: '8px',
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--green)',
            }}
          >
            No PR smells detected
          </div>
        </div>
      </div>
    )
  }

  // Smells detected
  return (
    <div className="card">
      <div className="section-label" style={{ marginBottom: '16px' }}>
        PR SMELL DETECTOR
      </div>

      {/* Smell Count Banner */}
      <div
        style={{
          background: 'var(--yellow-bg)',
          border: '1px solid var(--yellow)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '24px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono), monospace',
            color: 'var(--yellow)',
          }}
        >
          {data.smells_detected}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--yellow)',
            fontWeight: 600,
          }}
        >
          smell{data.smells_detected !== 1 ? 's' : ''} detected
        </div>
      </div>

      {/* Smell List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {data.smells.map((smell, i) => {
          const config = severityConfig[smell.severity]

          return (
            <div
              key={i}
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${config.border}`,
                borderRadius: '6px',
                padding: '12px 14px',
              }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '6px',
                }}
              >
                {/* Severity Circle */}
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: config.color,
                  }}
                />

                {/* Type */}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {smell.type}
                </div>

                {/* Severity Badge */}
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: config.color,
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    letterSpacing: '0.05em',
                  }}
                >
                  {smell.severity}
                </div>
              </div>

              {/* Message */}
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                }}
              >
                {smell.message}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      {data.recommendation && (
        <div
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-3)',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}
          >
            RECOMMENDATION
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text)',
              lineHeight: 1.5,
            }}
          >
            {data.recommendation}
          </div>
        </div>
      )}
    </div>
  )
}

// Made with Bob
