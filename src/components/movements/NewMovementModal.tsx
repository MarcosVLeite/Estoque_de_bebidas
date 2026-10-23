import React, { useState, useEffect } from 'react';
import {
  Product,
  Batch,
  StockMovement,
  MovementType,
  LossReason,
  User,
} from '../../types';
import {
  getProducts,
  getProductBatches,
  getBatchesSortedByFEFO,
  recordStockMovement,
  findProductByBarcode,
} from '../../services/storage';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import {
  X,
  Camera,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  FileText,
  User as UserIcon,
} from 'lucide-react';

interface NewMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovementCreated: () => void;
  currentUser: User | null;
  initialProduct?: Product | null;
  initialType?: MovementType;
  initialBatch?: Batch | null;
}

export const NewMovementModal: React.FC<NewMovementModalProps> = ({
  isOpen,
  onClose,
  onMovementCreated,
  currentUser,
  initialProduct,
  initialType = 'entrada',
  initialBatch,
}) => {
  const [movementType, setMovementType] = useState<MovementType>(initialType);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('12');
  const [documentNumber, setDocumentNumber] = useState<string>('');

  // Fields for Entrada
  const [newBatchNumber, setNewBatchNumber] = useState<string>('');
  const [newBatchExpiry, setNewBatchExpiry] = useState<string>('');

  // Fields for Perda
  const [lossReason, setLossReason] = useState<LossReason>('quebra');
  const [lossDetails, setLossDetails] = useState<string>('');

  const [showScanner, setShowScanner] = useState(false);

  const products = getProducts();
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableBatches = selectedProductId ? getBatchesSortedByFEFO(selectedProductId) : [];

  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }

    if (initialType) {
      setMovementType(initialType);
    }

    if (initialBatch) {
      setSelectedBatchId(initialBatch.id);
    } else {
      setSelectedBatchId('');
    }

    // Set default batch number and expiry
    const now = new Date();
    const defaultBatch = `L-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}A`;
    setNewBatchNumber(defaultBatch);

    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    setNewBatchExpiry(sixMonths.toISOString().split('T')[0]);
  }, [initialProduct, initialType, initialBatch, isOpen]);

  const handleBarcodeScanned = (barcode: string) => {
    const product = findProductByBarcode(barcode);
    if (product) {
      setSelectedProductId(product.id);
      const batches = getBatchesSortedByFEFO(product.id);
      if (batches.length > 0) {
        setSelectedBatchId(batches[0].id);
      }
    } else {
      alert(`Nenhum produto encontrado com o código ${barcode}.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!selectedProductId) {
      alert('Selecione um produto.');
      return;
    }

    const qtyNumber = parseInt(quantity, 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      alert('Quantidade inválida.');
      return;
    }

    try {
      const selectedBatch = availableBatches.find((b) => b.id === selectedBatchId);

      recordStockMovement({
        type: movementType,
        productId: selectedProductId,
        batchId: selectedBatchId || undefined,
        batchNumber:
          movementType === 'entrada'
            ? newBatchNumber.trim()
            : selectedBatch?.batchNumber,
        expirationDate: movementType === 'entrada' ? newBatchExpiry : undefined,
        quantity: qtyNumber,
        lossReason: movementType === 'perda' ? lossReason : undefined,
        reasonDetails: movementType === 'perda' ? lossDetails.trim() : undefined,
        documentNumber: documentNumber.trim(),
        currentUser,
      });

      onMovementCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar movimentação.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
            <div>
              <h3 className="font-bold text-white text-base">Registrar Movimentação de Bebida</h3>
              <p className="text-xs text-slate-400">
                Auditoria automática: registrada pelo usuário{' '}
                <strong className="text-amber-400">{currentUser?.name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Movement Type Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMovementType('entrada')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  movementType === 'entrada'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>+ Entrada (Compra)</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('saida')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  movementType === 'saida'
                    ? 'bg-blue-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Saída (Venda)</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType('perda')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  movementType === 'perda'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>! Registrar Perda</span>
              </button>
            </div>

            {/* Product Selection with Camera Scanner Trigger */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Produto Selecionado</label>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ler código na câmera</span>
                </button>
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.volume}) - EAN: {p.barcode}
                  </option>
                ))}
              </select>

              {/* Visual preview card of chosen beverage */}
              {selectedProduct && (
                <div className="mt-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3">
                  <img
                    src={selectedProduct.photoUrl}
                    alt={selectedProduct.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Custo: R$ {selectedProduct.costPrice.toFixed(2)} • Venda: R${' '}
                      {selectedProduct.salePrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Specific Fields for ENTRADA */}
            {movementType === 'entrada' && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Dados do Lote e Validade Recebida</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Número do Lote (Fornecedor)
                    </label>
                    <input
                      type="text"
                      required
                      value={newBatchNumber}
                      onChange={(e) => setNewBatchNumber(e.target.value)}
                      placeholder="Ex: L-202611B"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Data de Validade (Obrigatório) *
                    </label>
                    <input
                      type="date"
                      required
                      value={newBatchExpiry}
                      onChange={(e) => setNewBatchExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Specific Fields for SAIDA (FEFO Recommendation) */}
            {movementType === 'saida' && (
              <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                  <span>Lote Recomendado (FEFO - Primeiro que Vence, Primeiro que Sai)</span>
                </div>

                {availableBatches.length > 0 ? (
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">Despacho Automático FEFO (Lote mais antigo primeiro)</option>
                    {availableBatches.map((b, idx) => (
                      <option key={b.id} value={b.id}>
                        {idx === 0 ? '⭐ [FEFO Prioritário] ' : ''}Lote {b.batchNumber} (Validade:{' '}
                        {new Date(b.expirationDate).toLocaleDateString('pt-BR')}) - {b.quantity} un
                        disponíveis
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-rose-400">
                    Nenhum lote com saldo disponível para este produto.
                  </div>
                )}
              </div>
            )}

            {/* Specific Fields for PERDA */}
            {movementType === 'perda' && (
              <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Motivo da Perda (Controle Anti-Perda)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'quebra', label: '💥 Quebra Física' },
                    { id: 'vencimento', label: '⏳ Vencimento Expirado' },
                    { id: 'avaria', label: '📦 Avaria / Vazamento' },
                    { id: 'furto', label: '🚨 Furto / Extravio' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLossReason(r.id as LossReason)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold text-left border transition-all ${
                        lossReason === r.id
                          ? 'bg-rose-500 text-white border-rose-400 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Justificativa / Ocorrência
                  </label>
                  <textarea
                    rows={2}
                    value={lossDetails}
                    onChange={(e) => setLossDetails(e.target.value)}
                    placeholder="Descreva o que ocorreu (ex: garrafa quebrou na descarga do caminhão)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {currentUser?.role === 'estoquista' && (
                  <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">
                    ℹ️ Como Estoquista, este registro ficará com status{' '}
                    <strong>"Pendente de Aprovação"</strong> até que um Gerente ou Administrador revise e
                    aprove a baixa do estoque.
                  </p>
                )}
              </div>
            )}

            {/* Quantity and Document Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade (Unidades) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nº Documento / NF-e / Pedido
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ex: NF-e 4912, Pedido 104"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg ${
                  movementType === 'entrada'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : movementType === 'saida'
                    ? 'bg-blue-500 hover:bg-blue-400 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                Confirmar {movementType.toUpperCase()}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Camera Scanner inside movement modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
        title="Identificar Bebida no Movimento"
        subtitle="Aponte para o código de barras para carregar o produto"
      />
    </>
  );
};
