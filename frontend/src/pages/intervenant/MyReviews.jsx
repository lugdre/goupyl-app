import { useState, useEffect } from 'react';
import { reviewApi } from '../../services/review.api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import { Star, MessageSquareReply, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_COACH_REPLY_EDITS = 3;

const RV_CSS = `
  .rv-summary{display:flex;align-items:center;gap:20px;flex-wrap:wrap;border:1px solid var(--line);border-radius:18px;padding:22px 24px;background:#fff}
  .rv-avg{display:flex;align-items:baseline;gap:4px}
  .rv-avg-num{font-size:44px;font-weight:700;letter-spacing:-.03em;color:var(--ink);line-height:1}
  .rv-avg-deno{font-size:15px;font-weight:500;color:var(--ink-3)}
  .rv-summary-meta p{margin:0}
  .rv-count{font-size:13px;color:var(--ink-3);margin-top:6px!important}

  .rv-list{display:flex;flex-direction:column;gap:14px}
  .rv-card{border:1px solid var(--line);border-radius:18px;padding:22px 24px;background:#fff}
  .rv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
  .rv-client{font-size:14.5px;font-weight:600;color:var(--ink);margin:0}
  .rv-date{font-size:12px;color:var(--ink-3);margin:3px 0 0}
  .rv-comment{font-size:14px;color:var(--ink-2);line-height:1.65;font-style:italic;margin:0}
  .rv-reply{margin-top:16px;padding-left:14px;border-left:2px solid var(--orange)}
  .rv-reply-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
  .rv-reply-label{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--orange);margin:0}
  .rv-reply-text{font-size:13.5px;color:var(--ink-2);line-height:1.6;margin:0}
  .rv-reply-meta{font-size:11.5px;color:var(--ink-3);margin:8px 0 0}
  .rv-edit-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:var(--ink-3);background:none;border:none;cursor:pointer;padding:0;transition:color .15s}
  .rv-edit-btn:hover:not(:disabled){color:var(--orange)}
  .rv-edit-btn:disabled{opacity:.4;cursor:not-allowed}
  .rv-form{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
  .rv-form-label{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;color:var(--ink-2);margin:0 0 8px}
  .rv-form-actions{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
`;

const StarRow = ({ rating, size = 15 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        fill={i < rating ? '#F4530F' : 'none'}
        color={i < rating ? '#F4530F' : '#c9c7c1'}
      />
    ))}
  </div>
);

export default function MyReviews() {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], averageRating: null, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState({}); // reviewId → texte
  const [replying, setReplying] = useState(null); // reviewId en cours d'envoi
  const [editingId, setEditingId] = useState(null); // reviewId en cours d'édition

  useEffect(() => {
    reviewApi
      .getForIntervenant(user.id)
      .then(({ data: d }) => setData(d))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const handleReply = async (reviewId) => {
    const reply = replyDraft[reviewId]?.trim();
    if (!reply) return;
    setReplying(reviewId);
    try {
      const { data: updated } = await reviewApi.replyToReview(reviewId, reply);
      setData((prev) => ({
        ...prev,
        reviews: prev.reviews.map((r) => (r.id === reviewId ? { ...r, ...updated } : r)),
      }));
      setReplyDraft((d) => ({ ...d, [reviewId]: '' }));
      setEditingId(null);
      toast.success(editingId === reviewId ? 'Réponse modifiée' : 'Réponse publiée');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setReplying(null);
    }
  };

  const startEdit = (review) => {
    setEditingId(review.id);
    setReplyDraft((d) => ({ ...d, [review.id]: review.coachReply || '' }));
  };

  const cancelEdit = (reviewId) => {
    setEditingId(null);
    setReplyDraft((d) => ({ ...d, [reviewId]: '' }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="dsh-page" style={{ maxWidth: 860 }}>
      <style>{RV_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mes avis</h1>
          <p className="dsh-sub">Les retours de vos clients et vos réponses publiques</p>
        </div>
      </div>

      {/* Résumé */}
      <div className="rv-summary">
        <div className="rv-avg">
          <span className="rv-avg-num">
            {data.averageRating !== null ? data.averageRating : '–'}
          </span>
          {data.averageRating !== null && <span className="rv-avg-deno">/5</span>}
        </div>
        <div className="rv-summary-meta">
          <StarRow rating={Math.round(data.averageRating || 0)} size={17} />
          <p className="rv-count">
            {data.reviewCount} avis client{data.reviewCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {data.reviews.length === 0 ? (
        <div className="dsh-empty">
          <Star size={26} />
          Aucun avis pour le moment.
        </div>
      ) : (
        <div className="rv-list">
          {data.reviews.map((review) => {
            const editsUsed = review.coachReplyEdits || 0;
            const editsRemaining = Math.max(0, MAX_COACH_REPLY_EDITS - editsUsed);
            const canEdit = editsRemaining > 0;
            const isEditing = editingId === review.id;

            return (
              <div key={review.id} className="rv-card">
                {/* En-tête */}
                <div className="rv-head">
                  <div>
                    <p className="rv-client">
                      {review.client.firstName} {review.client.lastName}
                    </p>
                    <p className="rv-date">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <StarRow rating={review.rating} />
                </div>

                {/* Commentaire */}
                {review.comment && <p className="rv-comment">"{review.comment}"</p>}

                {/* Réponse existante (affichage) */}
                {review.coachReply && !isEditing && (
                  <div className="rv-reply">
                    <div className="rv-reply-head">
                      <p className="rv-reply-label">
                        <MessageSquareReply size={13} />
                        Votre réponse
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(review)}
                        disabled={!canEdit}
                        className="rv-edit-btn"
                        title={canEdit ? 'Modifier votre réponse' : 'Limite de modifications atteinte'}
                      >
                        <Pencil size={12} />
                        Modifier
                      </button>
                    </div>
                    <p className="rv-reply-text">{review.coachReply}</p>
                    <p className="rv-reply-meta">
                      {new Date(review.coachRepliedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {editsUsed > 0 && (
                        <> · {editsUsed} modification{editsUsed > 1 ? 's' : ''} ({editsRemaining} restante{editsRemaining > 1 ? 's' : ''})</>
                      )}
                    </p>
                  </div>
                )}

                {/* Édition d'une réponse existante */}
                {review.coachReply && isEditing && (
                  <div className="rv-form">
                    <p className="rv-form-label">
                      <Pencil size={13} />
                      Modifier votre réponse
                    </p>
                    <textarea
                      className="dsh-textarea"
                      rows={3}
                      value={replyDraft[review.id] || ''}
                      onChange={(e) => setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))}
                      placeholder="Votre réponse publique…"
                    />
                    <p className="rv-reply-meta">
                      {editsRemaining} modification{editsRemaining > 1 ? 's' : ''} restante{editsRemaining > 1 ? 's' : ''}
                    </p>
                    <div className="rv-form-actions">
                      <button
                        type="button"
                        onClick={() => handleReply(review.id)}
                        disabled={replying === review.id || !replyDraft[review.id]?.trim()}
                        className="dsh-btn dsh-btn--orange dsh-btn--sm"
                      >
                        {replying === review.id ? 'Envoi…' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(review.id)}
                        disabled={replying === review.id}
                        className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                      >
                        <X size={13} />
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Première réponse */}
                {!review.coachReply && (
                  <div className="rv-form">
                    <p className="rv-form-label">
                      <MessageSquareReply size={13} />
                      Répondre
                    </p>
                    <textarea
                      className="dsh-textarea"
                      rows={2}
                      value={replyDraft[review.id] || ''}
                      onChange={(e) => setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))}
                      placeholder="Votre réponse publique…"
                    />
                    <div className="rv-form-actions">
                      <button
                        type="button"
                        onClick={() => handleReply(review.id)}
                        disabled={replying === review.id || !replyDraft[review.id]?.trim()}
                        className="dsh-btn dsh-btn--orange dsh-btn--sm"
                      >
                        {replying === review.id ? 'Envoi…' : 'Publier'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
