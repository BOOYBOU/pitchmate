import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Shield,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Upload,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap,
  Flame,
  RotateCw,
  Send,
  Inbox,
  X,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { MOROCCAN_CITIES_LOCALIZED } from '../lib/translations';
import { isSuperAdminEmail } from '../types';

const MOROCCAN_CITIES = Object.keys(MOROCCAN_CITIES_LOCALIZED);

export const AuthView: React.FC = () => {
  const {
    loginWithCredentials,
    signupWithCredentials,
    resetPasswordWithEmail,
    sendVerificationOTP,
    verifyOTPCode,
    loginWithGoogle,
  } = usePitchStore();
  const { language, toggleLanguage, t, isRTL, getCityName } = useLanguage();

  type AuthMode = 'signin' | 'signup' | 'verify_signup' | 'forgot' | 'verify_forgot' | 'pending';
  const [mode, setMode] = useState<AuthMode>('signin');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpCity, setSignUpCity] = useState(MOROCCAN_CITIES[0] || 'الدار البيضاء (Casablanca)');
  const [signUpPosition, setSignUpPosition] = useState('MID');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200');
  const [signUpError, setSignUpError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [registeredUserName, setRegisteredUserName] = useState('');

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpSentNotification, setOtpSentNotification] = useState<{ code: string; email: string } | null>(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if ((mode === 'verify_signup' || mode === 'verify_forgot') && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, otpTimer]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!signUpPassword) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (signUpPassword.length >= 6) score += 1;
    if (signUpPassword.length >= 9) score += 1;
    if (/[A-Z]/.test(signUpPassword) || /[a-z]/.test(signUpPassword)) score += 1;
    if (/[0-9]/.test(signUpPassword) || /[^A-Za-z0-9]/.test(signUpPassword)) score += 1;

    if (score <= 1) return { score: 1, label: language === 'ar' ? 'ضعيفة' : 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: language === 'ar' ? 'متوسطة' : 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: language === 'ar' ? 'جيدة' : 'Good', color: 'bg-emerald-500' };
    return { score: 4, label: language === 'ar' ? 'قوية جداً' : 'Very Strong', color: 'bg-emerald-400' };
  }, [signUpPassword, language]);

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);
    setOtpError('');

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      const cleanEmail = signInEmail.trim().toLowerCase();
      const res = await loginWithCredentials(cleanEmail, signInPassword);
      if (!res.success) {
        setSignInError(res.error || t('auth.invalidCredentials'));
      }
    } catch {
      setSignInError(
        language === 'ar'
          ? 'حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.'
          : 'An unexpected authentication error occurred.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Flow Handler (Official Firebase Google Account Chooser)
  const handleGoogleAuth = async (action: 'signin' | 'signup') => {
    setSignInError('');
    setSignUpError('');
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle(action);

      if (!res.success) {
        if (res.code === 'USER_CANCELLED') {
          // User closed popup without selecting an account
          setGoogleLoading(false);
          return;
        }

        if (action === 'signin') {
          setSignInError(res.error || (language === 'ar' ? 'فشل تسجيل الدخول عبر Google.' : 'Google Sign-In failed.'));
        } else {
          setSignUpError(res.error || (language === 'ar' ? 'فشل إنشاء الحساب عبر Google.' : 'Google Sign-Up failed.'));
        }
      } else if (res.pendingApproval) {
        if (res.user) {
          setRegisteredUserName(res.user.name);
          setRegisteredUserEmail(res.user.email);
        }
        setMode('pending');
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const errMsg = err?.code === 'auth/popup-closed-by-user'
        ? ''
        : (language === 'ar'
            ? 'تعذر الاتصال بـ Google. يرجى التأكد من السماح بالنوافذ المنبثقة (Popups) أو تجربة فتح التطبيق في نافذة جديدة.'
            : 'Could not connect to Google. Please allow popups or open app in a new window.');
      if (action === 'signin') {
        if (errMsg) setSignInError(errMsg);
      } else {
        if (errMsg) setSignUpError(errMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Step 1: Sign Up -> Trigger 6-digit OTP verification
  const handleSignUpStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');

    if (!signUpName.trim()) {
      setSignUpError(language === 'ar' ? 'الاسم الكامل مطلوب.' : 'Full name is required.');
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setSignUpError(language === 'ar' ? 'الرجاء إدخال بريد إلكتروني صالح.' : 'Valid email is required.');
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError(t('auth.passwordLengthError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const isMustapha = isSuperAdminEmail(cleanEmail);

      // If Super Admin, direct registration verification
      if (isMustapha) {
        const res = await signupWithCredentials(
          signUpName.trim(),
          cleanEmail,
          signUpPassword,
          avatarPreview,
          signUpCity,
          signUpPosition
        );
        if (!res.success) {
          setSignUpError(res.error || (language === 'ar' ? 'فشل التحقق من الحساب.' : 'Verification failed.'));
        }
        return;
      }

      // Send 6-digit cryptographic verification code
      const otpRes = await sendVerificationOTP(cleanEmail, 'signup');
      if (!otpRes.success) {
        setSignUpError(otpRes.error || (language === 'ar' ? 'فشل إرسال رمز التحقق.' : 'Failed to send OTP.'));
        return;
      }

      // Transition to OTP verification screen
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setOtpTimer(60);
      if (otpRes.code) {
        setOtpSentNotification({ code: otpRes.code, email: cleanEmail });
      }
      setMode('verify_signup');
    } catch {
      setSignUpError(language === 'ar' ? 'حدث خطأ أثناء إرسال رمز التحقق.' : 'An error occurred during verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Confirm OTP & Finalize Registration
  const handleVerifySignUpOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    const enteredCode = otpDigits.join('').trim();
    if (enteredCode.length !== 6) {
      setOtpError(language === 'ar' ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام بالكامل.' : 'Please enter all 6 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = signUpEmail.trim().toLowerCase();
      const cleanName = signUpName.trim();

      const res = await signupWithCredentials(
        cleanName,
        cleanEmail,
        signUpPassword,
        avatarPreview,
        signUpCity,
        signUpPosition,
        enteredCode
      );

      if (!res.success) {
        setOtpError(res.error || t('auth.invalidOtp'));
      } else if (res.pendingApproval) {
        setRegisteredUserName(cleanName);
        setRegisteredUserEmail(cleanEmail);
        setMode('pending');
        setSignInEmail(cleanEmail);
        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
        setOtpSentNotification(null);
      }
    } catch {
      setOtpError(language === 'ar' ? 'حدث خطأ أثناء تأكيد الرمز.' : 'An error occurred during OTP verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP Code
  const handleResendOTP = async () => {
    if (otpTimer > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpError('');

    const targetEmail = mode === 'verify_signup' ? signUpEmail.trim().toLowerCase() : forgotEmail.trim().toLowerCase();
    const type = mode === 'verify_signup' ? 'signup' : 'forgot_password';

    try {
      const res = await sendVerificationOTP(targetEmail, type);
      if (res.success) {
        setOtpTimer(60);
        setOtpDigits(['', '', '', '', '', '']);
        if (res.code) {
          setOtpSentNotification({ code: res.code, email: targetEmail });
        }
      } else {
        setOtpError(res.error || (language === 'ar' ? 'فشل إعادة إرسال الرمز.' : 'Failed to resend code.'));
      }
    } catch {
      setOtpError(language === 'ar' ? 'تعذر إعادة الإرسال.' : 'Could not resend OTP.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Forgot Password: Step 1 -> Send OTP
  const handleForgotStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setForgotError(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Valid email required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendVerificationOTP(cleanEmail, 'forgot_password');
      if (!res.success) {
        setForgotError(res.error || (language === 'ar' ? 'فشل إرسال رمز التحقق.' : 'Failed to send OTP.'));
        return;
      }

      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setOtpTimer(60);
      if (res.code) {
        setOtpSentNotification({ code: res.code, email: cleanEmail });
      }
      setMode('verify_forgot');
    } catch {
      setForgotError(language === 'ar' ? 'حدث خطأ أثناء إرسال الرمز.' : 'Error sending reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password: Step 2 -> Verify OTP and Reset
  const handleVerifyForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setForgotError('');

    const enteredCode = otpDigits.join('').trim();
    if (enteredCode.length !== 6) {
      setOtpError(language === 'ar' ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام.' : 'Please enter all 6 digits.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError(t('auth.passwordLengthError'));
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(t('auth.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const res = await resetPasswordWithEmail(cleanEmail, forgotNewPassword, enteredCode);
      if (res.success) {
        setForgotSuccess(
          language === 'ar'
            ? 'تم التحقق وتحديث كلمة المرور بنجاح! جاري تسجيل الدخول...'
            : 'Password verified & updated successfully! Logging you in...'
        );
        setOtpSentNotification(null);
      } else {
        setOtpError(res.error || (language === 'ar' ? 'رمز التحقق غير صحيح أو انتهت صلاحيته.' : 'Invalid OTP code.'));
      }
    } catch {
      setForgotError(language === 'ar' ? 'حدث خطأ أثناء إعادة التعيين.' : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignUpError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)' : 'Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSignUpError(language === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size should be under 5MB');
      return;
    }

    setSignUpError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatarPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isPendingError =
    signInError.toLowerCase().includes('admin approval') ||
    signInError.toLowerCase().includes('waitlist') ||
    signInError.includes('المشرف') ||
    signInError.includes('الانتظار') ||
    signInError.includes('مراجعة');

  return (
    <div className="min-h-screen w-full bg-[#040D09] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none antialiased">
      {/* Visual Stadium Pitch Background with High-End Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft stadium floodlight glows */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />

        {/* Tactical pitch markings */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#E5B869_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-[#E5B869]/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#E5B869]/40" />
      </div>

      {/* Top Simulated Email / Security Verification Dispatch Toast */}
      {otpSentNotification && (
        <div className="relative z-30 max-w-xl mx-auto w-full px-4 pt-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0E382A] via-[#124B38] to-[#0E382A] border-2 border-[#E5B869] text-white shadow-2xl shadow-emerald-950/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#04130D] border border-[#E5B869]/60 flex items-center justify-center text-[#F5D794] shrink-0 shadow-inner">
                <Inbox className="w-5 h-5 animate-bounce" />
              </div>
              <div className="text-start space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#F5D794] uppercase tracking-wider">
                    {language === 'ar' ? '📩 رسالة التحقق الإلكتروني (PitchMate Mail)' : '📩 Verification Email Dispatched'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#04130D] text-emerald-300 border border-[#E5B869]/30 font-mono">
                    {otpSentNotification.email}
                  </span>
                </div>
                <p className="text-xs text-white">
                  {t('auth.otpDevNotice')}{' '}
                  <span className="font-mono font-black text-[#F5D794] text-sm bg-black/40 px-2 py-0.5 rounded-lg border border-[#E5B869]/40 tracking-widest">
                    {otpSentNotification.code}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = otpSentNotification.code;
                if (code && code.length === 6) {
                  setOtpDigits(code.split(''));
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-black hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
            >
              {language === 'ar' ? 'تعبئة الرمز' : 'Auto Fill'}
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F5D794] via-[#E5B869] to-[#C69238] flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-950/40">
            PM
          </div>
          <div>
            <span className="text-xl font-black font-display tracking-tight text-white flex items-center gap-1.5">
              PitchMate
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 font-mono font-bold">
                PRO 🇲🇦
              </span>
            </span>
            <p className="text-[11px] text-emerald-300/70 font-medium">{t('brand.tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#082218] border border-[#E5B869]/30 hover:border-[#E5B869] text-xs text-emerald-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-[#082218]/90 backdrop-blur-xl border border-[#E5B869]/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/60 space-y-6 text-center">

          {/* Header Title & Subtitle */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight flex items-center justify-center gap-2">
              <span>
                {mode === 'signin' && t('auth.welcomeBack')}
                {mode === 'signup' && t('auth.createAccount')}
                {mode === 'verify_signup' && t('auth.verificationTitle')}
                {mode === 'forgot' && t('auth.resetPassword')}
                {mode === 'verify_forgot' && t('auth.forgotVerifyTitle')}
                {mode === 'pending' && t('auth.accountPending')}
              </span>
            </h1>
            <p className="text-xs text-emerald-300/80 max-w-sm mx-auto leading-relaxed">
              {mode === 'signin' && t('auth.signInSubtitle')}
              {mode === 'signup' && t('auth.signUpSubtitle')}
              {mode === 'verify_signup' && t('auth.verificationSubtitle')}
              {mode === 'forgot' && t('auth.resetSubtitle')}
              {mode === 'verify_forgot' && t('auth.forgotVerifySubtitle')}
              {mode === 'pending' && t('auth.pendingNotice')}
            </p>
          </div>

          {/* Mode Switcher Tabs (Sign In / Sign Up) */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#04130D] rounded-2xl border border-[#E5B869]/20">
              <button
                id="switch-to-signin-tab"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError('');
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md shadow-amber-950/60 font-black'
                    : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t('auth.signInButton')}</span>
              </button>

              <button
                id="switch-to-signup-tab"
                type="button"
                onClick={() => {
                  setMode('signup');
                  setSignUpError('');
                }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md shadow-amber-950/60 font-black'
                    : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t('auth.signUpButton')}</span>
              </button>
            </div>
          )}

          {/* Back to Sign In Header for Forgot / OTP modes */}
          {(mode === 'forgot' || mode === 'verify_signup' || mode === 'verify_forgot') && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#F5D794]">
                {mode === 'verify_signup'
                  ? (language === 'ar' ? 'خطوة التحقق من البريد' : 'Email Verification Step')
                  : mode === 'verify_forgot'
                  ? (language === 'ar' ? 'تأكيد إعادة التعيين' : 'Verify Password Reset')
                  : t('auth.resetPassword')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'verify_signup' ? 'signup' : 'signin');
                  setForgotError('');
                  setForgotSuccess('');
                  setOtpError('');
                }}
                className="text-xs text-emerald-300 hover:text-[#F5D794] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
              >
                {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{mode === 'verify_signup' ? (language === 'ar' ? 'تعديل البيانات' : 'Edit info') : t('auth.backToSignIn')}</span>
              </button>
            </div>
          )}

          {/* ================= PENDING APPROVAL VIEW ================= */}
          {mode === 'pending' && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-[#0E382A] border border-[#E5B869]/40 text-amber-100 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#04130D] border border-[#E5B869]/50 flex items-center justify-center text-[#F5D794] shadow-xl">
                  <Clock className="w-7 h-7 animate-pulse text-[#F5D794]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base font-black text-[#F5D794]">{t('auth.accountPending')}</h2>
                  <p className="text-xs font-medium text-emerald-100 leading-relaxed">
                    {t('auth.pendingNotice')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#04130D] border border-[#E5B869]/25 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('auth.fullName')}:</span>
                  <span className="font-bold text-white">{registeredUserName}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('auth.email')}:</span>
                  <span className="font-mono text-[#F5D794]">{registeredUserEmail}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('profile.position')}:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0E382A] text-[#F5D794] border border-[#E5B869]/40 font-bold text-[11px]">
                    <Clock className="w-3 h-3" />
                    {language === 'ar' ? 'قيد المراجعة الإدارية' : 'Pending Admin Approval'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-300/70 text-center leading-relaxed">
                {t('auth.pendingRefreshHint')}
              </p>

              <button
                id="pending-return-signin-btn"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError('');
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{t('auth.backToSignIn')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* ================= SIGN IN TAB ================= */}
          {mode === 'signin' && (
            <div className="space-y-4 text-xs">
              {signInError && (
                <div
                  id="signin-error-banner"
                  className={`p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in ${
                    isPendingError
                      ? 'bg-[#0E382A] border border-[#E5B869]/50 text-amber-200'
                      : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
                  }`}
                >
                  {isPendingError ? (
                    <Clock className="w-5 h-5 shrink-0 text-[#E5B869] mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="space-y-1 text-start">
                    <span className="font-semibold block leading-snug">{signInError}</span>
                    {isPendingError && (
                      <span className="text-[11px] text-[#F5D794] block">
                        {language === 'ar'
                          ? 'تم إشعار المشرف وسيقوم بمراجعة حسابك وتفعيله في أقرب وقت.'
                          : 'The administrator has been notified and will review your pending account shortly.'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Google Native Official Button matching GIS / One-Tap standard */}
              <div className="relative pt-1">
                {/* Last Used Badge on Top Right */}
                <div
                  className={`absolute -top-2 ${
                    isRTL ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
                  } z-10 bg-[#1a73e8] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md border-2 border-[#04130D] flex items-center gap-1 select-none pointer-events-none`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{language === 'ar' ? 'آخر استخدام • Last Used' : 'Last Used'}</span>
                </div>

                <button
                  id="auth-google-signin-btn"
                  type="button"
                  onClick={() => handleGoogleAuth('signin')}
                  disabled={googleLoading || isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 bg-white hover:bg-[#F8F9FA] active:bg-[#F1F3F4] text-[#3c4043] hover:text-[#202124] border border-[#DADCE0] hover:border-[#D2E3FC] rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.005] active:scale-[0.99] text-xs sm:text-sm disabled:opacity-60 relative overflow-hidden"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="tracking-tight font-medium text-[#3c4043] font-sans">
                    {googleLoading
                      ? (language === 'ar' ? 'جاري الاتصال بـ Google...' : 'Connecting to Google...')
                      : (language === 'ar' ? 'المتابعة باستخدام Google (Continue with Google)' : 'Continue with Google')}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#E5B869]/20" />
                <span className="text-[11px] font-semibold text-emerald-300/60 uppercase tracking-wider">
                  {language === 'ar' ? 'أو بالبريد وكلمة المرور' : 'Or with password'}
                </span>
                <div className="flex-1 h-px bg-[#E5B869]/20" />
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email input */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold text-xs">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signin-email"
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-3 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Password input with show/hide */}
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center justify-between">
                    <label className="block text-emerald-200 font-semibold text-xs">{t('auth.password')}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(signInEmail);
                        setMode('forgot');
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                      className="text-[11px] text-[#F5D794] hover:underline font-semibold cursor-pointer"
                    >
                      {t('auth.forgotPasswordLink')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-[#F5D794] p-1 cursor-pointer transition-colors`}
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  id="auth-signin-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>{isSubmitting ? t('common.loading') : t('auth.signInButton')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ================= SIGN UP TAB ================= */}
          {mode === 'signup' && (
            <div className="space-y-4 text-xs">
              {signUpError && (
                <div
                  id="signup-error-banner"
                  className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex flex-col gap-1.5 animate-in fade-in text-start"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="font-semibold">{signUpError}</span>
                  </div>
                  {(signUpError.includes('مسجل بالفعل') || signUpError.includes('already exists')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setSignUpError('');
                      }}
                      className="text-[11px] font-bold text-[#F5D794] underline hover:text-white cursor-pointer self-start"
                    >
                      {language === 'ar' ? '← الانتقال إلى تسجيل الدخول الآن' : '← Switch to Sign In directly'}
                    </button>
                  )}
                </div>
              )}

              {/* Google Native One-Click Sign Up Button matching GIS standard */}
              <div className="relative pt-1">
                {/* Last Used / Recommended Badge */}
                <div
                  className={`absolute -top-2 ${
                    isRTL ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
                  } z-10 bg-[#1a73e8] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md border-2 border-[#04130D] flex items-center gap-1 select-none pointer-events-none`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{language === 'ar' ? 'تسجيل فوري وسريع • Instant' : 'Instant Setup'}</span>
                </div>

                <button
                  id="auth-google-signup-btn"
                  type="button"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={googleLoading || isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-4 bg-white hover:bg-[#F8F9FA] active:bg-[#F1F3F4] text-[#3c4043] hover:text-[#202124] border border-[#DADCE0] hover:border-[#D2E3FC] rounded-xl sm:rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.005] active:scale-[0.99] text-xs sm:text-sm disabled:opacity-60 relative overflow-hidden"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="tracking-tight font-medium text-[#3c4043] font-sans">
                    {googleLoading
                      ? (language === 'ar' ? 'جاري الاتصال بـ Google...' : 'Connecting to Google...')
                      : (language === 'ar' ? 'إنشاء حساب عبر Google (Sign up with Google)' : 'Continue with Google')}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[#E5B869]/20" />
                <span className="text-[11px] font-semibold text-emerald-300/60 uppercase tracking-wider">
                  {language === 'ar' ? 'أو التسجيل اليدوي بالبريد' : 'Or sign up with email'}
                </span>
                <div className="flex-1 h-px bg-[#E5B869]/20" />
              </div>

              <form onSubmit={handleSignUpStart} className="space-y-3.5">
                {/* Admin Approval Notice Banner */}
                <div className="p-3 rounded-xl bg-[#0E382A] border border-[#E5B869]/40 text-[#F5D794] flex items-center gap-2 text-[11px] text-start">
                  <Shield className="w-4 h-4 text-[#E5B869] shrink-0" />
                  <span>
                    {language === 'ar'
                      ? 'يتم إرسال رمز أمان (OTP) للتحقق من ملكية البريد الإلكتروني قبل مراجعة المشرف العام.'
                      : 'A security verification code (OTP) validates email ownership before account approval.'}
                  </span>
                </div>

                {/* Avatar Selection */}
                <div className="flex items-center gap-3 p-3 bg-[#04130D] border border-[#E5B869]/25 rounded-2xl">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-[#E5B869] shrink-0 shadow-md"
                  />
                  <div className="space-y-1 text-start">
                    <span className="text-xs font-bold text-white block">{t('auth.avatarUpload')}</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-[#082218] hover:bg-[#0E382A] text-[#F5D794] rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-[#E5B869]/30 transition-colors"
                    >
                      <Upload className="w-3 h-3 text-[#E5B869]" />
                      <span>{t('auth.avatarUpload')}</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold text-xs">{t('auth.fullName')}</label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-name"
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold text-xs">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-email"
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* City and Position row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* City */}
                  <div className="space-y-1.5 text-start">
                    <label className="block text-emerald-200 font-semibold text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#E5B869]" />
                      <span>{t('auth.preferredCity')}</span>
                    </label>
                    <select
                      value={signUpCity}
                      onChange={(e) => setSignUpCity(e.target.value)}
                      className="w-full py-2.5 px-3 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white text-xs focus:outline-none focus:border-[#E5B869]"
                    >
                      {MOROCCAN_CITIES.map((city) => (
                        <option key={city} value={city} className="bg-[#082218] text-white">
                          {getCityName(city)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position */}
                  <div className="space-y-1.5 text-start">
                    <label className="block text-emerald-200 font-semibold text-xs flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#E5B869]" />
                      <span>{t('auth.preferredPosition')}</span>
                    </label>
                    <select
                      value={signUpPosition}
                      onChange={(e) => setSignUpPosition(e.target.value)}
                      className="w-full py-2.5 px-3 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white text-xs focus:outline-none focus:border-[#E5B869]"
                    >
                      <option value="GK" className="bg-[#082218] text-white">GK - حارس مرمى</option>
                      <option value="DEF" className="bg-[#082218] text-white">DEF - مدافع</option>
                      <option value="MID" className="bg-[#082218] text-white">MID - وسط ميدان</option>
                      <option value="FWD" className="bg-[#082218] text-white">FWD - مهاجم</option>
                    </select>
                  </div>
                </div>

                {/* Password input with show/hide & strength meter */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold text-xs">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-[#F5D794] p-1 cursor-pointer transition-colors`}
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {signUpPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-emerald-300/70">{language === 'ar' ? 'قوة كلمة المرور:' : 'Strength:'}</span>
                        <span className="font-bold text-white">{passwordStrength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-[#04130D] rounded-full overflow-hidden p-0.5 border border-[#E5B869]/20">
                        <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} />
                        <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} />
                        <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} />
                        <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-transparent'}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  id="auth-signup-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? t('common.loading') : (language === 'ar' ? 'متابعة التحقق من البريد الإلكتروني' : 'Continue to Email Verification')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ================= VERIFY SIGNUP OTP TAB ================= */}
          {mode === 'verify_signup' && (
            <div className="space-y-5 text-xs animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-[#04130D] border border-[#E5B869]/30 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0E382A] border border-[#E5B869]/50 flex items-center justify-center text-[#F5D794] shadow-md">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-emerald-300/80 block">{t('auth.codeSentTo')}</span>
                  <span className="text-sm font-mono font-bold text-[#F5D794] block">{signUpEmail}</span>
                </div>
              </div>

              {otpError && (
                <div
                  id="otp-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 animate-in fade-in text-start"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifySignUpOTP} className="space-y-5">
                {/* 6 Digit Input Boxes */}
                <div className="space-y-2">
                  <label className="block text-emerald-200 font-semibold text-xs">{t('auth.enterOtpCode')}</label>
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5" dir="ltr">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono bg-[#04130D] border-2 border-[#E5B869]/40 focus:border-[#E5B869] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E5B869]/50 transition-all shadow-inner"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend button & timer */}
                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    type="button"
                    disabled={otpTimer > 0 || isResendingOtp}
                    onClick={handleResendOTP}
                    className="text-emerald-300 hover:text-[#F5D794] disabled:text-slate-600 font-semibold cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                    <span>{t('auth.resendCode')}</span>
                  </button>

                  {otpTimer > 0 && (
                    <span className="text-emerald-400/70 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{t('auth.resendIn')} {otpTimer}s</span>
                    </span>
                  )}
                </div>

                {/* Verify and finalize button */}
                <button
                  id="auth-otp-verify-submit-btn"
                  type="submit"
                  disabled={isSubmitting || otpDigits.join('').length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? t('common.loading') : t('auth.verifyCodeBtn')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ================= FORGOT PASSWORD TAB ================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotStart} className="space-y-4 text-xs">
              {forgotError && (
                <div
                  id="forgot-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 animate-in fade-in text-start"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              <p className="text-emerald-300/80 text-xs text-start">
                {t('auth.resetSubtitle')}
              </p>

              {/* Email */}
              <div className="space-y-1.5 text-start">
                <label className="block text-emerald-200 font-semibold text-xs">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                id="auth-forgot-send-otp-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? t('common.loading') : (language === 'ar' ? 'إرسال رمز التحقق الأمني' : 'Send Verification OTP')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* ================= VERIFY FORGOT PASSWORD OTP & SET NEW PASS ================= */}
          {mode === 'verify_forgot' && (
            <form onSubmit={handleVerifyForgotReset} className="space-y-4 text-xs text-start">
              {otpError && (
                <div
                  id="forgot-otp-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {forgotError && (
                <div
                  id="forgot-pass-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div
                  id="forgot-success-banner"
                  className="p-3 rounded-2xl bg-[#0E382A] border border-[#E5B869]/40 text-[#F5D794] flex items-start gap-2 animate-in fade-in"
                >
                  <Check className="w-4 h-4 shrink-0 text-[#E5B869] mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="space-y-2">
                <label className="block text-emerald-200 font-semibold text-xs">{t('auth.enterOtpCode')}</label>
                <div className="flex items-center justify-center gap-2 sm:gap-2.5" dir="ltr">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-10 h-12 sm:w-11 sm:h-13 text-center text-xl font-black font-mono bg-[#04130D] border-2 border-[#E5B869]/40 focus:border-[#E5B869] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E5B869]/50 transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-emerald-200 font-semibold text-xs">{t('auth.newPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-new-password"
                    type={showForgotNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-[#F5D794] p-1 cursor-pointer transition-colors`}
                  >
                    {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-emerald-200 font-semibold text-xs">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-confirm-password"
                    type={showForgotConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-2.5 bg-[#04130D] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-[#F5D794] p-1 cursor-pointer transition-colors`}
                  >
                    {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="auth-forgot-submit-btn"
                type="submit"
                disabled={isSubmitting || otpDigits.join('').length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isSubmitting ? t('common.loading') : t('auth.forgotVerifyBtn')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs text-emerald-400/60 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#E5B869]" />
        <span>PitchMate Pro • Made for Football Lovers in Morocco 🇲🇦</span>
      </footer>
    </div>
  );
};
