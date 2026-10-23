import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, Batch, StockMovement, InventorySession, User, Role } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_MOVEMENTS,
} from './mockData';

// Seed initial stock database in Firestore if empty
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      // Seed initial products
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
      // Seed initial batches
      for (const batch of INITIAL_BATCHES) {
        await setDoc(doc(db, 'batches', batch.id), batch);
      }
      // Seed initial movements
      for (const mov of INITIAL_MOVEMENTS) {
        await setDoc(doc(db, 'movements', mov.id), mov);
      }
    }
  } catch (err) {
    console.warn('Initial Firestore seeding skipped or restricted by rules', err);
  }
}

// ========================
// PRODUCTS
// ========================
export async function fetchProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) {
      await seedInitialFirestoreData();
      const retrySnap = await getDocs(collection(db, 'products'));
      const list: Product[] = [];
      retrySnap.forEach((d) => list.push(d.data() as Product));
      return list;
    }
    const list: Product[] = [];
    snap.forEach((d) => list.push(d.data() as Product));
    return list;
  } catch (err) {
    console.warn('Falling back to local cache for products', err);
    return INITIAL_PRODUCTS;
  }
}

export async function saveProductToFirestore(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Product> {
  const now = new Date().toISOString();
  const id = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const fullProduct: Product = {
    ...productData,
    id,
    createdAt: (productData as any).createdAt || now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'products', id), fullProduct);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
  }
  return fullProduct;
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

// ========================
// BATCHES
// ========================
export async function fetchBatches(): Promise<Batch[]> {
  try {
    const snap = await getDocs(collection(db, 'batches'));
    const list: Batch[] = [];
    snap.forEach((d) => list.push(d.data() as Batch));
    return list;
  } catch (err) {
    return INITIAL_BATCHES;
  }
}

export async function saveBatchToFirestore(
  batchData: Omit<Batch, 'id' | 'createdAt'> & { id?: string }
): Promise<Batch> {
  const now = new Date().toISOString();
  const id = batchData.id || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const fullBatch: Batch = {
    ...batchData,
    id,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'batches', id), fullBatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `batches/${id}`);
  }
  return fullBatch;
}

// ========================
// MOVEMENTS
// ========================
export async function fetchMovements(): Promise<StockMovement[]> {
  try {
    const snap = await getDocs(collection(db, 'movements'));
    const list: StockMovement[] = [];
    snap.forEach((d) => list.push(d.data() as StockMovement));
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    return INITIAL_MOVEMENTS;
  }
}

export async function recordMovementToFirestore(movement: StockMovement): Promise<void> {
  try {
    await setDoc(doc(db, 'movements', movement.id), movement);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `movements/${movement.id}`);
  }
}

export async function updateMovementStatusInFirestore(
  movementId: string,
  status: 'aprovado' | 'rejeitado',
  admin: User,
  rejectionReason?: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'movements', movementId), {
      status,
      approvedBy: admin.id,
      approvedByName: admin.name,
      approvedAt: now,
      ...(rejectionReason ? { rejectionReason } : {}),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `movements/${movementId}`);
  }
}
