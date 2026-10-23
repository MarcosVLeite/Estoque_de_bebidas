import React, { useState, useEffect } from 'react';
import { User, Role, UserStatus, FirebaseUserProfile, AuditLog } from '../../types';
import {
  fetchAllUsers,
  approveUserRequest,
  rejectUserRequest,
  updateUserRole,
  toggleUserStatus,
  fetchAuditLogs,
  sendPasswordReset,
} from '../../services/authService';
import { RoleBadge } from '../common/RoleBadge';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck,
  PackageCheck,
  Eye,
  Mail,
  RotateCcw,
  History,
  AlertTriangle,
  Send,
  UserX,
} from 'lucide-react';

interface UsersViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onRefreshData }) => {
  const [users, setUsers] = useState<FirebaseUserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'desativado' | 'auditoria'>('pendente');

  // Modal for approval: Admin MUST choose a role!
  const [approvalModalUser, setApprovalModalUser] = useState<FirebaseUserProfile | null>(null);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState<Role>('estoquista');

  // Modal for rejection
  const [rejectionModalUser, setRejectionModalUser] = useState<FirebaseUserProfile | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Modal for role change
  const [changeRoleModalUser, setChangeRoleModalUser] = useState<FirebaseUserProfile | null>(null);
  const [newRoleForChange, setNewRoleForChange] = useState<Role>('estoquista');

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, logs] = await Promise.all([
        fetchAllUsers(),
        fetchAuditLogs(),
      ]);
      setUsers(userList);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load users from Firestore', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="py-20 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Acesso Restrito ao Administrador</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Apenas o perfil de Administrador tem permissão para aprovar cadastros e gerenciar perfis.
        </p>
      </div>
    );
  }

  // Filter users by tab
  const pendingUsers = users.filter((u) => u.status === 'pendente');
  const approvedUsers = users.filter((u) => u.status === 'aprovado');
  const rejectedUsers = users.filter((u) => u.status === 'rejeitado');
  const deactivatedUsers = users.filter((u) => u.status === 'desativado');

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalUser || !currentUser) return;

    try {
      await approveUserRequest(
        currentUser,
        approvalModalUser.uid,
        approvalModalUser.nome,
        selectedRoleForApproval
      );
      setFeedbackMessage({
        text: `Usuário "${approvalModalUser.nome}" aprovado como ${selectedRoleForApproval.toUpperCase()} com sucesso!`,
        type: 'success',
      });
      setApprovalModalUser(null);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Erro ao aprovar.', type: 'error' });
    }
  };

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalUser || !currentUser) return;

    try {
      await rejectUserRequest(
        currentUser,
        rejectionModalUser.uid,
        rejectionModalUser.nome,
        rejectionReasonInput
      );
      setFeedbackMessage({
        text: `Cadastro de "${rejectionModalUser.nome}" rejeitado.`,
        type: 'success',
      });
      setRejectionModalUser(null);
      setRejectionReasonInput('');
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Erro ao rejeitar.', type: 'error' });
    }
  };

  const handleConfirmRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRoleModalUser || !currentUser) return;

    try {
      await updateUserRole(
        currentUser,
        changeRoleModalUser.uid,
        changeRoleModalUser.nome,
        newRoleForChange
      );
      setFeedbackMessage({
        text: `Perfil de "${changeRoleModalUser.nome}" alterado para ${newRoleForChange.toUpperCase()}!`,
        type: 'success',
      });
      setChangeRoleModalUser(null);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Erro ao alterar perfil.', type: 'error' });
    }
  };

  const handleToggleActive = async (target: FirebaseUserProfile) => {
    if (!currentUser) return;
    try {
      await toggleUserStatus(currentUser, target.uid, target.nome, target.status);
      setFeedbackMessage({
        text: `Status do usuário "${target.nome}" atualizado!`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Erro ao alterar status.', type: 'error' });
    }
  };

  const handleSendResetEmail = async (targetEmail: string, targetName: string) => {
    try {
      await sendPasswordReset(targetEmail);
      setFeedbackMessage({
        text: `E-mail de redefinição de senha enviado para "${targetName}" (${targetEmail})!`,
        type: 'success',
      });
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Erro ao enviar e-mail.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <span>Painel de Aprovação & Gestão de Usuários</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle seguro no Cloud Firestore com RBAC e auditoria de concessão de acessos
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('pendente')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pendente'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pendentes</span>
          {pendingUsers.length > 0 && (
            <span className="bg-amber-500 text-slate-950 px-2 py-0.2 rounded-full text-[10px] font-black animate-pulse">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('aprovado')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'aprovado'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Aprovados ({approvedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejeitado')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rejeitado'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <XCircle className="w-4 h-4 text-rose-400" />
          <span>Rejeitados ({rejectedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('desativado')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'desativado'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <UserX className="w-4 h-4 text-slate-400" />
          <span>Desativados ({deactivatedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'auditoria'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-blue-400" />
          <span>Auditoria ({auditLogs.length})</span>
        </button>
      </div>

      {/* 1. TAB: PENDENTES */}
      {activeTab === 'pendente' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-sm">
                Fila de Espera: Novos Cadastros Aguardando Liberação
              </p>
              <p className="text-slate-400 mt-0.5">
                Nenhum usuário pendente possui permissão de leitura ou gravação no estoque até que
                seja aprovado e receba um perfil.
              </p>
            </div>
            <span className="font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs shrink-0">
              {pendingUsers.length} aguardando
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map((u) => (
              <div
                key={u.uid}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pendente de Aprovação
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(u.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <h3 className="font-black text-white text-base">{u.nome}</h3>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{u.email}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRejectionReasonInput('');
                      setRejectionModalUser(u);
                    }}
                    className="flex-1 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRoleForApproval('estoquista');
                      setApprovalModalUser(u);
                    }}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar com Perfil</span>
                  </button>
                </div>
              </div>
            ))}

            {pendingUsers.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/40 border border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">Nenhum pedido de cadastro pendente</p>
                <p className="text-slate-400 mt-1">Todos os usuários foram avaliados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TAB: APROVADOS */}
      {activeTab === 'aprovado' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Perfil Atribuído</th>
                  <th className="py-3 px-4">Aprovado Por</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {approvedUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{u.nome}</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Desde: {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>

                    <td className="py-3 px-4">
                      {u.perfil ? <RoleBadge role={u.perfil} /> : <span className="text-slate-500">—</span>}
                    </td>

                    <td className="py-3 px-4 text-slate-400">
                      {u.approvedByName || 'Sistema'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setNewRoleForChange(u.perfil || 'estoquista');
                            setChangeRoleModalUser(u);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                          title="Alterar perfil de acesso"
                        >
                          Alterar Perfil
                        </button>
                        <button
                          onClick={() => handleSendResetEmail(u.email, u.nome)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Enviar e-mail para redefinir senha"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                          title="Desativar conta do usuário"
                        >
                          Desativar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB: REJEITADOS */}
      {activeTab === 'rejeitado' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Data do Pedido</th>
                  <th className="py-3 px-4">Motivo da Rejeição</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rejectedUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{u.nome}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-rose-300 italic">
                      {u.rejectionReason || 'Sem motivo registrado'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedRoleForApproval('estoquista');
                          setApprovalModalUser(u);
                        }}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold border border-amber-500/40 transition-colors"
                      >
                        Reconsiderar e Aprovar
                      </button>
                    </td>
                  </tr>
                ))}

                {rejectedUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      Nenhum usuário rejeitado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB: DESATIVADOS */}
      {activeTab === 'desativado' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Perfil Anterior</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deactivatedUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{u.nome}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.perfil ? <RoleBadge role={u.perfil} /> : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded-lg text-xs font-bold border border-emerald-500/40 transition-colors"
                      >
                        Reativar Conta
                      </button>
                    </td>
                  </tr>
                ))}

                {deactivatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                      Nenhuma conta desativada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB: AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Usuário Alvo</th>
                  <th className="py-3 px-4">Quem Realizou</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-[10px] text-amber-300">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{log.targetUserName}</td>
                    <td className="py-3 px-4 text-slate-300">{log.performedByName}</td>
                    <td className="py-3 px-4 text-slate-400">{log.details}</td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: APROVAÇÃO OBRIGATÓRIA DE PERFIL */}
      {approvalModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Aprovar Cadastro de Usuário</h3>
              </div>
              <button
                onClick={() => setApprovalModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl space-y-1">
              <p className="text-xs text-slate-400">Usuário:</p>
              <p className="text-sm font-bold text-white">{approvalModalUser.nome}</p>
              <p className="text-xs text-slate-400 font-mono">{approvalModalUser.email}</p>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  Escolha OBRIGATORIAMENTE o perfil de acesso:
                </label>

                <div className="space-y-2">
                  {[
                    {
                      id: 'admin' as Role,
                      name: 'Administrador',
                      desc: 'Acesso total, gerencia usuários, relatórios e preços.',
                    },
                    {
                      id: 'gerente' as Role,
                      name: 'Gerente',
                      desc: 'Cadastra produtos, aprova perdas/inventário, relatórios.',
                    },
                    {
                      id: 'estoquista' as Role,
                      name: 'Estoquista',
                      desc: 'Entradas, saídas, perdas e contagens (sem alterar preços).',
                    },
                    {
                      id: 'consulta' as Role,
                      name: 'Consulta (Leitura)',
                      desc: 'Visualiza produtos e lotes sem poder editar.',
                    },
                  ].map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedRoleForApproval === p.id
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="approvalRoleRadio"
                        value={p.id}
                        checked={selectedRoleForApproval === p.id}
                        onChange={() => setSelectedRoleForApproval(p.id)}
                        className="mt-0.5 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovalModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Confirmar Aprovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJEIÇÃO COM MOTIVO */}
      {rejectionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Rejeitar Cadastro</h3>
              </div>
              <button
                onClick={() => setRejectionModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Você está rejeitando a solicitação de{' '}
              <strong className="text-white">{rejectionModalUser.nome}</strong> (
              {rejectionModalUser.email}).
            </p>

            <form onSubmit={handleConfirmRejection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo da Rejeição (Opcional - exibido ao usuário):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Ex: E-mail não corporativo ou não localizado na equipe de depósito..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectionModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ALTERAÇÃO DE PERFIL */}
      {changeRoleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Alterar Perfil de Acesso</h3>
              <button
                onClick={() => setChangeRoleModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Alterando perfil de <strong className="text-white">{changeRoleModalUser.nome}</strong>
            </p>

            <form onSubmit={handleConfirmRoleChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Novo Perfil:</label>
                <select
                  value={newRoleForChange}
                  onChange={(e) => setNewRoleForChange(e.target.value as Role)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="admin">Administrador (Acesso Total)</option>
                  <option value="gerente">Gerente (Cadastros & Aprovações)</option>
                  <option value="estoquista">Estoquista (Entradas, Saídas & Perdas)</option>
                  <option value="consulta">Consulta (Somente Leitura)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setChangeRoleModalUser(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Salvar Novo Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
