import React, { useState, useEffect } from 'react';
import { useAuth, type CreateUserData } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { Users, Plus, X, Edit3, Trash2, KeyRound, Copy, CheckCheck } from 'lucide-react';

const roleColors: Record<UserRole, string> = {
  Admin:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  Accountant: 'bg-blue-50 text-blue-700 border-blue-200',
  Viewer:     'bg-slate-100 text-slate-600 border-slate-200',
};

const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
};

export const UserManagement: React.FC = () => {
  const { session, listBusinessUsers, createUser, updateUser, deleteUser, resetUserPassword } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      const loaded = await listBusinessUsers();
      setUsers(loaded);
      setLoading(false);
    };
    loadUsers();
  }, [listBusinessUsers]);

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [resetTempPwd, setResetTempPwd] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Create form state
  const [form, setForm] = useState<CreateUserData>({
    ownerName: '', username: '', contact: '', role: 'Accountant', tempPassword: generateTempPassword(),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await createUser(form);
    if (!result.success) { setError(result.error ?? 'Failed.'); return; }
    setCreatedCredentials({ username: form.username, password: form.tempPassword });
    setShowCreate(false);
    // Reload users
    const updated = await listBusinessUsers();
    setUsers(updated);
    setForm({ ownerName: '', username: '', contact: '', role: 'Accountant', tempPassword: generateTempPassword() });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    const result = await updateUser(editing.id, { ownerName: editing.ownerName, contact: editing.contact, role: editing.role });
    if (!result.success) { setError(result.error ?? 'Failed.'); return; }
    setEditing(null);
    const updated = await listBusinessUsers();
    setUsers(updated);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setError('');
    const result = await deleteUser(id);
    if (!result.success) { setError(result.error ?? 'Failed.'); return; }
    const updated = await listBusinessUsers();
    setUsers(updated);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError('');
    const result = await resetUserPassword(resetting.id, resetTempPwd);
    if (!result.success) { setError(result.error ?? 'Failed.'); return; }
    setCreatedCredentials({ username: resetting.username, password: resetTempPwd });
    setResetting(null);
    setResetTempPwd('');
  };

  const copyCreds = () => {
    if (!createdCredentials) return;
    const text = `Username: ${createdCredentials.username}\nTemp Password: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return <div className="text-center py-10 text-slate-500">Loading users…</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">User & Access Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add team members, assign roles, and manage workspace access.</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm((f) => ({ ...f, tempPassword: generateTempPassword() })); }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {error && (
        <div className="p-3 px-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-bold text-slate-800">{user.ownerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md border ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600">{user.contact}</td>
                  <td className="py-4 px-4 text-slate-500 text-[11px]">{fmtDate(user.createdAt)}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditing({ ...user }); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                        title="Edit user"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setResetting(user); setResetTempPwd(''); }}
                        className="p-1.5 text-slate-400 hover:bg-blue-50 rounded-lg"
                        title="Reset password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-slate-400 hover:bg-rose-50 rounded-lg"
                        title="Delete user"
                        disabled={user.id === session?.userId}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No users found. Create the first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Add New User</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-ownerName" className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                  <input
                    id="create-ownerName"
                    name="ownerName"
                    required
                    autoComplete="name"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="create-username" className="block text-[11px] font-semibold text-slate-500 mb-1">Username</label>
                  <input
                    id="create-username"
                    name="username"
                    required
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="create-contact" className="block text-[11px] font-semibold text-slate-500 mb-1">Contact</label>
                <input
                  id="create-contact"
                  name="contact"
                  required
                  autoComplete="email"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="create-role" className="block text-[11px] font-semibold text-slate-500 mb-1">Role</label>
                <select
                  id="create-role"
                  name="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="create-tempPassword" className="block text-[11px] font-semibold text-slate-500 mb-1">Temporary Password</label>
                <input
                  id="create-tempPassword"
                  name="tempPassword"
                  required
                  autoComplete="new-password"
                  value={form.tempPassword}
                  onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-emerald-600 rounded-xl">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Edit User</h3>
              <button onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="edit-ownerName" className="block text-[11px] font-semibold text-slate-500 mb-1">Full Name</label>
                <input
                  id="edit-ownerName"
                  name="ownerName"
                  required
                  autoComplete="name"
                  value={editing.ownerName}
                  onChange={(e) => setEditing({ ...editing, ownerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="edit-contact" className="block text-[11px] font-semibold text-slate-500 mb-1">Contact</label>
                <input
                  id="edit-contact"
                  name="contact"
                  required
                  autoComplete="email"
                  value={editing.contact}
                  onChange={(e) => setEditing({ ...editing, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="edit-role" className="block text-[11px] font-semibold text-slate-500 mb-1">Role</label>
                <select
                  id="edit-role"
                  name="role"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-emerald-600 rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Reset Password</h3>
              <button onClick={() => setResetting(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReset} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 text-sm">Set a new temporary password for <strong>{resetting.username}</strong>. The user will be required to change it on next login.</p>
              <div>
                <label htmlFor="reset-tempPassword" className="block text-[11px] font-semibold text-slate-500 mb-1">New Temporary Password</label>
                <input
                  id="reset-tempPassword"
                  name="tempPassword"
                  required
                  autoComplete="new-password"
                  value={resetTempPwd}
                  onChange={(e) => setResetTempPwd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  placeholder="Enter new password"
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setResetting(null)} className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 font-bold text-white bg-emerald-600 rounded-xl">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md p-6 text-center animate-zoom-in">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Credentials Generated</h3>
            <p className="text-slate-500 text-xs mb-4">Share these details securely with the user.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-4">
              <div className="mb-2"><span className="text-[10px] font-bold text-slate-500 uppercase">Username</span>
                <p className="font-mono text-sm font-bold text-slate-800">{createdCredentials.username}</p>
              </div>
              <div><span className="text-[10px] font-bold text-slate-500 uppercase">Password</span>
                <p className="font-mono text-sm font-bold text-slate-800">{createdCredentials.password}</p>
              </div>
            </div>
            <button onClick={copyCreds} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800">
              {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
            </button>
            <button onClick={() => setCreatedCredentials(null)} className="mt-2 text-xs text-slate-500 hover:underline">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
