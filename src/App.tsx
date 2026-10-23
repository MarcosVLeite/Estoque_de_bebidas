import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Product,
  Batch,
  StockMovement,
  MovementType,
  Role,
  FirebaseUserProfile,
} from './types';
import {
  getProducts,
  getBatches,
  getMovements,
  getSettings,
  findProductByBarcode,
  getDaysUntilExpiry,
} from './services/storage';
import {
  auth,
  db,
  testFirestoreConnection,
} from './services/firebase';
import {
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  logoutCurrentUser,
  fetchAllUsers,
} from './services/authService';
import {
  fetchProducts,
  fetchBatches,
  fetchMovements,
  saveProductToFirestore,
  saveBatchToFirestore,
  recordMovementToFirestore,
} from './services/firestoreData';

import { Header } from './components/common/Header';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { MovementsView } from './components/movements/MovementsView';
import { LossesView } from './components/losses/LossesView';
import { InventoryView } from './components/inventory/InventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { NewMovementModal } from './components/movements/NewMovementModal';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { InactivityWarningModal } from './components/common/InactivityWarningModal';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { X } from 'lucide-react';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'sidebar_desktop_open';

const getInitialDesktopSidebarState = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY);
  if (saved !== null) {
    return saved === 'true';
  }
  return true; // Default open on desktop
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar toggle state (desktop remembers last preference, mobile starts closed)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false; // Mobile starts closed
    }
    return getInitialDesktopSidebarState();
  });
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  // Data states
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [batches, setBatches] = useState<Batch[]>(getBatches());
  const [movements, setMovements] = useState<StockMovement[]>(getMovements());
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);

  // Modal states
  const [isHeaderScannerOpen, setIsHeaderScannerOpen] = useState(false);
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [movementInitialProduct, setMovementInitialProduct] = useState<Product | null>(null);
  const [movementInitialType, setMovementInitialType] = useState<MovementType>('entrada');
  const [movementInitialBatch, setMovementInitialBatch] = useState<Batch | null>(null);

  const [detailProductModal, setDetailProductModal] = useState<Product | null>(null);

  // Inactivity tracking
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(60);

  // 1. Firebase Authentication State Listener
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as FirebaseUserProfile;
          if (profile.status === 'aprovado' && profile.perfil) {
            setCurrentUser({
              id: profile.uid,
              name: profile.nome,
              email: profile.email,
              role: profile.perfil,
              status: profile.status,
              active: true,
              avatar: profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
              createdAt: profile.createdAt,
            });
          } else {
            // Pending, rejected, or deactivated
            await signOut(auth);
            setCurrentUser(null);
          }
        } else {
          await signOut(auth);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Failed to load profile on auth change', err);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Firestore Stock Data
  const refreshAllData = useCallback(async () => {
    try {
      const [prods, bts, movs] = await Promise.all([
        fetchProducts(),
        fetchBatches(),
        fetchMovements(),
      ]);
      setProducts(prods);
      setBatches(bts);
      setMovements(movs);
    } catch (e) {
      console.warn('Error refreshing Firestore data, using cached state', e);
      setProducts(getProducts());
      setBatches(getBatches());
      setMovements(getMovements());
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [currentUser, refreshAllData]);

  // 3. Track Pending User Requests for Administrator badge
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      try {
        const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
          let pending = 0;
          snapshot.forEach((d) => {
            const data = d.data() as FirebaseUserProfile;
            if (data.status === 'pendente') pending++;
          });
          setPendingUsersCount(pending);
        }, (err) => {
          console.warn('Users snapshot note:', err);
        });
        return () => unsub();
      } catch {}
    } else {
      setPendingUsersCount(0);
    }
  }, [currentUser]);

  // 4. Inactivity Listener
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    if (showInactivityWarning) {
      setShowInactivityWarning(false);
    }
  }, [showInactivityWarning]);

  useEffect(() => {
    const handleUserInteraction = () => resetActivity();
    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('click', handleUserInteraction);

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, [resetActivity]);

  // Inactivity countdown timer loop
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const settings = getSettings();
      const timeoutMins = settings.inactivityTimeoutMinutes;
      if (timeoutMins <= 0) return;

      const timeoutMs = timeoutMins * 60 * 1000;
      const elapsed = Date.now() - lastActivity;
      const remainingMs = timeoutMs - elapsed;

      if (remainingMs <= 0) {
        handleLogout();
        setShowInactivityWarning(false);
      } else if (remainingMs <= 60 * 1000) {
        setShowInactivityWarning(true);
        setSecondsUntilLogout(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, lastActivity, showInactivityWarning]);

  // 5. Window resize adapter (adapts between mobile and desktop)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile((prevMobile) => {
        if (prevMobile !== mobile) {
          if (mobile) {
            setIsSidebarOpen(false); // Mobile always begins closed
          } else {
            setIsSidebarOpen(getInitialDesktopSidebarState()); // Desktop restores preference
          }
        }
        return mobile;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 6. Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (window.innerWidth >= 1024) {
        localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'products') setSearchQuery('');
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    await logoutCurrentUser();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    resetActivity();
    refreshAllData();
  };

  const handleHeaderScan = (barcode: string) => {
    const existing = findProductByBarcode(barcode);
    if (existing) {
      setDetailProductModal(existing);
      setActiveTab('products');
    } else {
      setSearchQuery(barcode);
      setActiveTab('products');
    }
  };

  const handleOpenMovementModal = (
    product?: Product | null,
    type: MovementType = 'entrada',
    batch?: Batch | null
  ) => {
    setMovementInitialProduct(product || null);
    setMovementInitialType(type);
    setMovementInitialBatch(batch || null);
    setIsNewMovementModalOpen(true);
  };

  // Badge calculations
  const pendingLossesCount = movements.filter(
    (m) => m.type === 'perda' && m.status === 'pendente_aprovacao'
  ).length;

  const criticalExpiryCount = batches.filter((b) => {
    if (b.quantity <= 0) return false;
    const days = getDaysUntilExpiry(b.expirationDate);
    return days <= 15;
  }).length;

  const settings = getSettings();
  const inactivityMinutesLeft =
    settings.inactivityTimeoutMinutes > 0
      ? Math.max(
          0,
          Math.ceil(
            (settings.inactivityTimeoutMinutes * 60 * 1000 - (Date.now() - lastActivity)) / 60000
          )
        )
      : 0;

  // Show loading indicator while checking Firebase Auth session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center animate-bounce">
          🍺
        </div>
        <p className="text-xs font-semibold">Conectando ao Firebase...</p>
      </div>
    );
  }

  // If not logged in, render the real Firebase Login & Registration View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header with fixed Hamburger / X Button */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenScanner={() => setIsHeaderScannerOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSwitchRole={() => {}}
        onResetData={() => refreshAllData()}
        pendingApprovalsCount={currentUser.role === 'admin' && pendingUsersCount > 0 ? pendingUsersCount : pendingLossesCount}
        inactivityMinutesLeft={inactivityMinutesLeft}
        onNavigateToMovements={() => {
          if (currentUser.role === 'admin' && pendingUsersCount > 0) {
            handleSelectTab('users');
          } else {
            handleSelectTab('losses');
          }
        }}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Mobile Drawer Backdrop (Dark overlay with blur, closes menu on click) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-250 lg:hidden cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Overlay Drawer (Slides smoothly in 250ms from left) */}
      <aside
        id="app-sidebar-mobile"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl p-4 flex flex-col transition-transform duration-250 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Menu principal de navegação móvel"
        aria-hidden={!isSidebarOpen}
        inert={!isSidebarOpen ? true : undefined}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-extrabold text-slate-950 text-lg shadow">
              🍺
            </div>
            <div>
              <h2 className="font-extrabold text-white text-sm leading-tight">Estoque de Bebidas</h2>
              <p className="text-[10px] text-slate-400">Distribuidora & Depósito</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5 text-amber-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            currentUser={currentUser}
            pendingLossesCount={currentUser.role === 'admin' && pendingUsersCount > 0 ? pendingUsersCount : pendingLossesCount}
            criticalExpiryCount={criticalExpiryCount}
          />
        </div>
      </aside>

      {/* Main Body with Collapsible Desktop Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row">
        {/* Desktop Sidebar: slides and collapses smoothly in 250ms, expanding main content */}
        <aside
          id="app-sidebar-desktop"
          className={`hidden lg:block shrink-0 transition-all duration-250 ease-in-out overflow-hidden ${
            isSidebarOpen
              ? 'w-64 opacity-100 translate-x-0 mr-6'
              : 'w-0 opacity-0 -translate-x-6 mr-0 pointer-events-none'
          }`}
          aria-label="Menu principal de navegação"
          aria-hidden={!isSidebarOpen}
          inert={!isSidebarOpen ? true : undefined}
        >
          <div className="w-64">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              currentUser={currentUser}
              pendingLossesCount={currentUser.role === 'admin' && pendingUsersCount > 0 ? pendingUsersCount : pendingLossesCount}
              criticalExpiryCount={criticalExpiryCount}
            />
          </div>
        </aside>

        {/* Content View Container: Expands smoothly to occupy 100% width when menu is hidden */}
        <main className="flex-1 min-w-0 transition-all duration-250 ease-in-out">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              batches={batches}
              movements={movements}
              currentUser={currentUser}
              onNavigateToProducts={() => setActiveTab('products')}
              onNavigateToLosses={() => setActiveTab('losses')}
              onSelectProduct={(p) => setDetailProductModal(p)}
              onQuickMovement={(p, type) => handleOpenMovementModal(p, type)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
              onOpenMovement={(p, type, b) => handleOpenMovementModal(p, type, b)}
              searchFilter={searchQuery}
            />
          )}

          {activeTab === 'movements' && (
            <MovementsView
              movements={movements}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
              onOpenNewMovement={() => handleOpenMovementModal(null, 'entrada')}
            />
          )}

          {activeTab === 'losses' && (
            <LossesView
              products={products}
              batches={batches}
              movements={movements}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
              onOpenNewLossMovement={(p) => handleOpenMovementModal(p || null, 'perda')}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              products={products}
              batches={batches}
              movements={movements}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'users' && (
            <UsersView currentUser={currentUser} onRefreshData={refreshAllData} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewMovementModal
        isOpen={isNewMovementModalOpen}
        onClose={() => setIsNewMovementModalOpen(false)}
        onMovementCreated={refreshAllData}
        currentUser={currentUser}
        initialProduct={movementInitialProduct}
        initialType={movementInitialType}
        initialBatch={movementInitialBatch}
      />

      <ProductDetailModal
        isOpen={Boolean(detailProductModal)}
        onClose={() => setDetailProductModal(null)}
        product={detailProductModal}
        currentUser={currentUser}
        onMovement={(p, type, b) => handleOpenMovementModal(p, type, b)}
        onRefreshData={refreshAllData}
      />

      <BarcodeScannerModal
        isOpen={isHeaderScannerOpen}
        onClose={() => setIsHeaderScannerOpen(false)}
        onScan={handleHeaderScan}
        title="Busca Rápida de Bebida por Código"
        subtitle="Aponte para o código de barras para carregar a bebida correspondente"
      />

      <InactivityWarningModal
        isOpen={showInactivityWarning}
        secondsRemaining={secondsUntilLogout}
        onStayLoggedIn={resetActivity}
        onLogout={handleLogout}
      />
    </div>
  );
}
