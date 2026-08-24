import React, { useState } from 'react';
import { AdminAnnouncement } from '../../types';
import { Bell, Plus, Trash2, Info, AlertTriangle, Trophy, Wrench, Megaphone } from 'lucide-react';

interface AdminAnnouncementsProps {
  announcements: AdminAnnouncement[];
  onAddAnnouncement: (announcement: Omit<AdminAnnouncement, 'id' | 'createdAt'>) => Promise<any> | any;
  onDeleteAnnouncement: (id: string) => Promise<any> | any;
  adminName: string;
}

export function AdminAnnouncements({
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement,
  adminName,
}: AdminAnnouncementsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AdminAnnouncement['type']>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddAnnouncement({
        title: title.trim(),
        message: message.trim(),
        authorName: adminName,
        type,
      });
      setTitle('');
      setMessage('');
      setIsCreating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (annType: AdminAnnouncement['type']) => {
    switch (annType) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'tournament':
        return <Trophy className="w-4 h-4 text-purple-400" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      default:
        return <Info className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            League Announcements & Broadcasts
          </h3>
          <p className="text-xs text-slate-400">Post system-wide updates to all registered players</p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </button>
        )}
      </div>

      {/* Create Announcement Form */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-[#0E1526] border border-emerald-500/40 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            Publish Broadcast Announcement
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Headline</label>
              <input
                type="text"
                placeholder="e.g. Pitch 4 Lighting Maintenance this Weekend"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AdminAnnouncement['type'])}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="info">General Info</option>
                  <option value="pitch_update">Pitch Update</option>
                  <option value="tournament">Tournament / Event</option>
                  <option value="warning">Important Alert</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Message Body</label>
              <textarea
                placeholder="Provide clear details for players..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Broadcast to Players'}
            </button>
          </div>
        </form>
      )}

      {/* Announcements Feed */}
      <div className="space-y-3">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-[#0E1526] border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                {getTypeIcon(ann.type)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm truncate">{ann.title}</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {ann.type}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Posted by <span className="text-slate-400">{ann.authorName}</span> •{' '}
                  {new Date(ann.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => onDeleteAnnouncement(ann.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded transition-colors cursor-pointer shrink-0"
              title="Delete announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No active broadcasts. Click "New Broadcast" to post an announcement.
          </div>
        )}
      </div>
    </div>
  );
}
