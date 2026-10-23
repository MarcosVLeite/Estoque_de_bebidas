import React, { useState } from 'react';
import { Product, User, InventorySession, InventoryItemCount } from '../../types';
import {
  getInventories,
  createInventorySession,
  updateInventoryCount,
  saveInventories,
  recordStockMovement,
  findProductByBarcode,
} from '../../services/storage';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import {
  ClipboardList,
  Camera,
  Plus,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Scan,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  currentUser: User | null;
  onRefreshData: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  currentUser,
  onRefreshData,
}) => {
  const inventories = getInventories();
  const [activeSession, setActiveSession] = useState<InventorySession | null>(
    inventories.find((i) => i.status === 'aberto') || null
  );

  const [isContinuousScannerOpen, setIsContinuousScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductToCount, setSelectedProductToCount] = useState<Product | null>(null);
  const [manualCountInput, setManualCountInput] = useState<string>('');
  const [manualCountNotes, setManualCountNotes] = useState<string>('');

  const canOperate = currentUser?.role !== 'consulta';
  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'gerente';

  const handleStartNewInventory = () => {
    if (!currentUser) return;
    const title = prompt(
      'Título da Sessão de Contagem:',
      `Contagem de Estoque ${new Date().toLocaleDateString('pt-BR')}`
    );
    if (!title) return;

    const newSession = createInventorySession(title, currentUser);
    setActiveSession(newSession);
    onRefreshData();
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (!activeSession || !currentUser) return;

    const product = findProductByBarcode(barcode);
    if (!product) {
      alert(`Código ${barcode} não encontrado em nenhum produto.`);
      return;
    }

    const currentCount = activeSession.counts[product.id]?.countedQty || 0;
    const nextCount = currentCount + 1;

    const updated = updateInventoryCount(activeSession.id, product.id, nextCount, currentUser);
    if (updated) {
      setActiveSession(updated);
      onRefreshData();
    }
  };

  const handleSaveManualCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !selectedProductToCount || !currentUser) return;

    const qty = parseInt(manualCountInput, 10);
    if (isNaN(qty) || qty < 0) {
      alert('Quantidade inválida.');
      return;
    }

    const updated = updateInventoryCount(
      activeSession.id,
      selectedProductToCount.id,
      qty,
      currentUser,
      manualCountNotes.trim()
    );

    if (updated) {
      setActiveSession(updated);
      setSelectedProductToCount(null);
      setManualCountInput('');
      setManualCountNotes('');
      onRefreshData();
    }
  };

  const handleFinalizeSession = () => {
    if (!activeSession || !currentUser) return;

    if (!confirm('Deseja finalizar este inventário e aplicar os ajustes de divergência no estoque?')) {
      return;
    }

    activeSession.status = 'concluido';
    activeSession.completedAt = new Date().toISOString();
    activeSession.completedBy = currentUser.id;
    activeSession.completedByName = currentUser.name;

    // Apply adjustments for products with discrepancies
    Object.entries(activeSession.counts).forEach(([prodId, countInfo]) => {
      if (countInfo.difference !== 0) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          recordStockMovement({
            type: countInfo.difference < 0 ? 'perda' : 'entrada',
            productId: prodId,
            quantity: Math.abs(countInfo.difference),
            lossReason: countInfo.difference < 0 ? 'quebra' : undefined,
            reasonDetails: `Ajuste de inventário físico: ${countInfo.notes || 'Divergência de contagem'}`,
            currentUser,
          });
        }
      }
    });

    const all = getInventories();
    const updatedAll = all.map((i) => (i.id === activeSession.id ? activeSession : i));
    saveInventories(updatedAll);

    setActiveSession(null);
    onRefreshData();
    alert('Inventário concluído com sucesso e divergências registradas!');
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.barcode.includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            <span>Inventário Físico & Contagem Rápida por Câmera</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aponte a câmera para os fardos/garrafas: cada bip incrementa +1 na contagem ou digite em lote
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <>
              {canOperate && (
                <button
                  onClick={() => setIsContinuousScannerOpen(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Scan className="w-4 h-4" />
                  <span>Bipar Contagem Contínua (+1)</span>
                </button>
              )}
              {canApprove && (
                <button
                  onClick={handleFinalizeSession}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Finalizar & Ajustar Estoque</span>
                </button>
              )}
            </>
          ) : (
            canOperate && (
              <button
                onClick={handleStartNewInventory}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Iniciar Nova Sessão de Inventário</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Active Session Info Banner */}
      {activeSession ? (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                Sessão em Andamento
              </span>
              <h3 className="font-bold text-white text-base">{activeSession.title}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Iniciado por <strong className="text-white">{activeSession.startedByName}</strong> em{' '}
              {new Date(activeSession.startedAt).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Divergência Total (un)</span>
              <span className="font-mono font-bold text-base text-amber-400">
                {activeSession.totalDiscrepancyQty} un
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block">Prejuízo Potencial (R$)</span>
              <span className="font-mono font-bold text-base text-rose-400">
                R$ {activeSession.totalDiscrepancyValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-3">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhum inventário aberto</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Inicie um inventário periódico para confrontar o saldo do sistema com a contagem física
            feita com o leitor de código de barras nas prateleiras.
          </p>
          {canOperate && (
            <button
              onClick={handleStartNewInventory}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Inventário Agora</span>
            </button>
          )}
        </div>
      )}

      {/* Counting Table */}
      {activeSession && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar bebida para contagem rápida..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bebida & Foto</th>
                    <th className="py-3 px-4">Código EAN</th>
                    <th className="py-3 px-4 text-center">Saldo Sistema</th>
                    <th className="py-3 px-4 text-center">Contagem Física</th>
                    <th className="py-3 px-4 text-center">Divergência</th>
                    <th className="py-3 px-4 text-right">Impacto Financeiro</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.map((p) => {
                    const count = activeSession.counts[p.id] || {
                      systemQty: 0,
                      countedQty: 0,
                      difference: 0,
                      lossValue: 0,
                    };

                    const hasDiff = count.difference !== 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          hasDiff ? (count.difference < 0 ? 'bg-rose-500/5' : 'bg-emerald-500/5') : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.photoUrl}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.volume}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400">{p.barcode}</td>

                        <td className="py-3 px-4 text-center font-bold text-slate-300">
                          {count.systemQty} un
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-sm text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                            {count.countedQty} un
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {count.difference === 0 ? (
                            <span className="text-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Bateu (0)
                            </span>
                          ) : count.difference < 0 ? (
                            <span className="text-rose-400 font-bold text-[11px] flex items-center justify-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" /> Faltam {Math.abs(count.difference)} un
                            </span>
                          ) : (
                            <span className="text-blue-400 font-bold text-[11px]">
                              Sobram +{count.difference} un
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {count.lossValue > 0 ? (
                            <span className="text-rose-400">- R$ {count.lossValue.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {canOperate && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  updateInventoryCount(
                                    activeSession.id,
                                    p.id,
                                    count.countedQty + 1,
                                    currentUser!
                                  );
                                  onRefreshData();
                                }}
                                className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-xs font-bold transition-all"
                                title="Somar +1 na contagem"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProductToCount(p);
                                  setManualCountInput(count.countedQty.toString());
                                  setManualCountNotes(count.notes || '');
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700"
                                title="Editar contagem manual"
                              >
                                Digitar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Count Modal */}
      {selectedProductToCount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Ajustar Contagem Física</h3>
            <div className="p-3 bg-slate-950 rounded-xl flex items-center gap-3">
              <img
                src={selectedProductToCount.photoUrl}
                alt={selectedProductToCount.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {selectedProductToCount.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Saldo no Sistema: {activeSession?.counts[selectedProductToCount.id]?.systemQty || 0} un
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveManualCount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade Real Contada
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={manualCountInput}
                  onChange={(e) => setManualCountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-base text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações / Justificativa (Opcional)
                </label>
                <input
                  type="text"
                  value={manualCountNotes}
                  onChange={(e) => setManualCountNotes(e.target.value)}
                  placeholder="Ex: 2 garrafas quebradas no fundo do pallet..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductToCount(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Salvar Contagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Continuous Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isContinuousScannerOpen}
        onClose={() => setIsContinuousScannerOpen(false)}
        onScan={handleBarcodeScanned}
        continuous={true}
        title="Modo Contagem Rápida (+1 por Bip)"
        subtitle="Aponte para o código de cada item; cada leitura soma +1 automaticamente na contagem"
      />
    </div>
  );
};
