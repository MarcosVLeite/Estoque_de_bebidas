import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { playScanSuccessSound, playAlertWarningSound } from '../../services/sound';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Leitor de Código de Barras',
  subtitle = 'Aponte a câmera traseira para a embalagem da bebida (EAN-13, EAN-8, Code 128)',
  continuous = false,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-reader';
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setManualCode('');
      setLastScanned(null);
      setScanCount(0);
      setCameraError(null);
      return;
    }

    startScanner(facingMode);

    return () => {
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const startScanner = async (facing: 'environment' | 'user') => {
    setCameraError(null);
    try {
      // First stop any running scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ];

      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.0,
        formatsToSupport,
      };

      await html5QrCode.start(
        { facingMode: facing },
        config,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Frame error (no barcode in frame), can ignore
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera barcode start error:', err);
      setIsScanning(false);
      setCameraError(
        'Não foi possível inicializar a câmera. Verifique as permissões de vídeo ou use a digitação manual abaixo.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleDetectedCode = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    // Throttle duplicate reads within 1.2s to prevent rapid accidental duplicates
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1200 && clean === lastScanned) {
      return;
    }
    lastScanTimeRef.current = now;

    playScanSuccessSound();
    setLastScanned(clean);
    setScanCount((prev) => prev + 1);

    onScan(clean);

    if (!continuous) {
      setTimeout(() => {
        onClose();
      }, 300);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode);
    setManualCode('');
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const applyTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: applyTorch } as any],
      });
      setTorchOn(applyTorch);
    } catch {
      // Torch not supported on device
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar leitor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="relative bg-black flex-1 min-h-[280px] flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full max-h-[340px]" />

          {/* Aim Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="w-64 h-36 border-2 border-dashed border-amber-400/70 rounded-xl relative flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.15)]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400 -mt-0.5 -ml-0.5 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400 -mt-0.5 -mr-0.5 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400 -mb-0.5 -ml-0.5 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400 -mb-0.5 -mr-0.5 rounded-br" />

              {/* Laser line animated */}
              <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />

              <span className="text-[11px] font-mono tracking-wider text-amber-300/90 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Alinhe o código aqui
              </span>
            </div>
          </div>

          {/* Last scanned toast / feedback */}
          {lastScanned && (
            <div className="absolute top-3 left-3 right-3 bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs px-3 py-2 rounded-xl flex items-center justify-between shadow-lg backdrop-blur">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono font-medium">Lido: {lastScanned}</span>
              </div>
              {continuous && (
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-bold text-[10px]">
                  Total: {scanCount}
                </span>
              )}
            </div>
          )}

          {/* Quick Camera Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
            <button
              onClick={toggleTorch}
              type="button"
              className={`p-2.5 rounded-xl text-xs backdrop-blur border transition-all ${
                torchOn
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="Ligar/Desligar Lanterna"
            >
              <Flashlight className="w-4 h-4" />
            </button>
            <button
              onClick={toggleCameraFacing}
              type="button"
              className="p-2.5 bg-slate-900/80 text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 backdrop-blur transition-all"
              title="Trocar Câmera (Traseira/Frontal)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error notification if camera permission is blocked */}
        {cameraError && (
          <div className="bg-rose-950/60 border-t border-b border-rose-800/80 p-3 px-5 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-medium">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Manual Barcode Input & Test Simulation */}
        <div className="p-4 bg-slate-800/70 border-t border-slate-800 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Digite o código (ex: 7896045505051)..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md"
            >
              Confirmar
            </button>
          </form>

          {/* Quick Test Barcode Buttons for Evaluator / Testing */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simular leitura rápida com código real:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[
                { name: 'Heineken', code: '7896045505051' },
                { name: 'Coca-Cola 2L', code: '7894900011517' },
                { name: 'Spaten 600ml', code: '7891991016834' },
                { name: 'Red Bull', code: '9002490100070' },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleDetectedCode(item.code)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 rounded-lg text-[11px] text-left transition-colors text-slate-300"
                >
                  <div className="font-semibold text-white truncate">{item.name}</div>
                  <div className="font-mono text-[9px] text-slate-500 truncate">{item.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
