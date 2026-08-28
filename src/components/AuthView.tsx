import React, { useState, useRef } from 'react';
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
  Sparkles,
  Phone,
  Radio,
  Mic,
  Activity,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Globe
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, isSuperAdminEmail, UserProfile } from '../types';

export const AuthView: React.FC = () => {
  const { loginWithCredentials, signupWithCredentials, loginWithGoogle, resetPasswordWithEmail } = usePitchStore();
  const { language, setLanguage, toggleLanguage, t, isRTL } = useLanguage();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'pending'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200');
  const [signUpError, setSignUpError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [registeredUserName, setRegisteredUserName] = useState('');
  const [isRegisteredViaGoogle, setIsRegisteredViaGoogle] = useState(false);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGoogleAuth = async (action: 'signin' | 'signup') => {
    setSignInError('');
    setSignUpError('');
    setIsGoogleSubmitting(true);

    try {
      const res = await loginWithGoogle(action);
      if (!res.success) {
        let errorMsg = res.error;
        if (res.code === 'USER_EXISTS') {
          errorMsg = t('auth.googleAccountAlreadyExists');
        } else if (res.code === 'USER_NOT_FOUND') {
          errorMsg = t('auth.googleAccountNotFound');
        } else if (!errorMsg) {
          errorMsg = language === 'ar' ? 'فشل تسجيل الدخول بـ Google.' : 'Google sign-in failed.';
        }

        if (action === 'signup') {
          setSignUpError(errorMsg);
          if (res.user) {
            setSignInEmail(res.user.email);
          }
        } else {
          setSignInError(errorMsg);
        }
      } else if (res.pendingApproval && res.user) {
        setRegisteredUserName(res.user.name);
        setRegisteredUserEmail(res.user.email);
        setIsRegisteredViaGoogle(true);
        setMode('pending');
        setSignInEmail(res.user.email);
      }
    } catch {
      const errTxt = language === 'ar' ? 'حدث خطأ أثناء الاتصال بحساب Google.' : 'An error occurred with Google Sign-In.';
      if (action === 'signup') setSignUpError(errTxt);
      else setSignInError(errTxt);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      const res = await loginWithCredentials(signInEmail, signInPassword);
      if (!res.success) {
        setSignInError(res.error || t('auth.invalidCredentials'));
      }
    } catch {
      setSignInError(language === 'ar' ? 'حدث خطأ أثناء المصادقة. يرجى المحاولة لاحقاً.' : 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setIsSubmitting(true);

    try {
      const res = await signupWithCredentials(
        signUpName,
        signUpEmail,
        signUpPassword,
        avatarPreview
      );
      if (!res.success) {
        setSignUpError(res.error || (language === 'ar' ? 'فشل إنشاء الحساب.' : 'Failed to create account.'));
      } else if (res.pendingApproval) {
        setRegisteredUserName(signUpName);
        setRegisteredUserEmail(signUpEmail);
        setMode('pending');
        setSignInEmail(signUpEmail);
        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
      }
    } catch {
      setSignUpError(language === 'ar' ? 'حدث خطأ أثناء التسجيل.' : 'An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

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
      const res = await resetPasswordWithEmail(forgotEmail, forgotNewPassword);
      if (res.success) {
        setForgotSuccess(language === 'ar' ? 'تم تحديث كلمة المرور بنجاح! جاري تسجيل الدخول...' : 'Password updated successfully! Logging you in...');
      } else {
        setForgotError(res.error || (language === 'ar' ? 'فشل إعادة تعيين كلمة المرور.' : 'Failed to reset password.'));
      }
    } catch {
      setForgotError(language === 'ar' ? 'حدث خطأ أثناء إعادة التعيين.' : 'An error occurred while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignUpError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)' : 'Please select a valid image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSignUpError(language === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت' : 'Image size should be under 5MB');
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

  const isPendingError = signInError.toLowerCase().includes('admin approves') || signInError.toLowerCase().includes('wait until') || signInError.includes('المشرف');

  return (
    <div className="min-h-screen w-full bg-[#081813] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Tactical Stadium Pitch Lines Background */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border-2 border-[#E5B869]/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#E5B869]/40" />
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#E5B869]/20" />
        <div className="absolute inset-8 border border-[#E5B869]/15 rounded-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F5D794] via-[#E5B869] to-[#C69238] flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-950/50">
            PM
          </div>
          <div>
            <span className="text-xl font-black font-display tracking-tight text-white flex items-center gap-1.5">
              PitchMate
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 font-mono font-bold">
                PRO 🇲🇦
              </span>
            </span>
            <p className="text-[11px] text-emerald-300/70 font-medium">{t('brand.tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher in Auth view */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A3A2A] border border-[#E5B869]/30 hover:border-[#E5B869] text-xs text-emerald-200 hover:text-white transition-all cursor-pointer"
            title={t('nav.switchLanguage')}
          >
            <Globe className="w-3.5 h-3.5 text-[#E5B869]" />
            <span className="font-bold">{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A3A2A] border border-[#E5B869]/30 text-xs text-emerald-200">
            <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
            <span>{t('auth.verifiedAccess')}</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        <div className="w-full bg-[#0A3A2A]/95 backdrop-blur-xl border border-[#E5B869]/35 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          
          {/* Header section inside card */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black tracking-tight text-white font-display">
              {mode === 'signin' && t('auth.welcomeBack')}
              {mode === 'signup' && t('auth.createAccount')}
              {mode === 'forgot' && t('auth.resetPassword')}
              {mode === 'pending' && t('auth.accountPending')}
            </h1>
            <p className="text-xs text-emerald-300/70">
              {mode === 'signin' && t('auth.signInSubtitle')}
              {mode === 'signup' && t('auth.signUpSubtitle')}
              {mode === 'forgot' && t('auth.resetSubtitle')}
              {mode === 'pending' && t('auth.pendingNotice')}
            </p>
          </div>

          {/* Nav switcher pills */}
          {mode !== 'forgot' && mode !== 'pending' ? (
            <div className="grid grid-cols-2 p-1 bg-[#081813] rounded-2xl border border-[#E5B869]/25">
              <button
                id="switch-to-signin-tab"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError('');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md shadow-amber-950'
                    : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                {t('auth.signInButton')}
              </button>

              <button
                id="switch-to-signup-tab"
                type="button"
                onClick={() => {
                  setMode('signup');
                  setSignUpError('');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md shadow-amber-950'
                    : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                {t('auth.signUpButton')}
              </button>
            </div>
          ) : mode === 'forgot' ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#F5D794]">{t('auth.resetPassword')}</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="text-xs text-emerald-300/80 hover:text-[#F5D794] font-semibold cursor-pointer flex items-center gap-1"
              >
                {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{t('auth.backToSignIn')}</span>
              </button>
            </div>
          ) : null}

          {/* ================= PENDING APPROVAL CONFIRMATION SCREEN ================= */}
          {mode === 'pending' && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-[#0E4836] border border-[#E5B869]/40 text-amber-100 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#081813] border border-[#E5B869]/50 flex items-center justify-center text-[#F5D794] shadow-lg shadow-black/50">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-[#F5D794]">{t('auth.accountPending')}</h2>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {t('auth.pendingNotice')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#081813] border border-[#E5B869]/25 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('auth.fullName')}:</span>
                  <span className="font-bold text-white">{registeredUserName}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('auth.email')}:</span>
                  <span className="font-mono text-[#F5D794] flex items-center gap-1.5">
                    {registeredUserEmail}
                    {isRegisteredViaGoogle && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-400/40 font-sans font-bold">
                        Google Verified ✓
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-200">
                  <span className="text-emerald-300/70">{t('profile.position')}:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 font-bold text-[11px]">
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
                className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] text-slate-950 rounded-xl font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{t('auth.backToSignIn')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* ================= SIGN IN VIEW ================= */}
          {mode === 'signin' && (
            <div className="space-y-4 text-xs">
              {signInError && (
                <div
                  id="signin-error-banner"
                  className={`p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in ${
                    isPendingError
                      ? 'bg-[#0E4836] border border-[#E5B869]/50 text-amber-200'
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
                        {language === 'ar' ? 'تم إشعار المشرف وسيقوم بمراجعة حسابك وتفعيله في أقرب وقت.' : 'The administrator has been notified and will review your pending account shortly.'}
                      </span>
                    )}
                    {(signInError.includes('غير مسجل') || signInError.includes('not found') || signInError.includes('create a new account')) && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setSignInError('');
                        }}
                        className="text-[11px] font-bold text-[#F5D794] underline hover:text-white cursor-pointer block mt-1"
                      >
                        {language === 'ar' ? '← إنشاء حساب جديد الآن بـ Google' : '← Create a new account now with Google'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Google One-Click Sign In Button */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={() => handleGoogleAuth('signin')}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer border border-slate-200 disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
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
                )}
                <span className="text-xs sm:text-sm font-bold">
                  {isGoogleSubmitting
                    ? (language === 'ar' ? 'جاري الاتصال بـ Google...' : 'Connecting to Google...')
                    : t('auth.signInWithGoogle')}
                </span>
              </button>

              {/* Or Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5B869]/20" />
                <span className="flex-shrink mx-3 text-[11px] text-emerald-300/60 font-semibold">
                  {t('auth.orContinueWith')}
                </span>
                <div className="flex-grow border-t border-[#E5B869]/20" />
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signin-email"
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-3 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-start">
                  <div className="flex items-center justify-between">
                    <label className="block text-emerald-200 font-semibold">{t('auth.password')}</label>
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
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-3 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                <button
                  id="auth-signin-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>{isSubmitting ? t('common.loading') : t('auth.signInButton')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Quick Demo Access Bar */}
              <div className="pt-3 border-t border-[#E5B869]/20 space-y-2">
                <span className="text-[11px] text-emerald-300/70 font-semibold block text-center">
                  {t('auth.quickDemoLogins')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail('bouhbousmustapha@gmail.com');
                      setSignInPassword('AZRouww@#$&&$#@9934');
                    }}
                    className="p-2 rounded-xl bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] hover:bg-[#125842] text-[11px] font-bold text-center cursor-pointer transition-colors shadow-sm"
                  >
                    👑 {language === 'ar' ? 'المشرف مصطفى' : 'Admin Mustapha'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignInEmail('yassine.bounou@pitchmate.ma');
                      setSignInPassword('password123');
                    }}
                    className="p-2 rounded-xl bg-[#081813] border border-[#E5B869]/30 text-emerald-200 hover:text-white hover:border-[#E5B869] text-[11px] font-bold text-center cursor-pointer transition-colors shadow-sm"
                  >
                    ⚽ {language === 'ar' ? 'اللاعب ياسين بونو' : 'Player Yassine'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= SIGN UP VIEW ================= */}
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
                  {(signUpError.includes('مسجل بالفعل') || signUpError.includes('already exists') || signUpError.includes('Sign In directly')) && (
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

              {/* Google Fast Registration */}
              <div className="space-y-2">
                <button
                  id="google-signup-btn"
                  type="button"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer border border-slate-200 disabled:opacity-60"
                >
                  {isGoogleSubmitting ? (
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
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
                  )}
                  <span className="text-xs sm:text-sm font-bold">
                    {isGoogleSubmitting
                      ? (language === 'ar' ? 'جاري الاتصال بـ Google...' : 'Connecting to Google...')
                      : t('auth.signUpWithGoogle')}
                  </span>
                </button>

                <p className="text-[11px] text-emerald-300/70 text-center flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{t('auth.googleVerifiedNotice')}</span>
                </p>
              </div>

              {/* Or Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5B869]/20" />
                <span className="flex-shrink mx-3 text-[11px] text-emerald-300/60 font-semibold">
                  {t('auth.orContinueWith')}
                </span>
                <div className="flex-grow border-t border-[#E5B869]/20" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Notice about admin approval */}
                <div className="p-3 rounded-xl bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] flex items-center gap-2 text-[11px] text-start">
                  <Shield className="w-4 h-4 text-[#E5B869] shrink-0" />
                  <span>{language === 'ar' ? 'تخضع الحسابات الجديدة لمراجعة المشرف العام قبل تفعيل الدخول.' : 'New player registrations require Admin approval before accessing matches.'}</span>
                </div>

                {/* Avatar Selection */}
                <div className="flex items-center gap-3 p-3 bg-[#081813] border border-[#E5B869]/25 rounded-2xl">
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-[#E5B869] shrink-0"
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
                      className="px-2.5 py-1 bg-[#0A3A2A] hover:bg-[#0E4836] text-[#F5D794] rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-[#E5B869]/30"
                    >
                      <Upload className="w-3 h-3 text-[#E5B869]" />
                      <span>{t('auth.avatarUpload')}</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold">{t('auth.fullName')}</label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-name"
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-email"
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-start">
                  <label className="block text-emerald-200 font-semibold">{t('auth.password')}</label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                    <input
                      id="auth-signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                    />
                  </div>
                </div>

                <button
                  id="auth-signup-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>{isSubmitting ? t('common.loading') : t('auth.signUpButton')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ================= FORGOT PASSWORD VIEW ================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              {forgotError && (
                <div
                  id="forgot-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2 animate-in fade-in text-start"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div
                  id="forgot-success-banner"
                  className="p-3 rounded-2xl bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] flex items-start gap-2 animate-in fade-in text-start"
                >
                  <Check className="w-4 h-4 shrink-0 text-[#E5B869] mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <p className="text-emerald-300/70 text-[11px] text-start">
                {t('auth.resetSubtitle')}
              </p>

              <div className="space-y-1.5 text-start">
                <label className="block text-emerald-200 font-semibold">{t('auth.email')}</label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-start">
                <label className="block text-emerald-200 font-semibold">{t('auth.newPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-start">
                <label className="block text-emerald-200 font-semibold">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60`} />
                  <input
                    id="auth-forgot-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'} py-2.5 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 text-xs focus:outline-none focus:border-[#E5B869] transition-colors focus:ring-1 focus:ring-[#E5B869]/40`}
                  />
                </div>
              </div>

              <button
                id="auth-forgot-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-slate-950 rounded-xl font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isSubmitting ? t('common.loading') : t('auth.resetButton')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Security Guarantee */}
          <div className="pt-2 border-t border-[#E5B869]/20 text-center text-[11px] text-emerald-300/70 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
            <span>{t('auth.verifiedAccess')}</span>
          </div>
        </div>
      </main>

      {/* Feature Highlights Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-center sm:justify-between gap-4 text-xs text-emerald-300/70 border-t border-[#E5B869]/20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#E5B869]" />
            {language === 'ar' ? 'تشكيلات وتكتيكات مباشرة' : 'Live Rosters & Waitlists'}
          </span>
          <span className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#E5B869]" />
            {language === 'ar' ? 'ملاحظات ورسائل صوتية' : 'Voice Notes Chat'}
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
            {language === 'ar' ? 'أداء بالدرهم المغربي (CIH Bank)' : 'Morocco Dirham (MAD) Fees'}
          </span>
        </div>

        <div>
          <span>PitchMate Soccer Organizer &bull; Super Admin: Mustapha Bouhbous</span>
        </div>
      </footer>
    </div>
  );
};

