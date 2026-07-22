import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, User, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onLoginSuccess: (user: { firstName: string; lastName: string; email: string; role: 'ADMIN' | 'MANAGER' | 'MEMBER' }) => void;
}

export default function AuthenticationScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'AUTH' | 'MFA' | 'VERIFY'>('AUTH');
  
  // Form fields
  const [email, setEmail] = useState('keptonokoth@gmail.com');
  const [password, setPassword] = useState('password123');
  const [firstName, setFirstName] = useState('Kepton');
  const [lastName, setLastName] = useState('Okoth');
  const [phoneNumber, setPhoneNumber] = useState('+254712345678');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('ADMIN');
  
  // MFA Input
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      setStep('VERIFY'); // Prompt for email/phone verification
    } else {
      setStep('MFA'); // Simulated MFA requirement
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode === '123456' || mfaCode.length === 6) {
      onLoginSuccess({ firstName, lastName, email, role });
    } else {
      setMfaError('Invalid verification code. Try "123456" for immediate access.');
    }
  };

  const skipVerify = () => {
    onLoginSuccess({ firstName, lastName, email, role });
  };

  return (
    <div id="auth-container" className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-slate-900">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-8 overflow-hidden"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/25">
            <Shield className="w-6 h-6 text-slate-900 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-slate-100 tracking-tight">
            SaaS Business Comm
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Enterprise Identity Hub
          </p>
        </div>

        {step === 'AUTH' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                      placeholder="Kepton"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                      placeholder="Okoth"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone (E.164 for OTP)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    placeholder="+254712345678"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Tenant Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                >
                  <option value="ADMIN">Tenant Admin (Full Billing & Access)</option>
                  <option value="MANAGER">Tenant Manager (Campaign Operations)</option>
                  <option value="MEMBER">Tenant Member (Read & Template Composer)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-semibold rounded-lg text-sm transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-1 cursor-pointer"
            >
              {isSignUp ? 'Create Workspace Tenant' : 'Secure Login'}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                {isSignUp ? 'Already have a secure workspace? Sign In' : 'Need a cloud SaaS container? Register Tenant'}
              </button>
            </div>
          </form>
        )}

        {step === 'VERIFY' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                SaaS Tenant Container Ready
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                We sent a validation trigger to <span className="font-mono text-cyan-400">{email}</span> and an SMS OTP code to <span className="font-mono text-cyan-400">{phoneNumber}</span> to authenticate your registration in Safaricom's sandbox networks.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Verifying Carrier Loop Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit confirmation code"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm text-center tracking-widest font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setStep('AUTH')}
                className="py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Back to credentials
              </button>
              <button
                onClick={skipVerify}
                className="py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 rounded-lg text-xs font-semibold transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
              >
                Launch Platform
              </button>
            </div>
          </div>
        )}

        {step === 'MFA' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-400" />
                Two-Factor Authentication Required
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                For security validation compliant with the Kenya Data Protection Act 2019, enter the OTP code generated by your authenticator or sent to your phone.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Verification Code</label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value);
                  setMfaError('');
                }}
                maxLength={6}
                placeholder="e.g., 123456"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/60 rounded-lg text-slate-200 text-sm text-center tracking-widest font-mono"
              />
              {mfaError && <p className="text-xs text-red-400 mt-1">{mfaError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-semibold rounded-lg text-sm shadow-md shadow-cyan-500/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              Verify & Boot Container
            </button>

            <p className="text-[10px] text-center text-slate-500 uppercase font-mono">
              Demomode: enter "123456" or any 6-digit number to proceed
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
