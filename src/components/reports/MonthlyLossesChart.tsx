import React, { useState, useMemo } from 'react';
import { StockMovement, LossReason, Product } from '../../types';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  Layers,
  Calendar,
  Filter,
  Flame,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface MonthlyLossesChartProps {
  movements: StockMovement[];
  products: Product[];
  onSelectLossReportTab?: () => void;
}

const REASON_LABELS: Record<LossReason, { label: string; color: string; bg: string }> = {
  vencimento: {
    label: 'Vencimento',
    color: 'text-rose-400',
    bg: 'bg-rose-500',
  },
  quebra: {
    label: 'Quebra',
    color: 'text-amber-400',
    bg: 'bg-amber-500',
  },
  avaria: {
    label: 'Avaria',
    color: 'text-orange-400',
    bg: 'bg-orange-500',
  },
  furto: {
    label: 'Furto / Desvio',
    color: 'text-purple-400',
    bg: 'bg-purple-500',
  },
  degustacao_interno: {
    label: 'Consumo Interno',
    color: 'text-blue-400',
    bg: 'bg-blue-500',
  },
};

const MONTH_NAMES_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTH_NAMES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MonthlyLossesChart: React.FC<MonthlyLossesChartProps> = ({
  movements,
  products,
  onSelectLossReportTab,
}) => {
  const [metricType, setMetricType] = useState<'value' | 'quantity'>('value');
  const [reasonFilter, setReasonFilter] = useState<'all' | LossReason>('all');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(5); // Default to current/latest month

  // 1. Calculate the 6-month timeframe (chronological order)
  const monthlyData = useMemo(() => {
    const lossMovements = movements.filter((m) => m.type === 'perda');

    // Reference date based on the latest movement or current date
    const latestTimestamp = lossMovements.length > 0
      ? Math.max(...lossMovements.map((m) => new Date(m.timestamp).getTime()))
      : Date.now();
    const refDate = new Date(Math.max(Date.now(), latestTimestamp));

    const months: Array<{
      index: number;
      year: number;
      month: number;
      shortLabel: string;
      fullLabel: string;
      movements: StockMovement[];
      totalValue: number;
      totalQuantity: number;
      byReason: Record<string, { value: number; quantity: number; count: number }>;
      topProduct?: { name: string; value: number; quantity: number };
      isCurrent: boolean;
    }> = [];

    // 6 months ending at refDate
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const shortYear = String(year).slice(-2);
      const shortLabel = `${MONTH_NAMES_SHORT[month]}/${shortYear}`;
      const fullLabel = `${MONTH_NAMES_FULL[month]} de ${year}`;
      const isCurrent = i === 0;

      // Filter loss movements for this year and month
      const monthMovements = lossMovements.filter((m) => {
        const mDate = new Date(m.timestamp);
        if (isNaN(mDate.getTime())) return false;
        return mDate.getFullYear() === year && mDate.getMonth() === month;
      });

      // Filter further if reasonFilter is set
      const filteredMonthMovements = reasonFilter === 'all'
        ? monthMovements
        : monthMovements.filter((m) => m.lossReason === reasonFilter);

      let totalValue = 0;
      let totalQuantity = 0;
      const byReason: Record<string, { value: number; quantity: number; count: number }> = {};
      const productTotals: Record<string, { name: string; value: number; quantity: number }> = {};

      filteredMonthMovements.forEach((m) => {
        const val = m.totalValue !== undefined && m.totalValue !== null
          ? m.totalValue
          : (m.quantity * (m.unitPrice || 0));
        const qty = m.quantity || 0;

        totalValue += val;
        totalQuantity += qty;

        const reason = (m.lossReason || 'outro') as string;
        if (!byReason[reason]) {
          byReason[reason] = { value: 0, quantity: 0, count: 0 };
        }
        byReason[reason].value += val;
        byReason[reason].quantity += qty;
        byReason[reason].count += 1;

        if (!productTotals[m.productId]) {
          productTotals[m.productId] = { name: m.productName, value: 0, quantity: 0 };
        }
        productTotals[m.productId].value += val;
        productTotals[m.productId].quantity += qty;
      });

      // Find top product lost
      let topProduct: { name: string; value: number; quantity: number } | undefined;
      const productList = Object.values(productTotals);
      if (productList.length > 0) {
        topProduct = productList.sort((a, b) => b.value - a.value)[0];
      }

      months.push({
        index: 5 - i,
        year,
        month,
        shortLabel,
        fullLabel,
        movements: filteredMonthMovements,
        totalValue,
        totalQuantity,
        byReason,
        topProduct,
        isCurrent,
      });
    }

    return months;
  }, [movements, reasonFilter]);

  // 2. Summary KPIs across the 6-month period
  const totalPeriodValue = useMemo(
    () => monthlyData.reduce((acc, m) => acc + m.totalValue, 0),
    [monthlyData]
  );
  const totalPeriodQuantity = useMemo(
    () => monthlyData.reduce((acc, m) => acc + m.totalQuantity, 0),
    [monthlyData]
  );
  const averageMonthlyValue = totalPeriodValue / 6;
  const averageMonthlyQuantity = totalPeriodQuantity / 6;

  // Peak month
  const peakMonth = useMemo(() => {
    let peak = monthlyData[0];
    monthlyData.forEach((m) => {
      const metric = metricType === 'value' ? m.totalValue : m.totalQuantity;
      const peakMetric = metricType === 'value' ? peak.totalValue : peak.totalQuantity;
      if (metric > peakMetric) {
        peak = m;
      }
    });
    return peak;
  }, [monthlyData, metricType]);

  // Current vs Previous month trend
  const currentMonthData = monthlyData[5];
  const previousMonthData = monthlyData[4];
  const trendComparison = useMemo(() => {
    if (!previousMonthData || !currentMonthData) return null;
    const currentMetric = metricType === 'value' ? currentMonthData.totalValue : currentMonthData.totalQuantity;
    const previousMetric = metricType === 'value' ? previousMonthData.totalValue : previousMonthData.totalQuantity;

    if (previousMetric === 0) {
      return { diff: currentMetric, percent: currentMetric > 0 ? 100 : 0, isIncrease: currentMetric > 0 };
    }
    const diff = currentMetric - previousMetric;
    const percent = Math.round((diff / previousMetric) * 100);
    return {
      diff,
      percent: Math.abs(percent),
      isIncrease: diff > 0,
    };
  }, [currentMonthData, previousMonthData, metricType]);

  // Overall primary cause across all 6 months
  const topReasonSummary = useMemo<{ reason: string; value: number; percentage: number } | null>(() => {
    const reasonsMap: Record<string, { value: number; qty: number }> = {};
    monthlyData.forEach((m) => {
      Object.entries(m.byReason).forEach(([reason, stats]) => {
        if (!reasonsMap[reason]) reasonsMap[reason] = { value: 0, qty: 0 };
        reasonsMap[reason].value += stats.value;
        reasonsMap[reason].qty += stats.quantity;
      });
    });

    let topR: { reason: string; value: number; percentage: number } | null = null;
    let maxVal = -1;
    Object.entries(reasonsMap).forEach(([reason, stats]) => {
      if (stats.value > maxVal) {
        maxVal = stats.value;
        topR = {
          reason,
          value: stats.value,
          percentage: totalPeriodValue > 0 ? Math.round((stats.value / totalPeriodValue) * 100) : 0,
        };
      }
    });
    return topR;
  }, [monthlyData, totalPeriodValue]);

  // Selected month detail
  const activeMonth = monthlyData[selectedMonthIndex] || currentMonthData;

  // Maximum value for scaling the bars (with a safe minimum to avoid division by 0)
  const maxMetricValue = useMemo(() => {
    const values = monthlyData.map((m) => (metricType === 'value' ? m.totalValue : m.totalQuantity));
    const max = Math.max(...values);
    return max > 0 ? max * 1.15 : 100; // 15% headroom for top badges
  }, [monthlyData, metricType]);

  const averageMetric = metricType === 'value' ? averageMonthlyValue : averageMonthlyQuantity;
  const averageHeightPercent = Math.min(100, Math.max(0, (averageMetric / maxMetricValue) * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* 1. Header with Title & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Evolução de Perdas & Desperdício</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30">
                  Últimos 6 Meses
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo mensal de quebras, vencimentos e avarias para prever e estancar prejuízos
              </p>
            </div>
          </div>
        </div>

        {/* Metric and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector (R$ or Quantity) */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMetricType('value')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                metricType === 'value'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Prejuízo (R$)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricType('quantity')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                metricType === 'quantity'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Volume (Un)</span>
            </button>
          </div>

          {/* Reason Filter */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as 'all' | LossReason)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Todos os motivos</option>
              <option value="vencimento">Apenas Vencimentos</option>
              <option value="quebra">Apenas Quebras</option>
              <option value="avaria">Apenas Avarias</option>
              <option value="furto">Apenas Furtos/Desvios</option>
              <option value="degustacao_interno">Apenas Consumo Interno</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Executive Metric Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total 6-Month Loss */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Perdas Totais (6m)</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-white">
              R$ {totalPeriodValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {totalPeriodQuantity} unidades descartadas
            </div>
          </div>
        </div>

        {/* Monthly Average */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Média Mensal</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-mono font-bold text-amber-400">
              R$ {averageMonthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              ~{Math.round(averageMonthlyQuantity)} un / mês
            </div>
          </div>
        </div>

        {/* Peak Loss Month */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pico do Semestre</span>
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm sm:text-base font-bold text-rose-400 flex items-center gap-1">
              <span>{peakMonth.shortLabel}</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono">
                R$ {peakMonth.totalValue.toFixed(0)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {peakMonth.totalQuantity} un ({peakMonth.movements.length} ocorrências)
            </div>
          </div>
        </div>

        {/* Month-over-Month Trend */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mês Atual vs Anterior</span>
            {trendComparison?.isIncrease ? (
              <TrendingUp className="w-4 h-4 text-rose-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-2">
            {trendComparison ? (
              <div>
                <div
                  className={`text-sm sm:text-base font-bold flex items-center gap-1 ${
                    trendComparison.isIncrease ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  <span>{trendComparison.isIncrease ? '+' : '-'}{trendComparison.percent}%</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({trendComparison.isIncrease ? 'aumento' : 'redução'})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {trendComparison.isIncrease ? 'Atenção aos descartes' : 'Desperdício sob controle'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Sem histórico prévio</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bar Chart Canvas Area */}
      <div className="relative pt-6 pb-2">
        {/* Y-axis guidelines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-600 select-none pb-12 pt-8">
          <div className="w-full border-b border-dashed border-slate-800/80 flex items-center justify-between">
            <span>
              {metricType === 'value'
                ? `R$ ${maxMetricValue.toFixed(0)}`
                : `${Math.round(maxMetricValue)} un`}
            </span>
          </div>
          <div className="w-full border-b border-dashed border-slate-800/60 flex items-center justify-between">
            <span>
              {metricType === 'value'
                ? `R$ ${(maxMetricValue * 0.66).toFixed(0)}`
                : `${Math.round(maxMetricValue * 0.66)} un`}
            </span>
          </div>
          <div className="w-full border-b border-dashed border-slate-800/40 flex items-center justify-between">
            <span>
              {metricType === 'value'
                ? `R$ ${(maxMetricValue * 0.33).toFixed(0)}`
                : `${Math.round(maxMetricValue * 0.33)} un`}
            </span>
          </div>
          <div className="w-full border-b border-slate-800 flex items-center justify-between">
            <span>0</span>
          </div>
        </div>

        {/* Visual Average Line across chart */}
        {averageHeightPercent > 0 && (
          <div
            className="absolute left-0 right-0 border-b border-dashed border-amber-500/40 pointer-events-none z-10 flex justify-end"
            style={{ bottom: `calc(48px + ${averageHeightPercent * 0.72}%)` }}
          >
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold mr-2">
              Média: {metricType === 'value' ? `R$ ${averageMetric.toFixed(0)}` : `${Math.round(averageMetric)} un`}
            </span>
          </div>
        )}

        {/* Bars Container */}
        <div className="relative z-20 grid grid-cols-6 gap-2 sm:gap-4 h-64 pt-8 pb-12 items-end">
          {monthlyData.map((m, idx) => {
            const currentMetric = metricType === 'value' ? m.totalValue : m.totalQuantity;
            const heightPercent = maxMetricValue > 0
              ? Math.max(currentMetric > 0 ? 5 : 0, (currentMetric / maxMetricValue) * 100)
              : 0;

            const isPeak = m.shortLabel === peakMonth.shortLabel && currentMetric > 0;
            const isSelected = selectedMonthIndex === idx;

            // Bar color styles
            let barGradient = 'from-rose-500/60 via-rose-500/80 to-amber-500/90';
            if (isPeak) {
              barGradient = 'from-red-600 via-rose-500 to-rose-400 shadow-lg shadow-rose-950/80';
            } else if (m.isCurrent) {
              barGradient = 'from-amber-600 via-amber-500 to-amber-300';
            }

            return (
              <div
                key={m.shortLabel}
                className="flex flex-col items-center h-full justify-end group cursor-pointer"
                onClick={() => setSelectedMonthIndex(idx)}
              >
                {/* Floating Top Badge with Value */}
                <div
                  className={`mb-2 text-center transition-all duration-200 ${
                    isSelected ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                >
                  <span
                    className={`inline-block text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                        : isPeak
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {metricType === 'value'
                      ? `R$ ${m.totalValue.toFixed(0)}`
                      : `${m.totalQuantity} un`}
                  </span>

                  {isPeak && (
                    <div className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mt-0.5 hidden sm:block">
                      Pico
                    </div>
                  )}
                  {m.isCurrent && !isPeak && (
                    <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mt-0.5 hidden sm:block">
                      Atual
                    </div>
                  )}
                </div>

                {/* The Bar */}
                <div className="w-full flex justify-center items-end flex-1 max-h-[170px]">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 bg-gradient-to-t ${barGradient} ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-xl'
                        : 'opacity-90 hover:opacity-100 hover:brightness-110'
                    }`}
                  />
                </div>

                {/* X-axis Label */}
                <div className="mt-3 text-center">
                  <div
                    className={`text-xs font-bold transition-colors ${
                      isSelected
                        ? 'text-amber-400'
                        : m.isCurrent
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {m.shortLabel}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {m.movements.length} reg.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Selected Month Detailed Breakdown Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Detalhamento de <span className="text-amber-400">{activeMonth.fullLabel}</span>
            </h4>
            {activeMonth.isCurrent && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                Mês em andamento
              </span>
            )}
            {activeMonth.shortLabel === peakMonth.shortLabel && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                Mês de Maior Perda
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-4">
            <div>
              Prejuízo do Mês:{' '}
              <span className="font-mono font-bold text-white">
                R$ {activeMonth.totalValue.toFixed(2)}
              </span>
            </div>
            <div>
              Itens descartados:{' '}
              <span className="font-mono font-bold text-rose-400">
                {activeMonth.totalQuantity} un
              </span>
            </div>
          </div>
        </div>

        {/* Reasons breakdown horizontal bars */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Distribuição por Motivo no Mês</span>
              <span className="text-[10px] text-slate-500">
                {Object.keys(activeMonth.byReason).length} causas registradas
              </span>
            </div>

            {Object.keys(activeMonth.byReason).length === 0 ? (
              <div className="text-xs text-slate-500 py-3 italic">
                Nenhuma perda registrada com os filtros aplicados neste mês.
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(activeMonth.byReason).map(([reasonKey, stats]) => {
                  const cfg = REASON_LABELS[reasonKey as LossReason] || {
                    label: reasonKey,
                    color: 'text-slate-300',
                    bg: 'bg-slate-500',
                  };
                  const pct = activeMonth.totalValue > 0
                    ? Math.round((stats.value / activeMonth.totalValue) * 100)
                    : 0;

                  return (
                    <div key={reasonKey} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-400">{stats.quantity} un</span>
                          <span className="text-white font-bold">R$ {stats.value.toFixed(2)}</span>
                          <span className="text-slate-500 w-8 text-right font-normal">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cfg.bg}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top affected items and insight */}
          <div className="border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-6 pt-4 md:pt-0 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Item de Maior Impacto em {activeMonth.shortLabel}
              </div>

              {activeMonth.topProduct ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">
                      {activeMonth.topProduct.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Descarte de {activeMonth.topProduct.quantity} unidades
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-rose-400">
                      R$ {activeMonth.topProduct.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Custo total
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  Sem produtos registrados neste mês.
                </div>
              )}
            </div>

            {/* Practical Recommendation / Insight */}
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Recomendação Anti-Perda: </span>
                {topReasonSummary?.reason === 'vencimento'
                  ? 'O vencimento foi a causa principal. Reforce a conferência diária na aba "Validades & FEFO" e aplique descontos promocionais 15 dias antes da expiração.'
                  : topReasonSummary?.reason === 'quebra'
                  ? 'A quebra mecânica teve alto impacto. Revise a altura de empilhamento de engradados e rotas de manobra dos carrinhos de carga.'
                  : 'Mantenha os registros auditados no sistema para antecipar desvios e manter o estoque com alta acurácia.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
