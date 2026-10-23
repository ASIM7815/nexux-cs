'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './Teams.module.css';

interface Team {
  id: number;
  username: string;
  teamName: string | null;
  score: number | null;
  createdAt: Date | string | null;
}

interface Session {
  user: {
    id: string;
    name: string;
    accountType: string;
  };
}

interface Props {
  teams: Team[];
  session: Session;
}

export default function TeamsClient({ teams: initialTeams, session }: Props) {
  const router = useRouter();
  const [teamList, setTeamList] = useState<Team[]>(initialTeams);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    teamName: '',
  });

  // Auto-refresh disabled for stability - data fetches on load only
  // Uncomment below to enable auto-refresh every 10 seconds
  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/teams/list', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setTeamList(data.teams);
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  */

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setTeamList((currentTeams) => [...currentTeams, data.team]);
        setMessage({ type: 'success', text: `Team "${formData.teamName}" created successfully!` });
        setFormData({ username: '', password: '', confirmPassword: '', teamName: '' });
        setShowCreateModal(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to create team' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/teams/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          teamId: selectedTeam.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.team) {
          setTeamList((currentTeams) => currentTeams.map((team) => (
            team.id === data.team.id ? data.team : team
          )));
        }
        setMessage({ type: 'success', text: 'Team updated successfully!' });
        setFormData({ username: '', password: '', confirmPassword: '', teamName: '' });
        setShowEditModal(false);
        setSelectedTeam(null);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update team' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Delete team "${team.teamName || team.username}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/teams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ teamId: team.id }),
      });

      const data = await response.json();

      if (data.success) {
        setTeamList((currentTeams) => currentTeams.filter((currentTeam) => currentTeam.id !== team.id));
        setMessage({ type: 'success', text: 'Team deleted successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete team' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      username: team.username,
      password: '',
      confirmPassword: '',
      teamName: team.teamName || '',
    });
    setShowEditModal(true);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1 className={styles.logoText}>NEXUS CYPHER</h1>
            <span className={styles.logoSubtext}>Admin Panel</span>
          </div>

          <nav className={styles.nav}>
            <button className={styles.navLink} onClick={() => router.push('/admin/dashboard')}>
              Dashboard
            </button>
            <button className={styles.navLink} onClick={() => router.push('/admin/teams')}>
              Teams
            </button>
            <button className={styles.navLink} onClick={() => router.push('/admin/challenges')}>
              Challenges
            </button>
            <button className={styles.navLink} onClick={() => router.push('/arena/scoreboard')}>
              Scoreboard
            </button>
          </nav>

          <div className={styles.userSection}>
            <span className={styles.userName}>{session.user.name}</span>
            <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h2 className={styles.pageTitle}>👥 Team Management</h2>
          <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
            + Create Team
          </button>
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.teamsGrid}>
          {teamList.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <p className={styles.emptyText}>No teams yet. Create one to get started!</p>
            </div>
          ) : (
            teamList.map(team => (
              <div key={team.id} className={styles.teamCard}>
                <div className={styles.teamHeader}>
                  <h3 className={styles.teamName}>{team.teamName || team.username}</h3>
                  <span className={styles.teamScore}>{team.score || 0} pts</span>
                </div>
                <div className={styles.teamDetails}>
                  <div className={styles.teamDetail}>
                    <span className={styles.detailLabel}>Username:</span>
                    <span className={styles.detailValue}>{team.username}</span>
                  </div>
                  <div className={styles.teamDetail}>
                    <span className={styles.detailLabel}>Created:</span>
                    <span className={styles.detailValue}>
                      {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
                <div className={styles.teamActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => openEditModal(team)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteTeam(team)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Team</h3>
              <button className={styles.closeButton} onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Team Name</label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., Team Alpha"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username (Login)</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., team1"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={styles.input}
                  placeholder="Any password (minimum 1 character)"
                  required
                  minLength={1}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={styles.input}
                  placeholder="Re-enter password"
                  required
                  minLength={1}
                  autoComplete="new-password"
                />
              </div>
              <p className={styles.helpText}>Use at least 8 characters with uppercase, lowercase, and a number.</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Team</h3>
              <button className={styles.closeButton} onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleEditTeam} className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Team Name</label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., Team Alpha"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Username (Login)</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., team1"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={styles.input}
                  placeholder="New password (optional, any length)"
                  minLength={1}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={styles.input}
                  placeholder="Re-enter new password"
                  minLength={1}
                  autoComplete="new-password"
                />
              </div>
              <p className={styles.helpText}>Leave both password fields blank to keep the current password.</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
