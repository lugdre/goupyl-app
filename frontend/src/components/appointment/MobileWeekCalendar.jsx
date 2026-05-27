import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const HOUR_HEIGHT = 56;

const STATUS_BG = {
  PENDING:   { background: 'rgba(217,119,6,0.10)', borderColor: 'rgba(217,119,6,0.25)', color: '#92400e' },
  CONFIRMED: { background: 'rgba(74,124,89,0.10)', borderColor: 'rgba(74,124,89,0.25)', color: '#4A7C59' },
  DONE:      { background: 'rgba(0,0,0,0.04)',     borderColor: 'rgba(0,0,0,0.12)',     color: '#555' },
  CANCELLED: { background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.20)', color: '#dc2626' },
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const sameDay = (a, b) => a.toDateString() === b.toDateString();

/**
 * Mobile week calendar — day chips + single-day vertical timeline.
 *
 * Props:
 *  - weekStart: Date (Monday of current week)
 *  - onWeekChange: (newWeekStart: Date) => void
 *  - appointments: array (already filtered to the visible week, no CANCELLED)
 *  - onSelectAppointment: (appt) => void
 *  - renderAppointmentContent: (appt) => ReactNode  (inner text rendered inside the colored block)
 */
export default function MobileWeekCalendar({
  weekStart,
  onWeekChange,
  appointments,
  onSelectAppointment,
  renderAppointmentContent,
}) {
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const today = new Date();
  const todayIdx = weekDays.findIndex((d) => sameDay(d, today));
  const [selectedIdx, setSelectedIdx] = useState(todayIdx >= 0 ? todayIdx : 0);

  // Reset to first day (or today if visible) when week changes.
  useEffect(() => {
    const idx = weekDays.findIndex((d) => sameDay(d, today));
    setSelectedIdx(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const selectedDay = weekDays[selectedIdx];

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;

  const dayAppts = useMemo(
    () => appointments.filter((a) => sameDay(new Date(a.scheduledAt), selectedDay)),
    [appointments, selectedDay]
  );

  const apptPosition = (appt) => {
    const d = new Date(appt.scheduledAt);
    const minutesFromStart = (d.getHours() - BUSINESS_START_HOUR) * 60 + d.getMinutes();
    return {
      top: (minutesFromStart / 60) * HOUR_HEIGHT,
      height: (appt.durationMinutes / 60) * HOUR_HEIGHT,
    };
  };

  const hours = Array.from(
    { length: BUSINESS_END_HOUR - BUSINESS_START_HOUR + 1 },
    (_, i) => BUSINESS_START_HOUR + i
  );

  const countByDay = useMemo(() => {
    const m = new Array(7).fill(0);
    for (const a of appointments) {
      for (let i = 0; i < 7; i++) {
        if (sameDay(new Date(a.scheduledAt), weekDays[i])) { m[i]++; break; }
      }
    }
    return m;
  }, [appointments, weekDays]);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-medium text-gray-900 capitalize">{weekLabel}</p>
        <button
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day chips */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((day, idx) => {
          const isToday = sameDay(day, today);
          const isSelected = idx === selectedIdx;
          const count = countByDay[idx];
          return (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 2px', borderRadius: 8, border: '1px solid',
                background: isSelected ? '#252d62' : isToday ? 'rgba(37,45,98,0.08)' : '#fff',
                borderColor: isSelected ? '#252d62' : isToday ? 'rgba(37,45,98,0.25)' : 'rgba(0,0,0,0.10)',
                color: isSelected ? '#fff' : '#0a0a0a',
                cursor: 'pointer', transition: 'background .15s, color .15s, border-color .15s',
                minHeight: 56,
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '.10em',
                color: isSelected ? 'rgba(255,255,255,0.75)' : '#888',
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {DAY_LABELS_SHORT[idx]}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                {day.getDate()}
              </span>
              {count > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  minWidth: 14, height: 14, padding: '0 3px',
                  borderRadius: 999,
                  background: isSelected ? '#fff' : '#252d62',
                  color: isSelected ? '#252d62' : '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <p className="text-sm text-gray-600 capitalize mb-2">
        {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Empty state */}
      {dayAppts.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm border border-dashed rounded-lg" style={{ borderColor: 'rgba(0,0,0,0.10)' }}>
          Aucun rendez-vous ce jour
        </div>
      )}

      {/* Vertical timeline */}
      {dayAppts.length > 0 && (
        <div className="grid grid-cols-[40px_1fr] gap-px bg-gray-100 rounded-lg overflow-hidden">
          {/* Hour labels */}
          <div className="bg-white" style={{ height: hours.length * HOUR_HEIGHT }}>
            {hours.map((h) => (
              <div
                key={h}
                className="text-[10px] text-gray-400 text-right pr-1 border-t border-gray-100"
                style={{ height: HOUR_HEIGHT, fontFamily: '"JetBrains Mono", monospace' }}
              >
                {h}h
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="bg-white relative" style={{ height: hours.length * HOUR_HEIGHT }}>
            {hours.map((h) => (
              <div key={h} className="border-t border-gray-100" style={{ height: HOUR_HEIGHT }} />
            ))}
            {dayAppts.map((appt) => {
              const { top, height } = apptPosition(appt);
              const bg = STATUS_BG[appt.status] || STATUS_BG.PENDING;
              return (
                <button
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt)}
                  className="absolute text-left overflow-hidden transition-opacity active:opacity-70"
                  style={{
                    top, left: 4, right: 4,
                    height: Math.max(height - 2, 36),
                    padding: '6px 8px', borderRadius: 6,
                    border: '1px solid', borderColor: bg.borderColor,
                    background: bg.background, color: bg.color,
                    fontSize: 12, lineHeight: 1.3,
                  }}
                >
                  {renderAppointmentContent(appt)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
