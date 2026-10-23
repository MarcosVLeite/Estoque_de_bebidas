import {
  User,
  Product,
  Batch,
  StockMovement,
  InventorySession,
  AppSettings,
  Role,
  LossReason
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_MOVEMENTS,
  INITIAL_SETTINGS
} from './mockData';

const STORAGE_KEYS = {
  USERS: 'estoque_bebidas_users',
  CURRENT_USER: 'estoque_bebidas_current_user',
  PRODUCTS: 'estoque_bebidas_products',
  BATCHES: 'estoque_bebidas_batches',
  MOVEMENTS: 'estoque_bebidas_movements',
  INVENTORIES: 'estoque_bebidas_inventories',
  SETTINGS: 'estoque_bebidas_settings'
};

function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to localStorage key ${key}`, e);
  }
}

// ========================
// AUTH & USERS SERVICE
// ========================


export function checkPermission(user: User | null, required: 'admin' | 'gerente_or_admin' | 'can_edit_stock' | 'read_only'): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;

  if (required === 'admin') {
    return false;
  }
  if (required === 'gerente_or_admin') {
    return user.role === 'gerente';
  }
  if (required === 'can_edit_stock') {
    return user.role === 'gerente' || user.role === 'estoquista';
  }
  return true;
}

// ========================
// PRODUCTS SERVICE
// ========================
export function getProducts(): Product[] {
  const products = safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  if (products.length === 0) {
    safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS;
  }
  return products;
}

export function saveProducts(products: Product[]): void {
  safeSet(STORAGE_KEYS.PRODUCTS, products);
}

export function saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Product {
  const products = getProducts();
  const now = new Date().toISOString();

  if (product.id) {
    // Update existing
    const updated = products.map(p => {
      if (p.id === product.id) {
        return {
          ...p,
          ...product,
          updatedAt: now
        };
      }
      return p;
    });
    saveProducts(updated);
    return updated.find(p => p.id === product.id)!;
  } else {
    // Create new
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    products.push(newProduct);
    saveProducts(products);
    return newProduct;
  }
}

export function deleteProduct(productId: string): boolean {
  const products = getProducts();
  const filtered = products.filter(p => p.id !== productId);
  if (filtered.length !== products.length) {
    saveProducts(filtered);
    // Also remove associated batches
    const batches = getBatches().filter(b => b.productId !== productId);
    saveBatches(batches);
    return true;
  }
  return false;
}

export function findProductByBarcode(barcode: string): Product | undefined {
  const cleanBarcode = barcode.trim().replace(/\D/g, '');
  const products = getProducts();
  return products.find(p => p.barcode.trim().replace(/\D/g, '') === cleanBarcode);
}

// ========================
// BATCHES SERVICE (LOTES)
// ========================
export function getBatches(): Batch[] {
  const batches = safeGet<Batch[]>(STORAGE_KEYS.BATCHES, []);
  if (batches.length === 0) {
    safeSet(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    return INITIAL_BATCHES;
  }
  return batches;
}

export function saveBatches(batches: Batch[]): void {
  safeSet(STORAGE_KEYS.BATCHES, batches);
}

export function getProductBatches(productId: string): Batch[] {
  return getBatches().filter(b => b.productId === productId && b.quantity > 0);
}

export function getProductStockTotal(productId: string): number {
  const batches = getBatches().filter(b => b.productId === productId);
  return batches.reduce((acc, b) => acc + (b.quantity || 0), 0);
}

// FEFO: First Expired, First Out sorting
export function getBatchesSortedByFEFO(productId: string): Batch[] {
  const batches = getProductBatches(productId);
  return batches.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
}

export function saveBatch(batch: Omit<Batch, 'id' | 'createdAt'> & { id?: string }): Batch {
  const batches = getBatches();
  const now = new Date().toISOString();

  if (batch.id) {
    const updated = batches.map(b => (b.id === batch.id ? { ...b, ...batch } : b));
    saveBatches(updated);
    return updated.find(b => b.id === batch.id)!;
  } else {
    const newBatch: Batch = {
      ...batch,
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };
    batches.push(newBatch);
    saveBatches(batches);
    return newBatch;
  }
}

// ========================
// MOVEMENTS & AUDIT
// ========================
export function getMovements(): StockMovement[] {
  const movements = safeGet<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  if (movements.length === 0) {
    safeSet(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    return INITIAL_MOVEMENTS;
  }
  // Check if historical movements exist (e.g. before October 2026); if not, merge them so reports work
  const hasOlderMonths = movements.some(m => {
    const d = new Date(m.timestamp);
    return !isNaN(d.getTime()) && d.getMonth() < 9;
  });
  if (!hasOlderMonths && INITIAL_MOVEMENTS.length > movements.length) {
    const existingIds = new Set(movements.map(m => m.id));
    const merged = [...movements];
    INITIAL_MOVEMENTS.forEach(initM => {
      if (!existingIds.has(initM.id)) {
        merged.push(initM);
      }
    });
    safeSet(STORAGE_KEYS.MOVEMENTS, merged);
    return merged;
  }
  return movements;
}

export function saveMovements(movements: StockMovement[]): void {
  safeSet(STORAGE_KEYS.MOVEMENTS, movements);
}

export function recordStockMovement(params: {
  type: StockMovement['type'];
  productId: string;
  batchId?: string;
  batchNumber?: string;
  expirationDate?: string; // used if creating batch during 'entrada'
  quantity: number;
  unitPrice?: number;
  lossReason?: LossReason;
  reasonDetails?: string;
  documentNumber?: string;
  currentUser: User;
}): StockMovement {
  const products = getProducts();
  const batches = getBatches();
  const movements = getMovements();
  const product = products.find(p => p.id === params.productId);

  if (!product) {
    throw new Error('Produto não encontrado');
  }

  const isLoss = params.type === 'perda';
  const isAdjustment = params.type === 'ajuste';
  const isEstoquista = params.currentUser.role === 'estoquista';

  // Gerente and Admin approve immediately; Estoquista loss/adjustment requires approval
  const requiresApproval = (isLoss || isAdjustment) && isEstoquista;
  const status: StockMovement['status'] = requiresApproval ? 'pendente_aprovacao' : 'aprovado';

  const unitPrice = params.unitPrice || (isLoss ? product.costPrice : product.salePrice);
  const totalValue = unitPrice * Math.abs(params.quantity);

  const newMovement: StockMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: params.type,
    productId: product.id,
    productName: product.name,
    productPhotoUrl: product.photoUrl,
    batchId: params.batchId,
    batchNumber: params.batchNumber,
    quantity: params.quantity,
    unitPrice,
    totalValue,
    lossReason: params.lossReason,
    reasonDetails: params.reasonDetails,
    documentNumber: params.documentNumber,
    status,
    userId: params.currentUser.id,
    userName: params.currentUser.name,
    userRole: params.currentUser.role,
    timestamp: new Date().toISOString(),
    ...(status === 'aprovado' && !isEstoquista
      ? {
          approvedBy: params.currentUser.id,
          approvedByName: params.currentUser.name,
          approvedAt: new Date().toISOString()
        }
      : {})
  };

  // If immediately approved (not pending), execute the physical stock adjustment
  if (status === 'aprovado') {
    applyStockQuantityChange(params.type, params.productId, params.batchId, params.batchNumber, params.expirationDate, params.quantity, product.costPrice);
  }

  movements.unshift(newMovement);
  saveMovements(movements);
  return newMovement;
}

export function approveStockMovement(movementId: string, approver: User): boolean {
  if (approver.role !== 'admin' && approver.role !== 'gerente') return false;

  const movements = getMovements();
  const movement = movements.find(m => m.id === movementId);
  if (!movement || movement.status !== 'pendente_aprovacao') return false;

  movement.status = 'aprovado';
  movement.approvedBy = approver.id;
  movement.approvedByName = approver.name;
  movement.approvedAt = new Date().toISOString();

  // Now apply the stock reduction for approved loss or adjustment
  const products = getProducts();
  const product = products.find(p => p.id === movement.productId);
  const cost = product?.costPrice || 0;

  applyStockQuantityChange(movement.type, movement.productId, movement.batchId, movement.batchNumber, undefined, movement.quantity, cost);

  saveMovements(movements);
  return true;
}

export function rejectStockMovement(movementId: string, approver: User, reason: string): boolean {
  if (approver.role !== 'admin' && approver.role !== 'gerente') return false;

  const movements = getMovements();
  const movement = movements.find(m => m.id === movementId);
  if (!movement || movement.status !== 'pendente_aprovacao') return false;

  movement.status = 'rejeitado';
  movement.rejectionReason = reason;
  movement.approvedBy = approver.id;
  movement.approvedByName = approver.name;
  movement.approvedAt = new Date().toISOString();

  saveMovements(movements);
  return true;
}

function applyStockQuantityChange(
  type: StockMovement['type'],
  productId: string,
  batchId?: string,
  batchNumber?: string,
  expirationDate?: string,
  quantity: number = 0,
  unitCost: number = 0
) {
  const batches = getBatches();
  const absQty = Math.abs(quantity);

  if (type === 'entrada') {
    // If batchId specified, add to existing batch
    let batch = batchId ? batches.find(b => b.id === batchId) : undefined;
    if (!batch && batchNumber) {
      batch = batches.find(b => b.productId === productId && b.batchNumber === batchNumber);
    }

    if (batch) {
      batch.quantity += absQty;
    } else {
      // Create new batch for this entry
      const now = new Date();
      const defaultExpiry = expirationDate || new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString().split('T')[0];
      const newBatch: Batch = {
        id: `batch_${Date.now()}`,
        productId,
        batchNumber: batchNumber || `L-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`,
        expirationDate: defaultExpiry,
        quantity: absQty,
        unitCost,
        createdAt: now.toISOString()
      };
      batches.push(newBatch);
    }
    saveBatches(batches);
  } else if (type === 'saida' || type === 'perda' || type === 'ajuste') {
    // Deduct stock (FEFO if batch not specified)
    if (batchId) {
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - absQty);
      }
    } else {
      // Deduct according to FEFO: closest expiration date first!
      let remainingToDeduct = absQty;
      const sortedBatches = batches
        .filter(b => b.productId === productId && b.quantity > 0)
        .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

      for (const b of sortedBatches) {
        if (remainingToDeduct <= 0) break;
        const deductFromThis = Math.min(b.quantity, remainingToDeduct);
        b.quantity -= deductFromThis;
        remainingToDeduct -= deductFromThis;
      }
    }
    saveBatches(batches);
  }
}

// ========================
// INVENTORIES (CONTAGEM)
// ========================
export function getInventories(): InventorySession[] {
  return safeGet<InventorySession[]>(STORAGE_KEYS.INVENTORIES, []);
}

export function saveInventories(inventories: InventorySession[]): void {
  safeSet(STORAGE_KEYS.INVENTORIES, inventories);
}

export function createInventorySession(title: string, user: User): InventorySession {
  const inventories = getInventories();
  const products = getProducts();
  const initialCounts: Record<string, any> = {};

  products.forEach(p => {
    const sysQty = getProductStockTotal(p.id);
    initialCounts[p.id] = {
      systemQty: sysQty,
      countedQty: sysQty, // default to match until scanned
      difference: 0,
      unitCost: p.costPrice,
      lossValue: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name
    };
  });

  const session: InventorySession = {
    id: `inv_${Date.now()}`,
    title: title || `Inventário Geral ${new Date().toLocaleDateString('pt-BR')}`,
    status: 'aberto',
    startedBy: user.id,
    startedByName: user.name,
    startedAt: new Date().toISOString(),
    counts: initialCounts,
    totalDiscrepancyQty: 0,
    totalDiscrepancyValue: 0
  };

  inventories.unshift(session);
  saveInventories(inventories);
  return session;
}

export function updateInventoryCount(
  sessionId: string,
  productId: string,
  countedQty: number,
  user: User,
  notes?: string
): InventorySession | null {
  const inventories = getInventories();
  const session = inventories.find(i => i.id === sessionId);
  if (!session || session.status !== 'aberto') return null;

  const currentCount = session.counts[productId] || {
    systemQty: getProductStockTotal(productId),
    countedQty: 0,
    difference: 0,
    unitCost: 0,
    lossValue: 0
  };

  const diff = countedQty - currentCount.systemQty;
  const unitCost = currentCount.unitCost || 0;
  // If negative diff (loss: counted < system), calculate positive loss value
  const lossValue = diff < 0 ? Math.abs(diff) * unitCost : 0;

  session.counts[productId] = {
    ...currentCount,
    countedQty,
    difference: diff,
    lossValue,
    notes: notes || currentCount.notes,
    updatedAt: new Date().toISOString(),
    updatedBy: user.name
  };

  // Recalculate totals
  let totalDiff = 0;
  let totalLossVal = 0;
  Object.values(session.counts).forEach(c => {
    totalDiff += Math.abs(c.difference);
    totalLossVal += c.lossValue;
  });
  session.totalDiscrepancyQty = totalDiff;
  session.totalDiscrepancyValue = totalLossVal;

  saveInventories(inventories);
  return session;
}

// ========================
// SETTINGS
// ========================
export function getSettings(): AppSettings {
  return safeGet<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  safeSet(STORAGE_KEYS.SETTINGS, settings);
}

// ========================
// DATE & EXPIRY HELPERS
// ========================
export function getDaysUntilExpiry(expirationDateStr: string): number {
  if (!expirationDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDateStr);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'normal';

export function getExpiryStatus(expirationDateStr: string, settings = getSettings()): {
  status: ExpiryStatus;
  days: number;
  label: string;
  badgeClass: string;
} {
  const days = getDaysUntilExpiry(expirationDateStr);

  if (days < 0) {
    return {
      status: 'expired',
      days,
      label: `Vencido há ${Math.abs(days)}d`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    };
  }
  if (days <= settings.criticalExpiryThresholdDays) {
    return {
      status: 'critical',
      days,
      label: `Crítico (${days}d)`,
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
    };
  }
  if (days <= settings.nearExpiryThresholdDays) {
    return {
      status: 'warning',
      days,
      label: `Atenção (${days}d)`,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    };
  }
  return {
    status: 'normal',
    days,
    label: `${days}d para vencer`,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  };
}

export function resetToDemoData(): void {
  safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  safeSet(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  safeSet(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
  safeSet(STORAGE_KEYS.INVENTORIES, []);
  safeSet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}
