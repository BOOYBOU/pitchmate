import React, { useState } from 'react';
import { SoccerMatch, PaymentProof } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import {
  Coins,
  Copy,
  Check,
  UploadCloud,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Edit2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { formatMAD, MOROCCAN_BANKS, DEFAULT_CIH_BANK_DETAILS } from '../lib/moroccoUtils';
import { useLanguage } from '../lib/useLanguage';

interface CihPaymentTrackerProps {
  match: SoccerMatch;
}

export const CihPaymentTracker: React.FC<CihPaymentTrackerProps> = ({ match }) => {
  const { currentUser, updateMatchBankDetails, uploadPaymentProof, togglePlayerPaidStatus, updateMatchPitchCost } =
    usePitchStore();
  const { language } = useLanguage();

  const isCreatorOrAdmin =
    match.creatorId === currentUser.id ||
    currentUser.isAdmin === true ||
    currentUser.name?.toLowerCase().includes('mustapha') ||
    currentUser.email?.toLowerCase().includes('moustafa');

  const defaultBank = match.bankDetails || DEFAULT_CIH_BANK_DETAILS;
  const [bankName, setBankName] = useState(defaultBank.bankName);
  const [accountHolder, setAccountHolder] = useState(defaultBank.accountHolder);
  const [rib, setRib] = useState(defaultBank.rib);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [copiedRib, setCopiedRib] = useState(false);

  // Dynamic MAD Cost Split State
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [totalCost, setTotalCost] = useState<number | ''>(
    match.totalPitchCost ?? (match.pricePerPlayer * (match.maxPlayers || 14))
  );
  const [pricePerPlayer, setPricePerPlayer] = useState<number | ''>(match.pricePerPlayer || 0);

  // Proof Upload Form State
  const [proofMethod, setProofMethod] = useState<PaymentProof['method']>('cih_bank');
  const [proofNote, setProofNote] = useState('');
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [viewingProof, setViewingProof] = useState<PaymentProof | null>(null);

  // Calculation Metrics
  const currentMatchFee = match.pricePerPlayer || 0;
  const targetTotalCost = match.totalPitchCost ?? (currentMatchFee * (match.maxPlayers || 14));
  const paidCount = (match.paidPlayerIds || []).filter((id) =>
    match.roster.some((p) => p.userId === id)
  ).length;
  const unpaidCount = Math.max(0, match.roster.length - paidCount);
  const totalCollected = paidCount * currentMatchFee;
  const remainingCost = Math.max(0, targetTotalCost - totalCollected);
  const progressPercent =
    targetTotalCost > 0 ? Math.min(100, Math.round((totalCollected / targetTotalCost) * 100)) : 100;

  const handleCopyRib = () => {
    navigator.clipboard.writeText(rib);
    setCopiedRib(true);
    setTimeout(() => setCopiedRib(false), 2500);
  };

  const handleSaveBankDetails = async () => {
    await updateMatchBankDetails(match.id, {
      bankName,
      accountHolder,
      rib,
      notes: defaultBank.notes,
    });
    setIsEditingBank(false);
  };

  const handleSaveCostSplit = async () => {
    const finalTotal = totalCost === '' ? 0 : Number(totalCost);
    const finalPrice = pricePerPlayer === '' ? 0 : Number(pricePerPlayer);

    await updateMatchPitchCost(match.id, finalTotal, finalPrice);
    setIsEditingCost(false);
  };

  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploadingProof(true);
    let finalScreenshotUrl = proofImagePreview || undefined;

    if (proofFile) {
      try {
        const { mediaStorage } = await import('../lib/mediaStorage');
        const uploadRes = await mediaStorage.uploadAvatar(proofFile);
        if (uploadRes.success && uploadRes.avatarUrl) {
          finalScreenshotUrl = uploadRes.avatarUrl;
        }
      } catch (err) {
        console.warn('Payment proof cloud upload fallback:', err);
      }
    }

    await uploadPaymentProof(
      match.id,
      currentUser.id,
      currentUser.name,
      currentMatchFee,
      proofMethod,
      finalScreenshotUrl,
      proofNote || (language === 'ar' ? `تم الدفع عبر ${proofMethod}` : `Paid via ${proofMethod}`)
    );
    setIsUploadingProof(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  // Quick Action: Mark All as Paid (Cash)
  const handleMarkAllPaid = async () => {
    for (const player of match.roster) {
      if (!match.paidPlayerIds?.includes(player.userId)) {
        await togglePlayerPaidStatus(match.id, player.userId);
      }
    }
  };

  // Quick Action: Broadcast WhatsApp Payment Reminder
  const handleSendWhatsAppPaymentReminder = () => {
    const unpaidPlayers = match.roster.filter((p) => !match.paidPlayerIds?.includes(p.userId));
    const unpaidNames = unpaidPlayers.map((p) => `• ${p.name}`).join('\n');
    const msg =
      `💰 *تذكير تسديد مصاريف حجز الملعب (PITCHMATE)*\n\n` +
      `📍 *الماتش:* ${match.title}\n` +
      `💵 *المبلغ المطلوب:* ${formatMAD(currentMatchFee)} لكل لاعب\n` +
      `💳 *CIH Bank RIB:* \`${rib}\` (${accountHolder})\n\n` +
      `⏳ *اللاعبين في الانتظار:*\n${unpaidNames}\n\n` +
      `يرجى التحويل أو إحضار المبلغ نقداً قبل بداية الماتش. شكراً! 🇲🇦⚽`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#141A26] via-[#1A2234] to-[#080B10] border border-[#E5B869]/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5B869]/10 border border-[#E5B869]/30 text-[#E5B869] flex items-center justify-center shadow-lg shadow-amber-950/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                {language === 'ar' ? 'تتبع مدفوعات CIH والدفع نقداً (درهم)' : 'CIH Bank & Cash Payment Tracker'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'تقسيم ديناميكي لتكلفة الملعب، نسخ مباشر لرقم الحساب RIB، ورفع إيصالات التحويل'
                  : 'Dynamic MAD cost splitter, instant RIB copy & proof upload'}
              </p>
            </div>
          </div>

          {isCreatorOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSendWhatsAppPaymentReminder}
                className="px-3.5 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تذكير واتساب' : 'WhatsApp Reminder'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCost(!isEditingCost)}
                className="px-3.5 py-1.5 rounded-xl bg-[#080B10] hover:bg-[#141A26] text-slate-200 border border-[#E5B869]/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#E5B869]" />
                {isEditingCost
                  ? language === 'ar'
                    ? 'إلغاء التعديل'
                    : 'Cancel Edit'
                  : language === 'ar'
                  ? 'تعديل تكلفة الملعب'
                  : 'Adjust Pitch Cost'}
              </button>
            </div>
          )}
        </div>

        {/* Cost Splitter Edit Panel */}
        {isEditingCost && (
          <div className="p-4 rounded-2xl bg-[#080B10] border border-[#E5B869]/30 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {language === 'ar' ? 'إجمالي إيجار الملعب (درهم)' : 'Total Pitch Rental (MAD)'}
              </label>
              <input
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 30, 600, 700"
                value={totalCost}
                onChange={(e) => {
                  const val = e.target.value;
                  setTotalCost(val === '' ? '' : Number(val));
                  if (val !== '' && match.roster.length > 0) {
                    setPricePerPlayer(parseFloat((Number(val) / match.roster.length).toFixed(2)));
                  }
                }}
                className="w-full px-3 py-2 bg-[#141A26] border border-[#E5B869]/25 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-[#E5B869]"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {language === 'ar' ? 'رسوم كل لاعب (درهم)' : 'Fee Per Player (MAD)'}
              </label>
              <input
                type="number"
                min={0}
                step="any"
                placeholder="e.g. 2, 3, 50, 75"
                value={pricePerPlayer}
                onChange={(e) => {
                  const val = e.target.value;
                  setPricePerPlayer(val === '' ? '' : Number(val));
                  if (val !== '' && match.roster.length > 0) {
                    setTotalCost(Number(val) * match.roster.length);
                  }
                }}
                className="w-full px-3 py-2 bg-[#141A26] border border-[#E5B869]/25 rounded-xl text-xs text-[#F5D794] font-bold focus:outline-none focus:border-[#E5B869]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSaveCostSplit}
                className="w-full py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer"
              >
                {language === 'ar' ? 'حفظ وتطبيق التقسيم' : 'Apply Split'}
              </button>
            </div>
          </div>
        )}

        {/* 4-Stat Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[#080B10]/80 border border-[#E5B869]/20">
            <span className="text-[11px] text-slate-400 block">
              {language === 'ar' ? 'إجمالي الحجز' : 'Total Pitch Cost'}
            </span>
            <span className="text-base font-black text-white font-mono mt-0.5 block">
              {formatMAD(targetTotalCost)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080B10]/80 border border-[#E5B869]/20">
            <span className="text-[11px] text-slate-400 block">
              {language === 'ar' ? 'المبلغ المحصل' : 'Collected in MAD'}
            </span>
            <span className="text-base font-black text-[#F5D794] font-mono mt-0.5 block">
              {formatMAD(totalCollected)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080B10]/80 border border-[#E5B869]/20">
            <span className="text-[11px] text-slate-400 block">
              {language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Balance'}
            </span>
            <span className="text-base font-black text-amber-400 font-mono mt-0.5 block">
              {formatMAD(remainingCost)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#080B10]/80 border border-[#E5B869]/20">
            <span className="text-[11px] text-slate-400 block">
              {language === 'ar' ? 'رسوم اللاعب' : 'Fee / Player'}
            </span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
              {formatMAD(currentMatchFee, { showZeroAsFree: true })}
            </span>
          </div>
        </div>

        {/* Progress Gauge */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{language === 'ar' ? 'نسبة استخلاص المستحقات' : 'Pitch Collection Progress'}</span>
            <span className="text-[#F5D794] font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-[#080B10] rounded-full overflow-hidden border border-[#E5B869]/20">
            <div
              className="h-full bg-gradient-to-r from-[#0D503C] via-[#E5B869] to-[#F5D794] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CIH Bank & Moroccan RIB Card */}
      <div className="p-5 rounded-3xl bg-[#080B10] border border-[#E5B869]/25 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Landmark className="w-5 h-5 text-[#E5B869]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'بيانات الحساب البنكي (CIH Bank RIB)' : 'Organizer Bank Details & 24-Digit RIB'}
            </h3>
          </div>

          {isCreatorOrAdmin && (
            <button
              onClick={() => setIsEditingBank(!isEditingBank)}
              className="text-xs text-[#F5D794] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              {isEditingBank
                ? language === 'ar'
                  ? 'إلغاء'
                  : 'Cancel'
                : language === 'ar'
                ? 'تعديل الحساب'
                : 'Edit RIB'}
            </button>
          )}
        </div>

        {isEditingBank ? (
          <div className="space-y-3 p-4 rounded-2xl bg-[#141A26] border border-[#E5B869]/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {language === 'ar' ? 'اسم البنك' : 'Bank Name'}
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080B10] border border-[#E5B869]/20 rounded-xl text-xs text-white"
                >
                  {MOROCCAN_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {language === 'ar' ? 'صاحب الحساب' : 'Account Holder'}
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080B10] border border-[#E5B869]/20 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                {language === 'ar' ? 'رقم الحساب البنكي RIB (24 رقماً)' : '24-digit Moroccan RIB'}
              </label>
              <input
                type="text"
                value={rib}
                onChange={(e) => setRib(e.target.value)}
                className="w-full px-3 py-2 bg-[#080B10] border border-[#E5B869]/20 rounded-xl text-xs font-mono text-[#F5D794]"
              />
            </div>

            <button
              onClick={handleSaveBankDetails}
              className="px-4 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-black rounded-xl cursor-pointer"
            >
              {language === 'ar' ? 'حفظ البيانات البنكية' : 'Save Bank Info'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#141A26] border border-[#E5B869]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/30">
                  {bankName}
                </span>
                <span className="text-xs font-bold text-white">{accountHolder}</span>
              </div>
              <p className="font-mono text-xs text-[#F5D794] tracking-wider pt-1">{rib}</p>
              <p className="text-[11px] text-slate-400">{defaultBank.notes}</p>
            </div>

            <button
              type="button"
              onClick={handleCopyRib}
              className="px-4 py-2 rounded-xl bg-[#241A0B] hover:bg-[#342410] border border-[#E5B869]/30 text-[#F5D794] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedRib ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{language === 'ar' ? 'تم نسخ الـ RIB بنجاح!' : 'RIB Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{language === 'ar' ? 'نسخ رقم الحساب (RIB)' : 'Copy 24-Digit RIB'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Payment Proof Form */}
      <form onSubmit={handleSubmitProof} className="p-5 rounded-3xl bg-[#080B10] border border-[#E5B869]/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <UploadCloud className="w-4 h-4 text-[#E5B869]" />
            <span>
              {language === 'ar' ? 'رفع إيصال أو لقطة شاشة لإثبات الدفع' : 'Upload My Payment Proof Screenshot'}
            </span>
          </div>
          {uploadSuccess && (
            <span className="text-xs font-bold text-[#F5D794] flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />{' '}
              {language === 'ar' ? 'تم إرسال الإيصال بنجاح!' : 'Proof Submitted!'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </label>
            <select
              value={proofMethod}
              onChange={(e) => setProofMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#141A26] border border-[#E5B869]/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B869]"
            >
              <option value="cih_bank">{language === 'ar' ? 'تطبيق CIH بنك (CIH Mobile)' : 'CIH Mobile / CIH Bank'}</option>
              <option value="attijari">{language === 'ar' ? 'التجاري وفا بنك (Attijariwafa)' : 'Attijariwafa Bank'}</option>
              <option value="wafacash">{language === 'ar' ? 'وفاكاش / كاش بلوس (CashPlus)' : 'Wafacash / CashPlus'}</option>
              <option value="cash">{language === 'ar' ? 'دفع نقداً للمنظم في الملعب' : 'Cash Given to Organizer on Pitch'}</option>
              <option value="other">{language === 'ar' ? 'تحويل بنكي من بنك آخر' : 'Other Bank Transfer'}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              {language === 'ar' ? 'ملاحظة أو رقم العملية' : 'Transfer Note / Reference'}
            </label>
            <input
              type="text"
              placeholder={
                language === 'ar'
                  ? 'مثال: تحويل CIH رقم 889210 أو تم الدفع عند الدخول'
                  : 'e.g. CIH Ref #889210 or Paid at entrance'
              }
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#141A26] border border-[#E5B869]/20 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B869]"
            />
          </div>
        </div>

        {/* Screenshot Upload Input */}
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">
            {language === 'ar' ? 'صورة الإيصال / لقطة الشاشة' : 'Receipt / Screenshot'}
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 border-2 border-dashed border-[#E5B869]/30 hover:border-[#E5B869] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#141A26]/50">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                <ImageIcon className="w-4 h-4 text-[#E5B869]" />
                <span>
                  {proofImagePreview
                    ? language === 'ar'
                      ? 'تم اختيار الصورة (انقر للتغيير)'
                      : 'Screenshot Attached (Click to change)'
                    : language === 'ar'
                    ? 'انقر لاختيار صورة إيصال التحويل'
                    : 'Attach Transfer Receipt Screenshot'}
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isUploadingProof}
              className="px-5 py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-950 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4" />
              {language === 'ar' ? 'إرسال الإيصال' : 'Submit Proof'}
            </button>
          </div>
        </div>

        {proofImagePreview && (
          <div className="p-3 rounded-2xl bg-[#141A26] border border-[#E5B869]/30 flex items-center gap-3">
            <img
              src={proofImagePreview}
              alt="Payment Proof"
              className="w-14 h-14 rounded-xl object-cover border border-slate-700"
            />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-[#F5D794] block">
                {language === 'ar' ? 'الصورة جاهزة للإرسال' : 'Screenshot ready to upload'}
              </span>
              <span className="text-[11px] text-slate-400">
                {language === 'ar'
                  ? 'سيتم مراجعتها وتأكيدها من طرف المنظم'
                  : 'Will be verified by the match organizer'}
              </span>
            </div>
          </div>
        )}
      </form>

      {/* Roster Payment Status Table */}
      <div className="p-5 rounded-3xl bg-[#080B10] border border-[#E5B869]/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#E5B869]" />
            {language === 'ar'
              ? `حالة تسديد اللاعبين (${paidCount} سددوا • ${unpaidCount} في الانتظار)`
              : `Roster Payments (${paidCount} Paid • ${unpaidCount} Pending)`}
          </h3>

          {isCreatorOrAdmin && (
            <button
              type="button"
              onClick={handleMarkAllPaid}
              className="text-[11px] font-bold text-[#F5D794] hover:underline cursor-pointer"
            >
              {language === 'ar' ? 'تأكيد دفع الجميع نقداً' : 'Mark All Paid (Cash)'}
            </button>
          )}
        </div>

        <div className="divide-y divide-[#E5B869]/10">
          {match.roster.map((player) => {
            const isPaid = (match.paidPlayerIds || []).includes(player.userId);
            const proof = match.paymentProofs?.[player.userId];

            return (
              <div
                key={player.userId}
                className="flex items-center justify-between py-3 hover:bg-[#141A26]/50 px-2 rounded-xl transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      player.team === 'green' ? 'bg-[#0D503C]' : 'bg-[#E5B869]'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{player.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{player.position || 'MID'}</span>
                      {proof && (
                        <button
                          type="button"
                          onClick={() => setViewingProof(proof)}
                          className="text-[#F5D794] font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          • {language === 'ar' ? `إثبات (${proof.method})` : `Proof (${proof.method})`}
                          <Eye className="w-3 h-3 ml-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isPaid
                        ? 'bg-[#0D503C]/40 text-[#F5D794] border border-[#E5B869]/30'
                        : 'bg-[#241A0B] text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isPaid
                      ? language === 'ar'
                        ? 'تم التسديد'
                        : 'Paid'
                      : language === 'ar'
                      ? 'في الانتظار'
                      : 'Pending'}
                  </span>

                  {isCreatorOrAdmin && (
                    <button
                      type="button"
                      onClick={() => togglePlayerPaidStatus(match.id, player.userId)}
                      className="p-1.5 rounded-lg bg-[#141A26] hover:bg-[#1A2234] border border-[#E5B869]/20 text-slate-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
                      title={
                        isPaid
                          ? language === 'ar'
                            ? 'تعيين كغير مسدد'
                            : 'Mark as Unpaid'
                          : language === 'ar'
                          ? 'تأكيد التسديد'
                          : 'Mark as Paid'
                      }
                    >
                      {isPaid ? (
                        <Check className="w-3.5 h-3.5 text-[#E5B869]" />
                      ) : (
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proof Lightbox Modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-md w-full bg-[#141A26] border border-[#E5B869]/30 rounded-3xl p-5 text-white space-y-3">
            <button
              onClick={() => setViewingProof(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-[#F5D794]">
              {language === 'ar' ? 'إثبات الدفع المرفق' : 'Payment Proof Verification'}
            </h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p><strong>{language === 'ar' ? 'اللاعب:' : 'Player:'}</strong> {viewingProof.playerName}</p>
              <p><strong>{language === 'ar' ? 'المبلغ:' : 'Amount:'}</strong> {formatMAD(viewingProof.amount)}</p>
              <p><strong>{language === 'ar' ? 'الطريقة:' : 'Method:'}</strong> {viewingProof.method}</p>
              {viewingProof.note && <p><strong>{language === 'ar' ? 'ملاحظة:' : 'Note:'}</strong> {viewingProof.note}</p>}
            </div>
            {viewingProof.screenshotUrl && (
              <img
                src={viewingProof.screenshotUrl}
                alt="Proof"
                className="w-full max-h-80 object-contain rounded-2xl border border-slate-700"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
