import React, { useState } from 'react';
import { User, Role } from '../../types';
import { RoleBadge } from './RoleBadge';
import {
  Camera,
  Search,
  LogOut,
  Bell,
  Clock,
  RotateCcw,
  Sparkles,
  ChevronDown,
  User as UserIcon,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenScanner: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onSwitchRole: (role: Role) => void;
  onResetData: () => void;
  pendingApprovalsCount: number;
  inactivityMinutesLeft: number;
  onNavigateToMovements: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenScanner,
  onSearchChange,
  searchQuery,
  onSwitchRole,
  onResetData,
  pendingApprovalsCount,
  inactivityMinutesLeft,
  onNavigateToMovements,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Fixed Menu Toggle Button + Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Hamburger / Close Menu Button */}
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              aria-expanded={isSidebarOpen}
              title={isSidebarOpen ? 'Fechar menu lateral (Esc)' : 'Abrir menu lateral'}
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 shrink-0 cursor-pointer"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-amber-400" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5 text-slate-300" aria-hidden="true" />
              )}
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-extrabold text-xl tracking-tight shrink-0">
                🍺
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                    Estoque de Bebidas
                  </h1>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-none mt-1">
                  Controle Anti-Perda & Validade
                </p>
              </div>
            </div>
          </div>

          {/* Central Barcode Search Bar with Camera Scanner */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar bebida, marca ou código de barras..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-11 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={onOpenScanner}
                className="absolute right-1.5 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
                title="Abrir Câmera para Ler Código de Barras"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pending Approvals Badge (Gerente/Admin) */}
            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'gerente') && pendingApprovalsCount > 0 && (
              <button
                onClick={onNavigateToMovements}
                className="relative p-2 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl hover:bg-rose-500/25 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Movimentações de Perda pendentes de aprovação"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="hidden md:inline">{pendingApprovalsCount} pendente{pendingApprovalsCount > 1 ? 's' : ''}</span>
                <span className="md:hidden bg-rose-500 text-slate-950 rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                  {pendingApprovalsCount}
                </span>
              </button>
            )}

            {/* Inactivity Timer Display */}
            {inactivityMinutesLeft > 0 && (
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px]"
                title={`Logout automático em ~${inactivityMinutesLeft} minutos se inativo`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Inativo: {inactivityMinutesLeft}m</span>
              </div>
            )}

            {/* User Profile & Role Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition-colors text-left"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-600"
                  />
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-white truncate max-w-[120px]">
                      {currentUser.name}
                    </p>
                    <RoleBadge role={currentUser.role} size="sm" showIcon={false} />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 space-y-3">
                    <div className="pb-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <div className="mt-2">
                        <RoleBadge role={currentUser.role} size="md" />
                      </div>
                    </div>

                    {/* Profile Information */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Status da Conta:</div>
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Autenticado via Firebase</span>
                      </div>
                    </div>

                    {/* Reset Data Button */}
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          if (confirm('Deseja restaurar os produtos e lotes de demonstração iniciais?')) {
                            onResetData();
                            setShowUserMenu(false);
                          }
                        }}
                        className="w-full py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] font-medium flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar dados demo
                        </span>
                      </button>
                    </div>

                    {/* Visible Logout Button */}
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sair do Sistema
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Direct Logout Button */}
            {currentUser && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/30"
                title="Sair do sistema"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
