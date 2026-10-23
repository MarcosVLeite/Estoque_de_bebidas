import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, User } from '../../types';
import { findProductByBarcode } from '../../services/storage';
import { ImagePickerModal } from '../common/ImagePickerModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { Camera, Sparkles, Image as ImageIcon, Barcode, AlertCircle, X } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  productToEdit?: Product | null;
  currentUser: User | null;
  initialBarcode?: string;
  onOpenExistingProduct?: (product: Product) => void;
}

const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'cerveja', label: 'Cerveja' },
  { id: 'refrigerante', label: 'Refrigerante' },
  { id: 'agua', label: 'Água' },
  { id: 'suco', label: 'Suco' },
  { id: 'destilado', label: 'Destilado' },
  { id: 'vinho', label: 'Vinho' },
  { id: 'energetico', label: 'Energético' },
  { id: 'outros', label: 'Outros' },
];

const PACKAGING_PRESETS = [
  'Lata 350ml',
  'Lata 473ml (Latão)',
  'Garrafa 600ml',
  'Long Neck 330ml',
  'Garrafa 1L',
  'Garrafa PET 2L',
  'Garrafa 750ml',
  'Garrafa 500ml',
  'Caixa com 12',
  'Fardo com 6',
  'Barril 50L',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  currentUser,
  initialBarcode,
  onOpenExistingProduct,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('cerveja');
  const [volume, setVolume] = useState('Lata 350ml');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('0.00');
  const [salePrice, setSalePrice] = useState('0.00');
  const [minStock, setMinStock] = useState('50');
  const [photoUrl, setPhotoUrl] = useState('');
  const [location, setLocation] = useState('');

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeWarning, setBarcodeWarning] = useState<{ message: string; existingProduct: Product } | null>(null);

  // Permissions: Only Admin and Gerente can edit prices. Estoquistas cannot alter prices!
  const canEditPrices = currentUser?.role === 'admin' || currentUser?.role === 'gerente';

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setBrand(productToEdit.brand);
      setCategory(productToEdit.category);
      setVolume(productToEdit.volume);
      setBarcode(productToEdit.barcode);
      setCostPrice(productToEdit.costPrice.toFixed(2));
      setSalePrice(productToEdit.salePrice.toFixed(2));
      setMinStock(productToEdit.minStock.toString());
      setPhotoUrl(productToEdit.photoUrl);
      setLocation(productToEdit.location || '');
      setBarcodeWarning(null);
    } else {
      setName('');
      setBrand('');
      setCategory('cerveja');
      setVolume('Lata 350ml');
      setBarcode(initialBarcode || '');
      setCostPrice('5.00');
      setSalePrice('9.00');
      setMinStock('50');
      setPhotoUrl(
        'https://images.unsplash.com/photo-1608270191295-8a03ca1714fc?auto=format&fit=crop&w=600&q=80'
      );
      setLocation('Rua A - Pallet 01');
      setBarcodeWarning(null);
    }
  }, [productToEdit, initialBarcode, isOpen]);

  // Check barcode duplicate
  const handleBarcodeChange = (val: string) => {
    setBarcode(val);
    if (!productToEdit && val.trim().length >= 8) {
      const existing = findProductByBarcode(val.trim());
      if (existing) {
        setBarcodeWarning({
          message: `Código já cadastrado para: "${existing.name}".`,
          existingProduct: existing,
        });
      } else {
        setBarcodeWarning(null);
      }
    } else {
      setBarcodeWarning(null);
    }
  };

  const handleBarcodeScan = (scannedCode: string) => {
    handleBarcodeChange(scannedCode);
    const existing = findProductByBarcode(scannedCode);
    if (existing) {
      setBarcodeWarning({
        message: `Código já cadastrado para: "${existing.name}".`,
        existingProduct: existing,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      alert('Preencha o nome do produto e o código de barras.');
      return;
    }

    onSave({
      id: productToEdit?.id,
      name: name.trim(),
      brand: brand.trim() || 'Geral',
      category,
      volume,
      barcode: barcode.trim(),
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      minStock: parseInt(minStock, 10) || 10,
      photoUrl:
        photoUrl.trim() ||
        'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=600&q=80',
      location: location.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
            <div>
              <h3 className="font-bold text-white text-base">
                {productToEdit ? 'Editar Produto de Bebida' : 'Cadastrar Nova Bebida'}
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados e escolha a foto para identificação visual imediata
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Visual Photo Picker Section (Key requirement!) */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="relative aspect-square w-28 h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 group">
                <img
                  src={photoUrl}
                  alt="Prévia do Produto"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowImagePicker(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-400 text-xs font-bold"
                >
                  <Sparkles className="w-5 h-5 mb-1" />
                  Trocar Foto
                </button>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xs font-bold text-white">Identificação Visual por Foto</span>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    Busca Automática
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ao digitar o nome da bebida, você pode buscar fotos oficiais na internet ou escolher
                  modelos por categoria para facilitar a localização no depósito.
                </p>
                <button
                  type="button"
                  onClick={() => setShowImagePicker(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Buscar Foto Automática / Alterar Imagem
                </button>
              </div>
            </div>

            {/* Barcode Duplicate Warning */}
            {barcodeWarning && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{barcodeWarning.message}</span>
                </div>
                {onOpenExistingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExistingProduct(barcodeWarning.existingProduct);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] shrink-0"
                  >
                    Abrir Existente
                  </button>
                )}
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Heineken Puro Malte Long Neck"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Heineken, Ambev, Coca-Cola"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Packaging / Volume */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Volume / Embalagem *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="Ex: Lata 350ml, Garrafa 600ml"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setVolume(e.target.value);
                    }}
                    value=""
                    className="bg-slate-800 text-xs text-slate-300 rounded-xl px-2 border border-slate-700"
                  >
                    <option value="" disabled>
                      Padrões
                    </option>
                    {PACKAGING_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode with Camera Scanner Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Barras (EAN) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    placeholder="Ex: 7896045505051"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="absolute right-1.5 p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors"
                    title="Escanear com a câmera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preço de Custo (R$)
                  {!canEditPrices && (
                    <span className="text-[10px] text-slate-500 ml-1.5">(Apenas Gerente/Admin)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEditPrices}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preço de Venda (R$)
                  {!canEditPrices && (
                    <span className="text-[10px] text-slate-500 ml-1.5">(Apenas Gerente/Admin)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canEditPrices}
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>

              {/* Minimum Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estoque Mínimo (Alerta de Ruptura)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Physical Location in Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Localização no Depósito
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Rua B - Pallet 04, Câmara Fria"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
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
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
              >
                {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nested Automatic Photo Search Modal */}
      <ImagePickerModal
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelectImage={(url) => setPhotoUrl(url)}
        productName={name}
        category={category}
        brand={brand}
      />

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        title="Escanear Código do Produto"
        subtitle="Aponte para o código de barras da garrafa ou lata"
      />
    </>
  );
};
