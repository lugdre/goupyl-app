import { useState, useEffect, useMemo } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import Spinner from '../../components/ui/Spinner';
import PaymentModal from '../../components/payment/PaymentModal';
import ReviewModal from '../../components/review/ReviewModal';
import CancellationModal from '../../components/appointment/CancellationModal';
import QrCodeModal from '../../components/appointment/QrCodeModal';
import DisputeModal from '../../components/appointment/DisputeModal';
import MobileWeekCalendar from '../../components/appointment/MobileWeekCalendar';
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, Star, CheckCircle, List, LayoutGrid, X, QrCode, Scale, UserX } from 'lucide-react';
import { STATUS_LABELS, DISPUTE_STATUS_LABELS } from '../../utils/constants';
import { useIsMobile } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMED', 'DONE', 'CANCELLED'];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const HOUR_HEIGHT = 56;

// Pastilles de statut (liste + modale)
const STATUS_BADGE_CLASS = {
  PENDING: 'dsh-badge--wait',
  CONFIRMED: 'dsh-badge--ok',
  DONE: 'dsh-badge--neutral',
  CANCELLED: 'dsh-badge--err',
};

// Blocs du calendrier semaine
const SLOT_STYLE = {
  PENDING:   { background: '#FBF0DF', borderColor: '#EBD9B4', color: '#8A6212' },
  CONFIRMED: { background: '#EAF3EC', borderColor: '#CDE4D3', color: '#28643B' },
  DONE:      { background: '#F2F1ED', borderColor: '#E4E2DC', color: '#4c4a46' },
  CANCELLED: { background: '#FBEAE7', borderColor: '#EFC7BE', color: '#C0392B' },
};

const MA_CSS = `
  .ma-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px}
  .ma-cal-label{font-size:14.5px;font-weight:600;color:var(--ink);text-transform:capitalize}
  .ma-nav-btn{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,color .15s}
  .ma-nav-btn:hover{border-color:#c9c7c1;color:var(--ink)}
  .ma-cal-scroll{overflow-x:auto}
  .ma-cal{min-width:720px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .ma-cal-head{display:grid;grid-template-columns:52px repeat(7,1fr);background:#FAF9F7;border-bottom:1px solid var(--line)}
  .ma-cal-head > div + div{border-left:1px solid var(--line)}
  .ma-day{padding:10px 4px;text-align:center}
  .ma-day.is-today{background:var(--orange-soft)}
  .ma-day-name{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:0}
  .ma-day-num{font-size:15px;font-weight:700;color:var(--ink);margin:3px 0 0}
  .ma-day.is-today .ma-day-num,.ma-day.is-today .ma-day-name{color:var(--orange)}
  .ma-cal-body{display:grid;grid-template-columns:52px repeat(7,1fr)}
  .ma-cal-body > div + div{border-left:1px solid var(--line)}
  .ma-hour{font-size:10.5px;font-weight:500;color:var(--ink-3);text-align:right;padding-right:8px;border-top:1px solid var(--line)}
  .ma-hour:first-child{border-top:none}
  .ma-col{position:relative;background:#fff}
  .ma-line{border-top:1px solid #F0EFEB}
  .ma-line:first-child{border-top:none}
  .ma-slot{position:absolute;left:3px;right:3px;padding:4px 7px;text-align:left;font-size:10px;line-height:1.32;overflow:hidden;border:1px solid;border-radius:8px;cursor:pointer;transition:filter .15s;font-family:inherit}
  .ma-slot:hover{filter:brightness(.97)}
  .ma-slot p{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ma-slot .ma-slot-time{font-weight:700}
  .ma-slot.is-cancelled{text-decoration:line-through;opacity:.65}

  .ma-list{display:flex;flex-direction:column;gap:12px}
  .ma-item{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;transition:border-color .2s}
  .ma-item:hover{border-color:#c9c7c1}
  .ma-item-left{display:flex;align-items:flex-start;gap:14px;min-width:240px;flex:1}
  .ma-item-icon{width:44px;height:44px;border-radius:50%;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ma-item-name{font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .ma-item-sub{font-size:12.5px;color:var(--ink-3);margin:3px 0 0}
  .ma-item-note{font-size:12.5px;color:var(--ink-3);font-style:italic;margin:8px 0 0}
  .ma-item-right{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;flex-shrink:0}

  .ma-modal-back{position:fixed;inset:0;background:rgba(15,15,15,.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:60}
  .ma-modal{background:#fff;border-radius:20px;max-width:480px;width:100%;padding:26px;font-family:"Inter",system-ui,sans-serif}
  .ma-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
  .ma-modal-title{font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin:0}
  .ma-modal-sub{font-size:13px;color:var(--ink-3);margin:4px 0 0}
  .ma-modal-close{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
  .ma-modal-note{font-size:13px;color:var(--ink-2);font-style:italic;background:#FAF9F7;border:1px solid var(--line);border-radius:12px;padding:13px 15px;margin:14px 0 0}
  .ma-modal-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding-top:18px;margin-top:18px;border-top:1px solid var(--line)}
`;

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
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [payingAppointment, setPayingAppointment] = useState(null);
  const [reviewingAppointment, setReviewingAppointment] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [qrAppointment, setQrAppointment] = useState(null);
  const [disputingAppointment, setDisputingAppointment] = useState(null);
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

  useEffect(fetchAppointments, [statusFilter]); // eslint-disable-line react-hooks/set-state-in-effect

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

  const statusBadge = (status) => (
    <span className={`dsh-badge ${STATUS_BADGE_CLASS[status] || 'dsh-badge--neutral'}`}>
      <i />{STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="dsh-page">
      <style>{MA_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mes rendez-vous</h1>
          <p className="dsh-sub">Historique complet de vos séances</p>
        </div>
        <div className="dsh-tabs">
          {[['week', LayoutGrid, 'Semaine'], ['list', List, 'Liste']].map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`dsh-tab${view === v ? ' is-active' : ''}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="dsh-chips">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`dsh-chip${statusFilter === s ? ' is-active' : ''}`}
          >
            {s ? STATUS_LABELS[s] : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : view === 'week' ? (
        isMobile ? (
          <div className="dsh-card">
            <MobileWeekCalendar
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              appointments={weekAppointments}
              onSelectAppointment={setSelected}
              renderAppointmentContent={(appt) => (
                <>
                  <p className="font-semibold">
                    {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="truncate">{appt.coachService?.name || appt.service?.name}</p>
                  <p className="truncate opacity-75">{appt.intervenant?.firstName} {appt.intervenant?.lastName}</p>
                </>
              )}
            />
          </div>
        ) : (
          <div className="dsh-card">
            <div className="ma-cal-nav">
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="ma-nav-btn" aria-label="Semaine précédente">
                <ChevronLeft size={17} />
              </button>
              <p className="ma-cal-label">{weekLabel}</p>
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="ma-nav-btn" aria-label="Semaine suivante">
                <ChevronRight size={17} />
              </button>
            </div>

            {weekAppointments.length === 0 && (
              <p style={{ textAlign: 'center', padding: '10px 0 22px', color: '#8a8781', fontSize: 13.5, fontWeight: 500 }}>
                Aucun rendez-vous cette semaine
              </p>
            )}

            <div className="ma-cal-scroll">
              <div className="ma-cal">
                {/* En-têtes de jours */}
                <div className="ma-cal-head">
                  <div />
                  {weekDays.map((day, idx) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={idx} className={`ma-day${isToday ? ' is-today' : ''}`}>
                        <p className="ma-day-name">{DAY_LABELS_SHORT[idx]}</p>
                        <p className="ma-day-num">{day.getDate()}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Grille horaire */}
                <div className="ma-cal-body">
                  <div style={{ height: hours.length * HOUR_HEIGHT, background: '#FAF9F7' }}>
                    {hours.map((h) => (
                      <div key={h} className="ma-hour" style={{ height: HOUR_HEIGHT }}>{h}h</div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIdx) => {
                    const dayAppts = weekAppointments.filter(
                      (a) => new Date(a.scheduledAt).toDateString() === day.toDateString()
                    );
                    return (
                      <div key={dayIdx} className="ma-col" style={{ height: hours.length * HOUR_HEIGHT }}>
                        {hours.map((h) => (
                          <div key={h} className="ma-line" style={{ height: HOUR_HEIGHT }} />
                        ))}
                        {dayAppts.map((appt) => {
                          const { top, height } = apptPosition(appt);
                          const style = SLOT_STYLE[appt.status] || SLOT_STYLE.PENDING;
                          return (
                            <button
                              key={appt.id}
                              type="button"
                              onClick={() => setSelected(appt)}
                              className={`ma-slot${appt.status === 'CANCELLED' ? ' is-cancelled' : ''}`}
                              style={{ top, height: Math.max(height - 3, 22), ...style }}
                            >
                              <p className="ma-slot-time">
                                {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p>{appt.coachService?.name || appt.service?.name}</p>
                              <p style={{ opacity: .75 }}>{appt.intervenant?.firstName} {appt.intervenant?.lastName}</p>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      ) : appointments.length === 0 ? (
        <div className="dsh-empty">
          <Calendar size={26} />
          Aucun rendez-vous
        </div>
      ) : (
        <div className="ma-list">
          {appointments.map((rdv) => (
            <div key={rdv.id} className="ma-item">
              <div className="ma-item-left">
                <div className="ma-item-icon"><Clock size={19} /></div>
                <div style={{ minWidth: 0 }}>
                  <p className="ma-item-name">{rdv.coachService?.name || rdv.service?.name}</p>
                  <p className="ma-item-sub">Avec {rdv.intervenant.firstName} {rdv.intervenant.lastName}</p>
                  <p className="ma-item-sub">
                    {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  {rdv.notes && <p className="ma-item-note">"{rdv.notes}"</p>}
                </div>
              </div>

              <div className="ma-item-right">
                {statusBadge(rdv.status)}

                {rdv.status === 'CONFIRMED' && rdv.paymentStatus !== 'paid' && !rdv.coveredByCompany && (
                  <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={() => setPayingAppointment(rdv)}>
                    <CreditCard size={13} /> Payer
                  </button>
                )}
                {rdv.status === 'CONFIRMED' && !!rdv.coveredByCompany && (
                  <span className="dsh-badge dsh-badge--orange">
                    <CheckCircle size={12} /> Couvert par forfait
                  </span>
                )}
                {rdv.paymentStatus === 'paid' && (
                  <span className="dsh-badge dsh-badge--ok">
                    <CreditCard size={12} /> Payé
                  </span>
                )}
                {rdv.status === 'CONFIRMED' && rdv.qrToken && (
                  <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => setQrAppointment(rdv)}>
                    <QrCode size={13} /> QR séance
                  </button>
                )}
                {rdv.status === 'DONE' && rdv.attendanceStatus === 'ABSENT' && (
                  <span className="dsh-badge dsh-badge--err">
                    <UserX size={12} /> Absence signalée
                  </span>
                )}
                {rdv.status === 'DONE' && rdv.attendanceStatus === 'ABSENT' && !rdv.disputeStatus && (
                  <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => setDisputingAppointment(rdv)}>
                    <Scale size={13} /> Contester
                  </button>
                )}
                {rdv.disputeStatus && (
                  <span className="dsh-badge dsh-badge--wait">
                    <Scale size={12} /> {DISPUTE_STATUS_LABELS[rdv.disputeStatus]}
                  </span>
                )}
                {rdv.status === 'DONE' && rdv.attendanceStatus !== 'ABSENT' && (rdv.paymentStatus === 'paid' || !!rdv.coveredByCompany) && !reviewedIds.has(rdv.id) && (
                  <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => setReviewingAppointment(rdv)}>
                    <Star size={13} /> Laisser un avis
                  </button>
                )}
                {reviewedIds.has(rdv.id) && (
                  <span className="dsh-badge dsh-badge--ok">
                    <CheckCircle size={12} /> Avis déposé
                  </span>
                )}
                {['PENDING', 'CONFIRMED'].includes(rdv.status) && (
                  <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => setCancellingAppointment(rdv)}>
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale de détail (clic sur un créneau du calendrier) */}
      {selected && (
        <div className="ma-modal-back" onClick={() => setSelected(null)}>
          <div className="ma-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ma-modal-head">
              <div style={{ minWidth: 0 }}>
                <p className="ma-modal-title">{selected.coachService?.name || selected.service?.name}</p>
                <p className="ma-modal-sub">Avec {selected.intervenant?.firstName} {selected.intervenant?.lastName}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(selected.status)}
                <button type="button" onClick={() => setSelected(null)} className="ma-modal-close" aria-label="Fermer">
                  <X size={15} />
                </button>
              </div>
            </div>

            <p className="ma-modal-sub">
              {new Date(selected.scheduledAt).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {selected.durationMinutes ? ` (${selected.durationMinutes} min)` : ''}
            </p>

            {selected.notes && <p className="ma-modal-note">"{selected.notes}"</p>}

            <div className="ma-modal-foot">
              {selected.status === 'CONFIRMED' && selected.paymentStatus !== 'paid' && !selected.coveredByCompany && (
                <button
                  type="button"
                  className="dsh-btn dsh-btn--orange dsh-btn--sm"
                  onClick={() => { setSelected(null); setPayingAppointment(selected); }}
                >
                  <CreditCard size={13} /> Payer
                </button>
              )}
              {selected.status === 'CONFIRMED' && !!selected.coveredByCompany && (
                <span className="dsh-badge dsh-badge--orange">
                  <CheckCircle size={12} /> Couvert par votre forfait entreprise
                </span>
              )}
              {selected.status === 'CONFIRMED' && selected.qrToken && (
                <button
                  type="button"
                  className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                  onClick={() => { setSelected(null); setQrAppointment(selected); }}
                >
                  <QrCode size={13} /> QR séance
                </button>
              )}
              {selected.status === 'DONE' && selected.attendanceStatus === 'ABSENT' && !selected.disputeStatus && (
                <button
                  type="button"
                  className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                  onClick={() => { setSelected(null); setDisputingAppointment(selected); }}
                >
                  <Scale size={13} /> Contester
                </button>
              )}
              {selected.status === 'DONE' && selected.attendanceStatus !== 'ABSENT' && (selected.paymentStatus === 'paid' || !!selected.coveredByCompany) && !reviewedIds.has(selected.id) && (
                <button
                  type="button"
                  className="dsh-btn dsh-btn--ghost dsh-btn--sm"
                  onClick={() => { setSelected(null); setReviewingAppointment(selected); }}
                >
                  <Star size={13} /> Laisser un avis
                </button>
              )}
              {['PENDING', 'CONFIRMED'].includes(selected.status) && (
                <button
                  type="button"
                  className="dsh-btn dsh-btn--danger dsh-btn--sm"
                  onClick={() => { setSelected(null); setCancellingAppointment(selected); }}
                >
                  Annuler
                </button>
              )}
              <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => setSelected(null)}>
                Fermer
              </button>
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
      {qrAppointment && (
        <QrCodeModal
          appointment={qrAppointment}
          onClose={() => setQrAppointment(null)}
        />
      )}
      {disputingAppointment && (
        <DisputeModal
          appointment={disputingAppointment}
          onClose={() => setDisputingAppointment(null)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
}
