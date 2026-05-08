import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export const Profile: React.FC = () => {
  const { session, changePassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const result = await changePassword(currentPassword, newPassword);
    
    if (!result.success) {
      setError(result.error ?? 'Failed to change password.');
      setLoading(false);
      return;
    }

    setSuccess('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Profile Settings</h2>
            <p className="text-xs text-slate-500">Manage your account settings</p>
          </div>
        </div>

        <div className="mb-8 pb-6 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Account Information</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Username</dt>
              <dd className="font-medium text-slate-800">@{session?.username}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Full Name</dt>
              <dd className="font-medium text-slate-800">{session?.ownerName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Business</dt>
              <dd className="font-medium text-slate-800">{session?.businessName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-800">{session?.role}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Change Password</h3>
          
          {error && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <span>✓</span><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="profile-currentPassword" className="block text-xs font-semibold text-slate-500 mb-1">Current Password</label>
              <div className="relative">
                <input
                  id="profile-currentPassword"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="profile-newPassword" className="block text-xs font-semibold text-slate-500 mb-1">New Password</label>
              <input
                id="profile-newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label htmlFor="profile-confirmNewPassword" className="block text-xs font-semibold text-slate-500 mb-1">Confirm New Password</label>
              <input
                id="profile-confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  confirmPassword && newPassword !== confirmPassword
                    ? 'border-rose-500/50 focus:ring-rose-500/30'
                    : confirmPassword && newPassword === confirmPassword
                      ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                      : 'border-slate-200 focus:ring-emerald-500/50'
                }`}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-rose-500 text-[11px] font-semibold mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};