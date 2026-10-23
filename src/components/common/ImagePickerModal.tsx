import React, { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Link as LinkIcon, Upload, Check, Loader2, Sparkles, X } from 'lucide-react';
import { ProductCategory } from '../../types';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  productName: string;
  category: ProductCategory;
  brand?: string;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  productName,
  category,
  brand,
}) => {
  const [searchTerm, setSearchTerm] = useState(productName || '');
  const [activeTab, setActiveTab] = useState<'search' | 'category' | 'url' | 'upload'>('search');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [previewSelected, setPreviewSelected] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const term = `${brand ? brand + ' ' : ''}${productName}`.trim();
      setSearchTerm(term);
      fetchImages(term, category);
    }
  }, [isOpen, productName, brand, category]);

  const fetchImages = async (queryText: string, cat: ProductCategory) => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          category: cat,
          brand,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          setSearchResults(data.images);
        } else {
          setSearchResults(getCategoryFallbacks(cat));
        }
      } else {
        setSearchResults(getCategoryFallbacks(cat));
      }
    } catch {
      setSearchResults(getCategoryFallbacks(cat));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryFallbacks = (cat: ProductCategory): string[] => {
    const map: Record<ProductCategory, string[]> = {
      cerveja: [
        'https://images.unsplash.com/photo-1608270191295-8a03ca1714fc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1518542698889-ca82282f08d5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=800&q=80',
      ],
      refrigerante: [
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80',
      ],
      agua: [
        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=800&q=80',
      ],
      suco: [
        'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80',
      ],
      destilado: [
        'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
      ],
      vinho: [
        'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
      ],
      energetico: [
        'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
      ],
      outros: [
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
      ],
    };
    return map[cat] || map.outros;
  };

  const handleSelect = (url: string) => {
    setPreviewSelected(url);
    onSelectImage(url);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleSelect(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Identificação Visual por Foto</h3>
              <p className="text-xs text-slate-400">
                Escolha a foto para identificação rápida do produto no armazém
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/60 text-xs">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'search'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Busca Automática (Google)
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'category'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Fotos da Categoria ({category})
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'url'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Colar URL Direta
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload / Câmera
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchImages(searchTerm, category);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite o nome ou marca da bebida..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !searchTerm.trim()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar Fotos
                </button>
              </form>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs">Buscando imagens na web via Google...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-400 mb-3">
                    Clique na foto ideal para identificação visual imediata:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {searchResults.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelect(url)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer hover:border-amber-500 transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={url}
                          alt={`Opção ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            // Fallback if URL breaks
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Escolher esta foto
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhuma imagem encontrada para esta busca. Tente alterar o termo ou use a aba de
                  categoria.
                </div>
              )}
            </div>
          )}

          {activeTab === 'category' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Fotos padrão selecionadas para a categoria <strong>{category.toUpperCase()}</strong>:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {getCategoryFallbacks(category).map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelect(url)}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer hover:border-amber-500 transition-all hover:scale-[1.02]"
                  >
                    <img
                      src={url}
                      alt={`Categoria ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Selecionar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Cole a URL direta de uma imagem na web (PNG, JPG, WebP):
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-produto.jpg"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={!customUrl.trim()}
                  onClick={() => handleSelect(customUrl.trim())}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  Usar Esta URL
                </button>
              </div>

              {customUrl && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[11px] text-slate-500 mb-2">Pré-visualização:</p>
                  <img
                    src={customUrl}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).alt = 'Erro ao carregar URL';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Envie uma foto do seu computador, galeria do celular ou tire uma foto com a câmera:
              </p>
              <label className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-colors">
                <Upload className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-sm font-semibold text-white">Clique para selecionar foto</span>
                <span className="text-xs text-slate-500 mt-1">PNG, JPG, WebP ou tire com a câmera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
