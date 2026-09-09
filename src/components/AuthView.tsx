import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  ShieldCheck,
  Globe,
  CheckCircle2,
  RefreshCw,
  Check,
  LogIn,
  MapPin,
  Activity
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { MOROCCAN_CITIES_LOCALIZED } from '../lib/translations';
import { isSuperAdminEmail, MESSI_AVATAR_URL } from '../types';
import { PitchMateLogo } from './PitchMateLogo';

const MOROCCAN_CITIES = Object.keys(MOROCCAN_CITIES_LOCALIZED);

const POSITIONS = [
  { code: 'GK', labelAr: 'حارس مرمى', labelEn: 'Goalkeeper (GK)' },
  { code: 'DEF', labelAr: 'مدافع', labelEn: 'Defender (DEF)' },
  { code: 'MID', labelAr: 'لاعب وسط', labelEn: 'Midfielder (MID)' },
  { code: 'FWD', labelAr: 'مهاجم', labelEn: 'Forward (FWD)' },
];

export const AuthView: React.FC = () => {
  const {
    users,
    loginWithCredentials,
    signupWithCredentials,
    resetPasswordWithEmail,
    sendVerificationOTP,
    verifyFirebaseActionCode,
    confirmFirebasePasswordResetAction,
    loginWithGoogle,
  } = usePitchStore();
  const { language, toggleLanguage, t, isRTL, getCityName } = useLanguage();

  type AuthMode = 'signin' | 'signup' | 'verify_signup' | 'forgot' | 'verify_forgot' | 'action_reset' | 'pending';
  const [mode, setMode] = useState<AuthMode>('signin');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Resend timer for password reset code
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Sign Up Email Verification (OTP) state
  const [signupOtpDigits, setSignupOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const signupOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [signupResendTimer, setSignupResendTimer] = useState(0);
  const [isSignupResending, setIsSignupResending] = useState(false);
  const [signupVerifyError, setSignupVerifyError] = useState('');
  const [signupVerifySuccess, setSignupVerifySuccess] = useState('');

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
  const [signUpError, setSignUpError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [registeredUserName, setRegisteredUserName] = useState('');

  // Password Reset State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSentEmail, setResetSentEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Firebase Action Code link handling (?mode=resetPassword&oobCode=...)
  const [actionCode, setActionCode] = useState('');
  const [actionEmail, setActionEmail] = useState('');
  const [isVerifyingActionCode, setIsVerifyingActionCode] = useState(false);

  // Email regex helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const isSignInEmailValid = useMemo(() => isValidEmail(signInEmail), [signInEmail]);
  const isSignUpEmailValid = useMemo(() => isValidEmail(signUpEmail), [signUpEmail]);
  const isForgotEmailValid = useMemo(() => isValidEmail(forgotEmail), [forgotEmail]);

  // Auto-detect Firebase Password Reset Link in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlMode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        if (urlMode === 'resetPassword' && oobCode) {
          setActionCode(oobCode);
          setMode('action_reset');
          setIsVerifyingActionCode(true);
          verifyFirebaseActionCode(oobCode).then((res) => {
            setIsVerifyingActionCode(false);
            if (res.success && res.email) {
              setActionEmail(res.email);
            } else {
              setForgotError(
                res.error ||
                  (language === 'ar'
                    ? 'رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته.'
                    : 'The password reset link is invalid or expired.')
              );
            }
          });
        }
      } catch {
        // ignore parsing error
      }
    }
  }, [verifyFirebaseActionCode, language]);

  // Countdown timer for resending reset email
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'verify_forgot' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, resendTimer]);

  // Countdown timer for resending signup OTP code
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'verify_signup' && signupResendTimer > 0) {
      interval = setInterval(() => {
        setSignupResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, signupResendTimer]);

  // Password strength calculation for Sign Up
  const passwordStrength = useMemo(() => {
    if (!signUpPassword) return { score: 0, label: '', color: 'bg-slate-700', percentage: 0 };
    let score = 0;
    if (signUpPassword.length >= 6) score += 1;
    if (signUpPassword.length >= 9) score += 1;
    if (/[A-Z]/.test(signUpPassword) || /[a-z]/.test(signUpPassword)) score += 1;
    if (/[0-9]/.test(signUpPassword) || /[^A-Za-z0-9]/.test(signUpPassword)) score += 1;

    if (score <= 1) return { score: 1, label: language === 'ar' ? 'ضعيفة' : 'Weak', color: 'bg-rose-500', percentage: 25 };
    if (score === 2) return { score: 2, label: language === 'ar' ? 'متوسطة' : 'Fair', color: 'bg-amber-500', percentage: 50 };
    if (score === 3) return { score: 3, label: language === 'ar' ? 'جيدة' : 'Good', color: 'bg-emerald-500', percentage: 75 };
    return { score: 4, label: language === 'ar' ? 'قوية جداً' : 'Strong', color: 'bg-[#E5B869]', percentage: 100 };
  }, [signUpPassword, language]);

  // Password strength calculation for Reset Password
  const forgotPasswordStrength = useMemo(() => {
    if (!forgotNewPassword) return { score: 0, label: '', color: 'bg-slate-700', percentage: 0 };
    let score = 0;
    if (forgotNewPassword.length >= 6) score += 1;
    if (forgotNewPassword.length >= 9) score += 1;
    if (/[A-Z]/.test(forgotNewPassword) || /[a-z]/.test(forgotNewPassword)) score += 1;
    if (/[0-9]/.test(forgotNewPassword) || /[^A-Za-z0-9]/.test(forgotNewPassword)) score += 1;

    if (score <= 1) return { score: 1, label: language === 'ar' ? 'ضعيفة' : 'Weak', color: 'bg-rose-500', percentage: 25 };
    if (score === 2) return { score: 2, label: language === 'ar' ? 'متوسطة' : 'Fair', color: 'bg-amber-500', percentage: 50 };
    if (score === 3) return { score: 3, label: language === 'ar' ? 'جيدة' : 'Good', color: 'bg-emerald-500', percentage: 75 };
    return { score: 4, label: language === 'ar' ? 'قوية جداً' : 'Strong', color: 'bg-[#E5B869]', percentage: 100 };
  }, [forgotNewPassword, language]);

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

  // Google OAuth Flow Handler
  const handleGoogleAuth = async (action: 'signin' | 'signup') => {
    setSignInError('');
    setSignUpError('');
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle(action);

      if (!res.success) {
        if (res.code === 'USER_CANCELLED') {
          setGoogleLoading(false);
          return;
        }

        const errMsg = res.error || (language === 'ar' ? 'تعذر تسجيل الدخول عبر Google.' : 'Google authentication failed.');
        if (action === 'signin') {
          setSignInError(errMsg);
        } else {
          setSignUpError(errMsg);
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
      const errMsg = language === 'ar' ? 'حدث خطأ أثناء الاتصال بـ Google.' : 'Error connecting to Google.';
      if (action === 'signin') {
        setSignInError(errMsg);
      } else {
        setSignUpError(errMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Sign Up: Step 1 - Send 6-digit OTP
  const handleSignUpStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setSignupVerifyError('');
    setSignupVerifySuccess('');

    const cleanName = signUpName.trim();
    if (!cleanName) {
      setSignUpError(language === 'ar' ? 'الاسم الكامل مطلوب.' : 'Full name is required.');
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setSignUpError(
        language === 'ar'
          ? 'الرجاء إدخال بريد إلكتروني صالح بالصيغة الصحيحة (مثال: name@domain.com).'
          : 'Please enter a valid email address.'
      );
      return;
    }

    // Check duplicate
    const isSuper = cleanEmail === 'moustafa325476@gmail.com' || cleanEmail === 'mustapha.bouhbous@pitchmate.ma';
    const isAlreadyRegistered = users.some((u) => u.email.toLowerCase() === cleanEmail) || isSuper;
    if (isAlreadyRegistered) {
      setSignUpError(
        language === 'ar'
          ? 'هذا البريد الإلكتروني مسجل به حساب بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد.'
          : 'This email address already has an account. Please sign in directly instead of creating a new account.'
      );
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError(t('auth.passwordLengthError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await sendVerificationOTP(cleanEmail, 'signup');
      if (res.success) {
        setSignupOtpDigits(['', '', '', '', '', '']);
        setSignupResendTimer(60);
        setMode('verify_signup');
        setSignupVerifySuccess(
          language === 'ar'
            ? 'تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني بنجاح لتأكيد ملكيتك له!'
            : 'A 6-digit verification code has been sent to your email to verify ownership!'
        );
        setTimeout(() => {
          signupOtpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setSignUpError(
          res.error ||
            (language === 'ar'
              ? 'تعذر إرسال رمز التحقق إلى هذا البريد الإلكتروني.'
              : 'Failed to send verification code to this email.')
        );
      }
    } catch {
      setSignUpError(
        language === 'ar'
          ? 'حدث خطأ غير متوقع أثناء إرسال رمز التحقق.'
          : 'An unexpected error occurred during OTP dispatch.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend 6-digit OTP code for Sign Up
  const handleResendSignupOTP = async () => {
    if (signupResendTimer > 0 || isSignupResending) return;
    const cleanEmail = signUpEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSignupResending(true);
    setSignupVerifyError('');
    setSignupVerifySuccess('');

    try {
      const res = await sendVerificationOTP(cleanEmail, 'signup');
      if (res.success) {
        setSignupResendTimer(60);
        setSignupOtpDigits(['', '', '', '', '', '']);
        setSignupVerifySuccess(
          language === 'ar'
            ? 'تمت إعادة إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح!'
            : 'A new 6-digit code has been sent to your email!'
        );
        setTimeout(() => {
          signupOtpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setSignupVerifyError(
          res.error ||
            (language === 'ar'
              ? 'فشل في إعادة إرسال رمز التحقق.'
              : 'Failed to resend verification code.')
        );
      }
    } catch {
      setSignupVerifyError(
        language === 'ar'
          ? 'حدث خطأ أثناء إعادة إرسال رمز التحقق.'
          : 'An error occurred while resending the code.'
      );
    } finally {
      setIsSignupResending(false);
    }
  };

  // Sign Up: Step 2 - Verify OTP & Create User
  const handleVerifySignUpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupVerifyError('');
    setSignupVerifySuccess('');

    const cleanOtp = signupOtpDigits.join('').trim();
    if (cleanOtp.length !== 6) {
      setSignupVerifyError(
        language === 'ar'
          ? 'يرجى إدخال رمز التحقق المكون من 6 أرقام كاملاً.'
          : 'Please enter the complete 6-digit verification code.'
      );
      return;
    }

    const cleanName = signUpName.trim();
    const cleanEmail = signUpEmail.trim().toLowerCase();
    const isMustapha = isSuperAdminEmail(cleanEmail);

    setIsSubmitting(true);

    try {
      const defaultAvatar = isMustapha
        ? MESSI_AVATAR_URL
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';

      const res = await signupWithCredentials(
        cleanName,
        cleanEmail,
        signUpPassword,
        defaultAvatar,
        signUpCity,
        signUpPosition,
        cleanOtp
      );

      if (!res.success) {
        setSignupVerifyError(
          res.error ||
            (language === 'ar'
              ? 'فشل التحقق من الرمز أو إنشاء الحساب.'
              : 'Failed to verify code or register account.')
        );
        return;
      }

      confetti({
        particleCount: 70,
        spread: 85,
        origin: { y: 0.6 },
      });

      if (res.pendingApproval) {
        setRegisteredUserName(cleanName);
        setRegisteredUserEmail(cleanEmail);
        setMode('pending');
        setSignInEmail(cleanEmail);
        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
        setSignupOtpDigits(['', '', '', '', '', '']);
      }
    } catch {
      setSignupVerifyError(
        language === 'ar'
          ? 'حدث خطأ أثناء التحقق من الرمز وإتمام التسجيل.'
          : 'An error occurred during verification and registration.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign Up OTP digit handlers
  const handleSignupOtpDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newDigits = [...signupOtpDigits];
      newDigits[index] = '';
      setSignupOtpDigits(newDigits);
      return;
    }

    if (cleanValue.length > 1) {
      const newDigits = [...signupOtpDigits];
      for (let i = 0; i < 6 && index + i < 6 && i < cleanValue.length; i++) {
        newDigits[index + i] = cleanValue[i];
      }
      setSignupOtpDigits(newDigits);
      const nextIdx = Math.min(index + cleanValue.length, 5);
      signupOtpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...signupOtpDigits];
    newDigits[index] = cleanValue.slice(-1);
    setSignupOtpDigits(newDigits);

    if (index < 5) {
      signupOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleSignupOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !signupOtpDigits[index] && index > 0) {
      signupOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSignupOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!pasted) return;
    const newDigits = [...signupOtpDigits];
    for (let i = 0; i < 6 && i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setSignupOtpDigits(newDigits);
    const focusTarget = Math.min(pasted.length, 5);
    signupOtpInputRefs.current[focusTarget]?.focus();
  };

  // OTP Digits input handlers for password reset
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (cleanValue.length > 1) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6 && index + i < 6 && i < cleanValue.length; i++) {
        newDigits[index + i] = cleanValue[i];
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(index + cleanValue.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue.slice(-1);
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6 && i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const focusTarget = Math.min(pasted.length, 5);
    otpInputRefs.current[focusTarget]?.focus();
  };

  // Forgot password start
  const handleForgotStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setForgotError(
        language === 'ar'
          ? 'الرجاء إدخال بريد إلكتروني صالح.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendVerificationOTP(cleanEmail, 'forgot_password');
      if (res.success) {
        setResetSentEmail(cleanEmail);
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setMode('verify_forgot');
        setForgotSuccess(
          language === 'ar'
            ? 'تم إرسال كود التحقق السري المكون من 6 أرقام إلى بريدك الإلكتروني!'
            : 'A 6-digit verification code has been dispatched to your email!'
        );
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setForgotError(
          res.error ||
            (language === 'ar'
              ? 'فشل في إرسال كود التحقق.'
              : 'Failed to send verification code.')
        );
      }
    } catch {
      setForgotError(
        language === 'ar'
          ? 'حدث خطأ غير متوقع أثناء إرسال كود التحقق.'
          : 'An unexpected error occurred during OTP dispatch.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend 6-digit OTP Code for password reset
  const handleResendForgotLink = async () => {
    if (resendTimer > 0 || isResending) return;
    const targetEmail = resetSentEmail || forgotEmail;
    if (!targetEmail) return;

    setIsResending(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await sendVerificationOTP(targetEmail, 'forgot_password');
      if (res.success) {
        setResendTimer(60);
        setForgotSuccess(
          language === 'ar'
            ? 'تمت إعادة إرسال كود التحقق المكون من 6 أرقام إلى بريدك بنجاح!'
            : '6-digit verification code resent successfully!'
        );
      } else {
        setForgotError(res.error || (language === 'ar' ? 'فشل إعادة الإرسال.' : 'Failed to resend.'));
      }
    } catch {
      setForgotError(language === 'ar' ? 'حدث خطأ أثناء إعادة إرسال كود التحقق.' : 'An error occurred.');
    } finally {
      setIsResending(false);
    }
  };

  // Set New Password with 6-Digit OTP Verification
  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== 6) {
      setForgotError(
        language === 'ar'
          ? 'يرجى إدخال رمز التحقق كاملاً المكون من 6 أرقام.'
          : 'Please enter the complete 6-digit verification code.'
      );
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
      const targetEmail = resetSentEmail || forgotEmail;
      const res = await resetPasswordWithEmail(targetEmail, forgotNewPassword, otpCode);
      if (res.success) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
        setForgotSuccess(
          language === 'ar'
            ? 'تم التحقق من الرمز وتحديث كلمة المرور بنجاح! جاري تحويلك لتسجيل الدخول...'
            : 'Code verified and password updated successfully! Redirecting to sign in...'
        );
        setTimeout(() => {
          setSignInEmail(targetEmail);
          setSignInPassword('');
          setMode('signin');
          setForgotSuccess('');
          setForgotError('');
          setOtpDigits(['', '', '', '', '', '']);
        }, 1600);
      } else {
        setForgotError(
          res.error ||
            (language === 'ar'
              ? 'رمز التحقق غير صحيح أو انتهت صلاحيته.'
              : 'Invalid or expired verification code.')
        );
      }
    } catch {
      setForgotError(
        language === 'ar'
          ? 'حدث خطأ أثناء تحديث كلمة المرور.'
          : 'An error occurred during password reset.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Firebase Email Action Link: Confirm New Password with actionCode
  const handleConfirmActionReset = async (e: React.FormEvent) => {
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
      const res = await confirmFirebasePasswordResetAction(actionCode, forgotNewPassword);
      if (res.success) {
        setForgotSuccess(
          language === 'ar'
            ? 'تم تحديث كلمة المرور بنجاح! جاري تحويلك لتسجيل الدخول...'
            : 'Password updated successfully! Redirecting to sign in...'
        );
        setTimeout(() => {
          setSignInEmail(actionEmail || forgotEmail);
          setMode('signin');
          setForgotSuccess('');
          setForgotError('');
        }, 2000);
      } else {
        setForgotError(
          res.error ||
            (language === 'ar'
              ? 'فشل في تحديث كلمة المرور. قد يكون الرابط منتهي الصلاحية.'
              : 'Failed to update password. The link might be expired.')
        );
      }
    } catch {
      setForgotError(
        language === 'ar'
          ? 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور.'
          : 'An unexpected error occurred.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPendingError = signInError.includes('الموافقة') || signInError.includes('pending') || signInError.includes('قيد المراجعة');

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen stadium-ambient-bg text-slate-100 flex flex-col justify-between selection:bg-[#E5B869]/30 selection:text-[#F5D794] font-sans relative overflow-hidden"
    >
      {/* Royal Moroccan Gold & Emerald Obsidian Ambient Atmosphere ("تغذية بصرية فاخرة") */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Golden Crown Stadium Aurora (Top) */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[820px] h-[400px] bg-gradient-to-b from-[#E5B869]/20 via-[#C69238]/10 to-transparent rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Deep Moroccan Emerald Pitch Illumination (Center & Bottom) */}
        <div className="absolute top-1/3 -left-32 w-[520px] h-[520px] bg-[#0E4836]/25 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] bg-[#0A3829]/25 rounded-full blur-[130px]" />
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-t from-[#0E4836]/35 via-[#0A2E22]/20 to-transparent rounded-full blur-[130px]" />
        
        {/* Tactical Pitch Lines & Golden Grid Watermark */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5b8690a_1px,transparent_1px),linear-gradient(to_bottom,#e5b8690a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_65%,transparent_100%)] opacity-90" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        {/* Brand identity using authentic PitchMate logo */}
        <div className="flex items-center gap-3">
          <PitchMateLogo size="sm" withSubtitle={true} />
        </div>

        {/* Clean Language Selector */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#08130E]/90 hover:bg-[#0E221A] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-xs font-semibold text-slate-200 hover:text-[#F5D794] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-[#E5B869]" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </header>

      {/* Main SaaS Auth Centerpiece */}
      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 py-6 sm:py-8 flex items-center justify-center">
        <div className="w-full">
          {/* Main Card Container with Royal Moroccan Emerald & Gold Glassmorphism */}
          <div className="relative bg-gradient-to-b from-[#0B1A14]/94 via-[#07130F]/96 to-[#050C0A]/98 backdrop-blur-2xl border border-[#E5B869]/35 hover:border-[#E5B869]/55 transition-all duration-300 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(13,80,60,0.25),inset_0_1px_1px_rgba(245,215,148,0.25)]">
            {/* Top gold luminous jewel highlight line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#E5B869] to-transparent rounded-full pointer-events-none shadow-[0_0_8px_#E5B869]" />
            
            {/* Header Titles with Moroccan Community Badge */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#0E4836]/80 via-[#103D2F]/80 to-[#0A261D]/80 border border-[#E5B869]/40 shadow-[0_2px_14px_rgba(14,72,54,0.4)] mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5B869] animate-pulse" />
                <span className="text-[11px] font-bold text-[#F5D794] tracking-wide">
                  {language === 'ar' ? 'المنصة الرسمية لمجتمع كرة القدم بالمغرب' : 'Official Moroccan Football Hub'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                {mode === 'signin' && t('auth.welcomeBack')}
                {mode === 'signup' && t('auth.createAccount')}
                {mode === 'verify_signup' && (language === 'ar' ? 'التحقق من البريد الإلكتروني' : 'Verify Email')}
                {mode === 'forgot' && t('auth.resetPassword')}
                {mode === 'verify_forgot' && (language === 'ar' ? 'تعيين كلمة مرور جديدة' : 'Set New Password')}
                {mode === 'action_reset' && (language === 'ar' ? 'تعيين كلمة المرور' : 'Create New Password')}
                {mode === 'pending' && t('auth.accountPending')}
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                {mode === 'signin' && t('auth.signInSubtitle')}
                {mode === 'signup' && t('auth.signUpSubtitle')}
                {mode === 'verify_signup' && (language === 'ar' ? 'أدخل رمز التحقق (OTP) للتأكد من ملكية البريد الإلكتروني' : 'Enter the 6-digit code sent to verify email ownership')}
                {mode === 'forgot' && (language === 'ar' ? 'أدخل بريدك الإلكتروني المسجل لاستلام رمز التحقق' : 'Enter your registered email to receive a 6-digit code')}
                {mode === 'verify_forgot' && (language === 'ar' ? 'أدخل رمز التحقق وكلمة المرور الجديدة لتحديث حسابك' : 'Enter the 6-digit code and your new password to update')}
                {mode === 'action_reset' && (language === 'ar' ? 'أدخل كلمة المرور الجديدة لحسابك' : 'Enter your new secure password')}
                {mode === 'pending' && t('auth.pendingNotice')}
              </p>
            </div>

            {/* Seamless Segmented Tab Slider between Login & Signup */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="grid grid-cols-2 p-1 bg-[#040B08]/90 rounded-2xl border border-[#E5B869]/30 mb-6 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <button
                  id="tab-signin-btn"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setSignInError('');
                    setSignUpError('');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className={`relative py-2.5 text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2 z-10 ${
                    mode === 'signin' ? 'text-[#F5D794] font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'signin' && (
                    <motion.div
                      layoutId="activeAuthSegment"
                      className="absolute inset-0 bg-gradient-to-r from-[#0D4433] via-[#12533F] to-[#093325] border border-[#E5B869]/80 rounded-xl shadow-[0_4px_16px_rgba(229,184,105,0.25),inset_0_1px_0_rgba(245,215,148,0.3)] -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <LogIn className={`w-3.5 h-3.5 ${mode === 'signin' ? 'text-[#E5B869]' : 'text-slate-400'}`} />
                  <span>{t('auth.signInButton')}</span>
                </button>

                <button
                  id="tab-signup-btn"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignInError('');
                    setSignUpError('');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className={`relative py-2.5 text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2 z-10 ${
                    mode === 'signup' ? 'text-[#F5D794] font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="activeAuthSegment"
                      className="absolute inset-0 bg-gradient-to-r from-[#0D4433] via-[#12533F] to-[#093325] border border-[#E5B869]/80 rounded-xl shadow-[0_4px_16px_rgba(229,184,105,0.25),inset_0_1px_0_rgba(245,215,148,0.3)] -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <User className={`w-3.5 h-3.5 ${mode === 'signup' ? 'text-[#E5B869]' : 'text-slate-400'}`} />
                  <span>{t('auth.signUpButton')}</span>
                </button>
              </div>
            )}

            {/* Back button for Forgot/Reset views */}
            {(mode === 'forgot' || mode === 'verify_forgot' || mode === 'action_reset') && (
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5B869]/15">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{t('auth.resetPassword')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="text-xs text-slate-400 hover:text-[#F5D794] font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{t('auth.backToSignIn')}</span>
                </button>
              </div>
            )}

            {/* Animated Forms Slider */}
            <AnimatePresence mode="wait" initial={false}>
              
              {/* ================= 1. SIGN IN ================= */}
              {mode === 'signin' && (
                <motion.div
                  key="signin-view"
                  initial={{ opacity: 0, x: isRTL ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? -16 : 16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Error Notification */}
                  {signInError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                        isPendingError
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
                      }`}
                    >
                      {isPendingError ? (
                        <Clock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="space-y-1 text-start">
                        <span className="font-semibold block leading-snug">{signInError}</span>
                        {isPendingError && (
                          <span className="text-[11px] text-amber-300 block">
                            {language === 'ar'
                              ? 'حسابك مسجل وينتظر موافقة المشرف. سيتم التفعيل قريباً.'
                              : 'Your account is under review by administrator.'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Google Single Sign-On Button */}
                  <button
                    id="btn-google-signin"
                    type="button"
                    onClick={() => handleGoogleAuth('signin')}
                    disabled={googleLoading || isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#05110C]/90 hover:bg-[#0B221A] active:bg-[#040D09] text-slate-200 hover:text-white border border-[#E5B869]/25 hover:border-[#E5B869]/55 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm text-xs sm:text-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>{googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}</span>
                  </button>

                  {/* Clean Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-[#E5B869]/25 to-transparent flex-1" />
                    <span className="text-[11px] text-[#E5B869]/80 font-semibold uppercase tracking-wider">
                      {language === 'ar' ? 'أو عبر البريد' : 'Or with email'}
                    </span>
                    <div className="h-px bg-gradient-to-r from-transparent via-[#E5B869]/25 to-transparent flex-1" />
                  </div>

                  {/* Sign In Form */}
                  <form onSubmit={handleSignIn} className="space-y-3.5 text-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200 block">
                        {t('auth.email')}
                      </label>
                      <div className="relative group">
                        <input
                          id="signin-email"
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] group-hover:border-[#E5B869]/40 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        {isSignInEmailValid && (
                          <Check className="w-4 h-4 text-[#E5B869] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-200">
                          {t('auth.password')}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(signInEmail);
                            setMode('forgot');
                            setSignInError('');
                            setForgotError('');
                            setForgotSuccess('');
                          }}
                          className="text-xs text-[#E5B869] hover:text-[#F5D794] hover:underline cursor-pointer font-semibold transition-colors"
                        >
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      <div className="relative group">
                        <input
                          id="signin-password"
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] group-hover:border-[#E5B869]/40 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-signin-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:from-[#FFF1C5] hover:via-[#F5D794] hover:to-[#D4A045] active:scale-[0.985] text-slate-950 rounded-xl font-black transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-[0_8px_25px_rgba(229,184,105,0.35)] hover:shadow-[0_12px_32px_rgba(229,184,105,0.5)] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{t('auth.signInButton')}</span>
                          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 2. SIGN UP ================= */}
              {mode === 'signup' && (
                <motion.div
                  key="signup-view"
                  initial={{ opacity: 0, x: isRTL ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 16 : -16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Error Notification */}
                  {signUpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex flex-col gap-2 text-start text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span className="font-semibold leading-relaxed">{signUpError}</span>
                      </div>
                      {(signUpError.includes('مسجل') || signUpError.includes('already')) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSignInEmail(signUpEmail);
                            setMode('signin');
                            setSignUpError('');
                          }}
                          className="self-start px-2.5 py-1 rounded-lg bg-[#241A0B] hover:bg-[#332510] border border-[#E5B869]/40 text-[#F5D794] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-[#E5B869]" />
                          <span>{language === 'ar' ? 'تسجيل الدخول مباشرة بهذا البريد' : 'Sign in directly with this email'}</span>
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Google Single Sign-On Button */}
                  <button
                    id="btn-google-signup"
                    type="button"
                    onClick={() => handleGoogleAuth('signup')}
                    disabled={googleLoading || isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#05110C]/90 hover:bg-[#0B221A] active:bg-[#040D09] text-slate-200 hover:text-white border border-[#E5B869]/25 hover:border-[#E5B869]/55 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm text-xs sm:text-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>{googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}</span>
                  </button>

                  {/* Clean Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-[#E5B869]/25 to-transparent flex-1" />
                    <span className="text-[11px] text-[#E5B869]/80 font-semibold uppercase tracking-wider">
                      {language === 'ar' ? 'أو إدخال البيانات' : 'Or enter details'}
                    </span>
                    <div className="h-px bg-gradient-to-r from-transparent via-[#E5B869]/25 to-transparent flex-1" />
                  </div>

                  {/* Sign Up Form */}
                  <form onSubmit={handleSignUpStart} className="space-y-3 text-start">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200 block">
                        {t('auth.fullName')}
                      </label>
                      <div className="relative group">
                        <input
                          id="signup-name"
                          type="text"
                          required
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] group-hover:border-[#E5B869]/40 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200 block">
                        {t('auth.email')}
                      </label>
                      <div className="relative group">
                        <input
                          id="signup-email"
                          type="email"
                          required
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] group-hover:border-[#E5B869]/40 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        {isSignUpEmailValid && (
                          <Check className="w-4 h-4 text-[#E5B869] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                    </div>

                    {/* City & Position */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200 block">
                          {t('profile.city')}
                        </label>
                        <div className="relative">
                          <select
                            id="signup-city"
                            value={signUpCity}
                            onChange={(e) => setSignUpCity(e.target.value)}
                            className="w-full py-2.5 pl-8 pr-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] hover:border-[#E5B869]/40 focus:border-[#E5B869] focus:ring-2 focus:ring-[#E5B869]/25 text-white text-xs outline-none cursor-pointer shadow-inner"
                          >
                            {MOROCCAN_CITIES.map((city) => (
                              <option key={city} value={city} className="bg-[#08130E] text-white">
                                {getCityName(city)}
                              </option>
                            ))}
                          </select>
                          <MapPin className="w-3.5 h-3.5 text-[#E5B869] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-200 block">
                          {t('profile.position')}
                        </label>
                        <div className="relative">
                          <select
                            id="signup-position"
                            value={signUpPosition}
                            onChange={(e) => setSignUpPosition(e.target.value)}
                            className="w-full py-2.5 pl-8 pr-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] hover:border-[#E5B869]/40 focus:border-[#E5B869] focus:ring-2 focus:ring-[#E5B869]/25 text-white text-xs outline-none cursor-pointer shadow-inner"
                          >
                            {POSITIONS.map((pos) => (
                              <option key={pos.code} value={pos.code} className="bg-[#08130E] text-white">
                                {language === 'ar' ? pos.labelAr : pos.labelEn}
                              </option>
                            ))}
                          </select>
                          <Activity className="w-3.5 h-3.5 text-[#E5B869] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200 block">
                        {t('auth.password')}
                      </label>
                      <div className="relative group">
                        <input
                          id="signup-password"
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#040B08]/90 border border-[#16382B] group-hover:border-[#E5B869]/40 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                        >
                          {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Clean Segmented Password Strength Bar */}
                      {signUpPassword && (
                        <div className="pt-1.5 space-y-1">
                          <div className="grid grid-cols-4 gap-1.5 h-1">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`rounded-full h-full transition-colors duration-200 ${
                                  step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              {language === 'ar' ? 'مستوى أمان كلمة المرور' : 'Password security'}
                            </span>
                            <span className="font-bold text-[#F5D794]">{passwordStrength.label}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      id="btn-signup-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:from-[#FFF1C5] hover:via-[#F5D794] hover:to-[#D4A045] active:scale-[0.985] text-slate-950 rounded-xl font-black transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-[0_8px_25px_rgba(229,184,105,0.35)] hover:shadow-[0_12px_32px_rgba(229,184,105,0.5)] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{t('auth.signUpButton')}</span>
                          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 2.5. SIGN UP OTP VERIFICATION ================= */}
              {mode === 'verify_signup' && (
                <motion.div
                  key="verify-signup-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 text-xs text-start"
                >
                  <div className="p-3 rounded-xl bg-[#05070A]/90 border border-[#E5B869]/25 text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-[#E5B869] shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-slate-500 font-medium">
                          {language === 'ar' ? 'تم الإرسال إلى:' : 'Sent to:'}
                        </div>
                        <div className="font-mono font-semibold text-[#F5D794] truncate">{signUpEmail}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setSignupVerifyError('');
                        setSignupVerifySuccess('');
                      }}
                      className="text-xs text-[#E5B869] hover:text-[#F5D794] font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                  </div>

                  {signupVerifyError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{signupVerifyError}</span>
                    </div>
                  )}

                  {signupVerifySuccess && (
                    <div className="p-3 rounded-xl bg-[#0D382A]/60 border border-[#E5B869]/30 text-[#F5D794] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E5B869]" />
                      <span>{signupVerifySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifySignUpAndRegister} className="space-y-4">
                    <div className="space-y-2 text-center">
                      <label className="text-xs font-medium text-slate-300 block">
                        {language === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 Digits)'}
                      </label>
                      <div className="flex items-center justify-center gap-2" dir="ltr">
                        {signupOtpDigits.map((digit, idx) => (
                          <input
                            key={`signup-otp-${idx}`}
                            ref={(el) => { signupOtpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleSignupOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleSignupOtpKeyDown(idx, e)}
                            onPaste={handleSignupOtpPaste}
                            className="w-10 h-12 text-center text-lg font-mono font-bold rounded-xl bg-[#05070A] border border-[#E5B869]/25 focus:border-[#E5B869] focus:ring-2 focus:ring-[#E5B869]/25 text-[#F5D794] outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      id="btn-signup-verify"
                      type="submit"
                      disabled={isSubmitting || signupOtpDigits.join('').length !== 6}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-105 active:scale-[0.99] text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-lg shadow-[#E5B869]/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تأكيد الحساب والمتابعة' : 'Verify & Complete'}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={signupResendTimer > 0 || isSignupResending}
                        onClick={handleResendSignupOTP}
                        className="text-xs text-[#E5B869] hover:text-[#F5D794] font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSignupResending ? 'animate-spin' : ''}`} />
                        <span>
                          {signupResendTimer > 0
                            ? language === 'ar'
                              ? `إعادة الإرسال بعد ${signupResendTimer} ثانية`
                              : `Resend in ${signupResendTimer}s`
                            : language === 'ar'
                            ? 'إعادة إرسال الرمز'
                            : 'Resend code'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('signin')}
                        className="text-xs text-slate-400 hover:text-[#F5D794] transition-colors cursor-pointer"
                      >
                        {t('auth.backToSignIn')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ================= 3. FORGOT PASSWORD ================= */}
              {mode === 'forgot' && (
                <motion.div
                  key="forgot-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 text-xs text-start"
                >
                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotStart} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300 block">
                        {t('auth.email')}
                      </label>
                      <div className="relative group">
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#05070A]/90 border border-slate-800 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none"
                        />
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        {isForgotEmailValid && (
                          <Check className="w-4 h-4 text-[#E5B869] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                    </div>

                    <button
                      id="btn-forgot-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-105 active:scale-[0.99] text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-lg shadow-[#E5B869]/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>{language === 'ar' ? 'إرسال رمز التحقق' : 'Send Verification Code'}</span>
                          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 4. VERIFY OTP & RESET PASSWORD ================= */}
              {mode === 'verify_forgot' && (
                <motion.div
                  key="verify-forgot-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 text-xs text-start"
                >
                  <div className="p-3 rounded-xl bg-[#05070A]/90 border border-[#E5B869]/25 text-slate-300 flex items-center justify-between">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {language === 'ar' ? 'البريد الإلكتروني:' : 'Account email:'}
                      </div>
                      <div className="font-mono font-semibold text-[#F5D794] truncate">
                        {resetSentEmail || forgotEmail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[#E5B869] hover:text-[#F5D794] font-semibold cursor-pointer shrink-0 ml-2"
                    >
                      {language === 'ar' ? 'تغيير' : 'Change'}
                    </button>
                  </div>

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3 rounded-xl bg-[#0D382A]/60 border border-[#E5B869]/30 text-[#F5D794] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E5B869]" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5">
                    {/* OTP Inputs */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300 block">
                          {language === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 Digits)'}
                        </label>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || isResending}
                          onClick={handleResendForgotLink}
                          className="text-xs text-[#E5B869] hover:text-[#F5D794] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {isResending
                            ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                            : resendTimer > 0
                            ? `${language === 'ar' ? 'إعادة الإرسال بعد' : 'Resend in'} ${resendTimer}s`
                            : (language === 'ar' ? 'إعادة الإرسال' : 'Resend')}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 sm:gap-2" dir="ltr">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            id={`otp-digit-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpDigits[index] || ''}
                            onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                            className="w-10 sm:w-11 h-12 text-center text-lg font-bold font-mono rounded-xl bg-[#05070A] border border-[#E5B869]/25 focus:border-[#E5B869] focus:ring-2 focus:ring-[#E5B869]/25 text-[#F5D794] outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 block">
                        {t('auth.newPassword')}
                      </label>
                      <div className="relative group">
                        <input
                          id="forgot-new-pwd"
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#05070A]/90 border border-slate-800 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Strength bar */}
                      {forgotNewPassword && (
                        <div className="pt-1.5 space-y-1">
                          <div className="grid grid-cols-4 gap-1.5 h-1">
                            {[1, 2, 3, 4].map((step) => (
                              <div
                                key={step}
                                className={`rounded-full h-full transition-colors duration-200 ${
                                  step <= forgotPasswordStrength.score ? forgotPasswordStrength.color : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 block text-end font-semibold">
                            {forgotPasswordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 block">
                        {t('auth.confirmNewPassword')}
                      </label>
                      <div className="relative group">
                        <input
                          id="forgot-confirm-pwd"
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#05070A]/90 border border-slate-800 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-verify-forgot-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-105 active:scale-[0.99] text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-lg shadow-[#E5B869]/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 5. ACTION LINK PASSWORD RESET ================= */}
              {mode === 'action_reset' && (
                <motion.div
                  key="action-reset-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 text-xs text-start"
                >
                  {isVerifyingActionCode && (
                    <div className="p-3 rounded-xl bg-[#05070A]/90 border border-slate-800 text-slate-300 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#E5B869] border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'ar' ? 'جاري التحقق من الرابط...' : 'Verifying reset link...'}</span>
                    </div>
                  )}

                  {actionEmail && (
                    <div className="p-2.5 rounded-xl bg-[#05070A]/90 border border-[#E5B869]/25 text-slate-300 flex items-center justify-between">
                      <span className="text-slate-400 text-xs">{t('auth.accountEmail')}:</span>
                      <span className="font-mono font-semibold text-[#F5D794]">{actionEmail}</span>
                    </div>
                  )}

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3 rounded-xl bg-[#0D382A]/60 border border-[#E5B869]/30 text-[#F5D794] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E5B869]" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmActionReset} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 block">
                        {t('auth.newPassword')}
                      </label>
                      <div className="relative group">
                        <input
                          id="action-new-pwd"
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#05070A]/90 border border-slate-800 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300 block">
                        {t('auth.confirmNewPassword')}
                      </label>
                      <div className="relative group">
                        <input
                          id="action-confirm-pwd"
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#05070A]/90 border border-slate-800 group-focus-within:border-[#E5B869] group-focus-within:ring-2 group-focus-within:ring-[#E5B869]/25 text-white placeholder-slate-500 text-xs transition-all outline-none"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#E5B869] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-action-reset-submit"
                      type="submit"
                      disabled={isSubmitting || isVerifyingActionCode}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-105 active:scale-[0.99] text-slate-950 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm shadow-lg shadow-[#E5B869]/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>{t('auth.saveNewPassword')}</span>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 6. PENDING APPROVAL ================= */}
              {mode === 'pending' && (
                <motion.div
                  key="pending-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E5B869]/10 border border-[#E5B869]/30 flex items-center justify-center text-[#E5B869]">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white">{t('auth.accountPending')}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                      {t('auth.pendingNotice')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#05070A]/90 border border-slate-800 space-y-1 text-xs text-start">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{t('auth.fullName')}:</span>
                      <span className="font-semibold text-slate-200">{registeredUserName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{t('auth.email')}:</span>
                      <span className="font-mono text-[#E5B869]">{registeredUserEmail}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {t('auth.pendingRefreshHint')}
                  </p>

                  <button
                    id="btn-pending-back-signin"
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setSignInError('');
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                  >
                    <span>{t('auth.backToSignIn')}</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Clean Professional SaaS Footer */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 border-t border-[#E5B869]/15">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
          <ShieldCheck className="w-4 h-4 text-[#E5B869]" />
          <span className="font-medium text-slate-300">
            {language === 'ar' ? 'منصة كرة القدم المغربية المعتمدة • تشفير سحابي 256-Bit آمن' : 'Official Moroccan Football Platform • 256-Bit Encrypted'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#E5B869]/80 font-semibold">
          <span>GoMatch PRO</span>
          <span className="w-1 h-1 rounded-full bg-[#E5B869]/40" />
          <span>v2.5 SaaS</span>
        </div>
      </footer>
    </div>
  );
};
