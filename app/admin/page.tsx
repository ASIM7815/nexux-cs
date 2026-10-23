'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './AdminAuth.module.css';

export default function AdminAuthPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRetryCount(prev => prev + 1);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        loginType: 'admin',
        redirect: false,
      });

      if (result?.error) {
        // Check if it's a connection error vs invalid credentials
        if (result.error.includes('fetch') || result.error.includes('timeout')) {
          setError(`Database connection issue (Attempt ${retryCount}). Retrying automatically...`);
          
          // Auto-retry after 2 seconds
          setTimeout(() => {
            if (retryCount < 3) {
              handleSubmit(e);
            } else {
              setError('Connection failed after multiple attempts. Please try again in a moment.');
              setLoading(false);
            }
          }, 2000);
        } else {
          setError('Invalid admin credentials. Check username and password.');
          setLoading(false);
        }
      } else if (result?.ok) {
        // Success - redirect to dashboard
        setRetryCount(0);
        router.push('/admin/dashboard');
        router.refresh();
      } else {
        setError('Authentication failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error instanceof Error ? error.message : 'unknown error');
      setError('Connection error. Please check your internet and try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>👑</div>
          <h1 className={styles.title}>ADMIN ACCESS</h1>
          <p className={styles.subtitle}>Administrative Control Panel</p>
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
              Admin Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              placeholder="Enter admin username"
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter admin password"
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
              'Access Dashboard'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Authorized personnel only. All access is logged.
          </p>
          <div className={styles.footerLinks}>
            <button
              onClick={() => router.push('/')}
              className={styles.backButton}
            >
              ← Back to Home
            </button>
            <button
              onClick={() => router.push('/participantauth')}
              className={styles.participantButton}
            >
              Team Login →
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
