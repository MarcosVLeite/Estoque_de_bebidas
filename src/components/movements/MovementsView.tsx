import React, { useState } from 'react';
import { StockMovement, User, MovementType } from '../../types';
import { approveStockMovement, rejectStockMovement } from '../../services/storage';
import {
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

interface MovementsViewProps {
  movements: StockMovement[];
  currentUser: User | null;
  onRefreshData: () => void;
  onOpenNewMovement: () => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  currentUser,
  onRefreshData,
  onOpenNewMovement,
}) => {
  const [filterType, setFilterType] = useState<MovementType | 'todos'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente_aprovacao' | 'aprovado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'gerente';
  const canOperate = currentUser?.role !== 'consulta';

  const filteredMovements = movements.filter((m) => {
    if (filterType !== 'todos' && m.type !== filterType) return false;
    if (filterStatus !== 'todos' && m.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchProduct = m.productName.toLowerCase().includes(term);
      const matchUser = m.userName.toLowerCase().includes(term);
      const matchBatch = m.batchNumber?.toLowerCase().includes(term);
      const matchDoc = m.documentNumber?.toLowerCase().includes(term);
      if (!matchProduct && !matchUser && !matchBatch && !matchDoc) return false;
    }
    return true;
  });

  const handleApprove = (m: StockMovement) => {
    if (!currentUser) return;
    if (confirm(`Aprovar a baixa de ${m.quantity} un de "${m.productName}"?`)) {
      approveStockMovement(m.id, currentUser);
      onRefreshData();
    }
  };

  const handleReject = (m: StockMovement) => {
    if (!currentUser) return;
    const reason = prompt('Informe o motivo da rejeição:');
    if (reason && reason.trim()) {
      rejectStockMovement(m.id, currentUser, reason.trim());
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>Rastreabilidade & Histórico de Movimentações</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {filteredMovements.length} registros
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auditoria completa: registra <strong>QUEM</strong> fez, <strong>QUANDO</strong> e o{' '}
            <strong>QUÊ</strong>
          </p>
        </div>

        {canOperate && (
          <button
            onClick={onOpenNewMovement}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Movimentação</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, lote, usuário ou nota fiscal..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="entrada">Entradas (+)</option>
          <option value="saida">Saídas (-)</option>
          <option value="perda">Perdas / Avarias (!)</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
        >
          <option value="todos">Todos os Status</option>
          <option value="pendente_aprovacao">Pendentes de Aprovação</option>
          <option value="aprovado">Aprovados</option>
        </select>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Bebida & Lote</th>
                <th className="py-3 px-4 text-center">Quantidade</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4">Quem Fez (Auditoria)</th>
                <th className="py-3 px-4">Status / Aprovação</th>
                {canApprove && <th className="py-3 px-4 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMovements.map((m) => {
                const date = new Date(m.timestamp);
                const isPending = m.status === 'pendente_aprovacao';

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isPending ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      <div>{date.toLocaleDateString('pt-BR')}</div>
                      <div className="text-[10px] text-slate-500">
                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.type === 'entrada' && (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Entrada
                        </span>
                      )}
                      {m.type === 'saida' && (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Saída
                        </span>
                      )}
                      {m.type === 'perda' && (
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <ShieldAlert className="w-3.5 h-3.5" /> Perda ({m.lossReason})
                        </span>
                      )}
                    </td>

                    {/* Product & Batch */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white max-w-[200px] truncate">
                        {m.productName}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-300">
                          {m.batchNumber ? `Lote: ${m.batchNumber}` : 'Sem lote'}
                        </span>
                        {m.documentNumber && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{m.documentNumber}</span>
                          </>
                        )}
                      </div>
                      {m.reasonDetails && (
                        <div className="text-[10px] text-amber-300/80 italic mt-0.5">
                          Obs: {m.reasonDetails}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`font-black text-sm ${
                          m.type === 'entrada'
                            ? 'text-emerald-400'
                            : m.type === 'perda'
                            ? 'text-rose-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {m.type === 'entrada' ? '+' : '-'}
                        {Math.abs(m.quantity)} un
                      </span>
                    </td>

                    {/* Total Value */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-slate-300">
                      R$ {(m.totalValue || 0).toFixed(2)}
                    </td>

                    {/* WHO did it (Logged user) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-200">{m.userName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {m.userRole}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.status === 'aprovado' && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                          </span>
                          {m.approvedByName && (
                            <div className="text-[10px] text-slate-500">Por: {m.approvedByName}</div>
                          )}
                        </div>
                      )}
                      {m.status === 'pendente_aprovacao' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Pendente Aprovação
                        </span>
                      )}
                      {m.status === 'rejeitado' && (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Rejeitado
                          </span>
                          {m.rejectionReason && (
                            <div className="text-[10px] text-rose-300/80 italic">
                              {m.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Gerente/Admin Actions for Pending Items */}
                    {canApprove && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApprove(m)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow"
                              title="Aprovar baixa definitiva de estoque"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(m)}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold transition-colors"
                              title="Rejeitar movimentação"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Nenhuma movimentação encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
