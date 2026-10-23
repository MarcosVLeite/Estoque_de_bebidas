import React from 'react';
import { Role } from '../../types';
import { ShieldCheck, UserCheck, PackageCheck, Eye } from 'lucide-react';

interface RoleBadgeProps {
  role: Role;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showIcon = true, size = 'md' }) => {
  const configs: Record<
    Role,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    admin: {
      label: 'Administrador',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    gerente: {
      label: 'Gerente',
      bg: 'bg-blue-500/15',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      icon: <UserCheck className="w-3.5 h-3.5" />,
    },
    estoquista: {
      label: 'Estoquista',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    consulta: {
      label: 'Consulta (Leitura)',
      bg: 'bg-slate-500/15',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
  };

  const config = configs[role] || configs.consulta;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
