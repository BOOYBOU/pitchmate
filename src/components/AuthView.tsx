import React, { useState, useRef } from 'react';
import {
  Shield,
  Mail,
  Lock,
  User,
  ArrowRight,
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
  ShieldAlert
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, isSuperAdminEmail, UserProfile } from '../types';

export const AuthView: React.FC = () => {
  const { loginWithCredentials, signupWithCredentials, resetPasswordWithEmail } = usePitchStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'pending'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200');
  const [signUpError, setSignUpError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [registeredUserName, setRegisteredUserName] = useState('');

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      const res = await loginWithCredentials(signInEmail, signInPassword);
      if (!res.success) {
        setSignInError(res.error || 'Invalid email or password.');
      }
    } catch {
      setSignInError('An unexpected authentication error occurred.');
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
        setSignUpError(res.error || 'Failed to create account.');
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
      setSignUpError('An error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithEmail(forgotEmail, forgotNewPassword);
      if (res.success) {
        setForgotSuccess('Password updated successfully! Logging you in...');
      } else {
        setForgotError(res.error || 'Failed to reset password.');
      }
    } catch {
      setForgotError('An error occurred while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignUpError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSignUpError('Image size should be under 5MB');
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

  const isPendingError = signInError.toLowerCase().includes('admin approves') || signInError.toLowerCase().includes('wait until');

  return (
    <div className="min-h-screen w-full bg-[#040711] text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Tactical Stadium Pitch Lines Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border-2 border-emerald-500/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500/40" />
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-emerald-500/30" />
        <div className="absolute inset-8 border border-emerald-500/20 rounded-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-950/50">
            PM
          </div>
          <div>
            <span className="text-xl font-black font-display tracking-tight text-white flex items-center gap-1.5">
              PitchMate
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                PRO
              </span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Soccer Match Organizer & Community</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B1120] border border-[#1E293B] text-xs text-slate-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Admin Approved Access</span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        <div className="w-full bg-[#0B1120]/95 backdrop-blur-xl border border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          
          {/* Header section inside card */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black tracking-tight text-white font-display">
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Create Player Account'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'pending' && 'Account Pending Approval'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'signin' && 'Sign in with your verified credentials to access matches'}
              {mode === 'signup' && 'Register your profile to join matches and team rosters'}
              {mode === 'forgot' && 'Recover and restore access to your player profile'}
              {mode === 'pending' && 'Your account was registered and submitted for review'}
            </p>
          </div>

          {/* Nav switcher pills */}
          {mode !== 'forgot' && mode !== 'pending' ? (
            <div className="grid grid-cols-2 p-1 bg-[#050814] rounded-2xl border border-[#1E293B]">
              <button
                id="switch-to-signin-tab"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError('');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
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
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          ) : mode === 'forgot' ? (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-amber-400">Password Recovery</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="text-xs text-slate-400 hover:text-blue-400 font-semibold cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : null}

          {/* ================= PENDING APPROVAL CONFIRMATION SCREEN ================= */}
          {mode === 'pending' && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-100 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-amber-300">Registration Complete</h2>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    "Your account has been created. Please wait until the Admin approves your account."
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Player Name:</span>
                  <span className="font-bold text-white">{registeredUserName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Account Email:</span>
                  <span className="font-mono text-emerald-400">{registeredUserEmail}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Approval Status:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]">
                    <Clock className="w-3 h-3" />
                    Pending Admin Approval
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                For pitch safety, all player registrations are reviewed by the Admin before match access is activated. Once approved, you will be able to log in immediately with your password.
              </p>

              <button
                id="pending-return-signin-btn"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setSignInError('');
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= SIGN IN VIEW ================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              {signInError && (
                <div
                  id="signin-error-banner"
                  className={`p-3.5 rounded-2xl flex items-start gap-2.5 animate-in fade-in ${
                    isPendingError
                      ? 'bg-amber-950/70 border border-amber-500/50 text-amber-200'
                      : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {isPendingError ? (
                    <Clock className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-semibold block leading-snug">{signInError}</span>
                    {isPendingError && (
                      <span className="text-[11px] text-amber-300/80 block">
                        The administrator has been notified and will review your pending account shortly.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-signin-email"
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. player@example.com"
                    className="w-full pl-10 pr-3.5 py-3 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(signInEmail);
                      setMode('forgot');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-signin-password"
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-3.5 py-3 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                id="auth-signin-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to PitchMate'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ================= SIGN UP VIEW ================= */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4 text-xs">
              {signUpError && (
                <div
                  id="signup-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{signUpError}</span>
                </div>
              )}

              {/* Notice about admin approval */}
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 flex items-center gap-2 text-[11px]">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <span>New player registrations require Admin approval before accessing matches.</span>
              </div>

              {/* Avatar Selection */}
              <div className="flex items-center gap-3 p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl">
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-white block">Profile Picture</span>
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

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-signup-name"
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Leo Messi"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-signup-email"
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                id="auth-signup-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isSubmitting ? 'Submitting Registration...' : 'Register & Request Approval'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ================= FORGOT PASSWORD VIEW ================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              {forgotError && (
                <div
                  id="forgot-error-banner"
                  className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div
                  id="forgot-success-banner"
                  className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-start gap-2 animate-in fade-in"
                >
                  <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <p className="text-slate-400 text-[11px]">
                Enter your registered account email and specify a new password.
              </p>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">New Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-forgot-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="auth-forgot-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                id="auth-forgot-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>{isSubmitting ? 'Updating...' : 'Reset Password & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Security Guarantee */}
          <div className="pt-2 border-t border-[#1E293B] text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Admin Verification & Security Enforcement Active</span>
          </div>
        </div>
      </main>

      {/* Feature Highlights Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-center sm:justify-between gap-4 text-xs text-slate-400 border-t border-[#1E293B]/50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Live Rosters & Waitlists
          </span>
          <span className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            Voice Notes Chat
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            Live Voice Calling
          </span>
        </div>

        <div>
          <span>PitchMate Soccer Organizer &bull; Powered by Mustapha Bouhbous</span>
        </div>
      </footer>
    </div>
  );
};
