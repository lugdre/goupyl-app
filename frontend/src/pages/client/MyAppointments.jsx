import { useState, useEffect, useMemo } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import PaymentModal from '../../components/payment/PaymentModal';
import ReviewModal from '../../components/review/ReviewModal';
import CancellationModal from '../../components/appointment/CancellationModal';
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, Star, CheckCircle, List, LayoutGrid, X } from 'lucide-react';
import { STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const HOURS_48 = 48 * 60 * 60 * 1000;
const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMED', 'DONE', 'CANCELLED'];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const HOUR_HEIGHT = 48;

const STATUS_COLORS = {
  PENDING:   'bg-amber-500/15 border-amber-500/30 text-amber-300',
  CONFIRMED: 'bg-green-500/15 border-green-500/30 text-green-300',
  DONE:      'bg-white/[0.05] border-white/[0.08] text-gray-400',
  CANCELLED: 'bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50',
};

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [payingAppointment, setPayingAppointment] = useState(null);
  const [reviewingAppointment, setReviewingAppointment] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  const fetchAppointments = () => {
    setLoading(true);
    appointmentApi
      .getMyAppointments({ page: 1, limit: 200, ...(statusFilter && { status: statusFilter }) })
      .then(({ data }) => {
        setAppointments(data.appointments);
        const ids = new Set();
        data.appointments.forEach((rdv) => { if (rdv.review) ids.add(rdv.id); });
        setReviewedIds((prev) => { const m = new Set(prev); ids.forEach((id) => m.add(id)); return m; });
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAppointments, [statusFilter]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;

  const weekAppointments = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    return appointments.filter((a) => {
      const d = new Date(a.scheduledAt);
      return d >= weekStart && d < weekEnd && a.status !== 'CANCELLED';
    });
  }, [appointments, weekStart]);

  const apptPosition = (appt) => {
    const d = new Date(appt.scheduledAt);
    const minutesFromStart = (d.getHours() - BUSINESS_START_HOUR) * 60 + d.getMinutes();
    return {
      top: (minutesFromStart / 60) * HOUR_HEIGHT,
      height: (appt.durationMinutes / 60) * HOUR_HEIGHT,
    };
  };

  const hours = Array.from({ length: BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1 }, (_, i) => BUSINESS_START_HOUR + i);

  const canCancel = (rdv) => new Date(rdv.scheduledAt).getTime() - Date.now() >= HOURS_48;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mes rendez-vous</h1>
          <p className="text-gray-500 mt-1">Historique complet de vos séances</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-lg p-1">
          <button
            onClick={() => setView('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'week' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Semaine
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white/[0.05] border border-white/[0.08] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : view === 'week' ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-900 capitalize">{weekLabel}</p>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {weekAppointments.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm">
              Aucun rendez-vous cette semaine
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header */}
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-gray-100 rounded-t-lg overflow-hidden">
                <div className="bg-white" />
                {weekDays.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={idx} className={`px-2 py-2 text-center ${isToday ? 'bg-primary-600/20' : 'bg-[#14152A]'}`}>
                      <p className="text-xs font-medium text-gray-500 uppercase">{DAY_LABELS_SHORT[idx]}</p>
                      <p className={`text-sm font-semibold ${isToday ? 'text-primary-400' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-gray-100">
                <div className="bg-white" style={{ height: hours.length * HOUR_HEIGHT }}>
                  {hours.map((h) => (
                    <div key={h} className="text-[10px] text-gray-400 text-right pr-1 border-t border-gray-100" style={{ height: HOUR_HEIGHT }}>
                      {h}h
                    </div>
                  ))}
                </div>

                {weekDays.map((day, dayIdx) => {
                  const dayAppts = weekAppointments.filter(
                    (a) => new Date(a.scheduledAt).toDateString() === day.toDateString()
                  );
                  return (
                    <div key={dayIdx} className="bg-white relative" style={{ height: hours.length * HOUR_HEIGHT }}>
                      {hours.map((h) => (
                        <div key={h} className="border-t border-gray-100" style={{ height: HOUR_HEIGHT }} />
                      ))}
                      {dayAppts.map((appt) => {
                        const { top, height } = apptPosition(appt);
                        const color = STATUS_COLORS[appt.status] || STATUS_COLORS.PENDING;
                        return (
                          <button
                            key={appt.id}
                            onClick={() => setSelected(appt)}
                            className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left text-[10px] overflow-hidden shadow-sm hover:shadow-md transition-shadow ${color}`}
                            style={{ top, height: Math.max(height - 2, 20) }}
                          >
                            <p className="font-semibold truncate">
                              {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="truncate">{appt.coachService?.name || appt.service?.name}</p>
                            <p className="truncate opacity-75">{appt.intervenant?.firstName} {appt.intervenant?.lastName}</p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : appointments.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun rendez-vous</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {appointments.map((rdv) => (
            <Card key={rdv.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-brand-50 rounded-lg shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-brand-800" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rdv.coachService?.name || rdv.service?.name}</p>
                    <p className="text-sm text-gray-500">Avec {rdv.intervenant.firstName} {rdv.intervenant.lastName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {rdv.notes && <p className="text-xs text-gray-400 mt-1 italic">"{rdv.notes}"</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={rdv.status}>{STATUS_LABELS[rdv.status]}</Badge>
                  {rdv.status === 'CONFIRMED' && rdv.paymentStatus !== 'paid' && !rdv.client?.employerCompanyId && (
                    <Button variant="success" size="sm" onClick={() => setPayingAppointment(rdv)}>
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />Payer
                    </Button>
                  )}
                  {rdv.status === 'CONFIRMED' && !!rdv.client?.employerCompanyId && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-400">
                      <CheckCircle className="w-3 h-3" />Couvert par forfait
                    </span>
                  )}
                  {rdv.paymentStatus === 'paid' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CreditCard className="w-3 h-3" />Payé
                    </span>
                  )}
                  {rdv.status === 'DONE' && (rdv.paymentStatus === 'paid' || !!rdv.client?.employerCompanyId) && !reviewedIds.has(rdv.id) && (
                    <Button variant="secondary" size="sm" onClick={() => setReviewingAppointment(rdv)}>
                      <Star className="w-3.5 h-3.5 mr-1.5" />Laisser un avis
                    </Button>
                  )}
                  {reviewedIds.has(rdv.id) && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                      <CheckCircle className="w-3 h-3" />Avis déposé
                    </span>
                  )}
                  {['PENDING', 'CONFIRMED'].includes(rdv.status) && (
                    canCancel(rdv) ? (
                      <Button variant="danger" size="sm" onClick={() => setCancellingAppointment(rdv)}>Annuler</Button>
                    ) : (
                      <span className="text-xs text-gray-600" title="Annulation impossible — moins de 48h avant la séance">Non annulable</span>
                    )
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal (week view click) */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-surface border border-surface-border rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg text-gray-900">{selected.coachService?.name || selected.service?.name}</p>
                <p className="text-sm text-gray-500">Avec {selected.intervenant?.firstName} {selected.intervenant?.lastName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selected.status}>{STATUS_LABELS[selected.status]}</Badge>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-gray-500 hover:bg-white/[0.05]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-1">
              {new Date(selected.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {selected.durationMinutes ? ` (${selected.durationMinutes} min)` : ''}
            </p>

            {selected.notes && (
              <p className="text-sm text-gray-500 mb-4 p-3 bg-white/[0.04] rounded-lg italic">
                "{selected.notes}"
              </p>
            )}

            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-surface-border">
              {selected.status === 'CONFIRMED' && selected.paymentStatus !== 'paid' && !selected.client?.employerCompanyId && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => { setSelected(null); setPayingAppointment(selected); }}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />Payer
                </Button>
              )}
              {selected.status === 'CONFIRMED' && !!selected.client?.employerCompanyId && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 px-2 py-1.5 bg-primary-500/10 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" />Couvert par votre forfait entreprise
                </span>
              )}
              {selected.status === 'DONE' && (selected.paymentStatus === 'paid' || !!selected.client?.employerCompanyId) && !reviewedIds.has(selected.id) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setSelected(null); setReviewingAppointment(selected); }}
                >
                  <Star className="w-3.5 h-3.5 mr-1.5" />Laisser un avis
                </Button>
              )}
              {['PENDING', 'CONFIRMED'].includes(selected.status) && (
                canCancel(selected) ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => { setSelected(null); setCancellingAppointment(selected); }}
                  >
                    Annuler
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500 self-center">Non annulable (&lt;48h)</span>
                )
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {payingAppointment && (
        <PaymentModal
          appointment={payingAppointment}
          onClose={() => setPayingAppointment(null)}
          onSuccess={() => { toast.success('Paiement effectué avec succès !'); setPayingAppointment(null); fetchAppointments(); }}
        />
      )}
      {reviewingAppointment && (
        <ReviewModal
          appointment={reviewingAppointment}
          onClose={() => setReviewingAppointment(null)}
          onSuccess={(appointmentId) => { setReviewedIds((prev) => new Set(prev).add(appointmentId)); setReviewingAppointment(null); }}
        />
      )}
      {cancellingAppointment && (
        <CancellationModal
          appointment={cancellingAppointment}
          onClose={() => setCancellingAppointment(null)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
}
