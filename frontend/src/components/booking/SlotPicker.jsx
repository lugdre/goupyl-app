import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentApi } from '../../services/appointment.api';
import Spinner from '../ui/Spinner';

const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 21;
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Monday of the week containing `date` (local time)
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Doctolib-style week slot picker.
 *
 * Props:
 *  - intervenantId: number — whose agenda to show
 *  - durationMinutes: number — slot length (e.g. 30, 60)
 *  - onSelect?: (isoString) => void — called when user clicks a slot
 *  - selectedSlot?: string — ISO string of the currently selected slot
 *  - readOnly?: boolean — if true, slots are not clickable (for public profile preview)
 *  - fetchClientBusy?: boolean — also fetch the logged-in client's own busy slots
 */
export default function SlotPicker({
  intervenantId,
  durationMinutes = 60,
  onSelect,
  selectedSlot,
  readOnly = false,
  fetchClientBusy = false,
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [busy, setBusy] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    if (!intervenantId) return;
    setLoading(true);
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 7).toISOString();

    const requests = [appointmentApi.getBusySlots(intervenantId, from, to)];
    if (fetchClientBusy) requests.push(appointmentApi.getMyBusySlots(from, to));

    Promise.all(requests)
      .then((results) => {
        const merged = results.flatMap(({ data }) =>
          data.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
        );
        setBusy(merged);
      })
      .catch(() => setBusy([]))
      .finally(() => setLoading(false));
  }, [intervenantId, weekStart, fetchClientBusy]);

  // Generate candidate slots per day at `durationMinutes` intervals,
  // starting at BUSINESS_START_HOUR, as long as the end stays ≤ BUSINESS_END_HOUR.
  const slotsForDay = (day) => {
    const slots = [];
    const base = new Date(day);
    base.setHours(BUSINESS_START_HOUR, 0, 0, 0);

    const stepMs = durationMinutes * 60 * 1000;
    const now = new Date();

    for (let t = base.getTime(); ; t += stepMs) {
      const start = new Date(t);
      const end = new Date(t + stepMs);
      if (end.getHours() > BUSINESS_END_HOUR) break;
      if (end.getHours() === BUSINESS_END_HOUR && end.getMinutes() > 0) break;

      const isPast = start <= now;
      const conflict = busy.some((b) => b.start < end && b.end > start);

      slots.push({
        iso: start.toISOString(),
        label: start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        disabled: isPast || conflict,
      });
    }
    return slots;
  };

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })}`;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const canGoPrev = weekStart > todayMidnight;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => canGoPrev && setWeekStart(addDays(weekStart, -7))}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-medium text-gray-900 capitalize">{weekLabel}</p>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="py-10">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {weekDays.map((day, idx) => {
            const slots = slotsForDay(day);
            const availableCount = slots.filter((s) => !s.disabled).length;
            return (
              <div key={idx} className="bg-white min-h-[280px]">
                <div className="px-2 py-2 text-center border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {DAY_LABELS_SHORT[idx]}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {day.getDate()}
                  </p>
                </div>
                <div className="px-1.5 py-2 space-y-1">
                  {availableCount === 0 ? (
                    <p className="text-[10px] text-gray-300 text-center pt-2">—</p>
                  ) : (
                    slots.map((slot) => {
                      if (slot.disabled) return null;
                      const isSelected = selectedSlot === slot.iso;
                      return (
                        <button
                          key={slot.iso}
                          type="button"
                          disabled={readOnly}
                          onClick={() => onSelect?.(slot.iso)}
                          className={`w-full text-center px-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-brand-800 text-white'
                              : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                          } ${readOnly ? 'cursor-default' : ''}`}
                        >
                          {slot.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
