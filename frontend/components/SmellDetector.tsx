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
  const maxSeverity = data.smells.length > 0
    ? data.smells.reduce((max, smell) => {
        const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return severityOrder[smell.severity] > severityOrder[max as keyof typeof severityOrder]
          ? smell.severity
          : max
      }, 'LOW' as 'HIGH' | 'MEDIUM' | 'LOW')
    : null

  const bannerConfig = {
    HIGH: { bg: 'var(--red-bg)', border: 'var(--red)', color: 'var(--red)' },
    MEDIUM: { bg: 'var(--yellow-bg)', border: 'var(--yellow)', color: 'var(--yellow)' },
    LOW: { bg: 'var(--low-bg)', border: 'var(--low)', color: 'var(--low)' },
  }

  const getCircleColor = (severity: string) => {
    const colors = {
      HIGH: 'var(--red)',
      MEDIUM: 'var(--yellow)',
      LOW: 'var(--low)',
    }
    return colors[severity as keyof typeof colors] || 'var(--border)'
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
        PR Health
      </h3>

      {data.smells_detected === 0 ? (
        <div
          style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            color: 'var(--green)',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Clean PR structure
        </div>
      ) : (
        <>
          {maxSeverity && (
            <div
              style={{
                background: bannerConfig[maxSeverity].bg,
                border: `1px solid ${bannerConfig[maxSeverity].border}`,
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: bannerConfig[maxSeverity].color, marginBottom: '4px' }}>
                {data.smells_detected} issue{data.smells_detected > 1 ? 's' : ''} detected
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {data.recommendation}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.smells.map((smell, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getCircleColor(smell.severity),
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>
                    {smell.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Made with Bob
