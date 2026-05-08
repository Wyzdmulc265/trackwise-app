import React, { useState } from 'react';
import { useAuth, RegisterData } from '../context/AuthContext';

interface RegisterPageProps {
  onGoToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onGoToLogin }) => {
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterData>({
    ownerName: '',
    username: '',
    businessName: '',
    contact: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(form);
    if (!result.success) {
      setError(result.error ?? 'Registration failed.');
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-zoom-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-full shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Business Registered!</h2>
          <p className="text-slate-400 text-sm mb-2">
            <span className="font-bold text-emerald-400">{form.businessName}</span> has been successfully set up.
          </p>
          <p className="text-slate-400 text-sm mb-8">You can now sign in with your credentials.</p>
          <button
            onClick={onGoToLogin}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fade-in py-8">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/30 mb-4">
            <span className="text-slate-950 font-black text-lg tracking-tight">TW</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">TrackWise</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Create your standalone business workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Register your business</h2>
            <p className="text-slate-400 text-sm mt-0.5">Each business gets its own fully isolated workspace</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Owner Name + Business Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ownerName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Business Owner's Full Name
                </label>
                <input
                  id="ownerName"
                  name="ownerName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Tadala Banda"
                  value={form.ownerName}
                  onChange={set('ownerName')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="businessName" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Business / Shop Name
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="e.g. Chitsanzo General Dealers"
                  value={form.businessName}
                  onChange={set('businessName')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {/* Row 2: Username + Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Unique login handle"
                  value={form.username}
                  onChange={set('username')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label htmlFor="contact" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number or Email
                </label>
                <input
                  id="contact"
                  name="contact"
                  type="text"
                  required
                  autoComplete="email tel"
                  placeholder="e.g. +265 999 123 456"
                  value={form.contact}
                  onChange={set('contact')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Security</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Row 3: Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={set('password')}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 transition-all pr-14 ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? 'border-rose-500/50 focus:ring-rose-500/30'
                        : form.confirmPassword && form.password === form.confirmPassword
                        ? 'border-emerald-500/50 focus:ring-emerald-500/30 focus:border-emerald-500/50'
                        : 'border-white/10 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-rose-400 text-[11px] font-semibold mt-1">Passwords do not match</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="text-emerald-400 text-[11px] font-semibold mt-1">✓ Passwords match</p>
                )}
              </div>
            </div>

            {/* Role info note */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <span className="text-emerald-400 mt-0.5">ℹ</span>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                The first account registered for a business is automatically assigned the <span className="font-bold text-emerald-400">Admin</span> role with full workspace access.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed tracking-wide cursor-pointer"
            >
              {loading ? 'Creating workspace…' : 'Create Business Workspace'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <button
              onClick={onGoToLogin}
              className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 font-medium">
          TrackWise · Multi-Business Financial Suite · MWK Edition
        </p>
      </div>
    </div>
  );
};
