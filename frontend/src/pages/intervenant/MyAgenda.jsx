import { useState, useEffect, useMemo } from 'react';
import { appointmentApi } from '../../services/appointment.api';
import { reviewApi } from '../../services/review.api';
import Spinner from '../../components/ui/Spinner';
import MobileWeekCalendar from '../../components/appointment/MobileWeekCalendar';
import QrScannerModal from '../../components/appointment/QrScannerModal';
import { MODAL_CSS } from '../../components/ui/modalStyles';
import { Calendar, ChevronLeft, ChevronRight, List, LayoutGrid, Star, ScanLine, UserX, CheckCircle, X, Check } from 'lucide-react';
import { STATUS_LABELS, DISPUTE_STATUS_LABELS, LEVEL_LABELS } from '../../utils/constants';
import { useIsMobile } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['', 'PENDING', 'CONFIRMED', 'DONE', 'CANCELLED'];
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const HOUR_HEIGHT = 56; // px par heure en vue semaine

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

const AG_CSS = `
  .ag-cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px}
  .ag-cal-label{font-size:14.5px;font-weight:600;color:var(--ink);text-transform:capitalize}
  .ag-nav-btn{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,color .15s}
  .ag-nav-btn:hover{border-color:#c9c7c1;color:var(--ink)}
  .ag-cal-scroll{overflow-x:auto}
  .ag-cal{min-width:720px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .ag-cal-head{display:grid;grid-template-columns:52px repeat(7,1fr);background:#FAF9F7;border-bottom:1px solid var(--line)}
  .ag-cal-head > div + div{border-left:1px solid var(--line)}
  .ag-day{padding:10px 4px;text-align:center}
  .ag-day.is-today{background:var(--orange-soft)}
  .ag-day-name{font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:0}
  .ag-day-num{font-size:15px;font-weight:700;color:var(--ink);margin:3px 0 0}
  .ag-day.is-today .ag-day-num,.ag-day.is-today .ag-day-name{color:var(--orange)}
  .ag-cal-body{display:grid;grid-template-columns:52px repeat(7,1fr)}
  .ag-cal-body > div + div{border-left:1px solid var(--line)}
  .ag-hour{font-size:10.5px;font-weight:500;color:var(--ink-3);text-align:right;padding-right:8px;border-top:1px solid var(--line)}
  .ag-hour:first-child{border-top:none}
  .ag-col{position:relative;background:#fff}
  .ag-line{border-top:1px solid #F0EFEB}
  .ag-line:first-child{border-top:none}
  .ag-slot{position:absolute;left:3px;right:3px;padding:4px 7px;text-align:left;font-size:10px;line-height:1.32;overflow:hidden;border:1px solid;border-radius:8px;cursor:pointer;transition:filter .15s;font-family:inherit}
  .ag-slot:hover{filter:brightness(.97)}
  .ag-slot p{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ag-slot .ag-slot-time{font-weight:700}
  .ag-slot.is-cancelled{text-decoration:line-through;opacity:.65}

  .ag-list{display:flex;flex-direction:column;gap:12px}
  .ag-item{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;transition:border-color .2s}
  .ag-item:hover{border-color:#c9c7c1}
  .ag-item-left{min-width:240px;flex:1}
  .ag-item-name{font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .ag-item-sub{font-size:12.5px;color:var(--ink-3);margin:4px 0 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ag-item-right{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;flex-shrink:0}

  /* Bloc profil sportif / avis dans la modale */
  .ag-panel{background:#FAF9F7;border:1px solid #E4E2DC;border-radius:14px;padding:16px 18px}
  .ag-panel--accent{background:#FEF1EA;border-color:#F7D3C0}
  .ag-panel-title{font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8a8781;margin:0 0 10px}
  .ag-panel p{margin:0;font-size:13px;color:#4c4a46;line-height:1.6}
  .ag-panel p + p{margin-top:6px}
  .ag-panel b{font-weight:600;color:#171614}
  .ag-tag{display:inline-block;font-size:11.5px;font-weight:600;padding:4px 11px;border-radius:999px;background:#FEF1EA;color:#F4530F}
  .ag-reply{margin-top:14px;padding-left:14px;border-left:2px solid #F4530F}
  .ag-reply-label{font-size:11.5px;font-weight:600;color:#F4530F;margin:0 0 4px}
`;

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

export default function MyAgenda() {
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('week'); // 'week' | 'list'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null); // avis de la séance DONE sélectionnée
  const [reviewLoading, setReviewLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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

  const handleMarkAbsent = async (rdv) => {
    const ok = window.confirm(
      `Signaler l'absence de ${rdv.client.firstName} ${rdv.client.lastName} à la séance ? ` +
      'La séance sera clôturée et le client pourra contester.'
    );
    if (!ok) return;
    try {
      await appointmentApi.markAbsent(rdv.id);
      toast.success('Absence signalée — séance clôturée');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const sessionStarted = (rdv) => new Date(rdv.scheduledAt) <= new Date();

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

  const statusBadge = (status) => (
    <span className={`dsh-badge ${STATUS_BADGE_CLASS[status] || 'dsh-badge--neutral'}`}>
      <i />{STATUS_LABELS[status]}
    </span>
  );

  const clientProfile = selected?.client?.profile;
  const hasClientProfile = clientProfile && (
    clientProfile.level || clientProfile.sportType || clientProfile.specificNeed ||
    clientProfile.objectives?.length || clientProfile.constraints
  );

  return (
    <div className="dsh-page">
      <style>{AG_CSS}</style>
      <style>{MODAL_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mon agenda</h1>
          <p className="dsh-sub">Tous vos rendez-vous</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={() => setShowScanner(true)}>
            <ScanLine size={14} /> Scanner un QR
          </button>
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
              onSelectAppointment={openModal}
              renderAppointmentContent={(appt) => (
                <>
                  <p className="font-semibold">
                    {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="truncate">{appt.client.firstName} {appt.client.lastName}</p>
                  <p className="truncate opacity-75">{appt.coachService?.name || appt.service?.name}</p>
                </>
              )}
            />
          </div>
        ) : (
          <div className="dsh-card">
            <div className="ag-cal-nav">
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="ag-nav-btn" aria-label="Semaine précédente">
                <ChevronLeft size={17} />
              </button>
              <p className="ag-cal-label">{weekLabel}</p>
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="ag-nav-btn" aria-label="Semaine suivante">
                <ChevronRight size={17} />
              </button>
            </div>

            {weekAppointments.length === 0 && (
              <p style={{ textAlign: 'center', padding: '10px 0 22px', color: '#8a8781', fontSize: 13.5, fontWeight: 500 }}>
                Aucun rendez-vous cette semaine
              </p>
            )}

            <div className="ag-cal-scroll">
              <div className="ag-cal">
                {/* En-têtes de jours */}
                <div className="ag-cal-head">
                  <div />
                  {weekDays.map((day, idx) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={idx} className={`ag-day${isToday ? ' is-today' : ''}`}>
                        <p className="ag-day-name">{DAY_LABELS_SHORT[idx]}</p>
                        <p className="ag-day-num">{day.getDate()}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Grille horaire */}
                <div className="ag-cal-body">
                  <div style={{ height: hours.length * HOUR_HEIGHT, background: '#FAF9F7' }}>
                    {hours.map((h) => (
                      <div key={h} className="ag-hour" style={{ height: HOUR_HEIGHT }}>{h}h</div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIdx) => {
                    const dayAppts = weekAppointments.filter(
                      (a) => new Date(a.scheduledAt).toDateString() === day.toDateString()
                    );
                    return (
                      <div key={dayIdx} className="ag-col" style={{ height: hours.length * HOUR_HEIGHT }}>
                        {hours.map((h) => (
                          <div key={h} className="ag-line" style={{ height: HOUR_HEIGHT }} />
                        ))}
                        {dayAppts.map((appt) => {
                          const { top, height } = apptPosition(appt);
                          const style = SLOT_STYLE[appt.status] || SLOT_STYLE.PENDING;
                          return (
                            <button
                              key={appt.id}
                              type="button"
                              onClick={() => openModal(appt)}
                              className={`ag-slot${appt.status === 'CANCELLED' ? ' is-cancelled' : ''}`}
                              style={{ top, height: Math.max(height - 3, 22), ...style }}
                            >
                              <p className="ag-slot-time">
                                {new Date(appt.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p>{appt.client.firstName} {appt.client.lastName}</p>
                              <p style={{ opacity: .75 }}>{appt.coachService?.name || appt.service?.name}</p>
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
        <div className="ag-list">
          {appointments.map((rdv) => {
            const blocked = rdv.paymentStatus !== 'paid' && !rdv.coveredByCompany;
            return (
              <div key={rdv.id} className="ag-item">
                <div className="ag-item-left">
                  <p className="ag-item-name">{rdv.coachService?.name || rdv.service?.name}</p>
                  <div className="ag-item-sub">
                    <span>Client : {rdv.client.firstName} {rdv.client.lastName}</span>
                    {rdv.coveredByCompany && <span className="dsh-badge dsh-badge--orange">Entreprise</span>}
                  </div>
                  <div className="ag-item-sub">
                    {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {` (${rdv.durationMinutes} min)`}
                  </div>
                  <div className="ag-item-sub">
                    {rdv.status === 'DONE' && rdv.validatedByQr && (
                      <span className="dsh-badge dsh-badge--ok"><CheckCircle size={12} /> Validée par QR</span>
                    )}
                    {rdv.status === 'DONE' && rdv.attendanceStatus === 'ABSENT' && (
                      <span className="dsh-badge dsh-badge--err">
                        <UserX size={12} /> Client absent
                        {rdv.disputeStatus && ` · ${DISPUTE_STATUS_LABELS[rdv.disputeStatus]}`}
                      </span>
                    )}
                    {rdv.status === 'CONFIRMED' && blocked && (
                      <span className="dsh-badge dsh-badge--wait"><i />En attente de paiement</span>
                    )}
                  </div>
                </div>

                <div className="ag-item-right">
                  {statusBadge(rdv.status)}

                  {rdv.status === 'PENDING' && (
                    <>
                      <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={() => handleAction(rdv.id, 'CONFIRMED')}>
                        <Check size={14} /> Confirmer
                      </button>
                      <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => handleAction(rdv.id, 'CANCELLED')}>
                        Refuser
                      </button>
                    </>
                  )}

                  {rdv.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        className="dsh-btn dsh-btn--orange dsh-btn--sm"
                        onClick={() => handleAction(rdv.id, 'DONE')}
                        disabled={blocked}
                        title={blocked ? 'Le client doit payer avant de clôturer' : ''}
                      >
                        <Check size={14} /> Terminer
                      </button>
                      {sessionStarted(rdv) && (
                        <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => handleMarkAbsent(rdv)}>
                          <UserX size={14} /> Absent
                        </button>
                      )}
                      <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => handleAction(rdv.id, 'CANCELLED')}>
                        Annuler
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale de détail (clic sur un créneau) */}
      {selected && (
        <div className="gm-back" onClick={() => setSelected(null)}>
          <div className="gm gm--wide" onClick={(e) => e.stopPropagation()}>
            <div className="gm-head">
              <div className="gm-head-left">
                <div style={{ minWidth: 0 }}>
                  <h2 className="gm-title">{selected.coachService?.name || selected.service?.name}</h2>
                  <p className="gm-summary-line" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {selected.client.firstName} {selected.client.lastName}
                    {selected.coveredByCompany && (
                      <span className="ag-tag">
                        {selected.client.employerCompany?.companyName || 'Entreprise'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusBadge(selected.status)}
                <button type="button" onClick={() => setSelected(null)} className="gm-close" aria-label="Fermer">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="gm-body">
              <p className="gm-note">
                {new Date(selected.scheduledAt).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {` (${selected.durationMinutes} min)`}
              </p>

              {selected.notes && (
                <div className="ag-panel">
                  <p className="ag-panel-title">Notes du client</p>
                  <p>{selected.notes}</p>
                </div>
              )}

              {/* Profil sportif du client (questionnaire d'inscription) */}
              {hasClientProfile && (
                <div className="ag-panel ag-panel--accent">
                  <p className="ag-panel-title" style={{ color: '#B33D0A' }}>Profil sportif du client</p>
                  {clientProfile.level && (
                    <p><b>Niveau :</b> {LEVEL_LABELS[clientProfile.level] || clientProfile.level}</p>
                  )}
                  {clientProfile.sportType && (
                    <p><b>Sport :</b> {clientProfile.sportType}</p>
                  )}
                  {['PRO', 'ELITE'].includes(clientProfile.level) && clientProfile.specificNeed ? (
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      <b>Besoin spécifique :</b> {clientProfile.specificNeed}
                    </p>
                  ) : clientProfile.objectives?.length ? (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b>Objectifs :</b>
                      {clientProfile.objectives.map((obj, i) => (
                        <span key={i} className="ag-tag" style={{ background: '#fff' }}>{obj}</span>
                      ))}
                    </p>
                  ) : null}
                  {clientProfile.constraints && (
                    <p><b>Contraintes :</b> {clientProfile.constraints}</p>
                  )}
                </div>
              )}

              {/* Avis du client — séances terminées */}
              {selected.status === 'DONE' && (
                <div className="ag-panel">
                  <p className="ag-panel-title">Avis du client</p>
                  {reviewLoading ? (
                    <p style={{ color: '#8a8781' }}>Chargement…</p>
                  ) : selectedReview ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 8 }}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={15}
                            fill={i < selectedReview.rating ? '#F4530F' : 'none'}
                            color={i < selectedReview.rating ? '#F4530F' : '#c9c7c1'}
                          />
                        ))}
                        <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color: '#171614' }}>
                          {selectedReview.rating}/5
                        </span>
                      </div>
                      {selectedReview.comment && (
                        <p style={{ fontStyle: 'italic' }}>"{selectedReview.comment}"</p>
                      )}
                      {selectedReview.coachReply ? (
                        <div className="ag-reply">
                          <p className="ag-reply-label">Votre réponse</p>
                          <p>{selectedReview.coachReply}</p>
                        </div>
                      ) : (
                        <div style={{ marginTop: 12 }}>
                          <textarea
                            className="gm-textarea"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            placeholder="Répondre à cet avis…"
                          />
                          <button
                            type="button"
                            className="dsh-btn dsh-btn--orange dsh-btn--sm"
                            style={{ marginTop: 10 }}
                            onClick={handleReply}
                            disabled={replyLoading || !replyText.trim()}
                          >
                            {replyLoading ? 'Envoi…' : 'Publier la réponse'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#8a8781', fontStyle: 'italic' }}>
                      Aucun avis déposé pour cette séance.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="gm-foot" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {selected.status === 'PENDING' && (
                <>
                  <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => handleAction(selected.id, 'CANCELLED')}>
                    Refuser
                  </button>
                  <button type="button" className="dsh-btn dsh-btn--orange dsh-btn--sm" onClick={() => handleAction(selected.id, 'CONFIRMED')}>
                    <Check size={14} /> Confirmer
                  </button>
                </>
              )}
              {selected.status === 'CONFIRMED' && (
                <>
                  <button type="button" className="dsh-btn dsh-btn--danger dsh-btn--sm" onClick={() => handleAction(selected.id, 'CANCELLED')}>
                    Annuler
                  </button>
                  {sessionStarted(selected) && (
                    <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => handleMarkAbsent(selected)}>
                      <UserX size={14} /> Client absent
                    </button>
                  )}
                  <button
                    type="button"
                    className="dsh-btn dsh-btn--orange dsh-btn--sm"
                    onClick={() => handleAction(selected.id, 'DONE')}
                    disabled={selected.paymentStatus !== 'paid' && !selected.coveredByCompany}
                    title={selected.paymentStatus !== 'paid' && !selected.coveredByCompany ? 'Le client doit payer avant de clôturer' : ''}
                  >
                    <Check size={14} /> Terminer
                  </button>
                </>
              )}
              <button type="button" className="dsh-btn dsh-btn--ghost dsh-btn--sm" onClick={() => setSelected(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onValidated={fetchData}
        />
      )}
    </div>
  );
}
