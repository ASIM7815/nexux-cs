'use client';

import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Scoreboard.module.css';

interface Ranking {
  id: number;
  teamName: string | null;
  username: string;
  score: number | null;
  lastSolveTime: Date | null;
  solveCount: number;
}

interface Session {
  user: {
    id: string;
    name: string;
    accountType: string;
    teamName: string | null;
  };
}

interface Props {
  rankings: Ranking[];
  session: Session;
}

export default function ScoreboardClient({ rankings: initialRankings, session }: Props) {
  const router = useRouter();
  const [rankings, setRankings] = useState<Ranking[]>(initialRankings);

  // Auto-refresh disabled for stability - data fetches on load only  
  // Uncomment below to enable auto-refresh every 10 seconds
  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/scoreboard', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setRankings(data.rankings);
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      }
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  */

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1 className={styles.logoText}>NEXUS CYPHER</h1>
            <span className={styles.logoSubtext}>CTF Arena</span>
          </div>
          
          <nav className={styles.nav}>
            <button className={styles.navLink} onClick={() => router.push('/arena/challenges')}>
              Challenges
            </button>
            <button className={styles.navLink} onClick={() => router.push('/arena/scoreboard')}>
              Scoreboard
            </button>
            {session.user.accountType === 'admin' && (
              <button className={styles.navLink} onClick={() => router.push('/arena/admin')}>
                Admin
              </button>
            )}
          </nav>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{session.user.teamName || session.user.name}</span>
              <span className={styles.userType}>
                {session.user.accountType === 'admin' ? '👑 Admin' : '👥 Team'}
              </span>
            </div>
            <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h2 className={styles.pageTitle}>🏆 Leaderboard</h2>
          <p className={styles.pageSubtitle}>Top teams ranked by score and solve time</p>
        </div>

        {rankings.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>👥</span>
            <p className={styles.emptyText}>No teams yet. Be the first!</p>
          </div>
        ) : (
          <div className={styles.scoreboardTable}>
            {/* Header Row */}
            <div className={`${styles.scoreboardRow} ${styles.headerRow}`}>
              <div className={styles.rankColumn}>Rank</div>
              <div className={styles.teamColumn}>Team</div>
              <div className={styles.solvedColumn}>Solved</div>
              <div className={styles.scoreColumn}>Score</div>
              <div className={styles.timeColumn}>Last Solve</div>
            </div>

            {/* Data Rows */}
            {rankings.map((ranking, index) => {
              const isCurrentTeam = Boolean(session.user.teamName && ranking.teamName === session.user.teamName);
              const rank = index + 1;
              let medal = '';
              if (rank === 1) medal = '🥇';
              else if (rank === 2) medal = '🥈';
              else if (rank === 3) medal = '🥉';

              return (
                <div
                  key={ranking.id}
                  className={`${styles.scoreboardRow} ${isCurrentTeam ? styles.currentTeam : ''}`}
                >
                  <div className={styles.rankColumn}>
                    <span className={styles.rankNumber}>#{rank}</span>
                    {medal && <span className={styles.medal}>{medal}</span>}
                  </div>
                  <div className={styles.teamColumn}>
                    <span className={styles.teamName}>
                      {ranking.teamName || ranking.username}
                    </span>
                    {isCurrentTeam && <span className={styles.youBadge}>YOU</span>}
                  </div>
                  <div className={styles.solvedColumn}>
                    {ranking.solveCount}
                  </div>
                  <div className={styles.scoreColumn}>
                    <span className={styles.scoreValue}>{ranking.score || 0}</span>
                    <span className={styles.scoreLabel}>pts</span>
                  </div>
                  <div className={styles.timeColumn}>
                    {ranking.lastSolveTime
                      ? new Date(ranking.lastSolveTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
