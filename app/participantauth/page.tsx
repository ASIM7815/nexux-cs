'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './ParticipantAuth.module.css';

export default function ParticipantAuthPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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
              Team Username
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
              placeholder="Enter your team password"
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
              'Enter Arena'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Teams are created by administrators only. Contact your organizer if you need credentials.
          </p>
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
