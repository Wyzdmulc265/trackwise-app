import React, { useState, useMemo } from 'react';
import { useTrackWise } from '../context/TrackWiseContext';
import { useAuth } from '../context/AuthContext';
import { PendingApproval, ApprovalStatus } from '../types';
import { CheckCircle2, XCircle, Clock, ShieldCheck, FileEdit, Trash2, PlusCircle, Package, Receipt } from 'lucide-react';

const statusStyles: Record<ApprovalStatus, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const actionIcons = {
  create: <PlusCircle className="w-3.5 h-3.5" />,
  update: <FileEdit className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
};

export const Approvals: React.FC = () => {
  const { approvals, approveRequest, rejectRequest } = useTrackWise();
  const { session } = useAuth();
  const isAdmin = session?.role === 'Admin';

  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [rejecting, setRejecting] = useState<PendingApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Admins see all; accountants see only theirs
  const visible = useMemo(() => {
    let list = approvals;
    if (!isAdmin) list = list.filter((a) => a.requestedBy === session?.username);
    if (filter !== 'all') list = list.filter((a) => a.status === filter);
    return list;
  }, [approvals, isAdmin, session, filter]);

  const counts = useMemo(() => {
    const list = isAdmin ? approvals : approvals.filter((a) => a.requestedBy === session?.username);
    return {
      all: list.length,
      pending: list.filter((a) => a.status === 'pending').length,
      approved: list.filter((a) => a.status === 'approved').length,
      rejected: list.filter((a) => a.status === 'rejected').length,
    };
  }, [approvals, isAdmin, session]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleReject = () => {
    if (!rejecting) return;
    rejectRequest(rejecting.id, rejectionReason || undefined);
    setRejecting(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isAdmin ? 'Pending Approvals & Audit Trail' : 'My Approval Requests'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Review and approve or reject changes submitted by accountants.'
                : 'Track the status of your submitted changes awaiting admin review.'}
            </p>
          </div>
        </div>

        {counts.pending > 0 && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Action Needed</p>
            <p className="text-lg font-black text-amber-900">{counts.pending} pending</p>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(['pending','approved','rejected','all'] as const).map((f) => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'All' : f} <span className="ml-1.5 opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No {filter !== 'all' ? filter : ''} approval requests</p>
            <p className="text-xs text-slate-400 mt-1">
              {isAdmin ? 'You\'re all caught up!' : 'Changes you submit will appear here.'}
            </p>
          </div>
        ) : (
          visible.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl ${a.kind === 'transaction' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {a.kind === 'transaction' ? <Receipt className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border bg-slate-50 text-slate-700 border-slate-200`}>
                          {actionIcons[a.action]} {a.action}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {a.kind}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${statusStyles[a.status]}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 mt-1.5 text-sm break-words">{a.summary}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                        <span>Requested by <span className="font-bold text-slate-700">@{a.requestedBy}</span></span>
                        <span>·</span>
                        <span>{fmtDate(a.requestedAt)}</span>
                        {a.reviewedBy && (
                          <>
                            <span>·</span>
                            <span>{a.status === 'approved' ? 'Approved' : 'Rejected'} by <span className="font-bold text-slate-700">@{a.reviewedBy}</span></span>
                          </>
                        )}
                      </div>
                      {a.rejectionReason && (
                        <div className="mt-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                          <span className="font-bold">Reason:</span> {a.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: actions for admin on pending */}
                  {isAdmin && a.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejecting(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />Reject
                      </button>
                      <button
                        onClick={() => approveRequest(a.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Detail payload */}
                {(a.payload || a.targetSnapshot) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    {a.targetSnapshot && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1.5">Current value</p>
                        <pre className="font-mono text-slate-700 whitespace-pre-wrap break-words text-[10px]">{JSON.stringify(a.targetSnapshot, null, 2)}</pre>
                      </div>
                    )}
                    {a.payload && (
                      <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                        <p className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider mb-1.5">
                          {a.action === 'delete' ? 'Action' : 'Proposed value'}
                        </p>
                        <pre className="font-mono text-slate-700 whitespace-pre-wrap break-words text-[10px]">
                          {a.action === 'delete' ? 'DELETE this record' : JSON.stringify(a.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject reason modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-zoom-in">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Reject Request</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600"><span className="font-bold">{rejecting.summary}</span></p>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Reason (optional)</label>
                <textarea
                  rows={3} value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why is this being rejected? The accountant will see this."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setRejecting(null); setRejectionReason(''); }} className="px-4 py-2 font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs">Cancel</button>
                <button onClick={handleReject} className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md text-xs cursor-pointer">Confirm Rejection</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
