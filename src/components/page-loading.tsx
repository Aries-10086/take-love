export function PageLoading({ label = "加载中" }: { label?: string }) {
  return (
    <main className="shell">
      <div className="loading-skeleton" aria-busy="true" aria-label={label}>
        <div className="skel skel-line short" />
        <div className="skel skel-line" />
        <div className="skel skel-line mid" />
      </div>
      <div className="loading-skeleton quality-card" aria-hidden="true">
        <div className="skel skel-line short" />
        <div className="skel skel-line" />
        <div className="skel skel-line mid" />
      </div>
    </main>
  );
}
