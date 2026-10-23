import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Sessão Expirando por Inatividade</h3>
          <p className="text-xs text-slate-300 mt-1">
            Por segurança operacional do estoque, seu login será encerrado automaticamente em:
          </p>
        </div>

        <div className="py-2">
          <span className="font-mono text-4xl font-extrabold text-amber-400">
            {secondsRemaining}s
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
          >
            Sair Agora
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-lg"
          >
            Continuar Logado
          </button>
        </div>
      </div>
    </div>
  );
};
