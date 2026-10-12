import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Mail,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { UserAccessRecord } from '../types';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  isOpen,
  onClose,
  adminEmail,
}) => {
  const [users, setUsers] = useState<UserAccessRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'X-User-Email': adminEmail },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        const pCount = (data.users || []).filter((u: UserAccessRecord) => u.status === 'pending').length;
        setPendingCount(pCount);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleApprove = async (targetEmail: string) => {
    setActionLoading(`approve_${targetEmail}`);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': adminEmail,
        },
        body: JSON.stringify({ targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');

      showToast(`Access granted to ${targetEmail}! User can now enter.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (targetEmail: string) => {
    setActionLoading(`revoke_${targetEmail}`);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': adminEmail,
        },
        body: JSON.stringify({ targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke');

      showToast(`Access revoked for ${targetEmail}.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (targetEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${targetEmail} and their private database?`)) {
      return;
    }
    setActionLoading(`delete_${targetEmail}`);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': adminEmail,
        },
        body: JSON.stringify({ targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      showToast(`User ${targetEmail} removed.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setActionLoading('add_new');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': adminEmail,
        },
        body: JSON.stringify({ email: clean, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');

      showToast(`${clean} pre-approved successfully!`);
      setNewEmail('');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">User Access & Approval Management</h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Grant or revoke access for users. Each user has their own completely private and isolated sheet database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast / Error notices */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Quick Pre-Approve User Form */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pre-Approve a User in Advance</span>
            </h4>
            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter user email (e.g. client@gmail.com)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="user">Role: Standard User</option>
                <option value="admin">Role: Admin</option>
              </select>

              <button
                type="submit"
                disabled={actionLoading === 'add_new'}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Pre-Approve
              </button>
            </form>
          </div>

          {/* Users Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Total Registered: <strong className="text-slate-200">{users.length}</strong></span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Data isolation active: Each user stores their own sheets</span>
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-4">User Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Private Sheets</th>
                    <th className="py-3 px-4">Requested / Approved</th>
                    <th className="py-3 px-4 text-right">Access Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No user access requests found yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isOwner = u.email.toLowerCase() === adminEmail.toLowerCase();
                      const isApproving = actionLoading === `approve_${u.email}`;
                      const isRevoking = actionLoading === `revoke_${u.email}`;
                      const isDeleting = actionLoading === `delete_${u.email}`;

                      return (
                        <tr
                          key={u.email}
                          className={`hover:bg-slate-900/50 transition-colors ${
                            u.status === 'pending' ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-200 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{u.email}</span>
                              {isOwner && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-sans font-semibold">
                                  Owner
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {u.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approved</span>
                              </span>
                            ) : u.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>Pending Approval</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                <span>Denied</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 capitalize">
                            {u.role}
                          </td>

                          <td className="py-3 px-4 text-slate-300 font-mono">
                            <div className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                              <span>{u.sheetCount ?? 0} sheets</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            <div>Req: {new Date(u.createdAt).toLocaleDateString()}</div>
                            {u.approvedAt && (
                              <div className="text-emerald-400/80 text-[10px]">
                                Appr: {new Date(u.approvedAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* One-Click Approve Button */}
                              {u.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(u.email)}
                                  disabled={isApproving}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-[11px] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                                  title="Approve access for this user"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isApproving ? 'Approving...' : 'Approve'}</span>
                                </button>
                              )}

                              {/* Revoke Button */}
                              {u.status === 'approved' && !isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(u.email)}
                                  disabled={isRevoking}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
                                  title="Revoke access"
                                >
                                  <span>{isRevoking ? 'Revoking...' : 'Revoke'}</span>
                                </button>
                              )}

                              {/* Delete User */}
                              {!isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u.email)}
                                  disabled={isDeleting}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All user databases are strictly separated and stored in isolated server directories.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
