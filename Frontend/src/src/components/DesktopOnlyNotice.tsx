const DESKTOP_ONLY_MESSAGE =
  'Sorry, this website currently only works on desktop/laptop browsers for now. Please open it on a computer.'

function DesktopOnlyNotice() {
  return (
    <main className="desktop-only-shell" role="main">
      <section className="desktop-only-card" aria-live="polite">
        <p className="desktop-only-kicker">Cat and Dog Classifier</p>
        <h1 className="desktop-only-title">Desktop Only</h1>
        <p className="desktop-only-copy">{DESKTOP_ONLY_MESSAGE}</p>
      </section>
    </main>
  )
}

export default DesktopOnlyNotice
