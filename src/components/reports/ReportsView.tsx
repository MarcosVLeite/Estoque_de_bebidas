import React, { useState } from 'react';
import { Product, Batch, StockMovement, User } from '../../types';
import {
  getProductStockTotal,
  getDaysUntilExpiry,
  getExpiryStatus,
} from '../../services/storage';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  ShieldAlert,
  TrendingDown,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { MonthlyLossesChart } from './MonthlyLossesChart';

interface ReportsViewProps {
  products: Product[];
  batches: Batch[];
  movements: StockMovement[];
  currentUser: User | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  batches,
  movements,
  currentUser,
}) => {
  const [reportType, setReportType] = useState<'validades' | 'perdas' | 'posicao'>('validades');

  // Print/Export helper
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'validades') {
      csvContent += 'Produto;Categoria;Volume;Lote;Validade;Dias_Restantes;Quantidade;Custo_Unit;Total_Risco_R$\n';
      batches.forEach((b) => {
        const prod = products.find((p) => p.id === b.productId);
        if (!prod || b.quantity <= 0) return;
        const days = getDaysUntilExpiry(b.expirationDate);
        const value = b.quantity * prod.costPrice;
        csvContent += `"${prod.name}";"${prod.category}";"${prod.volume}";"${b.batchNumber}";"${b.expirationDate}";${days};${b.quantity};${prod.costPrice.toFixed(2)};${value.toFixed(2)}\n`;
      });
    } else if (reportType === 'perdas') {
      csvContent += 'Data;Tipo;Produto;Lote;Quantidade;Motivo;Valor_Perda_R$;Quem_Registrou;Status\n';
      movements
        .filter((m) => m.type === 'perda')
        .forEach((m) => {
          csvContent += `"${new Date(m.timestamp).toLocaleDateString('pt-BR')}";"${m.type}";"${m.productName}";"${m.batchNumber || ''}";${m.quantity};"${m.lossReason || ''}";${(m.totalValue || 0).toFixed(2)};"${m.userName}";"${m.status}"\n`;
        });
    } else {
      csvContent += 'Produto;Marca;Categoria;Volume;Código_Barras;Estoque_Atual;Estoque_Mínimo;Custo_R$;Venda_R$;Valor_Total_Estoque_R$\n';
      products.forEach((p) => {
        const qty = getProductStockTotal(p.id);
        const total = qty * p.costPrice;
        csvContent += `"${p.name}";"${p.brand}";"${p.category}";"${p.volume}";"${p.barcode}";${qty};${p.minStock};${p.costPrice.toFixed(2)};${p.salePrice.toFixed(2)};${total.toFixed(2)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>Relatórios Gerenciais & Análise Anti-Perda</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados para auditoria, controle de perdas por validade e planejamento de compras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* 6-Month Losses Trend Bar Chart Section */}
      <MonthlyLossesChart
        movements={movements}
        products={products}
        onSelectLossReportTab={() => setReportType('perdas')}
      />

      {/* Detailed Tables Section */}
      <div className="pt-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span>Detalhamento e Auditoria de Registros</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte listagens completas para conferência física e exporte em planilha CSV
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 max-w-lg">
        <button
          onClick={() => setReportType('validades')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            reportType === 'validades'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Validades & FEFO
        </button>
        <button
          onClick={() => setReportType('perdas')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            reportType === 'perdas'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Prejuízos & Baixas
        </button>
        <button
          onClick={() => setReportType('posicao')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            reportType === 'posicao'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Posição de Estoque
        </button>
      </div>

      {/* Report Content Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {reportType === 'validades' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4">Lote</th>
                  <th className="py-3 px-4">Data de Validade</th>
                  <th className="py-3 px-4">Status FEFO</th>
                  <th className="py-3 px-4 text-center">Saldo</th>
                  <th className="py-3 px-4 text-right">Custo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {batches
                  .filter((b) => b.quantity > 0)
                  .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
                  .map((b) => {
                    const prod = products.find((p) => p.id === b.productId);
                    if (!prod) return null;
                    const expiry = getExpiryStatus(b.expirationDate);
                    const totalCost = b.quantity * prod.costPrice;

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <img
                              src={prod.photoUrl}
                              alt={prod.name}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                            <div>
                              <div>{prod.name}</div>
                              <div className="text-[10px] text-slate-400">{prod.volume}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{b.batchNumber}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(b.expirationDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${expiry.badgeClass}`}>
                            {expiry.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">{b.quantity} un</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                          R$ {totalCost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {reportType === 'perdas' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Ocorrência</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Prejuízo (R$)</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements
                  .filter((m) => m.type === 'perda')
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{m.productName}</td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-rose-300">
                        {m.lossReason}
                      </td>
                      <td className="py-3 px-4 text-slate-400 italic">{m.reasonDetails || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold text-rose-400">{m.quantity} un</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        R$ {(m.totalValue || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.userName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.status === 'aprovado'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {reportType === 'posicao' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Bebida</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Código EAN</th>
                  <th className="py-3 px-4 text-center">Saldo Atual</th>
                  <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                  <th className="py-3 px-4 text-right">Custo Médio</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-right">Patrimônio (Custo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const qty = getProductStockTotal(p.id);
                  const total = qty * p.costPrice;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-white">{p.name}</td>
                      <td className="py-3 px-4 uppercase text-[10px] text-slate-400">{p.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.barcode}</td>
                      <td className="py-3 px-4 text-center font-bold text-white">{qty} un</td>
                      <td className="py-3 px-4 text-center text-slate-400">{p.minStock} un</td>
                      <td className="py-3 px-4 text-right text-slate-300">R$ {p.costPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-amber-400 font-semibold">
                        R$ {p.salePrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        R$ {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
