'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminSettings.module.css';

interface CompetitionConfig {
  competition_name: string;
  is_active: boolean;
  allow_team_registration: boolean;
  max_team_size: number;
}

export default function AdminSettingsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [config, setConfig] = useState<CompetitionConfig>({
    competition_name: 'NEXUS CYPHER CTF',
    is_active: true,
    allow_team_registration: false,
    max_team_size: 4
  });

  async function fetchConfig() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/get', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadConfig = window.setTimeout(() => {
      void fetchConfig();
    }, 0);
    return () => window.clearTimeout(loadConfig);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/admin/dashboard')} className={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Competition Settings</h1>
        <p className={styles.subtitle}>Configure competition parameters and system behavior</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} className={styles.settingsGrid}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>General Settings</h2>
            <p className={styles.sectionDescription}>
              Basic competition information and branding
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Competition Name</label>
            <input
              type="text"
              value={config.competition_name}
              onChange={(e) => setConfig({ ...config, competition_name: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className={styles.checkbox}
              />
              <span className={styles.label}>Competition is Active</span>
            </label>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
              When inactive, participants cannot submit flags or access challenges
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Team Settings</h2>
            <p className={styles.sectionDescription}>
              Configure team registration and size limits
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={config.allow_team_registration}
                onChange={(e) => setConfig({ ...config, allow_team_registration: e.target.checked })}
                className={styles.checkbox}
              />
              <span className={styles.label}>Allow Self-Registration</span>
            </label>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
              Currently disabled. Teams are created by admin only.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Maximum Team Size</label>
            <input
              type="number"
              value={config.max_team_size}
              onChange={(e) => setConfig({ ...config, max_team_size: parseInt(e.target.value) })}
              className={styles.input}
              min="1"
              max="20"
              required
            />
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
              Maximum number of members per team (1-20)
            </p>
          </div>
        </div>

        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
