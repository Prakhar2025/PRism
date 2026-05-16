interface MergeReadinessProps {
  data: {
    status: 'GREEN' | 'YELLOW' | 'RED'
    blocking: string[]
    warnings: string[]
    passing: string[]
  }
}

export default function MergeReadiness({ data }: MergeReadinessProps) {
  if (!data || !data.status) {
    return null
  }

  const statusConfig = {
    GREEN: {
      color: 'var(--green)',
      bg: 'var(--green-bg)',
      text: 'Ready to Merge',
    },
    YELLOW: {
      color: 'var(--yellow)',
      bg: 'var(--yellow-bg)',
      text: 'Merge with Caution',
    },
    RED: {
      color: 'var(--red)',
      bg: 'var(--red-bg)',
      text: 'Do Not Merge',
    },
  }

  const config = statusConfig[data.status]

  return (
    <div
      style={{
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: `${config.bg}80`,
        borderBottom: `2px solid ${config.color}`,
        borderRadius: 'var(--radius)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: config.color,
          }}
        />
        <span style={{ fontSize: '15px', fontWeight: 600, color: config.color }}>
          {config.text}
        </span>
      </div>

      {data.blocking.length > 0 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {data.blocking.slice(0, 3).map((issue, i) => (
            <div
              key={i}
              style={{
                background: 'var(--critical-bg)',
                border: '1px solid var(--critical)',
                color: 'var(--critical)',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '4px',
              }}
            >
              {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Made with Bob
