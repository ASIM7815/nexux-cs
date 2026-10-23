'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './ParticipantAuth.module.css';

export default function ParticipantAuthPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (registering) {
        const response = await fetch('/api/teams/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, teamName }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to create team');
        setRegistering(false);
        setError('');
        await signIn('credentials', { username, password, redirect: false });
        router.push('/arena/challenges');
        router.refresh();
        return;
      }
      const result = await signIn('credentials', {
        username,
        password,
        loginType: 'team',
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid team credentials');
        setLoading(false);
      } else {
        // Check if it's an admin trying to login here
        router.push('/arena/challenges');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎯</div>
          <h1 className={styles.title}>PARTICIPANT ACCESS</h1>
          <p className={styles.subtitle}>Team Arena Login</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              {registering ? 'Your Username' : 'Team Username'}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="Enter your team username"
              required
              autoComplete="username"
            />
          </div>

          {registering && (
            <div className={styles.inputGroup}>
              <label htmlFor="teamName" className={styles.label}>Team Name</label>
              <input id="teamName" type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className={styles.input} minLength={3} required placeholder="Enter a unique team name" />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Team Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder={registering ? 'At least 8 characters' : 'Enter your team password'}
              minLength={registering ? 8 : undefined}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Authenticating...
              </>
            ) : (
              registering ? 'Create Team' : 'Enter Arena'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            {registering ? 'Registration can be closed by the organizers.' : 'Don\'t have team credentials? Create a team if registration is open.'}
          </p>
          <button onClick={() => { setRegistering(!registering); setError(''); }} className={styles.backButton} type="button">
            {registering ? '← Use existing team login' : 'Create a team →'}
          </button>
          <div className={styles.footerLinks}>
            <button
              onClick={() => router.push('/')}
              className={styles.backButton}
            >
              ← Back to Home
            </button>
            <button
              onClick={() => router.push('/admin')}
              className={styles.adminButton}
            >
              Admin Login →
            </button>
          </div>
        </div>
      </div>

      <div className={styles.background}>
        <div className={styles.grid}></div>
        <div className={styles.glow}></div>
      </div>
    </div>
  );
}
