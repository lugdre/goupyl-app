import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise, paymentApi } from '../../services/payment.api';
import { MODAL_CSS, STRIPE_APPEARANCE } from '../ui/modalStyles';
import { X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

function CheckoutForm({ appointment, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    // 1. Validate the Elements form fields
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setLoading(false);
      return;
    }

    // 2. Create the PaymentIntent on the backend
    let clientSecret;
    try {
      const { data } = await paymentApi.createPaymentIntent(appointment.id);
      clientSecret = data.clientSecret;
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de créer le paiement. Vérifiez votre connexion.');
      setLoading(false);
      return;
    }

    // 3. Confirm the payment
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    try {
      await paymentApi.confirmPayment(paymentIntent.id);
    } catch {
      // Non bloquant : le webhook prendra le relais en production
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement />

      {error && (
        <div className="gm-alert gm-alert--err">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="gm-alert gm-alert--warn">
          <AlertCircle size={15} />
          Mode test — utilisez la carte 4242 4242 4242 4242
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="gm-btn gm-btn--orange gm-btn--block"
      >
        <CreditCard size={16} />
        {loading ? 'Paiement en cours…' : 'Payer'}
      </button>
    </form>
  );
}

export default function PaymentModal({ appointment, onClose, onSuccess }) {
  const [paid, setPaid] = useState(false);

  const handleSuccess = () => {
    setPaid(true);
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  };

  const price = Number(appointment.coachService?.price || appointment.service?.price || 0);
  const serviceName = appointment.coachService?.name || appointment.service?.name || 'Séance';
  const intervenantShare = (price * 0.7).toFixed(2);
  const platformFee = (price * 0.3).toFixed(2);
  const priceInCents = Math.round(price * 100);

  return (
    <div className="gm-back" onClick={onClose}>
      <style>{MODAL_CSS}</style>

      <div className="gm" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gm-head">
          <div className="gm-head-left">
            <div className="gm-head-icon"><CreditCard size={17} /></div>
            <h2 className="gm-title">Paiement</h2>
          </div>
          <button type="button" onClick={onClose} className="gm-close" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="gm-body">
          {/* Récapitulatif */}
          <div className="gm-summary">
            <p className="gm-summary-name">{serviceName}</p>
            <p className="gm-summary-line">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="gm-summary-line">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="gm-total">
              <span className="gm-total-label">Total</span>
              <span className="gm-total-value">{price.toFixed(2)} &euro;</span>
            </div>
          </div>

          {/* Répartition */}
          <div>
            <p className="gm-eyebrow">Répartition</p>
            <div className="gm-row">
              <span>70 % au professionnel</span>
              <span>{intervenantShare} &euro;</span>
            </div>
            <div className="gm-row">
              <span>30 % plateforme</span>
              <span>{platformFee} &euro;</span>
            </div>
          </div>

          {/* Formulaire de paiement / succès */}
          {paid ? (
            <div className="gm-success">
              <div className="gm-success-icon"><CheckCircle size={28} /></div>
              <p>Paiement réussi !</p>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'payment',
                currency: 'eur',
                amount: priceInCents,
                paymentMethodTypes: ['card', 'klarna'],
                appearance: STRIPE_APPEARANCE,
              }}
            >
              <CheckoutForm appointment={appointment} onSuccess={handleSuccess} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
