import React, { useState } from 'react';
import { Product, ProductCategory, User, Batch } from '../../types';
import { ProductCard } from '../common/ProductCard';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailModal } from './ProductDetailModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { saveProduct, deleteProduct, findProductByBarcode } from '../../services/storage';
import {
  Plus,
  Camera,
  Filter,
  Search,
  Sparkles,
  Layers,
  AlertTriangle,
  Beer,
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  currentUser: User | null;
  onRefreshData: () => void;
  onOpenMovement: (product: Product, type: 'entrada' | 'saida' | 'perda', batch?: Batch) => void;
  searchFilter: string;
}

const CATEGORIES: { id: ProductCategory | 'todas'; label: string; icon: string }[] = [
  { id: 'todas', label: 'Todas', icon: '🍻' },
  { id: 'cerveja', label: 'Cervejas', icon: '🍺' },
  { id: 'refrigerante', label: 'Refrigerantes', icon: '🥤' },
  { id: 'agua', label: 'Águas', icon: '💧' },
  { id: 'suco', label: 'Sucos', icon: '🧃' },
  { id: 'destilado', label: 'Destilados', icon: '🥃' },
  { id: 'vinho', label: 'Vinhos', icon: '🍷' },
  { id: 'energetico', label: 'Energéticos', icon: '⚡' },
  { id: 'outros', label: 'Outros', icon: '📦' },
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  currentUser,
  onRefreshData,
  onOpenMovement,
  searchFilter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'todas'>('todas');
  const [stockFilter, setStockFilter] = useState<'todos' | 'baixo' | 'zerado'>('todos');
  const [localSearch, setLocalSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedInitialBarcode, setScannedInitialBarcode] = useState<string>('');

  // Permission: Estoquista cannot register new products or edit prices. Consulta is read-only.
  // Gerente and Admin can create/edit products.
  const canCreateOrEditProduct =
    currentUser?.role === 'admin' || currentUser?.role === 'gerente';

  const activeSearch = (localSearch || searchFilter).toLowerCase();

  const filteredProducts = products.filter((p) => {
    // Category filter
    if (selectedCategory !== 'todas' && p.category !== selectedCategory) {
      return false;
    }

    // Search query
    if (activeSearch) {
      const matchName = p.name.toLowerCase().includes(activeSearch);
      const matchBrand = p.brand.toLowerCase().includes(activeSearch);
      const matchBarcode = p.barcode.includes(activeSearch);
      const matchVolume = p.volume.toLowerCase().includes(activeSearch);
      if (!matchName && !matchBrand && !matchBarcode && !matchVolume) {
        return false;
      }
    }

    return true;
  });

  const handleBarcodeScan = (scannedCode: string) => {
    // Check if product exists
    const existing = findProductByBarcode(scannedCode);
    if (existing) {
      // Open product details directly
      setSelectedProductDetail(existing);
    } else {
      // If product does not exist and user has permission, open registration with barcode filled
      if (canCreateOrEditProduct) {
        setScannedInitialBarcode(scannedCode);
        setProductToEdit(null);
        setIsFormOpen(true);
      } else {
        alert(`Nenhum produto cadastrado com o código ${scannedCode}.`);
      }
    }
  };

  const handleSaveProduct = (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    saveProduct(productData);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>Catálogo de Bebidas & Identificação Visual</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
              {filteredProducts.length} itens
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Localize garrafas e latas rapidamente pela foto ou código de barras
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Camera Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors shadow-md"
            title="Escanear Código de Barras pela Câmera"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Escanear Câmera</span>
          </button>

          {/* New Product Button (Only Gerente / Admin) */}
          {canCreateOrEditProduct && (
            <button
              onClick={() => {
                setProductToEdit(null);
                setScannedInitialBarcode('');
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Bebida</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Local Filter input if needed */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filtrar por nome, marca ou código no catálogo..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currentUser={currentUser}
              onSelect={(p) => setSelectedProductDetail(p)}
              onAction={(p, type) => onOpenMovement(p, type)}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Beer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">Nenhuma bebida encontrada</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tente mudar a categoria ou limpar a busca.
          </p>
        </div>
      )}

      {/* Product Creation / Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setProductToEdit(null);
          setScannedInitialBarcode('');
        }}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        currentUser={currentUser}
        initialBarcode={scannedInitialBarcode}
        onOpenExistingProduct={(p) => {
          setSelectedProductDetail(p);
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={Boolean(selectedProductDetail)}
        onClose={() => setSelectedProductDetail(null)}
        product={selectedProductDetail}
        currentUser={currentUser}
        onEditProduct={(p) => {
          setProductToEdit(p);
          setIsFormOpen(true);
        }}
        onMovement={(p, type, batch) => onOpenMovement(p, type, batch)}
        onRefreshData={onRefreshData}
      />

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        title="Buscar Bebida pela Câmera"
        subtitle="Aponte para o código de barras para localizar o produto no catálogo"
      />
    </div>
  );
};
