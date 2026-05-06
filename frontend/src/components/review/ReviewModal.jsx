import { useState } from 'react';
import { reviewApi } from '../../services/review.api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { X, Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReviewModal({ appointment, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Veuillez selectionner une note.');
      return;
    }

    setLoading(true);
    try {
      await reviewApi.create({
        appointmentId: appointment.id,
        rating,
        ...(comment.trim() && { comment: comment.trim() }),
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.(appointment.id);
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi de l\'avis.');
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">Laisser un avis</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Appointment summary */}
          <div className="space-y-1">
            <p className="font-medium text-white">{appointment.service?.name}</p>
            <p className="text-sm text-gray-500">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="font-medium text-white">Merci pour votre avis !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Note</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= displayRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Commentaire <span className="text-gray-500 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Partagez votre experience..."
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{comment.length}/500</p>
              </div>

              <Button
                type="submit"
                loading={loading}
                disabled={rating === 0}
                className="w-full"
              >
                Envoyer mon avis
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
