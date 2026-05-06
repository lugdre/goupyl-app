import { useState, useEffect, useMemo } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import { reviewApi } from '../../services/review.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Calendar, ChevronLeft, ChevronRight, List, LayoutGrid, Star } from 'lucide-react';
import { STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMED', 'DONE', 'CANCELLED'];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const HOUR_HEIGHT = 48; // px per hour in week view

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const STATUS_COLORS = {
  PENDING:   'bg-amber-500/15 border-amber-500/30 text-amber-300',
  CONFIRMED: 'bg-green-500/15 border-green-500/30 text-green-300',
  DONE:      'bg-white/[0.05] border-white/[0.08] text-gray-400',
  CANCELLED: 'bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50',
};

export default function MyAgenda() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('week'); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null); // review for the selected DONE appointment
  const [reviewLoading, setReviewLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    appointmentApi
      .getMyAppointments({ page: 1, limit: 200, ...(statusFilter && { status: statusFilter }) })
      .then(({ data }) => setAppointments(data.appointments))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [statusFilter]);

  const openModal = async (appt) => {
    setSelected(appt);
    setSelectedReview(null);
    setReplyText('');
    if (appt.status === 'DONE') {
      setReviewLoading(true);
      try {
        const { data } = await reviewApi.getByAppointmentAsIntervenant(appt.id);
        setSelectedReview(data);
      } catch {
        setSelectedReview(null);
      } finally {
        setReviewLoading(false);
      }
    }
  };

  const handleAction = async (id, action) => {
    try {
      await appointmentApi.updateStatus(id, action);
      toast.success('RDV mis a jour');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedReview) return;
    setReplyLoading(true);
    try {
      const { data } = await reviewApi.replyToReview(selectedReview.id, replyText.trim());
      setSelectedReview(data);
      toast.success('Réponse publiée');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setReplyLoading(false);
    }
  };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })}`;

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
    const top = (minutesFromStart / 60) * HOUR_HEIGHT;
    const height = (appt.durationMinutes / 60) * HOUR_HEIGHT;
    return { top, height };
  };

  const hours = Array.from({ length: BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1 }, (_, i) => BUSINESS_START_HOUR + i);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mon agenda</h1>
          <p className="text-gray-500 mt-1">Tous vos rendez-vous</p>
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
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-sm font-medium text-gray-900 capitalize">{weekLabel}</p>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-gray-100 rounded-t-lg overflow-hidden">
                <div className="bg-white" />
                {weekDays.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={idx} className={`px-2 py-2 text-center ${isToday ? 'bg-primary-600/20' : 'bg-[#14152A]'}`}>
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        {DAY_LABELS_SHORT[idx]}
                      </p>
                      <p className={`text-sm font-semibold ${isToday ? 'text-primary-400' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-gray-100">
                {/* Hour labels column */}
                <div className="bg-white" style={{ height: hours.length * HOUR_HEIGHT }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="text-[10px] text-gray-400 text-right pr-1 border-t border-gray-100"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {h}h
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIdx) => {
                  const dayAppts = weekAppointments.filter(
                    (a) => new Date(a.scheduledAt).toDateString() === day.toDateString()
                  );
                  return (
                    <div
                      key={dayIdx}
                      className="bg-white relative"
                      style={{ height: hours.length * HOUR_HEIGHT }}
                    >
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="border-t border-gray-100"
                          style={{ height: HOUR_HEIGHT }}
                        />
                      ))}
                      {dayAppts.map((appt) => {
                        const { top, height } = apptPosition(appt);
                        const color = STATUS_COLORS[appt.status] || STATUS_COLORS.PENDING;
                        return (
                          <button
                            key={appt.id}
                            onClick={() => openModal(appt)}
                            className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-left text-[10px] overflow-hidden shadow-sm hover:shadow-md transition-shadow ${color}`}
                            style={{ top, height: Math.max(height - 2, 20) }}
                          >
                            <p className="font-semibold truncate">
                              {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="truncate">
                              {appt.client.firstName} {appt.client.lastName}
                            </p>
                            <p className="truncate opacity-75">
                              {appt.coachService?.name || appt.service?.name}
                            </p>
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
                <div>
                  <p className="font-medium text-gray-900">{rdv.coachService?.name || rdv.service?.name}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    Client : {rdv.client.firstName} {rdv.client.lastName}
                    {rdv.client.employerCompanyId && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 bg-primary-500/15 text-primary-400 rounded-md">
                        Entreprise
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {' '}({rdv.durationMinutes}min)
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={rdv.status}>{STATUS_LABELS[rdv.status]}</Badge>
                  <div className="flex gap-1">
                    {rdv.status === 'PENDING' && (
                      <>
                        <Button size="sm" variant="success" onClick={() => handleAction(rdv.id, 'CONFIRMED')}>Confirmer</Button>
                        <Button size="sm" variant="danger" onClick={() => handleAction(rdv.id, 'CANCELLED')}>Annuler</Button>
                      </>
                    )}
                    {rdv.status === 'CONFIRMED' && (
                      <>
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAction(rdv.id, 'DONE')}
                            disabled={rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId}
                            title={rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId ? 'Le client doit payer avant de clôturer' : ''}
                          >
                            Terminer
                          </Button>
                          {rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId && (
                            <span className="text-xs text-amber-600 font-medium">En attente de paiement</span>
                          )}
                          {rdv.client.employerCompanyId && (
                            <span className="text-xs text-primary-400 font-medium">Paiement via Goupyl Sport</span>
                          )}
                        </div>
                        <Button size="sm" variant="danger" onClick={() => handleAction(rdv.id, 'CANCELLED')}>Annuler</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal for week-view clicks */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#14152A] border border-white/[0.08] rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-lg text-gray-900">
                  {selected.coachService?.name || selected.service?.name}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  {selected.client.firstName} {selected.client.lastName}
                  {selected.client.employerCompanyId && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 bg-primary-500/15 text-primary-400 rounded-md">
                      {selected.client.employerCompany?.companyName || 'Entreprise'}
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={selected.status}>{STATUS_LABELS[selected.status]}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {new Date(selected.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {' '}({selected.durationMinutes} min)
            </p>
            {selected.notes && (
              <p className="text-sm text-gray-500 mb-4 p-3 bg-white/[0.04] rounded-lg">
                <span className="font-medium text-gray-400">Notes client : </span>
                {selected.notes}
              </p>
            )}

            {/* Review section — visible on DONE appointments */}
            {selected.status === 'DONE' && (
              <div className="mb-4 p-4 bg-white/[0.04] rounded-xl border border-white/[0.07]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Avis du client</p>
                {reviewLoading ? (
                  <p className="text-sm text-gray-400">Chargement…</p>
                ) : selectedReview ? (
                  <>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="ml-1.5 text-sm font-semibold text-gray-700">{selectedReview.rating}/5</span>
                    </div>
                    {selectedReview.comment && (
                      <p className="text-sm text-gray-600 italic">"{selectedReview.comment}"</p>
                    )}
                    {/* Coach reply */}
                    {selectedReview.coachReply ? (
                      <div className="mt-3 pl-3 border-l-2 border-primary-300">
                        <p className="text-xs text-primary-600 font-medium mb-0.5">Votre réponse</p>
                        <p className="text-sm text-gray-700">{selectedReview.coachReply}</p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                          placeholder="Répondre à cet avis (une seule fois)…"
                          className="w-full text-sm bg-white/[0.05] border border-white/[0.08] text-gray-700 placeholder:text-gray-500 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                        <button
                          onClick={handleReply}
                          disabled={replyLoading || !replyText.trim()}
                          className="mt-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {replyLoading ? 'Envoi…' : 'Publier la réponse'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucun avis déposé pour cette séance.</p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
              {selected.status === 'PENDING' && (
                <>
                  <Button size="sm" variant="danger" onClick={() => handleAction(selected.id, 'CANCELLED')}>
                    Refuser
                  </Button>
                  <Button size="sm" variant="success" onClick={() => handleAction(selected.id, 'CONFIRMED')}>
                    Confirmer
                  </Button>
                </>
              )}
              {selected.status === 'CONFIRMED' && (
                <>
                  <Button size="sm" variant="danger" onClick={() => handleAction(selected.id, 'CANCELLED')}>
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(selected.id, 'DONE')}
                    disabled={selected.paymentStatus !== 'paid'}
                    title={selected.paymentStatus !== 'paid' ? 'Le client doit payer avant de clôturer' : ''}
                  >
                    Terminer
                  </Button>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
