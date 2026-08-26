import React, { useState } from 'react';
import { SoccerMatch } from '../types';
import {
  Share2,
  Copy,
  Check,
  MessageSquare,
  X,
  MapPin,
  Calendar,
  Users,
  Shirt,
  Sparkles,
  Link,
  Coins,
  Trophy,
  Landmark,
} from 'lucide-react';
import { formatMoroccoDate, formatMAD } from '../lib/moroccoUtils';

interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: SoccerMatch | null;
}

export const MatchShareModal: React.FC<MatchShareModalProps> = ({ isOpen, onClose, match }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareType, setShareType] = useState<'invite' | 'lineup' | 'payment' | 'result'>('invite');

  if (!isOpen || !match) return null;

  const formattedDate = formatMoroccoDate(match.dateTime, 'day_month_time');
  const spotsLeft = Math.max(0, match.maxPlayers - (match.roster?.length || 0));
  const greenPlayers = match.roster.filter((p) => p.team === 'green');
  const bluePlayers = match.roster.filter((p) => p.team === 'blue');
  const paidCount = (match.paidPlayerIds || []).filter((id) =>
    match.roster.some((p) => p.userId === id)
  ).length;
  const unpaidCount = Math.max(0, match.roster.length - paidCount);

  const mapsUrl =
    match.location.googleMapsUrl ||
    `https://maps.google.com/?q=${encodeURIComponent(match.location.address || match.location.venueName)}`;
  const matchShareLink = `${window.location.origin}/?match=${match.id}`;

  // Build clean message payloads for WhatsApp in Moroccan context
  const inviteText =
    `🇲🇦 ⚽ *PITCHMATE MATCH INVITE: ${match.title.toUpperCase()}*\n\n` +
    `📅 *Date & Time:* ${formattedDate}\n` +
    `📍 *Venue:* ${match.location.venueName} (${match.location.city || 'Morocco'})\n` +
    `📌 *Address:* ${match.location.address}\n` +
    `👥 *Format:* ${match.format || '7v7'} (${match.roster.length}/${match.maxPlayers} players joined - *${spotsLeft > 0 ? `${spotsLeft} spots left!` : 'FULL SQUAD'}*)\n` +
    `💰 *Fee:* ${match.pricePerPlayer === 0 ? 'FREE' : `${match.pricePerPlayer} MAD / player`}\n` +
    `🗺️ *Google Maps:* ${mapsUrl}\n\n` +
    `👉 *Join roster & reserve spot:* ${matchShareLink}`;

  const greenList =
    greenPlayers.map((p, i) => `  ${i + 1}. ${p.name} (${p.position || 'MID'})`).join('\n') || '  (None yet)';
  const blueList =
    bluePlayers.map((p, i) => `  ${i + 1}. ${p.name} (${p.position || 'MID'})`).join('\n') || '  (None yet)';

  const lineupText =
    `📋 *MATCH LINEUP & FORMATIONS: ${match.title.toUpperCase()}*\n\n` +
    `📅 ${formattedDate} | 📍 ${match.location.venueName}\n\n` +
    `🟢 *TEAM GREEN* (${match.formationGreen || '2-3-1'} - ${greenPlayers.length} players):\n${greenList}\n\n` +
    `🔵 *TEAM BLUE* (${match.formationBlue || '2-3-1'} - ${bluePlayers.length} players):\n${blueList}\n\n` +
    `👉 *View 3D Tactical Pitch:* ${matchShareLink}`;

  const bankInfoText = match.bankDetails?.rib
    ? `\n💳 *CIH Bank RIB:* \`${match.bankDetails.rib}\` (${match.bankDetails.accountHolder})`
    : '';

  const paymentText =
    `💰 *PITCH FEE & PAYMENT TRACKER: ${match.title.toUpperCase()}*\n\n` +
    `📍 *Venue:* ${match.location.venueName}\n` +
    `💵 *Total Pitch Rental:* ${formatMAD(match.totalPitchCost || match.pricePerPlayer * match.maxPlayers)}\n` +
    `🎟️ *Fee Per Player:* ${formatMAD(match.pricePerPlayer)}\n` +
    `📊 *Status:* ${paidCount} Paid • ${unpaidCount} Pending${bankInfoText}\n\n` +
    `👉 *View Payment Proofs & Status:* ${matchShareLink}`;

  const scoreGreen = match.score?.green ?? 0;
  const scoreBlue = match.score?.blue ?? 0;
  const winnerTeam =
    scoreGreen > scoreBlue
      ? '🟢 Team Green Victorious!'
      : scoreBlue > scoreGreen
      ? '🔵 Team Blue Victorious!'
      : '🤝 Thrilling Draw!';
  const motmName = match.motmWinnerName || match.mvpWinnerName || 'TBD';
  const resultText =
    `🏆 *MATCH RESULT & RECAP: ${match.title.toUpperCase()}*\n\n` +
    `📍 ${match.location.venueName} • ${formattedDate}\n\n` +
    `🟢 *Team Green* ${scoreGreen} - ${scoreBlue} *Team Blue* 🔵\n` +
    `✨ *Outcome:* ${winnerTeam}\n` +
    `⭐ *Man of the Match (MOTM):* ${motmName}\n\n` +
    `👉 *View full stats & leaderboards:* ${matchShareLink}`;

  const activeMessageText =
    shareType === 'invite'
      ? inviteText
      : shareType === 'lineup'
      ? lineupText
      : shareType === 'payment'
      ? paymentText
      : resultText;

  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(activeMessageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessageText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(matchShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0D1527] border border-[#1E293B] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white">
        {/* Close Button */}
        <button
          id="close-share-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950 shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">One-Tap WhatsApp Squad Share</h3>
            <p className="text-xs text-slate-400">Share match details, lineups, and MAD payments to your group</p>
          </div>
        </div>

        {/* Clean Match Summary Card */}
        <div className="p-4 bg-[#080D1A] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-sm font-extrabold text-white line-clamp-1">{match.title}</span>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {formattedDate}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
              {match.format || '7v7'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 border-t border-slate-800/80 pt-2.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{match.location.venueName} • {match.location.city || 'Casablanca'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Roster Spots</span>
              <span className="text-xs font-black text-white">
                {match.roster.length}/{match.maxPlayers} ({spotsLeft} open)
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Fee / Player</span>
              <span className="text-xs font-black text-emerald-400">
                {formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Share Template Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Select Formatted Template
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setShareType('invite')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                shareType === 'invite'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-[#080D1A] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              📢 Match Invite
            </button>
            <button
              type="button"
              onClick={() => setShareType('lineup')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                shareType === 'lineup'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-[#080D1A] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              ⚔️ Squad Lineup
            </button>
            <button
              type="button"
              onClick={() => setShareType('payment')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                shareType === 'payment'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-[#080D1A] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              💳 CIH / MAD Fee
            </button>
            <button
              type="button"
              onClick={() => setShareType('result')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                shareType === 'result'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-[#080D1A] border border-[#1E293B] text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              🏆 Result & MOTM
            </button>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="p-3 bg-[#080D1A] border border-slate-800 rounded-2xl max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
          {activeMessageText}
        </div>

        {/* Primary Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            id="btn-whatsapp-share-direct"
            type="button"
            onClick={handleShareToWhatsApp}
            className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99] text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-[#25D366]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-slate-950" />
            Share to WhatsApp Group
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-copy-formatted-text"
              type="button"
              onClick={handleCopyMessage}
              className="py-2.5 px-3 bg-[#080D1A] hover:bg-slate-900 border border-[#1E293B] hover:border-slate-700 active:scale-[0.99] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Message Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              id="btn-copy-share-card"
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-[#080D1A] hover:bg-slate-900 border border-[#1E293B] hover:border-slate-700 active:scale-[0.99] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Link className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
