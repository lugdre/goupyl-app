import { useState } from 'react';
import { reviewApi } from '../../services/review.api';
import { MODAL_CSS } from '../ui/modalStyles';
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
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';

  return (
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><Star size={17} /></div>
            <h2 className="gm-title">Laisser un avis</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="gm-body">
          <div className="gm-summary">
            <p className="gm-summary-name">{serviceName}</p>
            <p className="gm-summary-line">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="gm-summary-line">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {submitted ? (
            <div className="gm-success">
              <div className="gm-success-icon"><CheckCircle size={28} /></div>
              <p>Merci pour votre avis !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Note */}
              <div>
                <span className="gm-label">Note</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      style={{
                        background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                        display: 'flex', transition: 'transform .15s ease',
                        transform: star <= displayRating ? 'scale(1.05)' : 'none',
                      }}
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={32}
                        fill={star <= displayRating ? '#F4530F' : 'none'}
                        color={star <= displayRating ? '#F4530F' : '#c9c7c1'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Commentaire */}
              <div>
                <label className="gm-label" htmlFor="reviewComment">
                  Commentaire <em>(optionnel)</em>
                </label>
                <textarea
                  id="reviewComment"
                  className="gm-textarea"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Partagez votre expérience..."
                />
                <p className="gm-count">{comment.length}/500</p>
              </div>

              <button
                type="submit"
                className="gm-btn gm-btn--orange gm-btn--block"
                disabled={loading || rating === 0}
              >
                {loading ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
