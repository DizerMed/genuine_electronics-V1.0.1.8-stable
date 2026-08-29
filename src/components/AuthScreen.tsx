import React, { useState } from 'react';
import { Mail, Lock, User, ShieldCheck, LogIn, UserPlus, X, Phone, KeyRound, CheckCircle2, ArrowLeft, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react';
import { BRAND_LOGO_URL, UserProfile } from '../types';
import { supabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { safeLocalStorage } from '../utils/storage';

interface AuthScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  sessionExpiredMessage?: string | null;
}

type AuthMode = 'signin' | 'signup' | 'forgot_password';
type ResetMethod = 'direct' | 'email';

export function AuthScreen({ onSuccess, onCancel, theme, sessionExpiredMessage }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [resetMethod, setResetMethod] = useState<ResetMethod>('direct');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = String(email || "").toLowerCase().trim();
    const isAdminEmail = cleanEmail === 'admin@genuine-electronics.com';

    try {
      if (mode === 'forgot_password') {
        if (!cleanEmail) throw new Error('Please enter your account email.');

        if (resetMethod === 'email' || isAdminEmail) {
          // Model 1: Send official recovery email link via Supabase Auth
          try {
            const res = await fetch('/api/auth/send-reset-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail })
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data) {
              setSuccessMsg(data.message || `Password reset instructions have been dispatched to ${cleanEmail}.`);
            } else {
              throw new Error(data?.error || 'Failed to dispatch reset email.');
            }
          } catch (emailErr: any) {
            if (isSupabaseConfigured) {
              const { error: supaErr } = await supabaseClient.auth.resetPasswordForEmail(cleanEmail);
              if (supaErr) throw new Error(supaErr.message || 'Failed to send reset email.');
              setSuccessMsg(`A secure recovery link has been dispatched to ${cleanEmail}.`);
            } else {
              throw emailErr;
            }
          }
          return;
        }

        // Model 2: Instant Self-Service Reset with phone verification
        if (!password) throw new Error('Please enter your new password.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        let resetSuccess = false;
        let sessionUser: any = null;

        // 1. Try server endpoint
        let serverErrorMsg: string | null = null;
        try {
          const res = await fetch('/api/auth/reset-password-direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              phone: phone.trim(),
              fullName: fullName.trim(),
              newPassword: password
            })
          });

          const resData = await res.json().catch(() => null);
          if (res.ok && resData && resData.user) {
            sessionUser = resData.user;
            resetSuccess = true;
          } else {
            serverErrorMsg = resData?.error || 'Password reset failed.';
          }
        } catch {
          // Server endpoint unreachable, fallback
        }

        if (serverErrorMsg) {
          throw new Error(serverErrorMsg);
        }

        // 2. Fallback to client-side Supabase
        if (!resetSuccess && isSupabaseConfigured) {
          try {
            const { data: supaUser } = await supabaseClient.auth.updateUser({ password });
            if (supaUser?.user) {
              sessionUser = {
                id: supaUser.user.id,
                email: cleanEmail,
                role: isAdminEmail ? 'admin' : 'customer',
                displayName: fullName || cleanEmail.split('@')[0]
              };
              resetSuccess = true;
            }
          } catch {
            // ignore
          }
        }

        if (!resetSuccess) {
          throw new Error(serverErrorMsg || 'Password reset failed. Please ensure the email and details are correct.');
        }

        setSuccessMsg('Your password was successfully reset! You are being signed in...');
        if (sessionUser) {
          safeLocalStorage.setItem('ge_user_session', JSON.stringify(sessionUser));
        }

        window.dispatchEvent(new Event('auth-state-changed'));
        setTimeout(() => {
          onSuccess();
        }, 1000);
        return;
      }

      // Handle Sign In and Sign Up
      let authenticatedUser: any = null;
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body = mode === 'signup' 
        ? { email: cleanEmail, password, fullName: fullName.trim() } 
        : { email: cleanEmail, password };

      // Step 1: Attempt backend API endpoint
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const resData = await response.json().catch(() => null);

        if (response.ok && resData && resData.user) {
          authenticatedUser = resData.user;
        } else {
          throw new Error(resData?.error || 'Invalid email or password. Please check your credentials.');
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('Failed to fetch') && !apiErr.message.includes('Unexpected token')) {
          throw apiErr;
        }
      }

      // Step 2: Direct client-side Supabase if server was unreachable via network
      if (!authenticatedUser && isSupabaseConfigured) {
        if (mode === 'signup') {
          const { data: supaSignUp, error: supaErr } = await supabaseClient.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                role: isAdminEmail ? 'admin' : 'customer'
              }
            }
          });
          if (supaErr) {
            throw new Error(supaErr.message || 'Failed to create account.');
          }
          if (supaSignUp?.user) {
            authenticatedUser = {
              id: supaSignUp.user.id,
              email: cleanEmail,
              displayName: fullName.trim() || cleanEmail.split('@')[0],
              fullName: fullName.trim(),
              role: isAdminEmail ? 'admin' : 'customer'
            };
          }
        } else {
          const { data: supaSignIn, error: supaErr } = await supabaseClient.auth.signInWithPassword({
            email: cleanEmail,
            password
          });
          if (supaErr) {
            throw new Error(supaErr.message || 'Invalid email or password.');
          }
          if (supaSignIn?.user) {
            authenticatedUser = {
              id: supaSignIn.user.id,
              email: cleanEmail,
              displayName: supaSignIn.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              fullName: supaSignIn.user.user_metadata?.full_name,
              role: isAdminEmail ? 'admin' : (supaSignIn.user.user_metadata?.role || 'customer')
            };
          }
        }
      }

      if (authenticatedUser) {
        safeLocalStorage.setItem('ge_user_session', JSON.stringify(authenticatedUser));

        window.dispatchEvent(new Event('auth-state-changed'));
        onSuccess();
      } else {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-colors duration-300 ${
      isDark ? 'bg-slate-950/90' : 'bg-slate-900/40'
    }`}>
      <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border transition-all duration-300 max-h-[92vh] flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {/* Brand Header */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="h-14 mb-3 flex items-center justify-center">
              <img 
                src={BRAND_LOGO_URL} 
                alt="Genuine Electronics" 
                className="h-14 w-auto max-w-[180px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {mode === 'forgot_password' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Secure Account Recovery</span>
                </div>
                <h2 className={`text-2xl font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Reset Password
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Choose your preferred recovery method below.
                </p>

                {/* Reset Method Selector */}
                <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl mt-3 mb-1 border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => { setResetMethod('direct'); setError(null); setSuccessMsg(null); }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      resetMethod === 'direct'
                        ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                    }`}
                  >
                    Phone Verification
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetMethod('email'); setError(null); setSuccessMsg(null); }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      resetMethod === 'email'
                        ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                    }`}
                  >
                    Email Recovery Link
                  </button>
                </div>
              </>
            ) : mode === 'signup' ? (
              <>
                <h2 className={`text-2xl font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Join Genuine Electronics
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Create an account to track orders and save VIP delivery addresses.
                </p>
              </>
            ) : (
              <>
                <h2 className={`text-2xl font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Welcome Back
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sign in to access your customer account, past orders, and tracking.
                </p>
              </>
            )}
          </div>

          {sessionExpiredMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Session Re-Authentication Required</p>
                <p className="text-[11px] opacity-90 mt-0.5">{sessionExpiredMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name for Signup */}
            {mode === 'signup' && (
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className={`block w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`block w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Phone Number Verification for Reset Password (Direct Method only) */}
            {mode === 'forgot_password' && resetMethod === 'direct' && (
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Registered Phone Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0754 000 000 or +255..."
                    className={`block w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:ring-2 focus:ring-amber-500/20 outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used to securely verify account ownership without sending an email link.
                </p>
              </div>
            )}

            {/* Password */}
            {!(mode === 'forgot_password' && resetMethod === 'email') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {mode === 'forgot_password' ? 'New Password' : 'Password'}
                  </label>

                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMsg(null);
                        setMode('forgot_password');
                      }}
                      className="text-[11px] font-bold text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'forgot_password' ? 'Enter new password (min 6 chars)' : '••••••••'}
                    className={`block w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Confirm Password in Reset Mode (Direct only) */}
            {mode === 'forgot_password' && resetMethod === 'direct' && (
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Confirm New Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className={`block w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Success Display */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-[0.98] text-xs uppercase tracking-wider text-white ${
                mode === 'forgot_password'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'forgot_password' ? (
                resetMethod === 'email' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Password Reset Link via Email</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset & Sign In Immediately</span>
                  </>
                )
              ) : mode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Customer Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Account</span>
                </>
              )}
            </button>
            
            {/* Mode Switcher */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                <span className={`px-3 ${isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                  {mode === 'forgot_password' ? 'Remember your password?' : mode === 'signup' ? 'Already have an account?' : 'New customer?'}
                </span>
              </div>
            </div>

            {mode === 'forgot_password' ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode('signin');
                }}
                className={`w-full font-bold py-2.5 px-4 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isDark 
                    ? 'border-slate-800 text-white hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                }}
                className={`w-full font-bold py-2.5 px-4 rounded-xl border text-xs transition-all ${
                  isDark 
                    ? 'border-slate-800 text-white hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {mode === 'signup' ? 'Sign In to Existing Account' : 'Create New Account'}
              </button>
            )}
          </form>
        </div>
        
        <div className={`px-6 py-3 text-center border-t text-[10px] uppercase tracking-[0.2em] font-bold shrink-0 ${
          isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'
        }`}>
          Genuine Electronics Secure Auth
        </div>
      </div>
    </div>
  );
}
