import React, { useState, useRef } from 'react';
import {
  Shield,
  Mail,
  Lock,
  User,
  X,
  ArrowRight,
  Upload,
  AlertCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, isSuperAdminEmail } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup' | 'forgot';
  onClose?: () => void;
  onSuccess?: () => void;
  isMandatoryLanding?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
  isMandatoryLanding = false,
}) => {
  const { loginWithCredentials, signupWithCredentials, resetPasswordWithEmail } = usePitchStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  // Sign in form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign up form state
  const [name, setName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200');
  const [signUpError, setSignUpError] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      const res = await loginWithCredentials(signInEmail, signInPassword);
      if (res.success) {
        onSuccess?.();
        onClose?.();
      } else {
        setSignInError(res.error || 'Invalid email or password.');
      }
    } catch {
      setSignInError('An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignUpError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatarPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    setIsSubmitting(true);

    try {
      const res = await signupWithCredentials(
        name,
        signUpEmail,
        password,
        avatarPreview
      );
      if (res.success) {
        onSuccess?.();
        onClose?.();
      } else {
        setSignUpError(res.error || 'Failed to create account.');
      }
    } catch {
      setSignUpError('An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccessMsg('');

    if (forgotNewPass.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithEmail(forgotEmail, forgotNewPass);
      if (res.success) {
        setForgotSuccessMsg('Password successfully updated! You are now logged in.');
        setTimeout(() => {
          onSuccess?.();
          onClose?.();
        }, 1200);
      } else {
        setForgotError(res.error || 'Failed to reset password.');
      }
    } catch {
      setForgotError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="auth-modal"
        className="w-full max-w-md bg-[#0E1526] border border-[#1E293B] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-base shadow-lg shadow-emerald-950">
              PM
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-display text-white">
                {mode === 'signin'
                  ? 'Sign In to PitchMate'
                  : mode === 'signup'
                  ? 'Join PitchMate Community'
                  : 'Account Recovery'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin'
                  ? 'Access matches, live chat, and voice calls'
                  : mode === 'signup'
                  ? 'Create your soccer player profile'
                  : 'Reset your account password'}
              </p>
            </div>
          </div>
          {!isMandatoryLanding && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab switch */}
        {mode !== 'forgot' ? (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090D16] rounded-xl border border-[#1E293B]">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setSignInError('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signin' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setSignUpError('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up (New Player)
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              Password Reset
            </span>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setForgotError('');
                setForgotSuccessMsg('');
              }}
              className="text-xs text-slate-400 hover:text-blue-400 font-semibold cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Mode: Sign In */}
        {mode === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs">
            {signInError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{signInError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signin-email-input"
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="e.g. player@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(signInEmail);
                    setMode('forgot');
                    setForgotError('');
                    setForgotSuccessMsg('');
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signin-password-input"
                  type="password"
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              id="submit-signin-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Mode: Sign Up */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
            {signUpError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{signUpError}</span>
              </div>
            )}

            {/* Profile picture selection */}
            <div className="flex items-center gap-4 p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shrink-0"
              />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">Profile Picture</span>
                <div className="flex gap-2">
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
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    Upload Photo
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Leo Messi"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (Min 6 chars)"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              id="submit-signup-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Creating Profile...' : 'Create Player Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Mode: Forgot Password */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs">
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            <p className="text-slate-400 text-[11px]">
              Enter the email address registered with your PitchMate account along with your new desired password.
            </p>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="forgot-new-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  placeholder="•••••••• (Min 6 characters)"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="forgot-confirm-password-input"
                  type="password"
                  required
                  minLength={6}
                  value={forgotConfirmPass}
                  onChange={(e) => setForgotConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              id="submit-forgot-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Resetting Password...' : 'Reset Password & Access Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
