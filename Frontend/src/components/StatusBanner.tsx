interface StatusBannerProps {
  tone: 'error' | 'info' | 'success'
  message: string
}

function StatusBanner({ tone, message }: StatusBannerProps) {
  const toneClass =
    tone === 'error' ? 'status-error' : tone === 'success' ? 'status-success' : 'status-info'
  return (
    <div className={`status-banner ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  )
}

export default StatusBanner
