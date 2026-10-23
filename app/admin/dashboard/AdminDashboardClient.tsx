'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminDashboard.module.css';

interface Session {
  user: {
    id: string;
    name: string;
    accountType: string;
  };
}

interface Props {
  session: Session;
}

export default function AdminDashboardClient({ session }: Props) {
  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1 className={styles.logoText}>NEXUS CYPHER</h1>
            <span className={styles.logoSubtext}>Admin Dashboard</span>
          </div>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{session.user.name}</span>
              <span className={styles.userType}>👑 Administrator</span>
            </div>
            <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.welcomeSection}>
          <h2 className={styles.welcomeTitle}>Welcome, Admin!</h2>
          <p className={styles.welcomeText}>
            Control panel for managing teams, challenges, and competition settings.
          </p>
        </div>

        <div className={styles.quickActionsGrid}>
          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>👥</div>
            <h3 className={styles.actionTitle}>Manage Teams</h3>
            <p className={styles.actionDescription}>
              Create team accounts, reset passwords, and manage participants.
            </p>
            <button className={styles.actionButton} onClick={() => router.push('/admin/teams')}>
              Go to Teams
            </button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>🎯</div>
            <h3 className={styles.actionTitle}>Manage Challenges</h3>
            <p className={styles.actionDescription}>
              Create, edit, and organize CTF challenges and categories.
            </p>
            <button className={styles.actionButton} onClick={() => router.push('/admin/challenges')}>
              Go to Challenges
            </button>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>🏆</div>
            <h3 className={styles.actionTitle}>View Leaderboard</h3>
            <p className={styles.actionDescription}>
              Monitor team progress and competition rankings in real-time.
            </p>
            <Link href="/arena/scoreboard" className={styles.actionButton}>
              View Leaderboard
            </Link>
          </div>

          <div className={styles.actionCard}>
            <div className={styles.actionIcon}>⚙️</div>
            <h3 className={styles.actionTitle}>Competition Settings</h3>
            <p className={styles.actionDescription}>
              Configure competition dates, rules, and system settings.
            </p>
            <button className={styles.actionButton} onClick={() => router.push('/admin/settings')}>
              Go to Settings
            </button>
          </div>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>✅</div>
          <div className={styles.infoContent}>
            <h4 className={styles.infoTitle}>Platform Ready</h4>
            <p className={styles.infoText}>
              Core CTF functionality is operational. Teams can compete, submit flags, and track their progress on the scoreboard.
              Use the admin panels to manage teams and challenges.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
