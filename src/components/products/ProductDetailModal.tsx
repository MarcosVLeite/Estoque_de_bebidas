import React, { useState } from 'react';
import { Product, Batch, User } from '../../types';
import {
  getProductBatches,
  getBatchesSortedByFEFO,
  getProductStockTotal,
  getExpiryStatus,
  saveBatch,
} from '../../services/storage';
import {
  X,
  Clock,
  Barcode,
  Package,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currentUser: User | null;
  onEditProduct?: (product: Product) => void;
  onMovement: (product: Product, type: 'entrada' | 'saida' | 'perda', batch?: Batch) => void;
  onRefreshData: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  currentUser,
  onEditProduct,
  onMovement,
  onRefreshData,
}) => {
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchQty, setNewBatchQty] = useState('100');

  if (!isOpen || !product) return null;

  const totalStock = getProductStockTotal(product.id);
  const fefoBatches = getBatchesSortedByFEFO(product.id);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'gerente';
  const canOperate = currentUser?.role !== 'consulta';

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchNumber.trim() || !newBatchExpiry) {
      alert('Informe o número do lote e a data de validade.');
      return;
    }

    saveBatch({
      productId: product.id,
      batchNumber: newBatchNumber.trim(),
      expirationDate: newBatchExpiry,
      quantity: parseInt(newBatchQty, 10) || 0,
      unitCost: product.costPrice,
    });

    setNewBatchNumber('');
    setNewBatchExpiry('');
    setShowAddBatch(false);
    onRefreshData();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {product.category}
            </span>
            <span className="text-xs text-slate-400">{product.volume}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Product Summary */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-full sm:w-44 aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 shadow-lg relative">
              <img
                src={product.photoUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-slate-400">{product.brand}</span>
                  <h2 className="text-lg sm:text-xl font-black text-white">{product.name}</h2>
                </div>
                {canEdit && onEditProduct && (
                  <button
                    onClick={() => {
                      onEditProduct(product);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Editar Cadastro
                  </button>
                )}
              </div>

              {/* Barcode and Location */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Código de Barras</span>
                    <span className="font-mono text-white">{product.barcode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Localização</span>
                    <span className="text-slate-200">{product.location || 'Depósito Principal'}</span>
                  </div>
                </div>
              </div>

              {/* Stock and Financial Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Estoque Total</span>
                  <span
                    className={`font-black text-base ${
                      totalStock <= product.minStock ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {totalStock} un
                  </span>
                  <span className="text-[9px] text-slate-500 block">(mín: {product.minStock})</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Preço de Custo</span>
                  <span className="font-bold text-sm text-slate-300">
                    R$ {product.costPrice.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
                  <span className="font-bold text-sm text-amber-400">
                    R$ {product.salePrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quick Operation Triggers */}
              {canOperate && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      onMovement(product, 'entrada');
                      onClose();
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowDownRight className="w-4 h-4" /> Registrar Entrada
                  </button>
                  <button
                    onClick={() => {
                      onMovement(product, 'saida');
                      onClose();
                    }}
                    disabled={totalStock <= 0}
                    className="flex-1 py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" /> Despachar (Saída)
                  </button>
                  <button
                    onClick={() => {
                      onMovement(product, 'perda');
                      onClose();
                    }}
                    disabled={totalStock <= 0}
                    className="flex-1 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" /> Registrar Perda
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Batches (Lotes) & FEFO Expiration Section */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Lotes Cadastrados e Ordem FEFO (First Expired, First Out)
                </h3>
              </div>
              {canOperate && !showAddBatch && (
                <button
                  onClick={() => setShowAddBatch(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Lote
                </button>
              )}
            </div>

            {/* Form to Add New Batch */}
            {showAddBatch && (
              <form
                onSubmit={handleCreateBatch}
                className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Novo Lote de Bebida</span>
                  <button
                    type="button"
                    onClick={() => setShowAddBatch(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Número do Lote</label>
                    <input
                      type="text"
                      required
                      value={newBatchNumber}
                      onChange={(e) => setNewBatchNumber(e.target.value)}
                      placeholder="Ex: L-202611A"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Data de Validade</label>
                    <input
                      type="date"
                      required
                      value={newBatchExpiry}
                      onChange={(e) => setNewBatchExpiry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Quantidade (un)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newBatchQty}
                      onChange={(e) => setNewBatchQty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddBatch(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                  >
                    Salvar Lote
                  </button>
                </div>
              </form>
            )}

            {/* List of Batches */}
            <div className="divide-y divide-slate-800/60 bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
              {fefoBatches.map((batch, index) => {
                const expiry = getExpiryStatus(batch.expirationDate);

                return (
                  <div
                    key={batch.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            {batch.batchNumber}
                          </span>
                          {index === 0 && (
                            <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                              FEFO (Prioridade de Saída)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>Validade: {new Date(batch.expirationDate).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-200">
                            {batch.quantity} unidades
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border ${expiry.badgeClass}`}
                      >
                        {expiry.label}
                      </span>
                      {canOperate && (
                        <button
                          onClick={() => {
                            onMovement(product, 'saida', batch);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold"
                          title="Dar saída deste lote específico"
                        >
                          Baixar Lote
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {fefoBatches.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhum lote registrado com saldo positivo. Registre uma entrada para adicionar lotes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
