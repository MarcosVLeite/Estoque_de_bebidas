import React, { useState } from 'react';
import { Product, Batch, StockMovement, User } from '../../types';
import {
  getBatchesSortedByFEFO,
  getDaysUntilExpiry,
  getExpiryStatus,
  approveStockMovement,
  rejectStockMovement,
} from '../../services/storage';
import {
  ShieldAlert,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Camera,
  Plus,
  ArrowRight,
  PackageX,
  FileCheck2,
} from 'lucide-react';

interface LossesViewProps {
  products: Product[];
  batches: Batch[];
  movements: StockMovement[];
  currentUser: User | null;
  onRefreshData: () => void;
  onOpenNewLossMovement: (product?: Product) => void;
}

export const LossesView: React.FC<LossesViewProps> = ({
  products,
  batches,
  movements,
  currentUser,
  onRefreshData,
  onOpenNewLossMovement,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'validade' | 'fisicas' | 'aprovacoes'>('validade');

  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'gerente';
  const canOperate = currentUser?.role !== 'consulta';

  // Critical batches expiring in <= 30 days
  const expiringBatches: Array<{
    batch: Batch;
    product: Product;
    days: number;
    valueAtRisk: number;
  }> = [];

  batches.forEach((b) => {
    if (b.quantity <= 0) return;
    const prod = products.find((p) => p.id === b.productId);
    if (!prod) return;

    const days = getDaysUntilExpiry(b.expirationDate);
    if (days <= 45) {
      expiringBatches.push({
        batch: b,
        product: prod,
        days,
        valueAtRisk: b.quantity * prod.costPrice,
      });
    }
  });

  expiringBatches.sort((a, b) => a.days - b.days);

  // Losses movements
  const allLosses = movements.filter((m) => m.type === 'perda');
  const pendingApprovals = allLosses.filter((m) => m.status === 'pendente_aprovacao');
  const approvedLosses = allLosses.filter((m) => m.status === 'aprovado');

  const totalLossValue = approvedLosses.reduce((acc, m) => acc + (m.totalValue || 0), 0);
  const totalValueAtRisk = expiringBatches.reduce((acc, b) => acc + b.valueAtRisk, 0);

  const handleApprove = (m: StockMovement) => {
    if (!currentUser) return;
    if (confirm(`Confirmar aprovação de baixa por perda de ${m.quantity} un de "${m.productName}"?`)) {
      approveStockMovement(m.id, currentUser);
      onRefreshData();
    }
  };

  const handleReject = (m: StockMovement) => {
    if (!currentUser) return;
    const reason = prompt('Informe a razão de reprovar esta baixa:');
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
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Central Anti-Perda: Validade & Quebras Físicas</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento proativo para evitar descartes por vencimento e controle de quebras no
            manuseio
          </p>
        </div>

        {canOperate && (
          <button
            onClick={() => onOpenNewLossMovement()}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Quebra / Perda</span>
          </button>
        )}
      </div>

      {/* KPI Cards for Loss Prevention */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Estoque Sob Risco (&lt;45d)</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              R$ {totalValueAtRisk.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {expiringBatches.length} lotes a vencer
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Perdas Totais Consolidadas</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400">
              R$ {totalLossValue.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {approvedLosses.length} baixas aprovadas
            </span>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Aprovações de Baixa Pendentes</span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {pendingApprovals.length} pendência{pendingApprovals.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-amber-300 block mt-0.5">
              {canApprove ? 'Aguardando sua revisão' : 'Aguardando Gerente/Admin'}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('validade')}
          className={`py-3 px-2 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'validade'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Prevenção de Validade (Ação FEFO & Promoções)</span>
          {expiringBatches.length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {expiringBatches.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('aprovacoes')}
          className={`py-3 px-2 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'aprovacoes'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Fila de Aprovação de Baixas</span>
          {pendingApprovals.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('fisicas')}
          className={`py-3 px-2 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'fisicas'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <PackageX className="w-4 h-4" />
          <span>Histórico de Quebras & Avarias ({approvedLosses.length})</span>
        </button>
      </div>

      {/* SubTab 1: Prevenção de Validade */}
      {activeSubTab === 'validade' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Plano de Ação para Evitar Descarte por Validade
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Regra FEFO (First Expired, First Out): bebidas mais próximas da data de validade devem ser
                colocadas na frente das prateleiras e faturadas com prioridade máxima.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringBatches.map(({ batch, product, days, valueAtRisk }) => {
              const expiry = getExpiryStatus(batch.expirationDate);
              const isUrgent = days <= 15;

              return (
                <div
                  key={batch.id}
                  className={`bg-slate-900 border rounded-2xl p-4 shadow-lg flex flex-col justify-between ${
                    isUrgent ? 'border-rose-500/60 bg-rose-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${expiry.badgeClass}`}
                        >
                          {expiry.label}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Lote: {batch.batchNumber}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Validade: {new Date(batch.expirationDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Estoque em Risco</span>
                      <span className="font-bold text-white">{batch.quantity} unidades</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Custo Financeiro</span>
                      <span className="font-bold text-rose-300">R$ {valueAtRisk.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Anti-Loss Recommendations */}
                  <div className="mt-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1">
                      <span>Ação Recomendada:</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isUrgent
                        ? '🔥 Fazer queima de estoque imediata com desconto promocional ou degustação.'
                        : '📦 Colocar na frente do pallet e priorizar em pedidos corporativos.'}
                    </p>
                  </div>

                  {canOperate && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onOpenNewLossMovement(product)}
                        className="flex-1 py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors"
                      >
                        Baixar Vencido
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {expiringBatches.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                Nenhum lote com vencimento próximo identificado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Fila de Aprovação */}
      {activeSubTab === 'aprovacoes' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Fila de Baixas por Perda Submetidas por Estoquistas
              </h3>
              <p className="text-xs text-slate-400">
                Apenas Gerentes e Administradores possuem autorização para aprovar o abatimento contábil
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingApprovals.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-slate-900 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30 shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{m.productName}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {m.lossReason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Quantidade: <strong className="text-white">{m.quantity} un</strong> • Valor de
                      Custo: <strong className="text-rose-300">R$ {(m.totalValue || 0).toFixed(2)}</strong>
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5 italic">
                      Motivo declarado: "{m.reasonDetails || 'Sem observações'}"
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Registrado por: <strong>{m.userName}</strong> ({m.userRole}) em{' '}
                      {new Date(m.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {canApprove ? (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleReject(m)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Rejeitar Baixa
                    </button>
                    <button
                      onClick={() => handleApprove(m)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      Aprovar Baixa
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                    Aguardando aprovação de Gerente
                  </span>
                )}
              </div>
            ))}

            {pendingApprovals.length === 0 && (
              <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-white">Nenhuma baixa pendente de aprovação</p>
                <p className="text-slate-400 mt-0.5">Todas as ocorrências de perda foram auditadas e processadas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 3: Histórico de Perdas Aprovadas */}
      {activeSubTab === 'fisicas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Quantidade</th>
                  <th className="py-3 px-4 text-right">Prejuízo (Custo)</th>
                  <th className="py-3 px-4">Registrado Por</th>
                  <th className="py-3 px-4">Aprovado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {approvedLosses.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(m.timestamp).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{m.productName}</div>
                      {m.reasonDetails && (
                        <div className="text-[10px] text-slate-400 italic">{m.reasonDetails}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-rose-300">
                      {m.lossReason}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-400">{m.quantity} un</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {(m.totalValue || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{m.userName}</td>
                    <td className="py-3 px-4 text-emerald-400">{m.approvedByName || 'Direta'}</td>
                  </tr>
                ))}

                {approvedLosses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      Nenhuma perda física registrada até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
