'use client';

export default function TeamsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
      <div>
        <h1>Teams are temporarily unavailable</h1>
        <p style={{ margin: '1rem 0', color: '#aaa' }}>The database connection could not be completed.</p>
        <button onClick={() => reset()} style={{ padding: '0.7rem 1rem', cursor: 'pointer' }}>Retry</button>
      </div>
    </main>
  );
}
