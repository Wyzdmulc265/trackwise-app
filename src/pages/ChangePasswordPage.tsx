import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ChangePasswordPage: React.FC = () => {
  const { session, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    if (!result.success) {
      setError(result.error ?? 'Password change failed.');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-2xl shadow-amber-500/30 mb-4">
            <svg className="w-7 h-7 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Set a New Password</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium max-w-sm mx-auto">
            For security, you must change your temporary password before continuing to <span className="text-emerald-400 font-bold">{session?.businessName}</span>.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-center gap-2">
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Current (Temporary) Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter the password you signed in with"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-rose-500/50 focus:ring-rose-500/30'
                    : confirmPassword && newPassword === confirmPassword
                    ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                    : 'border-white/10 focus:ring-emerald-500/50'
                }`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-rose-400 text-[11px] font-semibold mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Updating…' : 'Update Password & Continue'}
            </button>

            <button
              type="button" onClick={logout}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
