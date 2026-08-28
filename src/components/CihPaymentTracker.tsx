import React, { useState } from 'react';
import {
  Coins,
  CreditCard,
  Building2,
  Copy,
  Check,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Edit2,
  CheckSquare,
  Users,
  Shield,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { SoccerMatch, isSuperAdminEmail } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { formatMAD } from '../lib/moroccoUtils';
import {
  calculateMatchPricing,
  parsePrice,
  derivePlayerPriceFromTotal,
  deriveTotalFromPlayerPrice,
} from '../lib/matchPricing';

interface CihPaymentTrackerProps {
  match: SoccerMatch;
}

export const CihPaymentTracker: React.FC<CihPaymentTrackerProps> = ({ match }) => {
  const {
    currentUser,
    togglePlayerPaidStatus,
    updatePlayerPaymentStatus,
    updateMatchPitchCost,
    uploadPaymentProof,
    updateMatchBankDetails,
  } = usePitchStore();

  const { t, language, isRTL } = useLanguage();

  const isCreatorOrAdmin =
    currentUser.id === match.creatorId ||
    currentUser.isAdmin ||
    isSuperAdminEmail(currentUser.email);

  // Bank Details state
  const defaultBank = match.bankDetails || {
    bankName: 'CIH Bank',
    accountHolder: match.creatorName || 'مصطفى بوهبوس (Mustapha Bouhbous)',
    rib: '230 780 4458921000345600 12',
    phone: '+212 661-234567',
    notes: language === 'ar' ? 'يرجى كتابة اسمك في خانة بيان التحويل (Motif)' : 'Please add your name in the transfer motif',
  };

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankName, setBankName] = useState(defaultBank.bankName);
  const [accountHolder, setAccountHolder] = useState(defaultBank.accountHolder);
  const [rib, setRib] = useState(defaultBank.rib);
  const [copiedRib, setCopiedRib] = useState(false);

  // Cost Splitter state
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [totalCost, setTotalCost] = useState<number | string>(match.totalPitchCost ?? ((match.pricePerPlayer ?? 50) * match.maxPlayers));
  const [pricePerPlayer, setPricePerPlayer] = useState<number | string>(match.pricePerPlayer ?? 50);

  // Proof Upload State
  const [proofMethod, setProofMethod] = useState<'cih_bank' | 'attijari' | 'cash' | 'wafacash' | 'other'>('cih_bank');
  const [proofNote, setProofNote] = useState('');
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const pricing = calculateMatchPricing(
    match.totalPitchCost,
    match.pricePerPlayer,
    match.maxPlayers,
    match.roster.length,
    match.paidPlayerIds || [],
    match.roster.map((p) => p.userId)
  );

  const currentMatchFee = pricing.pricePerPlayer;
  const currentTotalCost = pricing.totalPitchCost;
  const paidCount = pricing.paidCount;
  const unpaidCount = pricing.unpaidCount;
  const totalCollected = pricing.totalCollected;
  const remainingCost = pricing.remainingBalance;
  const collectionPercentage = pricing.collectionPercentage;

  const handleCopyRib = () => {
    navigator.clipboard.writeText(rib.replace(/\s+/g, ''));
    setCopiedRib(true);
    setTimeout(() => setCopiedRib(false), 2200);
  };

  const handleSaveBankDetails = async () => {
    await updateMatchBankDetails(match.id, {
      bankName,
      accountHolder,
      rib,
      phone: defaultBank.phone,
      notes: defaultBank.notes,
    });
    setIsEditingBank(false);
  };

  const handleSaveCostSplit = async () => {
    const finalTotal = typeof totalCost === 'number'
      ? totalCost
      : (totalCost !== '' && !isNaN(Number(totalCost)) ? Number(totalCost) : 0);

    const finalPrice = typeof pricePerPlayer === 'number'
      ? pricePerPlayer
      : (pricePerPlayer !== '' && !isNaN(Number(pricePerPlayer)) ? Number(pricePerPlayer) : 0);

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

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#141A26] via-[#1A2234] to-[#080B10] border border-[#E5B869]/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5B869]/10 border border-[#E5B869]/30 text-[#E5B869] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">
                {language === 'ar' ? 'تتبع مدفوعات CIH والدفع نقداً (درهم)' : 'CIH Bank & Cash Payment Tracker'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'تقسيم ديناميكي لتكلفة الملعب، نسخ مباشر لرقم الحساب RIB، ورفع إيصالات التحويل' : 'Dynamic MAD cost splitter, instant RIB copy & proof upload'}
              </p>
            </div>
          </div>

          {isCreatorOrAdmin && (
            <button
              onClick={() => setIsEditingCost(!isEditingCost)}
              className="px-3.5 py-1.5 rounded-xl bg-[#080B10] hover:bg-[#141A26] text-slate-200 border border-[#E5B869]/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#E5B869]" />
              {isEditingCost ? (language === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit') : (language === 'ar' ? 'تعديل تكلفة الملعب' : 'Adjust Pitch Cost')}
            </button>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {language === 'ar' ? 'يقبل أي مبالغ مخصصة أو دقيقة' : 'Accepts any custom or micro amount'}
              </span>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {language === 'ar' ? 'مثال: 2 دراهم، 3 دراهم، 50 درهم' : 'E.g. 2 MAD, 3 MAD, 75 MAD'}
              </span>
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

        {/* Real-time Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              {language === 'ar' ? 'المحصل:' : 'Collected:'}{' '}
              <strong className="text-[#F5D794]">{formatMAD(totalCollected)}</strong> {language === 'ar' ? 'من أصل' : 'of'}{' '}
              <strong className="text-white">{formatMAD(currentTotalCost)}</strong>
            </span>
            <span className="text-[#E5B869]">{collectionPercentage}% {language === 'ar' ? 'مكتمل' : 'Funded'}</span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#080B10] overflow-hidden border border-[#E5B869]/20">
            <div
              className="h-full bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] rounded-full transition-all duration-500 shadow-lg shadow-amber-950/30"
              style={{ width: `${collectionPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-2xl bg-[#080B10] border border-[#E5B869]/20 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'ar' ? 'رسوم اللاعب' : 'Fee / Player'}
              </span>
              <span className="text-sm font-black text-[#F5D794]">{formatMAD(currentMatchFee, { showZeroAsFree: true })}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#080B10] border border-[#E5B869]/20 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'ar' ? 'المسددون' : 'Paid Players'}
              </span>
              <span className="text-sm font-black text-white">
                {paidCount} {language === 'ar' ? 'من' : 'of'} {match.roster.length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#080B10] border border-[#E5B869]/20 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Due'}
              </span>
              <span className="text-sm font-black text-amber-400">{formatMAD(remainingCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CIH Bank Information Card */}
      <div className="p-5 rounded-3xl bg-[#080B10] border border-[#E5B869]/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-[#E5B869]" />
            <span>{language === 'ar' ? 'بيانات الحساب البنكي بالمغرب (CIH / التجاري وفا بنك / نقداً)' : 'Morocco Bank Account (CIH / Attijariwafa / Cash)'}</span>
          </div>
          {isCreatorOrAdmin && (
            <button
              onClick={() => setIsEditingBank(!isEditingBank)}
              className="text-xs text-[#E5B869] hover:text-[#F5D794] font-semibold cursor-pointer"
            >
              {isEditingBank ? (language === 'ar' ? 'إغلاق' : 'Close') : (language === 'ar' ? 'تعديل البيانات' : 'Edit Details')}
            </button>
          )}
        </div>

        {isEditingBank ? (
          <div className="space-y-3 p-4 rounded-2xl bg-[#141A26] border border-[#E5B869]/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{language === 'ar' ? 'اسم البنك' : 'Bank Name'}</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080B10] border border-[#E5B869]/20 rounded-xl text-xs text-white"
                >
                  <option value="CIH Bank">CIH Bank</option>
                  <option value="Attijariwafa Bank">Attijariwafa Bank (التجاري وفا بنك)</option>
                  <option value="Bank of Africa">Bank of Africa (بنك إفريقيا)</option>
                  <option value="Banque Populaire">Banque Populaire (البنك الشعبي)</option>
                  <option value="Cash at Pitch">نقداً في الملعب (Cash at Pitch)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{language === 'ar' ? 'اسم صاحب الحساب' : 'Account Holder Name'}</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080B10] border border-[#E5B869]/20 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">{language === 'ar' ? 'رقم الحساب البنكي RIB (24 رقماً)' : '24-digit Moroccan RIB'}</label>
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
            <span>{language === 'ar' ? 'رفع إيصال أو لقطة شاشة لإثبات الدفع' : 'Upload My Payment Proof Screenshot'}</span>
          </div>
          {uploadSuccess && (
            <span className="text-xs font-bold text-[#F5D794] flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> {language === 'ar' ? 'تم إرسال الإيصال بنجاح!' : 'Proof Submitted!'}
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
              placeholder={language === 'ar' ? 'مثال: تحويل CIH رقم 889210 أو تم الدفع عند الدخول' : 'e.g. CIH Ref #889210 or Paid at entrance'}
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
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                <ImageIcon className="w-4 h-4 text-[#E5B869]" />
                <span>
                  {proofImagePreview
                    ? (language === 'ar' ? 'تم اختيار الصورة (انقر للتغيير)' : 'Screenshot Attached (Click to change)')
                    : (language === 'ar' ? 'انقر لاختيار صورة إيصال التحويل' : 'Attach Transfer Receipt Screenshot')}
                </span>
              </div>
            </label>

            <button
              type="submit"
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
                {language === 'ar' ? 'سيتم مراجعتها وتأكيدها من طرف المنظم' : 'Will be verified by the match organizer'}
              </span>
            </div>
          </div>
        )}
      </form>

      {/* Roster Payment Status Table */}
      <div className="p-5 rounded-3xl bg-[#080B10] border border-[#E5B869]/20 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E5B869]" />
          {language === 'ar'
            ? `حالة تسديد اللاعبين (${paidCount} سددوا • ${unpaidCount} في الانتظار)`
            : `Roster Payments (${paidCount} Paid • ${unpaidCount} Pending)`}
        </h3>

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
                        <span className="text-[#F5D794] font-semibold flex items-center gap-0.5">
                          • {language === 'ar' ? `تم إرفاق إثبات (${proof.method})` : `Proof attached (${proof.method})`}
                        </span>
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
                    {isPaid ? (language === 'ar' ? 'تم التسديد' : 'Paid') : (language === 'ar' ? 'في الانتظار' : 'Pending')}
                  </span>

                  {isCreatorOrAdmin && (
                    <button
                      type="button"
                      onClick={() => togglePlayerPaidStatus(match.id, player.userId)}
                      className="p-1.5 rounded-lg bg-[#141A26] hover:bg-[#1A2234] border border-[#E5B869]/20 text-slate-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
                      title={isPaid ? (language === 'ar' ? 'تعيين كغير مسدد' : 'Mark as Unpaid') : (language === 'ar' ? 'تأكيد التسديد' : 'Mark as Paid')}
                    >
                      {isPaid ? <Check className="w-3.5 h-3.5 text-[#E5B869]" /> : <Coins className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
