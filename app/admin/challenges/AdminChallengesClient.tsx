'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminChallenges.module.css';

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Hint {
  id?: string;
  content: string;
  penalty_points: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  points: number;
  flag?: string;
  is_visible: boolean;
  max_attempts: number | null;
  hints?: Hint[];
  attachments?: Array<{ id: number; filename: string; file_url: string; file_size: number }>;
}

interface FormData {
  title: string;
  description: string;
  category_id: string;
  points: number;
  flag: string;
  additionalFlags: string[]; // Array of additional flags
  is_visible: boolean;
  max_attempts: number | null;
  hints: Hint[];
  files: File[];
  replaceAttachments: boolean;
}

export default function AdminChallengesClient() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category_id: '',
    points: 100,
    flag: '',
    additionalFlags: [], // Initialize empty array
    is_visible: true,
    max_attempts: null,
    hints: [],
    files: [],
    replaceAttachments: false,
  });

  useEffect(() => {
    fetchChallenges();
    fetchCategories();
  }, []);

  // Auto-refresh disabled for stability - data fetches on load only
  // Uncomment below to enable auto-refresh every 10 seconds
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      fetchChallenges();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);
  */

  const filteredChallenges = useMemo(() => {
    let filtered = challenges;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category_id === selectedCategory);
    }

    if (visibilityFilter === 'visible') {
      filtered = filtered.filter(c => c.is_visible);
    } else if (visibilityFilter === 'hidden') {
      filtered = filtered.filter(c => !c.is_visible);
    }

    return filtered;
  }, [challenges, selectedCategory, visibilityFilter]);

  async function fetchChallenges() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/challenges/list', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch challenges');
      setChallenges(data.challenges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch('/api/admin/categories/list', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to fetch categories');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  const openCreateModal = () => {
    setEditingChallenge(null);
    setFormData({
      title: '',
      description: '',
      category_id: categories[0]?.id || '',
      points: 100,
      flag: '',
      additionalFlags: [],
      is_visible: true,
      max_attempts: null,
      hints: [],
      files: [],
      replaceAttachments: false,
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const openEditModal = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      category_id: challenge.category_id,
      points: challenge.points,
      flag: '',
      additionalFlags: [],
      is_visible: challenge.is_visible,
      max_attempts: challenge.max_attempts,
      hints: challenge.hints || [],
      files: [],
      replaceAttachments: false,
    });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingChallenge(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      const uploadedAttachments: Array<{ storageKey: string; filename: string; fileSize: number; contentType: string }> = [];

      // Upload file if provided with progress tracking
      if (formData.files.length > 0) {
        setLoading(true);
        setUploadProgress(10);

        for (let index = 0; index < formData.files.length; index += 1) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', formData.files[index]);
          const uploadResponse = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
          const uploadData = await uploadResponse.json().catch(() => ({}));
          if (!uploadResponse.ok || !uploadData.storageKey) {
            throw new Error(uploadData.error || 'Failed to upload file');
          }
          uploadedAttachments.push({
            storageKey: uploadData.storageKey,
            filename: uploadData.filename,
            fileSize: uploadData.fileSize,
            contentType: uploadData.contentType,
          });
          setUploadProgress(10 + Math.round(((index + 1) / formData.files.length) * 80));
        }
      }

      setLoading(true);
      const url = editingChallenge
        ? '/api/admin/challenges/update'
        : '/api/admin/challenges/create';

      const payload = {
        ...formData,
        files: undefined,
        // New challenges always receive the (possibly empty) attachment set.
        // Existing challenges retain their set until the admin explicitly
        // chooses replacement/removal.
        attachments: editingChallenge
          ? (formData.replaceAttachments ? uploadedAttachments : undefined)
          : uploadedAttachments,
        ...(editingChallenge && { id: editingChallenge.id }),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save challenge');
      }

      setUploadProgress(100);
      setSuccess(editingChallenge ? 'Challenge updated successfully!' : 'Challenge created successfully!');
      setLoading(false);

      setTimeout(() => {
        setUploadProgress(0);
        closeModal();
        fetchChallenges();
      }, 1500);
    } catch (err: unknown) {
      setLoading(false);
      setUploadProgress(0);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save challenge';
      setError(errorMessage);
      console.error('Challenge save error:', err);
    }
  };

  const handleDelete = async (challengeId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/challenges/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id: challengeId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete challenge');
      }

      setSuccess('Challenge deleted successfully!');
      fetchChallenges();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete challenge');
      setTimeout(() => setError(''), 3000);
    }
  };

  const addHint = () => {
    setFormData({
      ...formData,
      hints: [...formData.hints, { content: '', penalty_points: 10 }]
    });
  };

  const removeHint = (index: number) => {
    setFormData({
      ...formData,
      hints: formData.hints.filter((_, i) => i !== index)
    });
  };

  const updateHint = (index: number, field: keyof Hint, value: string | number) => {
    const newHints = [...formData.hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setFormData({ ...formData, hints: newHints });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>Loading challenges...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <div className={styles.navigation}>
        <button onClick={() => router.push('/admin/dashboard')} className={styles.backButton}>
          ← Back to Admin Dashboard
        </button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Challenge Management</h1>
        <button onClick={openCreateModal} className={styles.createButton}>
          + Create Challenge
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.filters}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Challenges</option>
          <option value="visible">Visible Only</option>
          <option value="hidden">Hidden Only</option>
        </select>
      </div>

      {filteredChallenges.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No challenges found</h3>
          <p>Create your first challenge to get started</p>
        </div>
      ) : (
        <div className={styles.challengesGrid}>
          {filteredChallenges.map(challenge => (
            <div key={challenge.id} className={styles.challengeCard}>
              <div className={styles.challengeHeader}>
                <div>
                  <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                  <span className={styles.categoryBadge}>
                    {challenge.category_name || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className={styles.challengeInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Points</span>
                  <span className={styles.infoValue}>{challenge.points}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Status</span>
                  <span className={styles.infoValue}>
                    {challenge.is_visible ? '👁️ Visible' : '🔒 Hidden'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Max Attempts</span>
                  <span className={styles.infoValue}>
                    {challenge.max_attempts || 'Unlimited'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Hints</span>
                  <span className={styles.infoValue}>
                    {challenge.hints?.length || 0}
                  </span>
                </div>
              </div>

              <p className={styles.challengeDescription}>{challenge.description}</p>

              <div className={styles.challengeActions}>
                <button
                  onClick={() => openEditModal(challenge)}
                  className={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(challenge.id, challenge.title)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
              </h2>
              <button onClick={closeModal} className={styles.closeButton}>×</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Challenge Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={styles.input}
                  required
                  placeholder="Enter challenge title"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={styles.textarea}
                  required
                  placeholder="Describe the challenge..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className={styles.select}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Points *</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    className={styles.input}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {editingChallenge ? 'New Flag (optional)' : 'Flag (Mandatory) *'}
                </label>
                <input
                  type="text"
                  value={formData.flag}
                  onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                  className={styles.input}
                  required={!editingChallenge}
                  placeholder="flag{example_flag_here}"
                />
                <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                  ⚠️ Flags are never visible to participants - they can only submit attempts
                </p>
              </div>

              {/* Additional Flags Section - NEW! */}
              <div className={styles.additionalFlagsSection}>
                <div className={styles.additionalFlagsHeader}>
                  <label className={styles.label}>Additional Flags (Optional)</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, additionalFlags: [...formData.additionalFlags, ''] })}
                    className={styles.addFlagButton}
                  >
                    + Add Flag
                  </button>
                </div>
                <p className={styles.helpText}>Add alternative flags that also count as correct answers</p>
                {formData.additionalFlags.map((flag, index) => (
                  <div key={index} className={styles.additionalFlagItem}>
                    <input
                      type="text"
                      value={flag}
                      onChange={(e) => {
                        const newFlags = [...formData.additionalFlags];
                        newFlags[index] = e.target.value;
                        setFormData({ ...formData, additionalFlags: newFlags });
                      }}
                      className={styles.input}
                      placeholder={`Alternative flag ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFlags = formData.additionalFlags.filter((_, i) => i !== index);
                        setFormData({ ...formData, additionalFlags: newFlags });
                      }}
                      className={styles.removeFlagButton}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Attempts (optional)</label>
                  <input
                    type="number"
                    value={formData.max_attempts || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      max_attempts: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className={styles.input}
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_visible}
                      onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                      className={styles.checkbox}
                    />
                    <span className={styles.label}>Challenge is visible to teams</span>
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                    Controls whether teams can see this challenge (not the flag)
                  </p>
                </div>
              </div>

              {/* File Upload Section */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Challenge File (Optional)</label>
                {editingChallenge && (editingChallenge.attachments?.length ?? 0) > 0 && !formData.replaceAttachments && (
                  <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(81, 207, 102, 0.1)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.9rem', color: '#51cf66', margin: 0 }}>
                      📎 Current file{editingChallenge.attachments!.length > 1 ? 's' : ''}: {editingChallenge.attachments!.map(file => file.filename).join(', ')}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem', marginBottom: 0 }}>
                      Upload a new file to replace it, or leave empty to keep the current file
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  id="challengeFile"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      if (files.length > 10 || files.some(file => file.size > 50 * 1024 * 1024)) {
                        setError('File too large (max 50MB)');
                        return;
                      }
                      setFormData({ ...formData, files, replaceAttachments: Boolean(editingChallenge) });
                      setError('');
                    }
                  }}
                  className={styles.input}
                  accept=".pdf,.zip,.txt,.jpg,.png,.gif,.mp4,.rar,.7z,.c,.cpp,.py,.js,.java,.go,.rs,.bin"
                  multiple
                />
                {formData.files.length > 0 && (
                  <p style={{ fontSize: '0.9rem', color: '#51cf66', marginTop: '0.5rem' }}>
                    ✓ {formData.files.map(file => `${file.name} (${(file.size / 1024).toFixed(2)} KB)`).join(', ')}
                  </p>
                )}
                {!formData.files.length && !editingChallenge && (
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                    Upload PDF, ZIP, images, videos, or text files (max 50MB)
                  </p>
                )}
                {editingChallenge && (editingChallenge.attachments?.length ?? 0) > 0 && !formData.replaceAttachments && (
                  <button type="button" className={styles.removeFlagButton} onClick={() => setFormData({ ...formData, replaceAttachments: true, files: [] })}>
                    Remove all current files
                  </button>
                )}
              </div>

              <div className={styles.hintsSection}>
                <div className={styles.hintsHeader}>
                  <label className={styles.label}>Hints (optional)</label>
                  <button
                    type="button"
                    onClick={addHint}
                    className={styles.addHintButton}
                  >
                    + Add Hint
                  </button>
                </div>

                {formData.hints.map((hint, index) => (
                  <div key={index} className={styles.hintItem}>
                    <div className={styles.hintHeader}>
                      <span className={styles.label}>Hint {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeHint(index)}
                        className={styles.removeHintButton}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.formGroup}>
                      <textarea
                        value={hint.content}
                        onChange={(e) => updateHint(index, 'content', e.target.value)}
                        className={styles.textarea}
                        placeholder="Hint content..."
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Penalty Points</label>
                      <input
                        type="number"
                        value={hint.penalty_points}
                        onChange={(e) => updateHint(index, 'penalty_points', parseInt(e.target.value))}
                        className={styles.input}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              {/* Upload Progress Bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    height: '30px',
                    position: 'relative'
                  }}>
                    <div style={{
                      background: 'linear-gradient(90deg, #51cf66, #37b24d)',
                      width: `${uploadProgress}%`,
                      height: '100%',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)'
                      }}>
                        {uploadProgress}% {uploadProgress < 30 ? 'Preparing...' : uploadProgress < 70 ? 'Uploading...' : uploadProgress < 100 ? 'Saving...' : 'Complete!'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <span>
                      {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%...` :
                       uploadProgress === 100 ? 'Saving...' :
                       'Processing...'}
                    </span>
                  ) : (
                    editingChallenge ? 'Update Challenge' : 'Create Challenge'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
