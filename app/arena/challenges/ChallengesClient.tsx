'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './Challenges.module.css';

interface Challenge {
  id: number;
  title: string;
  description: string;
  categoryId: number | null;
  categoryName: string | null;
  points: number;
  author: string | null;
  displayOrder: number | null;
}

interface Category {
  id: number;
  name: string;
  displayOrder: number | null;
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
  challenges: Challenge[];
  categories: Category[];
  solvedIds: number[];
  session: Session;
}

export default function ChallengesClient({ challenges: initialChallenges, categories, solvedIds: initialSolvedIds, session }: Props) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const challenges = initialChallenges;
  const solvedIds = initialSolvedIds;

  // Auto-refresh disabled for stability - data fetches on load only
  // Uncomment below to enable auto-refresh every 10 seconds
  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/challenges/list', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setChallenges(data.challenges);
          setSolvedIds(data.solvedIds);
        }
      } catch (error) {
        console.error('Failed to fetch challenges:', error);
      }
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  */

  const filteredChallenges = challenges.filter(challenge => {
    const matchesCategory = !selectedCategory || challenge.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (challenge.description && challenge.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const earnedPoints = challenges
    .filter(c => solvedIds.includes(c.id))
    .reduce((sum, c) => sum + c.points, 0);
  const solvedCount = solvedIds.length;

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
              <button className={styles.navLink} onClick={() => router.push('/admin/dashboard')}>
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

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{solvedCount}</span>
          <span className={styles.statLabel}>Solved</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{challenges.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{earnedPoints}</span>
          <span className={styles.statLabel}>Points</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{challenges.length ? Math.round((solvedCount / challenges.length) * 100) : 0}%</span>
          <span className={styles.statLabel}>Progress</span>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.categoryFilters}>
            <button
              className={`${styles.categoryFilter} ${!selectedCategory ? styles.active : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`${styles.categoryFilter} ${selectedCategory === category.id ? styles.active : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Challenges Grid */}
        <div className={styles.challengesGrid}>
          {filteredChallenges.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔍</span>
              <p className={styles.emptyText}>No challenges found</p>
            </div>
          ) : (
            filteredChallenges.map(challenge => {
              const isSolved = solvedIds.includes(challenge.id);
              return (
                <div
                  key={challenge.id}
                  className={`${styles.challengeCard} ${isSolved ? styles.solved : ''}`}
                  onClick={() => router.push(`/arena/challenges/${challenge.id}`)}
                >
                  {isSolved && <div className={styles.solvedBadge}>✓ Solved</div>}
                  
                  <div className={styles.challengeHeader}>
                    <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                    <span className={styles.challengePoints}>{challenge.points} pts</span>
                  </div>

                  <div className={styles.challengeCategory}>
                    {challenge.categoryName || 'Uncategorized'}
                  </div>

                  {challenge.author && (
                    <div className={styles.challengeAuthor}>
                      by {challenge.author}
                    </div>
                  )}

                  <div className={styles.challengeFooter}>
                    <span className={styles.viewChallenge}>View Challenge →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
