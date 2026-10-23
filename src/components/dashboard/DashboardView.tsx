import React from 'react';
import { Product, Batch, StockMovement, User } from '../../types';
import {
  getProductStockTotal,
  getBatchesSortedByFEFO,
  getExpiryStatus,
  getDaysUntilExpiry,
} from '../../services/storage';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Package,
  DollarSign,
  ArrowRight,
  Flame,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  batches: Batch[];
  movements: StockMovement[];
  currentUser: User | null;
  onNavigateToProducts: () => void;
  onNavigateToLosses: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickMovement: (product: Product, type: 'entrada' | 'saida' | 'perda') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  batches,
  movements,
  currentUser,
  onNavigateToProducts,
  onNavigateToLosses,
  onSelectProduct,
  onQuickMovement,
}) => {
  // Calculations
  let totalStockUnits = 0;
  let totalStockCostValue = 0;
  let totalStockSaleValue = 0;
  let lowStockProductsCount = 0;

  products.forEach((p) => {
    const qty = getProductStockTotal(p.id);
    totalStockUnits += qty;
    totalStockCostValue += qty * p.costPrice;
    totalStockSaleValue += qty * p.salePrice;
    if (qty <= p.minStock) {
      lowStockProductsCount++;
    }
  });

  // Expiration calculations
  const criticalBatches: Array<{
    batch: Batch;
    product: Product;
    days: number;
    valueAtRisk: number;
  }> = [];

  const warningBatches: Array<{
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
    const valueAtRisk = b.quantity * prod.costPrice;

    if (days <= 15) {
      criticalBatches.push({ batch: b, product: prod, days, valueAtRisk });
    } else if (days <= 30) {
      warningBatches.push({ batch: b, product: prod, days, valueAtRisk });
    }
  });

  // Sort batches by nearest expiry
  criticalBatches.sort((a, b) => a.days - b.days);
  warningBatches.sort((a, b) => a.days - b.days);

  const totalValueAtCriticalRisk = criticalBatches.reduce((acc, c) => acc + c.valueAtRisk, 0);

  // Losses calculations
  const approvedLosses = movements.filter((m) => m.type === 'perda' && m.status === 'aprovado');
  const totalLossValue = approvedLosses.reduce((acc, m) => acc + (m.totalValue || 0), 0);
  const totalLossUnits = approvedLosses.reduce((acc, m) => acc + Math.abs(m.quantity || 0), 0);

  // Breakdown of losses
  const lossesByReason: Record<string, { qty: number; value: number }> = {
    quebra: { qty: 0, value: 0 },
    vencimento: { qty: 0, value: 0 },
    avaria: { qty: 0, value: 0 },
    furto: { qty: 0, value: 0 },
  };

  approvedLosses.forEach((m) => {
    const reason = m.lossReason || 'avaria';
    if (!lossesByReason[reason]) lossesByReason[reason] = { qty: 0, value: 0 };
    lossesByReason[reason].qty += Math.abs(m.quantity);
    lossesByReason[reason].value += m.totalValue || 0;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Critical Expiring Products exist */}
      {criticalBatches.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-950/90 via-rose-900/40 to-slate-900 border border-rose-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/40 shrink-0">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                <span>Alerta Anti-Perda: {criticalBatches.length} lote(s) vencendo em até 15 dias!</span>
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                R$ {totalValueAtCriticalRisk.toFixed(2)} em bebidas sob risco de perda por validade.
                Priorize a saída via FEFO ou defina promoção imediata.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToLosses}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-lg"
          >
            <span>Ver Ações Recomendadas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock Value */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Patrimônio em Estoque</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white">
              R$ {totalStockCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <span>{totalStockUnits.toLocaleString('pt-BR')} unidades ativas</span>
            </div>
          </div>
        </div>

        {/* Losses Avoided / Loss Total */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Perdas Físicas / Baixas</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              R$ {totalLossValue.toFixed(2)}
            </div>
            <div className="text-[11px] text-rose-300/80 mt-1 flex items-center gap-1">
              <span>{totalLossUnits} garrafas/latas perdidas</span>
            </div>
          </div>
        </div>

        {/* Expiry Risk Counter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Vencendo em 30 Dias</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {criticalBatches.length + warningBatches.length} lotes
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1">
              {criticalBatches.length} críticos (&lt;15d) • {warningBatches.length} atenção
            </div>
          </div>
        </div>

        {/* Low Stock Counter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Estoque Mínimo / Ruptura</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white">
              {lowStockProductsCount} produtos
            </div>
            <div className="text-[11px] text-blue-300/80 mt-1">
              Abaixo do estoque mínimo estipulado
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Critical FEFO Expiry Matrix & Loss Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent FEFO Expirations List (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Fila de Saída Obrigatória FEFO (Vencimentos Próximos)
              </h3>
            </div>
            <span className="text-xs text-slate-400">Primeiro que Vence, Primeiro que Sai</span>
          </div>

          <div className="divide-y divide-slate-800/80 mt-2 flex-1">
            {[...criticalBatches, ...warningBatches].slice(0, 6).map(({ batch, product, days, valueAtRisk }) => {
              const expiry = getExpiryStatus(batch.expirationDate);

              return (
                <div
                  key={batch.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm truncate">
                          {product.name}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          {product.volume}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-slate-300">Lote: {batch.batchNumber}</span>
                        <span>•</span>
                        <span>{batch.quantity} un em estoque</span>
                        <span>•</span>
                        <span className="text-rose-300 font-semibold">
                          R$ {valueAtRisk.toFixed(2)} em risco
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${expiry.badgeClass}`}
                    >
                      {days < 0 ? `Vencido (${days}d)` : `${days} dias`}
                    </span>
                    {currentUser?.role !== 'consulta' && (
                      <button
                        onClick={() => onQuickMovement(product, 'saida')}
                        className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold transition-all border border-amber-500/40"
                        title="Despachar este lote prioritariamente"
                      >
                        Despachar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {criticalBatches.length === 0 && warningBatches.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <p className="font-semibold text-white">Nenhum lote com risco de vencimento nos próximos 30 dias!</p>
                <p className="text-slate-500">O estoque de bebidas está com giro saudável.</p>
              </div>
            )}
          </div>
        </div>

        {/* Physical Loss Breakdown Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Causas das Perdas</h3>
              </div>
              <button
                onClick={onNavigateToLosses}
                className="text-xs text-amber-400 hover:underline"
              >
                Detalhes →
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {[
                {
                  id: 'quebra',
                  name: 'Quebra Física (Garrafas/Quedas)',
                  color: 'bg-rose-500',
                  data: lossesByReason.quebra,
                },
                {
                  id: 'vencimento',
                  name: 'Validade Vencida',
                  color: 'bg-amber-500',
                  data: lossesByReason.vencimento,
                },
                {
                  id: 'avaria',
                  name: 'Avaria / Lata Amassada / Vazamento',
                  color: 'bg-orange-500',
                  data: lossesByReason.avaria,
                },
                {
                  id: 'furto',
                  name: 'Extravio / Furto Identificado',
                  color: 'bg-purple-500',
                  data: lossesByReason.furto,
                },
              ].map((item) => {
                const percentage =
                  totalLossValue > 0 ? ((item.data.value / totalLossValue) * 100).toFixed(0) : 0;

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{item.name}</span>
                      <span className="text-slate-400 font-mono">
                        R$ {item.data.value.toFixed(2)} ({item.data.qty} un)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400">
            <span className="font-bold text-white block mb-0.5">Política de Prevenção:</span>
            Toda quebra ou perda registrada exige identificação de lote e motivo, com aprovação de
            Gerente/Admin antes da baixa definitiva do custo contábil.
          </div>
        </div>
      </div>

      {/* Critical Stock Replenishment Alert */}
      {lowStockProductsCount > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Produtos com Estoque Baixo ou Esgotado
              </h3>
            </div>
            <button
              onClick={onNavigateToProducts}
              className="text-xs text-amber-400 hover:underline"
            >
              Ver todos no catálogo →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {products
              .filter((p) => getProductStockTotal(p.id) <= p.minStock)
              .slice(0, 4)
              .map((product) => {
                const currentQty = getProductStockTotal(product.id);
                return (
                  <div
                    key={product.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-3 hover:border-slate-700 transition-colors"
                  >
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                      <p className="text-[10px] text-slate-400">{product.volume}</p>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-rose-400 font-bold">
                          {currentQty} un (mín: {product.minStock})
                        </span>
                        {currentUser?.role !== 'consulta' && (
                          <button
                            onClick={() => onQuickMovement(product, 'entrada')}
                            className="text-amber-400 hover:text-amber-300 font-bold text-[10px]"
                          >
                            + Entrada
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
