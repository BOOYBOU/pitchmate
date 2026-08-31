import React, { useState, useRef } from 'react';
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
  Download,
  Image as ImageIcon,
  Send,
  QrCode,
} from 'lucide-react';
import { formatMoroccoDate, formatMAD } from '../lib/moroccoUtils';
import { useLanguage } from '../lib/useLanguage';

interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: SoccerMatch | null;
}

export const MatchShareModal: React.FC<MatchShareModalProps> = ({ isOpen, onClose, match }) => {
  const { language } = useLanguage();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGeneratedSuccess, setImageGeneratedSuccess] = useState(false);
  const [shareType, setShareType] = useState<'invite' | 'lineup' | 'payment' | 'result'>('invite');
  const [textLanguage, setTextLanguage] = useState<'ar' | 'fr' | 'en'>(language === 'ar' ? 'ar' : 'fr');
  const [directPhone, setDirectPhone] = useState('');
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'card'>('whatsapp');

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

  // Multi-Language WhatsApp Payload Generator
  const getInviteText = () => {
    if (textLanguage === 'ar') {
      return (
        `🇲🇦 ⚽ *دعوة لمباراة كرة قدم: ${match.title.toUpperCase()}*\n\n` +
        `📅 *الموعد والتاريخ:* ${formattedDate}\n` +
        `📍 *الملعب:* ${match.location.venueName} (${match.location.city || 'المغرب'})\n` +
        `📌 *العنوان:* ${match.location.address}\n` +
        `👥 *الفورمات:* ${match.format || '7v7'} (${match.roster.length}/${match.maxPlayers} لاعبين - *${spotsLeft > 0 ? `باقي ${spotsLeft} مقاعد!` : 'الماتش مكمّل'}*)\n` +
        `💰 *المساهمة:* ${match.pricePerPlayer === 0 ? 'مجاناً' : `${match.pricePerPlayer} درهم / لاعب`}\n` +
        `🗺️ *موقع الملعب (خرائط Google):* ${mapsUrl}\n\n` +
        `👉 *لحجز مقعدك وتأكيد المركز في التشكيلة:* ${matchShareLink}`
      );
    }
    if (textLanguage === 'fr') {
      return (
        `🇲🇦 ⚽ *INVITATION MATCH PITCHMATE: ${match.title.toUpperCase()}*\n\n` +
        `📅 *Date & Heure:* ${formattedDate}\n` +
        `📍 *Terrain:* ${match.location.venueName} (${match.location.city || 'Maroc'})\n` +
        `📌 *Adresse:* ${match.location.address}\n` +
        `👥 *Format:* ${match.format || '7v7'} (${match.roster.length}/${match.maxPlayers} joueurs - *${spotsLeft > 0 ? `${spotsLeft} places restantes!` : 'COMPLET'}*)\n` +
        `💰 *Cotisation:* ${match.pricePerPlayer === 0 ? 'GRATUIT' : `${match.pricePerPlayer} MAD / joueur`}\n` +
        `🗺️ *Google Maps:* ${mapsUrl}\n\n` +
        `👉 *Rejoins la feuille de match:* ${matchShareLink}`
      );
    }
    return (
      `🇲🇦 ⚽ *PITCHMATE MATCH INVITE: ${match.title.toUpperCase()}*\n\n` +
      `📅 *Date & Time:* ${formattedDate}\n` +
      `📍 *Venue:* ${match.location.venueName} (${match.location.city || 'Morocco'})\n` +
      `📌 *Address:* ${match.location.address}\n` +
      `👥 *Format:* ${match.format || '7v7'} (${match.roster.length}/${match.maxPlayers} players - *${spotsLeft > 0 ? `${spotsLeft} spots left!` : 'FULL SQUAD'}*)\n` +
      `💰 *Fee:* ${match.pricePerPlayer === 0 ? 'FREE' : `${match.pricePerPlayer} MAD / player`}\n` +
      `🗺️ *Google Maps:* ${mapsUrl}\n\n` +
      `👉 *Join roster & lock your spot:* ${matchShareLink}`
    );
  };

  const greenList =
    greenPlayers.map((p, i) => `  ${i + 1}. ${p.name} (${p.position || 'MID'})`).join('\n') || '  (None yet)';
  const blueList =
    bluePlayers.map((p, i) => `  ${i + 1}. ${p.name} (${p.position || 'MID'})`).join('\n') || '  (None yet)';

  const getLineupText = () => {
    return (
      `📋 *MATCH LINEUP & FORMATIONS: ${match.title.toUpperCase()}*\n\n` +
      `📅 ${formattedDate} | 📍 ${match.location.venueName}\n\n` +
      `🟢 *TEAM GREEN* (${match.formationGreen || '2-3-1'} - ${greenPlayers.length} players):\n${greenList}\n\n` +
      `🔵 *TEAM BLUE* (${match.formationBlue || '2-3-1'} - ${bluePlayers.length} players):\n${blueList}\n\n` +
      `👉 *View 3D Tactical Pitch:* ${matchShareLink}`
    );
  };

  const bankInfoText = match.bankDetails?.rib
    ? `\n💳 *CIH Bank RIB:* \`${match.bankDetails.rib}\` (${match.bankDetails.accountHolder})`
    : '';

  const getPaymentText = () => {
    return (
      `💰 *PITCH FEE & PAYMENT TRACKER: ${match.title.toUpperCase()}*\n\n` +
      `📍 *Venue:* ${match.location.venueName}\n` +
      `💵 *Total Pitch Rental:* ${formatMAD(match.totalPitchCost || match.pricePerPlayer * match.maxPlayers)}\n` +
      `🎟️ *Fee Per Player:* ${formatMAD(match.pricePerPlayer)}\n` +
      `📊 *Status:* ${paidCount} Paid • ${unpaidCount} Pending${bankInfoText}\n\n` +
      `👉 *View Payment Proofs & Status:* ${matchShareLink}`
    );
  };

  const scoreGreen = match.score?.green ?? 0;
  const scoreBlue = match.score?.blue ?? 0;
  const winnerTeam =
    scoreGreen > scoreBlue
      ? '🟢 Team Green Victorious!'
      : scoreBlue > scoreGreen
      ? '🔵 Team Blue Victorious!'
      : '🤝 Thrilling Draw!';
  const motmName = match.motmWinnerName || match.mvpWinnerName || 'TBD';

  const getResultText = () => {
    return (
      `🏆 *MATCH RESULT & RECAP: ${match.title.toUpperCase()}*\n\n` +
      `📍 ${match.location.venueName} • ${formattedDate}\n\n` +
      `🟢 *Team Green* ${scoreGreen} - ${scoreBlue} *Team Blue* 🔵\n` +
      `✨ *Outcome:* ${winnerTeam}\n` +
      `⭐ *Man of the Match (MOTM):* ${motmName}\n\n` +
      `👉 *View full stats & leaderboards:* ${matchShareLink}`
    );
  };

  const activeMessageText =
    shareType === 'invite'
      ? getInviteText()
      : shareType === 'lineup'
      ? getLineupText()
      : shareType === 'payment'
      ? getPaymentText()
      : getResultText();

  const handleShareToWhatsApp = () => {
    const cleanPhone = directPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(activeMessageText);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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

  // Generate and Download Canvas Match Poster
  const handleDownloadPosterCard = () => {
    setIsGeneratingImage(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, '#080B10');
      bgGrad.addColorStop(0.5, '#141A26');
      bgGrad.addColorStop(1, '#0D503C');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Gold border
      ctx.strokeStyle = '#E5B869';
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, 1160, 590);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(245, 215, 148, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, 1136, 566);

      // Header Brand
      ctx.fillStyle = '#F5D794';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('🇲🇦 PITCHMATE • MOROCCAN FOOTBALL LEAGUE', 60, 90);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText(match.title.substring(0, 32), 60, 170);

      // Details Bar
      ctx.fillStyle = '#F5D794';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`📅 ${formattedDate}`, 60, 240);
      ctx.fillText(`📍 ${match.location.venueName} (${match.location.city || 'Casablanca'})`, 60, 290);
      ctx.fillText(`👥 Format: ${match.format || '7v7'}  •  🎟️ ${match.pricePerPlayer} MAD / Player`, 60, 340);

      // Squad Box
      ctx.fillStyle = 'rgba(20, 26, 38, 0.8)';
      ctx.fillRect(60, 380, 1080, 160);
      ctx.strokeStyle = 'rgba(229, 184, 105, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 380, 1080, 160);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`🟢 Green Team (${greenPlayers.length} confirmed)`, 90, 430);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      ctx.fillText(greenPlayers.slice(0, 4).map((p) => p.name).join(', ') || 'Open spots...', 90, 470);

      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`🔵 Blue Team (${bluePlayers.length} confirmed)`, 620, 430);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      ctx.fillText(bluePlayers.slice(0, 4).map((p) => p.name).join(', ') || 'Open spots...', 620, 470);

      // Footer
      ctx.fillStyle = '#F5D794';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`👉 Reserve spot on pitchmate.ma: ${matchShareLink}`, 60, 580);

      // Convert to image download
      const link = document.createElement('a');
      link.download = `pitchmate_match_${match.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setImageGeneratedSuccess(true);
      setTimeout(() => setImageGeneratedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export poster card:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#141A26] border border-[#E5B869]/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
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
          <div className="w-11 h-11 rounded-2xl bg-[#241A0B] border border-[#E5B869]/30 text-[#F5D794] flex items-center justify-center shadow-lg shadow-amber-950 shrink-0">
            <Share2 className="w-5 h-5 text-[#E5B869]" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">Squad & Match Share Studio</h3>
            <p className="text-xs text-slate-400">One-tap WhatsApp group shares, lineups, MAD ledger & poster cards</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#080B10] rounded-2xl border border-[#E5B869]/20">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Text Generator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'card'
                ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Visual Poster Card</span>
          </button>
        </div>

        {activeTab === 'whatsapp' ? (
          <>
            {/* Share Template Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Template
                </label>
                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-[#080B10] p-0.5 rounded-lg border border-[#E5B869]/20">
                  <button
                    type="button"
                    onClick={() => setTextLanguage('ar')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      textLanguage === 'ar' ? 'bg-[#E5B869] text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextLanguage('fr')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      textLanguage === 'fr' ? 'bg-[#E5B869] text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    FR
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextLanguage('en')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      textLanguage === 'en' ? 'bg-[#E5B869] text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setShareType('invite')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    shareType === 'invite'
                      ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md font-extrabold'
                      : 'bg-[#080B10] border border-[#E5B869]/20 text-slate-300 hover:text-white'
                  }`}
                >
                  📢 Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('lineup')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    shareType === 'lineup'
                      ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md font-extrabold'
                      : 'bg-[#080B10] border border-[#E5B869]/20 text-slate-300 hover:text-white'
                  }`}
                >
                  ⚔️ Lineup
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('payment')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    shareType === 'payment'
                      ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md font-extrabold'
                      : 'bg-[#080B10] border border-[#E5B869]/20 text-slate-300 hover:text-white'
                  }`}
                >
                  💳 CIH / MAD
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('result')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    shareType === 'result'
                      ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md font-extrabold'
                      : 'bg-[#080B10] border border-[#E5B869]/20 text-slate-300 hover:text-white'
                  }`}
                >
                  🏆 Result & MOTM
                </button>
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="p-3 bg-[#080B10] border border-[#E5B869]/20 rounded-2xl max-h-40 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
              {activeMessageText}
            </div>

            {/* Direct WhatsApp Contact Number (Optional) */}
            <div className="flex items-center gap-2 bg-[#080B10] border border-[#E5B869]/20 p-2 rounded-xl">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Direct WhatsApp (+212):</span>
              <input
                type="text"
                placeholder="0661234567"
                value={directPhone}
                onChange={(e) => setDirectPhone(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                id="btn-whatsapp-share-direct"
                type="button"
                onClick={handleShareToWhatsApp}
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99] text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-[#25D366]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-slate-950" />
                {directPhone ? 'Send Direct via WhatsApp' : 'Share to WhatsApp Group'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-copy-formatted-text"
                  type="button"
                  onClick={handleCopyMessage}
                  className="py-2.5 px-3 bg-[#080B10] hover:bg-[#141A26] border border-[#E5B869]/20 hover:border-[#E5B869]/50 active:scale-[0.99] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#F5D794]" />
                      <span className="text-[#F5D794]">Copied!</span>
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
                  className="py-2.5 px-3 bg-[#080B10] hover:bg-[#141A26] border border-[#E5B869]/20 hover:border-[#E5B869]/50 active:scale-[0.99] text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#F5D794]" />
                      <span className="text-[#F5D794]">Link Copied!</span>
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
          </>
        ) : (
          /* Visual Match Poster Card View */
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#E5B869]/60 bg-gradient-to-br from-[#080B10] via-[#141A26] to-[#0D503C] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5B869]/20 pb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#F5D794]">
                  🇲🇦 PitchMate Official Fixture
                </span>
                <span className="px-2.5 py-0.5 bg-[#241A0B] border border-[#E5B869]/40 text-[#F5D794] text-[10px] font-black rounded-full">
                  {match.format || '7v7'}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-black text-white">{match.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{match.location.venueName} • {match.location.city || 'Casablanca'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="font-bold text-emerald-400 block">🟢 Green Team ({greenPlayers.length})</span>
                  <span className="text-[11px] text-slate-300 truncate block mt-0.5">
                    {greenPlayers.slice(0, 3).map((p) => p.name).join(', ') || 'Spots available'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30">
                  <span className="font-bold text-blue-400 block">🔵 Blue Team ({bluePlayers.length})</span>
                  <span className="text-[11px] text-slate-300 truncate block mt-0.5">
                    {bluePlayers.slice(0, 3).map((p) => p.name).join(', ') || 'Spots available'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#E5B869]/20 pt-3 text-xs">
                <span className="text-[#F5D794] font-black text-sm">
                  {formatMAD(match.pricePerPlayer, { showZeroAsFree: true })} / Player
                </span>
                <span className="text-slate-400 text-[11px]">
                  {spotsLeft > 0 ? `${spotsLeft} spots available` : 'Squad Full'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingImage}
              onClick={handleDownloadPosterCard}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-950/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              {isGeneratingImage ? (
                <span>Generating Poster...</span>
              ) : imageGeneratedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Poster Downloaded Successfully!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download High-Res Match Poster (PNG)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
