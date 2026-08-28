import React, { useState } from 'react';
import { UserProfile, isSuperAdminEmail, SUPER_ADMIN_EMAIL } from '../../types';
import { filterUsers, getUserStatusBadge } from '../../lib/adminUtils';
import { useLanguage } from '../../lib/useLanguage';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Star,
  CheckCheck,
} from 'lucide-react';

interface AdminUsersTableProps {
  users: UserProfile[];
  onApproveUser: (userId: string) => Promise<any> | any;
  onApproveAllUsers: () => Promise<any> | any;
  onRejectUser: (userId: string, reason?: string) => Promise<any> | any;
  onBanUser: (userId: string, reason?: string) => Promise<any> | any;
  onUnbanUser: (userId: string) => Promise<any> | any;
  onDeleteUser: (userId: string) => Promise<any> | any;
}

export function AdminUsersTable({
  users,
  onApproveUser,
  onApproveAllUsers,
  onRejectUser,
  onBanUser,
  onUnbanUser,
  onDeleteUser,
}: AdminUsersTableProps) {
  const { t, language, getPositionName } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'banned'>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved' || !u.status).length;
  const bannedCount = users.filter((u) => u.isBanned).length;

  const filteredUsers = filterUsers(users, searchTerm, filterTab);

  const handleBatchApprove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onApproveAllUsers();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#081813] p-1 rounded-2xl border border-[#E5B869]/25">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-bold shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'كافة اللاعبين' : 'All Players'} ({users.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'pending'
                ? 'bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'قيد المراجعة' : 'Pending'}
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#E5B869] text-slate-950 font-black text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'approved'
                ? 'bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'المعتمدون' : 'Approved'} ({approvedCount})
          </button>
          <button
            onClick={() => setFilterTab('banned')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === 'banned' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'المحظورون' : 'Banned'} ({bannedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث بالاسم، البريد، أو الهاتف...' : 'Search by name, email, phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
            />
          </div>

          {pendingCount > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{t('admin.approveAll', 'قبول الكل')} ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-emerald-100">
            <thead className="bg-[#081813] text-[#F5D794] font-semibold uppercase tracking-wider text-[11px] border-b border-[#E5B869]/20">
              <tr>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'اللاعب' : 'Player'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'الحالة والرتبة' : 'Status & Role'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'المركز والتقييم' : 'Position & Skill'}</th>
                <th className="py-3.5 px-4 text-start">{language === 'ar' ? 'نسبة الالتزام' : 'Reliability'}</th>
                <th className="py-3.5 px-4 text-end">{language === 'ar' ? 'الإجراءات الإدارية' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5B869]/15">
              {filteredUsers.map((user) => {
                const isSuper = isSuperAdminEmail(user.email);
                const isPending = user.status === 'pending';
                const isBanned = user.isBanned;

                return (
                  <tr key={user.id} className="hover:bg-[#0E4836]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#E5B869]/35 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate flex items-center gap-1.5">
                            {user.name}
                            {user.isGoogleAuth && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-blue-950/80 text-blue-300 text-[10px] font-bold border border-blue-400/40 shrink-0"
                                title={language === 'ar' ? 'حساب Google موثق' : 'Google Verified Account'}
                              >
                                <span>G✓</span>
                              </span>
                            )}
                            {isSuper && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#081813] text-[#F5D794] text-[10px] font-black border border-[#E5B869]/30">
                                {language === 'ar' ? 'المشرف العام' : 'SUPER ADMIN'}
                              </span>
                            )}
                          </div>
                          <div className="text-emerald-300/60 text-[11px] truncate font-mono">{user.email}</div>
                          {user.phone && <div className="text-emerald-300/60 text-[10px] truncate font-mono">{user.phone}</div>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold text-[11px] border border-red-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          {language === 'ar' ? 'محظور' : 'Banned'}
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#081813] text-[#F5D794] font-bold text-[11px] border border-[#E5B869]/40">
                          <AlertTriangle className="w-3 h-3 text-[#E5B869]" />
                          {language === 'ar' ? 'قيد المراجعة' : 'Pending Review'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#081813] text-[#F5D794] font-bold text-[11px] border border-[#E5B869]/40">
                          <CheckCircle2 className="w-3 h-3 text-[#E5B869]" />
                          {language === 'ar' ? 'معتمد' : 'Approved'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-[#081813] text-[#F5D794] font-bold text-[11px] border border-[#E5B869]/25">
                          {getPositionName(user.preferredPosition || 'MID')}
                        </span>
                        <div className="flex items-center gap-1 text-[#F5D794] font-medium">
                          <Star className="w-3.5 h-3.5 fill-[#E5B869] text-[#E5B869]" />
                          <span>{user.skillRating || 4.5}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#081813] rounded-full h-2 overflow-hidden border border-[#E5B869]/25">
                          <div
                            className={`h-full rounded-full ${
                              (user.reliabilityScore || 95) >= 90
                                ? 'bg-gradient-to-r from-[#F5D794] to-[#E5B869]'
                                : (user.reliabilityScore || 95) >= 75
                                ? 'bg-[#E5B869]'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${user.reliabilityScore || 95}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[#F5D794] text-xs">
                          {user.reliabilityScore ?? 98}%
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-300/70">
                        {user.matchesAttended || user.matchesPlayed || 0} {language === 'ar' ? 'مباراة ملعوبة' : 'matches attended'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <>
                            <button
                              onClick={() => onApproveUser(user.id)}
                              className="px-3 py-1 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                              title={language === 'ar' ? 'قبول اللاعب' : 'Approve User'}
                            >
                              {language === 'ar' ? 'قبول' : 'Approve'}
                            </button>
                            <button
                              onClick={() => onRejectUser(user.id)}
                              className="px-2.5 py-1 bg-[#081813] hover:bg-[#0E4836] text-emerald-200 rounded-lg text-xs transition-colors cursor-pointer border border-[#E5B869]/30"
                              title={language === 'ar' ? 'رفض الطلب' : 'Decline'}
                            >
                              {language === 'ar' ? 'رفض' : 'Decline'}
                            </button>
                          </>
                        )}

                        {!isSuper && !isBanned && (
                          <button
                            onClick={() => onBanUser(user.id)}
                            className="p-1.5 hover:bg-red-500/20 text-emerald-300/60 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حظر اللاعب' : 'Ban User'}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}

                        {isBanned && (
                          <button
                            onClick={() => onUnbanUser(user.id)}
                            className="px-2.5 py-1 bg-[#081813] hover:bg-[#0E4836] text-[#F5D794] rounded-lg text-xs font-bold transition-colors cursor-pointer border border-[#E5B869]/30"
                            title={language === 'ar' ? 'إلغاء الحظر' : 'Lift Ban'}
                          >
                            {language === 'ar' ? 'إلغاء الحظر' : 'Unban'}
                          </button>
                        )}

                        {!isSuper && (
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="p-1.5 hover:bg-red-500/20 text-emerald-300/60 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حذف الحساب' : 'Delete Account'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

