import React from 'react';
import { Product, Batch, User } from '../../types';
import { getProductStockTotal, getBatchesSortedByFEFO, getExpiryStatus } from '../../services/storage';
import { AlertTriangle, Clock, ArrowDownRight, ArrowUpRight, ShieldAlert, Barcode } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  currentUser: User | null;
  onSelect: (product: Product) => void;
  onAction: (product: Product, actionType: 'entrada' | 'saida' | 'perda') => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currentUser,
  onSelect,
  onAction,
}) => {
  const stockTotal = getProductStockTotal(product.id);
  const fefoBatches = getBatchesSortedByFEFO(product.id);
  const nearestBatch: Batch | undefined = fefoBatches[0];
  const expiryInfo = nearestBatch ? getExpiryStatus(nearestBatch.expirationDate) : null;

  const isLowStock = stockTotal <= product.minStock;
  const isOutOfStock = stockTotal <= 0;
  const canOperate = currentUser?.role !== 'consulta';

  return (
    <div className="group bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col">
      {/* Visual Product Photo Container */}
      <div
        className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden cursor-pointer"
        onClick={() => onSelect(product)}
      >
        <img
          src={product.photoUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 items-center z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300">
            {product.category}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur border border-slate-700 text-amber-300">
            {product.volume}
          </span>
        </div>

        {/* Stock Level Tag */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {isOutOfStock ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-600 text-white shadow-lg animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Sem Estoque
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shadow-lg flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Baixo ({stockTotal})
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 backdrop-blur">
              {stockTotal} un
            </span>
          )}
        </div>

        {/* Expiry Risk Alert Banner (FEFO) */}
        {expiryInfo && (
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <div
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg border backdrop-blur flex items-center justify-between ${expiryInfo.badgeClass}`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Clock className="w-3 h-3 shrink-0" />
                <span className="truncate">Lote {nearestBatch?.batchNumber}: {expiryInfo.label}</span>
              </div>
              <span className="text-[9px] uppercase tracking-wide opacity-80 shrink-0 font-bold">
                {expiryInfo.status === 'expired' ? 'DESCARTE' : 'FEFO'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium text-slate-300">{product.brand}</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <Barcode className="w-3 h-3 text-slate-400" />
              <span>{product.barcode}</span>
            </div>
          </div>

          <h4
            onClick={() => onSelect(product)}
            className="font-bold text-white text-sm line-clamp-2 hover:text-amber-400 cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h4>
        </div>

        {/* Prices & Physical Location */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Preço de Custo</span>
            <span className="font-semibold text-slate-300">
              R$ {product.costPrice.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
            <span className="font-bold text-amber-400">
              R$ {product.salePrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {canOperate ? (
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => onAction(product, 'entrada')}
              className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Registrar entrada de estoque"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Entrada</span>
            </button>
            <button
              onClick={() => onAction(product, 'saida')}
              disabled={isOutOfStock}
              className="py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Registrar saída (venda/despacho)"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Saída</span>
            </button>
            <button
              onClick={() => onAction(product, 'perda')}
              disabled={isOutOfStock}
              className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 disabled:opacity-40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              title="Registrar quebra, avaria ou vencimento"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Perda</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onSelect(product)}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
          >
            Ver Lotes e Detalhes
          </button>
        )}
      </div>
    </div>
  );
};
