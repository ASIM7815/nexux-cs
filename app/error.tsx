'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center' }}>
      <div>
        <h1>Something went wrong</h1>
        <p style={{ margin: '1rem 0', color: '#aaa' }}>The request could not be completed. Please try again.</p>
        <button onClick={() => reset()} style={{ padding: '0.7rem 1rem', cursor: 'pointer' }}>Try again</button>
      </div>
    </main>
  );
}
