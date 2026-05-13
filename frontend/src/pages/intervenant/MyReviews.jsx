import { useState, useEffect } from 'react';
import { reviewApi } from '../../services/review.api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Star, MessageSquareReply, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_COACH_REPLY_EDITS = 3;

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

export default function MyReviews() {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], averageRating: null, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState({}); // reviewId → text
  const [replying, setReplying] = useState(null); // reviewId being submitted
  const [editingId, setEditingId] = useState(null); // reviewId currently being edited

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mes avis</h1>
        <p className="text-gray-500 mt-1">
          {data.reviewCount} avis · Note moyenne{' '}
          {data.averageRating !== null ? (
            <span className="font-semibold text-amber-500">{data.averageRating}/5</span>
          ) : (
            '–'
          )}
        </p>
      </div>

      {data.reviews.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun avis pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((review) => {
            const editsUsed = review.coachReplyEdits || 0;
            const editsRemaining = Math.max(0, MAX_COACH_REPLY_EDITS - editsUsed);
            const canEdit = editsRemaining > 0;
            const isEditing = editingId === review.id;

            return (
              <Card key={review.id}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {review.client.firstName} {review.client.lastName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <StarRow rating={review.rating} />
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-sm text-gray-700 italic mb-3">"{review.comment}"</p>
                )}

                {/* Existing reply (display mode) */}
                {review.coachReply && !isEditing && (
                  <div className="pl-4 border-l-2 border-primary-300 mt-3">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-primary-600 flex items-center gap-1">
                        <MessageSquareReply className="w-3.5 h-3.5" />
                        Votre réponse
                      </p>
                      <button
                        type="button"
                        onClick={() => startEdit(review)}
                        disabled={!canEdit}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
                        title={canEdit ? 'Modifier votre réponse' : 'Limite de modifications atteinte'}
                      >
                        <Pencil className="w-3 h-3" />
                        Modifier
                      </button>
                    </div>
                    <p className="text-sm text-gray-700">{review.coachReply}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(review.coachRepliedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {editsUsed > 0 && (
                        <span className="ml-2">
                          · {editsUsed} modification{editsUsed > 1 ? 's' : ''} ({editsRemaining} restante{editsRemaining > 1 ? 's' : ''})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Edit mode (existing reply) */}
                {review.coachReply && isEditing && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier votre réponse
                    </p>
                    <textarea
                      rows={3}
                      value={replyDraft[review.id] || ''}
                      onChange={(e) =>
                        setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))
                      }
                      placeholder="Votre réponse publique…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      {editsRemaining} modification{editsRemaining > 1 ? 's' : ''} restante{editsRemaining > 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleReply(review.id)}
                        disabled={replying === review.id || !replyDraft[review.id]?.trim()}
                        className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors"
                      >
                        {replying === review.id ? 'Envoi…' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(review.id)}
                        disabled={replying === review.id}
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Initial reply (no existing reply) */}
                {!review.coachReply && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <MessageSquareReply className="w-3.5 h-3.5" />
                      Répondre
                    </p>
                    <textarea
                      rows={2}
                      value={replyDraft[review.id] || ''}
                      onChange={(e) =>
                        setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))
                      }
                      placeholder="Votre réponse publique…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={replying === review.id || !replyDraft[review.id]?.trim()}
                      className="mt-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {replying === review.id ? 'Envoi…' : 'Publier'}
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
