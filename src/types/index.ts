export type Role = 'admin' | 'gerente' | 'estoquista' | 'consulta';

export type UserStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'desativado';

export interface FirebaseUserProfile {
  uid: string;
  nome: string;
  email: string;
  status: UserStatus;
  perfil: Role | null;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectionReason?: string;
  avatar?: string;
}

// User representation for frontend navigation and permission checks
export interface User {
  id: string; // uid
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  active: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  action: 'aprovacao' | 'rejeicao' | 'alteracao_perfil' | 'desativacao' | 'reativacao' | 'redefinicao_senha';
  targetUserId: string;
  targetUserName: string;
  performedBy: string;
  performedByName: string;
  details: string;
  timestamp: string;
}

export type ProductCategory =
  | 'cerveja'
  | 'refrigerante'
  | 'agua'
  | 'suco'
  | 'destilado'
  | 'vinho'
  | 'energetico'
  | 'outros';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  volume: string; // Ex: 'Lata 350ml', 'Garrafa 600ml', 'Long Neck 330ml', 'Caixa com 12'
  barcode: string; // EAN-13, EAN-8, etc.
  costPrice: number;
  salePrice: number;
  minStock: number;
  photoUrl: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expirationDate: string; // YYYY-MM-DD
  quantity: number;
  manufacturingDate?: string;
  unitCost: number;
  createdAt: string;
}

export type MovementType = 'entrada' | 'saida' | 'perda' | 'ajuste' | 'transferencia';

export type LossReason =
  | 'quebra' // Garrafa quebrada, acidente físico
  | 'vencimento' // Prazo expirado
  | 'avaria' // Lata amassada, embalagem violada
  | 'furto' // Extravio ou furto
  | 'degustacao_interno'; // Consumo autorizado

export interface StockMovement {
  id: string;
  type: MovementType;
  productId: string;
  productName: string;
  productPhotoUrl?: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  lossReason?: LossReason;
  reasonDetails?: string;
  documentNumber?: string;
  status: 'aprovado' | 'pendente_aprovacao' | 'rejeitado';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  userId: string;
  userName: string;
  userRole: Role;
  timestamp: string;
}

export interface InventoryItemCount {
  systemQty: number;
  countedQty: number;
  difference: number;
  unitCost: number;
  lossValue: number;
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface InventorySession {
  id: string;
  title: string;
  status: 'aberto' | 'concluido' | 'cancelado';
  startedBy: string;
  startedByName: string;
  startedAt: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  counts: Record<string, InventoryItemCount>; // productId -> count info
  totalDiscrepancyQty: number;
  totalDiscrepancyValue: number;
  notes?: string;
}

export interface AppSettings {
  inactivityTimeoutMinutes: number; // 0 = disabled, default 15
  enableSoundAlerts: boolean;
  lowStockAlertDays: number;
  nearExpiryThresholdDays: number; // default 30
  criticalExpiryThresholdDays: number; // default 15
}
