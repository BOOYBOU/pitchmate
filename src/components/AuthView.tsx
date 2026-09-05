import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  KeyRound,
  ShieldCheck,
  Trophy,
  Globe,
  Inbox,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  LogIn
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { MOROCCAN_CITIES_LOCALIZED } from '../lib/translations';
import { isSuperAdminEmail, MESSI_AVATAR_URL } from '../types';

const MOROCCAN_CITIES = Object.keys(MOROCCAN_CITIES_LOCALIZED);

const POSITIONS = [
  { code: 'GK', labelAr: 'حارس', labelEn: 'GK', icon: '🧤' },
  { code: 'DEF', labelAr: 'دفاع', labelEn: 'DEF', icon: '🛡️' },
  { code: 'MID', labelAr: 'وسط', labelEn: 'MID', icon: '⚡' },
  { code: 'FWD', labelAr: 'هجوم', labelEn: 'FWD', icon: '🎯' },
];

export const AuthView: React.FC = () => {
  const {
    users,
    loginWithCredentials,
    signupWithCredentials,
    resetPasswordWithEmail,
    sendVerificationOTP,
    sendFirebasePasswordReset,
    verifyFirebaseActionCode,
    confirmFirebasePasswordResetAction,
    loginWithGoogle,
  } = usePitchStore();
  const { language, toggleLanguage, t, isRTL, getCityName } = useLanguage();

  type AuthMode = 'signin' | 'signup' | 'verify_signup' | 'forgot' | 'verify_forgot' | 'action_reset' | 'pending';
  const [mode, setMode] = useState<AuthMode>('signup');
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

  // Mouse position for subtle interactive radial glow
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
  const [avatarPreview, setAvatarPreview] = useState('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80');
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState('');
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle ambient interactive parallax glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-detect Firebase Password Reset Link in URL (e.g. ?mode=resetPassword&oobCode=...)
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
        // ignore parsing errors
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
    return { score: 4, label: language === 'ar' ? 'قوية جداً' : 'Strong', color: 'bg-[#F5D794]', percentage: 100 };
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
    return { score: 4, label: language === 'ar' ? 'قوية جداً' : 'Strong', color: 'bg-[#F5D794]', percentage: 100 };
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

  // Sign Up: Step 1 - Send 6-digit verification code (OTP) to prove email ownership first
  const handleSignUpStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setSignUpSuccess('');
    setSignupVerifyError('');
    setSignupVerifySuccess('');

    const cleanName = signUpName.trim();
    if (!cleanName) {
      setSignUpError(language === 'ar' ? 'الاسم الكامل مطلوب.' : 'Full name is required.');
      return;
    }

    const cleanEmail = signUpEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setSignUpError(
        language === 'ar'
          ? 'الرجاء إدخال بريد إلكتروني صالح بالصيغة الصحيحة (مثال: name@domain.com).'
          : 'Please enter a valid email address.'
      );
      return;
    }

    // Instant local check: prevent duplicate registration if email already has an account
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

  // Sign Up: Step 2 - Verify OTP & Create the User Account
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
        : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=300&auto=format&fit=crop&q=80';

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

  // OTP Digits input handlers
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

  // Forgot Password: Send 6-digit numeric OTP via Nodemailer & Firestore
  const handleForgotStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setForgotError(
        language === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صالح بالصيغة الصحيحة (مثال: name@domain.com).'
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
            ? 'تم إرسال كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني بنجاح!'
            : 'A 6-digit verification code has been sent to your email!'
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

  // Resend 6-digit OTP Code
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
        setForgotError(res.error || (language === 'ar' ? 'فشل تحديث كلمة المرور.' : 'Failed to reset password.'));
      }
    } catch {
      setForgotError(language === 'ar' ? 'حدث خطأ أثناء تحديث كلمة المرور.' : 'An error occurred.');
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
    <div className="min-h-screen w-full bg-[#020604] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none antialiased">
      {/* ================= AMBIENT LUMINESCENCE BACKGROUND ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 left-1/2 w-[800px] h-[600px] bg-gradient-to-b from-emerald-500/15 via-[#E5B869]/10 to-transparent rounded-full blur-[140px] transition-transform duration-700 ease-out"
          style={{
            transform: `translate(calc(-50% + ${mousePos.x}px), ${mousePos.y}px)`,
          }}
        />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#0E4836]/20 rounded-full blur-[160px]" />
        
        {/* Refined subtle mesh grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0E483610_1px,transparent_1px),linear-gradient(to_bottom,#0E483610_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* ================= MINIMAL TOP BAR ================= */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 group cursor-default">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#F5D794] to-emerald-400 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
            <div className="relative w-10 h-10 rounded-xl bg-[#041610] border border-[#E5B869]/60 flex items-center justify-center text-[#F5D794] shadow-lg">
              <Trophy className="w-5 h-5 text-[#F5D794] group-hover:scale-105 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                PitchMate
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 font-mono font-bold uppercase">
                PRO 🇲🇦
              </span>
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#07241A]/90 hover:bg-[#0E4836] border border-[#E5B869]/40 hover:border-[#E5B869] text-xs font-bold text-[#F5D794] hover:text-white transition-all cursor-pointer shadow-md active:scale-95 backdrop-blur-md"
        >
          <Globe className="w-3.5 h-3.5 text-[#E5B869]" />
          <span>{language === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
        </button>
      </header>

      {/* ================= PURE CENTERED AUTHENTICATION CARD ================= */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 py-4 sm:py-8 flex items-center justify-center">
        <div className="w-full relative">
          {/* Ambient Glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#E5B869]/30 via-emerald-500/20 to-[#F5D794]/30 rounded-[32px] blur-xl opacity-75" />

          {/* Masterpiece Glassmorphic Card */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative bg-gradient-to-b from-[#07241A]/95 via-[#041610]/98 to-[#020A07]/98 backdrop-blur-3xl border border-[#E5B869]/40 rounded-[28px] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(229,184,105,0.12)] space-y-5"
          >
            {/* Header Titles */}
            <div className="space-y-1.5 text-center">
              <motion.h2
                key={mode + '-title'}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight"
              >
                {mode === 'signin' && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-[#F5D794]">
                    {t('auth.welcomeBack')}
                  </span>
                )}
                {mode === 'signup' && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-[#F5D794]">
                    {t('auth.createAccount')}
                  </span>
                )}
                {mode === 'verify_signup' && (language === 'ar' ? 'تأكيد البريد الإلكتروني' : 'Verify Email')}
                {mode === 'forgot' && t('auth.resetPassword')}
                {mode === 'verify_forgot' && (language === 'ar' ? 'تعيين كلمة المرور الجديدة' : 'Set New Password')}
                {mode === 'action_reset' && (language === 'ar' ? 'تعيين كلمة مرور جديدة' : 'Create New Password')}
                {mode === 'pending' && t('auth.accountPending')}
              </motion.h2>

              <motion.p
                key={mode + '-sub'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="text-xs text-emerald-300/80 max-w-xs mx-auto leading-relaxed"
              >
                {mode === 'signin' && t('auth.signInSubtitle')}
                {mode === 'signup' && t('auth.signUpSubtitle')}
                {mode === 'verify_signup' && (language === 'ar' ? 'أدخل رمز التحقق (OTP) للتأكد من ملكية البريد الإلكتروني' : 'Enter the 6-digit code to verify email ownership')}
                {mode === 'forgot' && (language === 'ar' ? 'أدخل بريدك الإلكتروني لتصلك رسالة تتضمن رمز التحقق السري' : 'Enter your registered email to receive a secure 6-digit OTP code')}
                {mode === 'verify_forgot' && (language === 'ar' ? 'أدخل كلمة المرور الجديدة لحسابك لتحديثها فوراً' : 'Enter your new password to update your account immediately')}
                {mode === 'action_reset' && (language === 'ar' ? 'أدخل كلمة المرور الجديدة لحسابك' : 'Enter your new secure password')}
                {mode === 'pending' && t('auth.pendingNotice')}
              </motion.p>
            </div>

            {/* Seamless Fluid Mode Switcher Tabs (Sign In / Sign Up) */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#020A07] rounded-2xl border border-[#E5B869]/25 relative shadow-inner">
                <button
                  id="switch-to-signin-tab"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setSignInError('');
                    setSignUpError('');
                    setSignUpSuccess('');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className={`relative py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 z-10 ${
                    mode === 'signin'
                      ? 'text-slate-950 font-black'
                      : 'text-emerald-300/70 hover:text-white'
                  }`}
                >
                  {mode === 'signin' && (
                    <motion.div
                      layoutId="activeAuthPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] rounded-xl shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('auth.signInButton')}</span>
                </button>

                <button
                  id="switch-to-signup-tab"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignInError('');
                    setSignUpError('');
                    setSignUpSuccess('');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className={`relative py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 z-10 ${
                    mode === 'signup'
                      ? 'text-slate-950 font-black'
                      : 'text-emerald-300/70 hover:text-white'
                  }`}
                >
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="activeAuthPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] rounded-xl shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <User className="w-3.5 h-3.5" />
                  <span>{t('auth.signUpButton')}</span>
                </button>
              </div>
            )}

            {/* Back Button for Forgot & Reset flows */}
            {(mode === 'forgot' || mode === 'verify_forgot' || mode === 'action_reset') && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#F5D794] flex items-center gap-1.5">
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
                  className="text-xs text-emerald-300 hover:text-[#F5D794] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                >
                  {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{t('auth.backToSignIn')}</span>
                </button>
              </div>
            )}

            {/* ================= VIEWS CONTAINER ================= */}
            <AnimatePresence mode="wait">
              {/* ================= 1. SIGN IN VIEW ================= */}
              {mode === 'signin' && (
                <motion.div
                  key="signin-tab"
                  initial={{ opacity: 0, x: isRTL ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? -15 : 15 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="space-y-4 text-xs"
                >
                  {signInError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-2xl flex items-start gap-2.5 ${
                        isPendingError
                          ? 'bg-[#0E382A] border border-[#E5B869]/50 text-amber-200'
                          : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {isPendingError ? (
                        <Clock className="w-4 h-4 shrink-0 text-[#E5B869] mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      )}
                      <div className="space-y-1 text-start">
                        <span className="font-semibold block leading-snug">{signInError}</span>
                        {isPendingError && (
                          <span className="text-[11px] text-[#F5D794] block">
                            {language === 'ar'
                              ? 'تم إشعار المشرف وسيقوم بمراجعة حسابك وتفعيله في أقرب وقت.'
                              : 'The administrator will review and activate your account shortly.'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Google Button */}
                  <button
                    id="auth-google-signin-btn"
                    type="button"
                    onClick={() => handleGoogleAuth('signin')}
                    disabled={googleLoading || isSubmitting}
                    className="w-full py-2.5 px-4 bg-white/95 hover:bg-white active:bg-slate-100 text-[#1F2937] hover:text-black border border-white/30 rounded-xl font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] text-xs sm:text-sm disabled:opacity-60 group"
                  >
                    <svg className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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

                  <div className="flex items-center gap-3 my-2.5">
                    <div className="h-px bg-[#E5B869]/20 flex-1" />
                    <span className="text-[10px] text-emerald-300/60 uppercase font-semibold">
                      {language === 'ar' ? 'أو بالبريد الإلكتروني' : 'Or with Email'}
                    </span>
                    <div className="h-px bg-[#E5B869]/20 flex-1" />
                  </div>

                  {/* Sign In Form */}
                  <form onSubmit={handleSignIn} className="space-y-3 text-start">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.email')}
                      </label>
                      <div className="relative group">
                        <input
                          id="signin-email-input"
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="player@pitchmate.ma"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] focus:ring-1 focus:ring-[#E5B869]/30 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Mail className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#F5D794] transition-colors" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-emerald-200">
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
                          className="text-[11px] text-[#F5D794] hover:underline cursor-pointer font-medium"
                        >
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      <div className="relative group">
                        <input
                          id="signin-password-input"
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] focus:ring-1 focus:ring-[#E5B869]/30 text-white placeholder-slate-500 text-xs transition-all outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[#F5D794] transition-colors" />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showSignInPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="signin-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-[0_8px_20px_rgba(229,184,105,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm mt-2 disabled:opacity-50 group"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{t('auth.signInButton')}</span>
                          {isRTL ? (
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          )}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 2. SIGN UP VIEW ================= */}
              {mode === 'signup' && (
                <motion.div
                  key="signup-tab"
                  initial={{ opacity: 0, x: isRTL ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 15 : -15 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="space-y-3.5 text-xs"
                >
                  {signUpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex flex-col gap-2 text-start"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span className="font-semibold text-xs leading-relaxed">{signUpError}</span>
                      </div>
                      {(signUpError.includes('مسجل') || signUpError.includes('already')) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSignInEmail(signUpEmail);
                            setMode('signin');
                            setSignUpError('');
                          }}
                          className="self-start mt-0.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'الانتقال لتسجيل الدخول مباشرة بهذا البريد' : 'Sign in directly with this email'}</span>
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Google Sign Up Button */}
                  <button
                    id="auth-google-signup-btn"
                    type="button"
                    onClick={() => handleGoogleAuth('signup')}
                    disabled={googleLoading || isSubmitting}
                    className="w-full py-2.5 px-4 bg-white/95 hover:bg-white active:bg-slate-100 text-[#1F2937] hover:text-black border border-white/30 rounded-xl font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] text-xs sm:text-sm disabled:opacity-60 group"
                  >
                    <svg className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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

                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-[#E5B869]/20 flex-1" />
                    <span className="text-[10px] text-emerald-300/60 uppercase font-semibold">
                      {language === 'ar' ? 'أو بالتسجيل المباشر' : 'Or direct registration'}
                    </span>
                    <div className="h-px bg-[#E5B869]/20 flex-1" />
                  </div>

                  {/* Sign Up Form */}
                  <form onSubmit={handleSignUpStart} className="space-y-3 text-start">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.fullName')}
                      </label>
                      <div className="relative">
                        <input
                          id="signup-name-input"
                          type="text"
                          required
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          placeholder={language === 'ar' ? 'أشرف حكيمي' : 'Achraf Hakimi'}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <User className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.email')}
                      </label>
                      <div className="relative">
                        <input
                          id="signup-email-input"
                          type="email"
                          required
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          placeholder="hakimi@pitchmate.ma"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Mail className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* City & Position Selectors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-emerald-200 block">
                          {t('profile.city')}
                        </label>
                        <select
                          id="signup-city-select"
                          value={signUpCity}
                          onChange={(e) => setSignUpCity(e.target.value)}
                          className="w-full py-2 px-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none cursor-pointer"
                        >
                          {MOROCCAN_CITIES.map((city) => (
                            <option key={city} value={city} className="bg-[#020A07] text-white">
                              {getCityName(city)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-emerald-200 block">
                          {t('profile.position')}
                        </label>
                        <select
                          id="signup-position-select"
                          value={signUpPosition}
                          onChange={(e) => setSignUpPosition(e.target.value)}
                          className="w-full py-2 px-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none cursor-pointer"
                        >
                          {POSITIONS.map((pos) => (
                            <option key={pos.code} value={pos.code} className="bg-[#020A07] text-white">
                              {pos.icon} {language === 'ar' ? pos.labelAr : pos.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.password')}
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password-input"
                          type={showSignUpPassword ? 'text' : 'password'}
                          required
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {signUpPassword && (
                        <div className="pt-1 space-y-1">
                          <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden border border-emerald-500/20">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${passwordStrength.percentage}%` }}
                              className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            />
                          </div>
                          <span className="text-[10px] text-[#F5D794] block text-end font-mono font-bold">
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      id="signup-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-[0_8px_20px_rgba(229,184,105,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm mt-2 disabled:opacity-50 group"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{t('auth.signUpButton')}</span>
                          {isRTL ? (
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          )}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 2.5. SIGN UP EMAIL VERIFICATION (6-DIGIT OTP) ================= */}
              {mode === 'verify_signup' && (
                <motion.div
                  key="verify-signup"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="space-y-4 text-xs text-start"
                >
                  <div className="text-center space-y-1">
                    <div className="w-11 h-11 mx-auto rounded-2xl bg-[#04130D] border border-[#E5B869]/40 flex items-center justify-center text-[#F5D794] shadow-md mb-2">
                      <Mail className="w-5 h-5 text-[#F5D794]" />
                    </div>
                    <h3 className="text-sm font-black text-[#F5D794]">
                      {language === 'ar' ? 'تأكيد ملكية البريد الإلكتروني' : 'Verify Email Ownership'}
                    </h3>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed max-w-xs mx-auto">
                      {language === 'ar'
                        ? 'أدخل رمز التحقق (OTP) المكون من 6 أرقام المرسل إلى بريدك الإلكتروني للتأكد من أن البريد يخصك قبل إتمام التسجيل.'
                        : 'Enter the 6-digit verification code sent to your email to verify ownership before registration.'}
                    </p>
                  </div>

                  {/* Recipient Email Info Box with Edit/Change option */}
                  <div className="p-3 rounded-2xl bg-gradient-to-b from-[#0E382A] to-[#082218] border border-[#E5B869]/30 text-amber-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-[#04130D] border border-[#E5B869]/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-[10px] text-emerald-300/80 font-medium">
                          {language === 'ar' ? 'تم إرسال الرمز إلى:' : 'Verification code sent to:'}
                        </div>
                        <div className="font-mono font-bold text-xs text-[#F5D794] truncate">
                          {signUpEmail}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setSignupVerifyError('');
                        setSignupVerifySuccess('');
                        setSignupOtpDigits(['', '', '', '', '', '']);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#020A07] border border-[#E5B869]/25 hover:border-[#E5B869] text-[11px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {language === 'ar' ? 'تعديل البريد' : 'Edit Email'}
                    </button>
                  </div>

                  {signupVerifyError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{signupVerifyError}</span>
                    </div>
                  )}

                  {signupVerifySuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{signupVerifySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifySignUpAndRegister} className="space-y-4">
                    {/* 6-Digit OTP Boxes */}
                    <div className="space-y-1.5 text-center">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {language === 'ar' ? 'أدخل الرمز المكون من 6 أرقام:' : 'Enter 6-Digit Code:'}
                      </label>
                      <div className="flex items-center justify-center gap-2 dir-ltr" dir="ltr">
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
                            className="w-10 h-12 text-center text-lg font-mono font-black rounded-xl bg-[#020A07] border-2 border-[#E5B869]/30 focus:border-[#E5B869] focus:ring-2 focus:ring-[#E5B869]/30 text-[#F5D794] outline-none shadow-inner transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      id="signup-verify-submit-btn"
                      type="submit"
                      disabled={isSubmitting || signupOtpDigits.join('').length !== 6}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تأكيد البريد الإلكتروني وإتمام التسجيل' : 'Verify Email & Complete Registration'}</span>
                        </>
                      )}
                    </button>

                    {/* Resend button with timer */}
                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        disabled={signupResendTimer > 0 || isSignupResending}
                        onClick={handleResendSignupOTP}
                        className="w-full py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/30 hover:border-[#E5B869] text-xs font-bold text-[#F5D794] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isSignupResending ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#F5D794] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {signupResendTimer > 0
                            ? language === 'ar'
                              ? `إعادة إرسال الرمز (${signupResendTimer} ثانية)`
                              : `Resend code in ${signupResendTimer}s`
                            : language === 'ar'
                              ? 'إعادة إرسال رمز التحقق إلى بريدي'
                              : 'Resend Verification Code'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setSignupVerifyError('');
                          setSignupVerifySuccess('');
                        }}
                        className="w-full py-2 rounded-xl bg-[#04130D] border border-emerald-900/40 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>{t('auth.backToSignIn')}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ================= 3. FORGOT PASSWORD (ACCOUNT EMAIL VERIFICATION VIA OTP) ================= */}
              {mode === 'forgot' && (
                <motion.div
                  key="forgot-password"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="space-y-4 text-xs text-start"
                >
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[#04130D] border border-[#E5B869]/40 flex items-center justify-center text-[#F5D794] shadow-md mb-2">
                      <KeyRound className="w-5 h-5 text-[#F5D794]" />
                    </div>
                    <h3 className="text-sm font-black text-[#F5D794]">
                      {language === 'ar' ? 'استعادة كلمة المرور عبر كود التحقق (OTP)' : 'Password Reset via Verification Code (OTP)'}
                    </h3>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed max-w-xs mx-auto">
                      {language === 'ar'
                        ? 'أدخل بريدك الإلكتروني المسجل لنرسل لك رمز تحقق سرياً مكوناً من 6 أرقام لتأكيد هويتك وتعيين كلمة المرور الجديدة مباشرة في التطبيق.'
                        : 'Enter your email address to receive a secure 6-digit verification code to reset your password directly in the app.'}
                    </p>
                  </div>

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotStart} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {language === 'ar' ? 'البريد الإلكتروني المسجل (Gmail)' : 'Registered Email Address (Gmail)'}
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-email-input"
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="player@gmail.com"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Mail className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      id="forgot-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>{language === 'ar' ? 'إرسال رمز التحقق (OTP) إلى بريدي' : 'Send 6-Digit Code to Email'}</span>
                          {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setForgotError('');
                        setForgotSuccess('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#020A07] border border-emerald-900/40 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>{t('auth.backToSignIn')}</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 4. DIRECT PASSWORD RESET (VERIFY 6-DIGIT OTP & SET PASSWORD) ================= */}
              {mode === 'verify_forgot' && (
                <motion.div
                  key="verify-forgot"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="space-y-4 text-xs text-start"
                >
                  {/* Account Pill with Change Email action */}
                  <div className="p-3 rounded-2xl bg-gradient-to-b from-[#0E382A] to-[#082218] border border-[#E5B869]/30 text-amber-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-[#04130D] border border-[#E5B869]/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-[10px] text-emerald-300/80 font-medium">
                          {language === 'ar' ? 'تم الإرسال إلى البريد الإلكتروني:' : 'Sent to Registered Email:'}
                        </div>
                        <div className="font-mono font-bold text-xs text-[#F5D794] truncate">
                          {resetSentEmail || forgotEmail}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotError('');
                        setForgotSuccess('');
                        setOtpDigits(['', '', '', '', '', '']);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#020A07] border border-[#E5B869]/25 hover:border-[#E5B869] text-[11px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {language === 'ar' ? 'تغيير' : 'Change'}
                    </button>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[#04130D] border border-[#E5B869]/40 flex items-center justify-center text-[#F5D794] shadow-md mb-2">
                      <KeyRound className="w-5 h-5 text-[#F5D794]" />
                    </div>
                    <h3 className="text-sm font-black text-[#F5D794]">
                      {language === 'ar' ? 'إدخال رمز التحقق وكلمة المرور' : 'Enter 6-Digit Code & Password'}
                    </h3>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                      {language === 'ar'
                        ? 'أدخل رمز التحقق (OTP) المكون من 6 أرقام المرسل إلى بريدك، ثم عيّن كلمة المرور الجديدة.'
                        : 'Enter the 6-digit verification code sent to your email, then set your new password.'}
                    </p>
                  </div>

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                    {/* 6-Digit Numeric OTP Input Boxes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-emerald-200 block">
                          {language === 'ar' ? 'رمز التحقق (6 أرقام):' : 'Verification Code (6 Digits):'}
                        </label>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || isResending}
                          onClick={handleResendForgotLink}
                          className="text-[10px] font-bold text-[#E5B869] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {isResending
                            ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                            : resendTimer > 0
                            ? `${language === 'ar' ? 'إعادة الإرسال خلال' : 'Resend in'} ${resendTimer}s`
                            : (language === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Code')}
                        </button>
                      </div>

                      {/* Six individual numeric inputs */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2 dir-ltr" dir="ltr">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              otpInputRefs.current[index] = el;
                            }}
                            id={`otp-input-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            value={otpDigits[index] || ''}
                            onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                            className="w-10 sm:w-11 h-12 text-center text-lg font-black font-mono rounded-xl bg-[#020A07] border border-[#E5B869]/40 focus:border-[#F5D794] focus:ring-2 focus:ring-[#E5B869]/30 text-[#F5D794] outline-none shadow-inner transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-otp-new-password"
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {forgotNewPassword && (
                        <div className="pt-1 space-y-1">
                          <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden border border-emerald-500/20">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${forgotPasswordStrength.percentage}%` }}
                              className={`h-full ${forgotPasswordStrength.color} transition-all duration-300`}
                            />
                          </div>
                          <span className="text-[10px] text-[#F5D794] block text-end font-mono font-bold">
                            {forgotPasswordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.confirmNewPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-otp-confirm-password"
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="verify-forgot-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm mt-1 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{language === 'ar' ? 'تأكيد الرمز وتحديث كلمة المرور' : 'Verify Code & Reset Password'}</span>
                        </>
                      )}
                    </button>

                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setForgotError('');
                          setForgotSuccess('');
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#020A07] border border-emerald-900/40 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>{t('auth.backToSignIn')}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ================= 5. ACTION LINK PASSWORD RESET VIEW ================= */}
              {mode === 'action_reset' && (
                <motion.div
                  key="action-reset"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="space-y-4 text-xs text-start"
                >
                  {isVerifyingActionCode && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'ar' ? 'جاري التحقق من الرابط...' : 'Verifying reset link...'}</span>
                    </div>
                  )}

                  {actionEmail && (
                    <div className="p-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/30 text-emerald-200 flex items-center justify-between">
                      <span className="text-emerald-400/80 text-[11px]">{t('auth.accountEmail')}:</span>
                      <span className="font-mono font-bold text-[#F5D794]">{actionEmail}</span>
                    </div>
                  )}

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleConfirmActionReset} className="space-y-3.5">
                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-new-password-input"
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-200 block">
                        {t('auth.confirmNewPassword')}
                      </label>
                      <div className="relative">
                        <input
                          id="forgot-confirm-password-input"
                          type={showForgotConfirmPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-8 pr-8 py-2.5 rounded-xl bg-[#020A07] border border-[#E5B869]/25 focus:border-[#E5B869] text-white text-xs outline-none shadow-inner"
                        />
                        <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showForgotConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="action-reset-submit-btn"
                      type="submit"
                      disabled={isSubmitting || isVerifyingActionCode}
                      className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>{t('auth.saveNewPassword')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ================= 6. PENDING APPROVAL VIEW ================= */}
              {mode === 'pending' && (
                <motion.div
                  key="pending-tab"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0E382A] to-[#082218] border border-[#E5B869]/40 text-amber-100 flex flex-col items-center text-center gap-2.5 shadow-lg">
                    <div className="w-12 h-12 rounded-2xl bg-[#04130D] border border-[#E5B869]/60 flex items-center justify-center text-[#F5D794] shadow-md">
                      <Clock className="w-6 h-6 animate-spin text-[#F5D794]" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-base font-black text-[#F5D794]">{t('auth.accountPending')}</h2>
                      <p className="text-xs font-medium text-emerald-100 leading-relaxed">
                        {t('auth.pendingNotice')}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#020A07] border border-[#E5B869]/25 space-y-1.5 text-xs text-start">
                    <div className="flex items-center justify-between text-emerald-200">
                      <span className="text-emerald-300/70">{t('auth.fullName')}:</span>
                      <span className="font-bold text-white">{registeredUserName}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-200">
                      <span className="text-emerald-300/70">{t('auth.email')}:</span>
                      <span className="font-mono text-[#F5D794]">{registeredUserEmail}</span>
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
                    className="w-full py-3 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 active:scale-[0.99] text-slate-950 rounded-xl font-black shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                  >
                    <span>{t('auth.backToSignIn')}</span>
                    {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* ================= MINIMAL FOOTER ================= */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-emerald-300/60 flex items-center justify-between border-t border-emerald-900/20">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E5B869]" />
          <span>PitchMate PRO</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#F5D794]">
          <span>{language === 'ar' ? 'المملكة المغربية 🇲🇦' : 'Morocco 🇲🇦'}</span>
        </div>
      </footer>
    </div>
  );
};
