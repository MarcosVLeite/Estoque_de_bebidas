import React from 'react';
import { User, Role } from '../../types';
import {
  LayoutDashboard,
  Beer,
  ArrowLeftRight,
  ShieldAlert,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Lock,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'products'
  | 'movements'
  | 'losses'
  | 'inventory'
  | 'reports'
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  pendingLossesCount: number;
  criticalExpiryCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  pendingLossesCount,
  criticalExpiryCount,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isGerenteOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'gerente';

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | null;
    badgeColor?: string;
    requiredRole?: 'admin' | 'gerente_or_admin' | 'any';
    hideIfUnauthorized?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Visão Geral & Alertas',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: criticalExpiryCount > 0 ? criticalExpiryCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'products',
      label: 'Produtos & Fotos',
      icon: <Beer className="w-4 h-4" />,
    },
    {
      id: 'movements',
      label: 'Movimentações & Entradas',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: 'losses',
      label: 'Gestão de Perdas & Avarias',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: pendingLossesCount > 0 ? pendingLossesCount : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'inventory',
      label: 'Inventário & Contagem',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Relatórios & FEFO',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'users',
      label: 'Usuários & Permissões',
      icon: <Users className="w-4 h-4" />,
      requiredRole: 'admin',
      hideIfUnauthorized: true, // Only Admin sees this tab!
    },
  ];

  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Navegação do sistema">
      {navItems.map((item) => {
        if (item.hideIfUnauthorized && item.requiredRole === 'admin' && !isAdmin) {
          return null;
        }

        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={isActive ? 'text-slate-950' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </div>

            {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-950 text-amber-400' : item.badgeColor
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
