import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise, paymentApi } from '../../services/payment.api';
import Button from '../ui/Button';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="p-3 bg-amber-500/10 text-amber-700 rounded-xl text-sm">
        Mode test — utilisez la carte 4242 4242 4242 4242
      </div>

      <Button
        type="submit"
        disabled={!stripe || !elements}
        loading={loading}
        className="w-full"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Payer
      </Button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-surface-border flex flex-col max-h-[90vh]" style={{ boxShadow: 'var(--shadow-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Paiement</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Appointment summary */}
          <div className="space-y-2">
            <p className="font-medium text-gray-900">{serviceName}</p>
            <p className="text-sm text-gray-500">
              Avec {appointment.intervenant?.firstName} {appointment.intervenant?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-baseline justify-between pt-2 border-t border-surface-border">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-semibold text-gray-900">{price.toFixed(2)} &euro;</span>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="p-3 bg-white/[0.03] rounded-xl space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Répartition</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">70% au professionnel</span>
              <span className="font-medium text-gray-900">{intervenantShare} &euro;</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">30% plateforme</span>
              <span className="font-medium text-gray-900">{platformFee} &euro;</span>
            </div>
          </div>

          {/* Payment form / success */}
          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="font-medium text-gray-900">Paiement réussi !</p>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'payment',
                currency: 'eur',
                amount: priceInCents,
                paymentMethodTypes: ['card', 'klarna'],
                appearance: {
                  theme: 'stripe',
                  variables: {
                    borderRadius: '12px',
                    colorPrimary: '#252d62',
                  },
                },
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
