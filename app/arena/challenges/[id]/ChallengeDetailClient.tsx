'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChallengeDetail.module.css';

interface Challenge {
  id: number;
  title: string;
  description: string;
  categoryName: string | null;
  points: number;
  author: string | null;
  maxAttempts: number | null;
}

interface Submission {
  id: number;
  isCorrect: boolean;
  submittedAt: Date | null;
}

interface Hint {
  id: number;
  content: string;
  cost: number;
  displayOrder: number | null;
}

interface Attachment {
  id: number;
  filename: string;
  fileUrl: string;
  fileSize: number | null;
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
  challenge: Challenge;
  isSolved: boolean;
  attemptCount: number;
  maxAttempts: number | null;
  submissionHistory: Submission[];
  hints: Hint[];
  unlockedHintIds: number[];
  attachments: Attachment[];
  session: Session;
}

export default function ChallengeDetailClient({
  challenge,
  isSolved,
  attemptCount,
  maxAttempts,
  submissionHistory,
  hints,
  unlockedHintIds,
  attachments,
  session,
}: Props) {
  const router = useRouter();
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unlockingHint, setUnlockingHint] = useState<number | null>(null);

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || submitting) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          challengeId: challenge.id,
          flag: flag.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `🎉 Correct! +${challenge.points} points` });
        setFlag('');
        setTimeout(() => router.refresh(), 1500);
      } else {
        setMessage({ type: 'error', text: data.message || '❌ Incorrect flag' });
      }
    } catch {
      setMessage({ type: 'error', text: '❌ Submission failed. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockHint = async (hintId: number, cost: number) => {
    if (unlockingHint) return;

    if (!confirm(`Unlock this hint for ${cost} points?`)) return;

    setUnlockingHint(hintId);

    try {
      const response = await fetch('/api/hints/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintId }),
      });

      const data = await response.json();

      if (data.success) {
        router.refresh();
      } else {
        alert(data.message || 'Failed to unlock hint');
      }
    } catch {
      alert('Failed to unlock hint');
    } finally {
      setUnlockingHint(null);
    }
  };

  const attemptsRemaining = maxAttempts ? maxAttempts - attemptCount : null;
  const attemptsExceeded = maxAttempts && attemptCount >= maxAttempts;

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
            </div>
            <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <button className={styles.backButton} onClick={() => router.push('/arena/challenges')}>
          ← Back to Challenges
        </button>

        <div className={styles.challengeContainer}>
          {/* Challenge Info */}
          <div className={styles.challengeHeader}>
            <div>
              <h1 className={styles.challengeTitle}>{challenge.title}</h1>
              <div className={styles.challengeMeta}>
                <span className={styles.category}>{challenge.categoryName}</span>
                <span className={styles.points}>{challenge.points} points</span>
                {challenge.author && <span className={styles.author}>by {challenge.author}</span>}
              </div>
            </div>
            {isSolved && <div className={styles.solvedBadge}>✓ Solved</div>}
          </div>

          {/* Description */}
          <div className={styles.descriptionSection}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <div className={styles.description}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{challenge.description}</ReactMarkdown>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className={styles.attachmentsSection}>
              <h2 className={styles.sectionTitle}>📎 Attachments</h2>
              <div className={styles.attachmentsList}>
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachment}
                  >
                    📄 {att.filename}
                    {att.fileSize && <span className={styles.fileSize}>({(att.fileSize / 1024).toFixed(1)} KB)</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Flag Submission */}
          {!isSolved && !attemptsExceeded && (
            <div className={styles.submitSection}>
              <h2 className={styles.sectionTitle}>Submit Flag</h2>
              <form onSubmit={handleSubmitFlag} className={styles.submitForm}>
                <input
                  type="text"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="NEXUS{...}"
                  className={styles.flagInput}
                  disabled={submitting}
                />
                <button type="submit" className={styles.submitButton} disabled={submitting || !flag.trim()}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </form>
              {attemptsRemaining !== null && (
                <div className={styles.attemptsInfo}>
                  Attempts remaining: <strong>{attemptsRemaining}</strong>
                </div>
              )}
              {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                  {message.text}
                </div>
              )}
            </div>
          )}

          {attemptsExceeded && !isSolved && (
            <div className={styles.maxAttemptsReached}>
              ⚠️ Maximum attempts reached for this challenge
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className={styles.hintsSection}>
              <h2 className={styles.sectionTitle}>💡 Hints</h2>
              <div className={styles.hintsList}>
                {hints.map((hint, index) => {
                  const isUnlocked = unlockedHintIds.includes(hint.id);
                  return (
                    <div key={hint.id} className={styles.hint}>
                      <div className={styles.hintHeader}>
                        <span className={styles.hintTitle}>Hint {index + 1}</span>
                        {!isUnlocked && (
                          <button
                            className={styles.unlockButton}
                            onClick={() => handleUnlockHint(hint.id, hint.cost)}
                            disabled={unlockingHint === hint.id}
                          >
                            {unlockingHint === hint.id ? 'Unlocking...' : `Unlock (-${hint.cost} pts)`}
                          </button>
                        )}
                      </div>
                      {isUnlocked ? (
                        <div className={styles.hintContent}>{hint.content}</div>
                      ) : (
                        <div className={styles.hintLocked}>🔒 Locked</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submission History */}
          {submissionHistory.length > 0 && (
            <div className={styles.historySection}>
              <h2 className={styles.sectionTitle}>Submission History</h2>
              <div className={styles.historyList}>
                {submissionHistory.map(sub => (
                  <div key={sub.id} className={`${styles.historyItem} ${sub.isCorrect ? styles.correct : styles.incorrect}`}>
                    <span className={styles.historyFlag}>{sub.isCorrect ? 'Correct submission' : 'Incorrect submission'}</span>
                    <span className={styles.historyStatus}>{sub.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                    <span className={styles.historyTime}>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
