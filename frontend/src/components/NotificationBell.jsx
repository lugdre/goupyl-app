import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notificationApi } from '../services/notification.api';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  return `Il y a ${Math.floor(hrs / 24)}j`;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const fetchCount = async () => {
    try {
      const { data } = await notificationApi.countUnread();
      setUnread(data.count);
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const { data } = await notificationApi.list();
      setNotifications(data);
      setUnread(data.filter((n) => !n.readAt).length);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    if (!open) fetchAll();
    setOpen((v) => !v);
  };

  const handleMarkRead = async (id) => {
    await notificationApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnread((v) => Math.max(0, v - 1));
  };

  const handleMarkAll = async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-xl hover:bg-white/[0.05]"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-xl border border-surface-border z-50 overflow-hidden" style={{ boxShadow: 'var(--shadow-modal)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-gray-700">Notifications</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.05]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Aucune notification
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && handleMarkRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors ${
                    !n.readAt ? 'bg-primary-600/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.readAt && (
                      <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-primary-400" />
                    )}
                    <div className={!n.readAt ? '' : 'pl-4'}>
                      <p className="text-sm font-medium text-gray-700 leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[11px] text-gray-500 mt-1 opacity-60">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
