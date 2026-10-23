import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  addDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { User, Role, UserStatus, FirebaseUserProfile, AuditLog } from '../types';

export const FIREBASE_CONSOLE_AUTH_URL =
  'https://console.firebase.google.com/project/knotted-hydra-hw2pc/authentication/providers';
const BOOTSTRAP_ADMIN_EMAILS = [
  'santosleitemv1@gmail.com',
  'marcosleite@estoque.com',
];

// Rate-limiting / Failed attempt tracking
const FAILED_ATTEMPTS_KEY = 'estoque_failed_login_attempts';
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface FailedAttemptTracker {
  count: number;
  lockoutUntil?: number;
}

function getFailedAttempts(): FailedAttemptTracker {
  try {
    const raw = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { count: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0 };
  }
}

function recordFailedAttempt(): { isLocked: boolean; minutesRemaining?: number } {
  const current = getFailedAttempts();
  const now = Date.now();

  if (current.lockoutUntil && current.lockoutUntil > now) {
    const minutesRemaining = Math.ceil((current.lockoutUntil - now) / 60000);
    return { isLocked: true, minutesRemaining };
  }

  const newCount = (current.count || 0) + 1;
  let lockoutUntil: number | undefined;

  if (newCount >= 5) {
    lockoutUntil = now + LOCKOUT_DURATION_MS;
  }

  sessionStorage.setItem(
    FAILED_ATTEMPTS_KEY,
    JSON.stringify({ count: newCount, lockoutUntil })
  );

  if (lockoutUntil) {
    return { isLocked: true, minutesRemaining: 5 };
  }
  return { isLocked: false };
}

function clearFailedAttempts(): void {
  try {
    sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
  } catch {}
}

// ========================
// USER REGISTRATION
// ========================
export async function registerNewAccount(
  nome: string,
  email: string,
  senha: string,
  confirmacaoSenha: string
): Promise<{ success: boolean; isFirstAdmin: boolean; message: string }> {
  // Input validations
  const cleanNome = nome.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanNome || cleanNome.length < 3) {
    throw new Error('Informe o nome completo (mínimo de 3 caracteres).');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Informe um e-mail válido.');
  }

  // Password rules: at least 8 chars, must contain letter and number
  if (senha.length < 8) {
    throw new Error('A senha deve ter no mínimo 8 caracteres.');
  }
  const hasLetter = /[a-zA-Z]/.test(senha);
  const hasNumber = /[0-9]/.test(senha);
  if (!hasLetter || !hasNumber) {
    throw new Error('A senha deve conter ao menos uma letra e um número.');
  }

  if (senha !== confirmacaoSenha) {
    throw new Error('As senhas não coincidem. Digite novamente.');
  }

  // Check if this email or users collection is currently empty to determine if this is the first administrator
  let isFirstUser = BOOTSTRAP_ADMIN_EMAILS.includes(cleanEmail);
  if (!isFirstUser) {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      isFirstUser = usersSnapshot.empty;
    } catch (err) {
      console.warn('Could not inspect users collection before signup, defaulting to standard flow', err);
    }
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, cleanEmail, senha);
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      const customErr = new Error(
        'O provedor E-mail/Senha não está ativado no Firebase Console para este projeto. Ative-o em Authentication > Sign-in method ou use o botão "Entrar com Google".'
      );
      (customErr as any).code = 'auth/operation-not-allowed';
      throw customErr;
    }
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já está cadastrado no sistema.');
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('O formato do e-mail é inválido.');
    }
    throw new Error(err.message || 'Erro ao criar conta no Firebase Authentication.');
  }

  const uid = cred.user.uid;
  const now = new Date().toISOString();

  // If first user, automatically approved as Administrator!
  const status: UserStatus = isFirstUser ? 'aprovado' : 'pendente';
  const perfil: Role | null = isFirstUser ? 'admin' : null;

  const profileData: FirebaseUserProfile = {
    uid,
    nome: cleanNome,
    email: cleanEmail,
    status,
    perfil,
    createdAt: now,
    ...(isFirstUser
      ? {
          approvedAt: now,
          approvedByName: 'Sistema (Primeiro Administrador)',
        }
      : {}),
  };

  // NEVER store the password in Firestore!
  try {
    await setDoc(doc(db, 'users', uid), profileData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  // Record audit log if first user was auto-approved as admin
  if (isFirstUser) {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action: 'aprovacao',
        targetUserId: uid,
        targetUserName: cleanNome,
        performedBy: uid,
        performedByName: 'Sistema (Auto-bootstrapping)',
        details: 'Primeiro usuário cadastrado: atribuído perfil de Administrador.',
        timestamp: now,
      });
    } catch {}
  }

  // Sign out after registration as requested:
  // "Depois do cadastro, mostrar a mensagem: 'Cadastro enviado! Aguarde a aprovação do administrador.' e deslogar a pessoa."
  await signOut(auth);

  return {
    success: true,
    isFirstAdmin: isFirstUser,
    message: isFirstUser
      ? 'Conta de Administrador criada com sucesso! Faça login para gerenciar o estoque.'
      : 'Cadastro enviado! Aguarde a aprovação do administrador.',
  };
}

// ========================
// USER LOGIN
// ========================
export async function loginWithEmailAndPassword(
  email: string,
  senha: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = senha.trim();

  // Check rate limiting / lockout
  const attemptStatus = getFailedAttempts();
  const now = Date.now();
  if (attemptStatus.lockoutUntil && attemptStatus.lockoutUntil > now) {
    const mins = Math.ceil((attemptStatus.lockoutUntil - now) / 60000);
    throw new Error(
      `Muitas tentativas incorretas seguidas. Por segurança, aguarde ${mins} minuto(s) antes de tentar novamente.`
    );
  }

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      const customErr = new Error(
        'O provedor E-mail/Senha não está ativado no Firebase Console para este projeto. Ative-o em Authentication > Sign-in method ou use o botão "Entrar com Google".'
      );
      (customErr as any).code = 'auth/operation-not-allowed';
      throw customErr;
    }
    const failInfo = recordFailedAttempt();
    if (failInfo.isLocked) {
      throw new Error(
        `Limite de 5 tentativas atingido. Acesso bloqueado temporariamente por ${failInfo.minutesRemaining} minutos.`
      );
    }
    // Generic friendly error message as requested without revealing email existence
    throw new Error('E-mail ou senha incorretos.');
  }

  const uid = cred.user.uid;

  // Read status from Firestore
  let profileDoc;
  try {
    profileDoc = await getDoc(doc(db, 'users', uid));
  } catch (err) {
    await signOut(auth);
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  if (!profileDoc || !profileDoc.exists()) {
    await signOut(auth);
    throw new Error('Registro do usuário não encontrado no banco de dados.');
  }

  const profile = profileDoc.data() as FirebaseUserProfile;

  // Status checks as strictly required:
  if (profile.status === 'pendente') {
    await signOut(auth);
    throw new Error('Sua conta ainda está aguardando aprovação do administrador.');
  }

  if (profile.status === 'rejeitado') {
    await signOut(auth);
    const reasonText = profile.rejectionReason
      ? ` Motivo: "${profile.rejectionReason}".`
      : '';
    throw new Error(`Seu cadastro não foi aprovado.${reasonText} Fale com o administrador.`);
  }

  if (profile.status === 'desativado') {
    await signOut(auth);
    throw new Error('Sua conta está desativada. Fale com o administrador.');
  }

  if (profile.status !== 'aprovado' || !profile.perfil) {
    await signOut(auth);
    throw new Error('Acesso bloqueado: perfil de acesso ainda não definido.');
  }

  // Clear failed attempts counter upon successful login
  clearFailedAttempts();

  // Return authenticated user representation
  return {
    id: profile.uid,
    name: profile.nome,
    email: profile.email,
    role: profile.perfil,
    status: profile.status,
    active: true,
    avatar: profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    createdAt: profile.createdAt,
    lastLogin: new Date().toISOString(),
  };
}

// ========================
// GOOGLE SIGN-IN
// ========================
export async function loginWithGoogle(): Promise<{ user?: User; pendingMessage?: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let cred;
  try {
    cred = await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Janela de login Google fechada antes da confirmação.');
    }
    throw new Error(err.message || 'Erro ao conectar com Google.');
  }

  const firebaseUser = cred.user;
  const uid = firebaseUser.uid;
  const email = (firebaseUser.email || '').toLowerCase();
  const nome = firebaseUser.displayName || 'Usuário Google';
  const avatar = firebaseUser.photoURL || undefined;

  // Check if profile exists in Firestore
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const profile = userDocSnap.data() as FirebaseUserProfile;

    if (profile.status === 'pendente') {
      await signOut(auth);
      throw new Error('Sua conta Google ainda está aguardando aprovação do administrador.');
    }
    if (profile.status === 'rejeitado') {
      await signOut(auth);
      const reasonText = profile.rejectionReason
        ? ` Motivo: "${profile.rejectionReason}".`
        : '';
      throw new Error(`Seu cadastro não foi aprovado.${reasonText} Fale com o administrador.`);
    }
    if (profile.status === 'desativado') {
      await signOut(auth);
      throw new Error('Sua conta está desativada. Fale com o administrador.');
    }
    if (profile.status !== 'aprovado' || !profile.perfil) {
      await signOut(auth);
      throw new Error('Acesso bloqueado: perfil de acesso ainda não definido.');
    }

    clearFailedAttempts();
    return {
      user: {
        id: profile.uid,
        name: profile.nome,
        email: profile.email,
        role: profile.perfil,
        status: profile.status,
        active: true,
        avatar: profile.avatar || avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: profile.createdAt,
        lastLogin: new Date().toISOString(),
      },
    };
  }

  // New Google user: determine if first admin
  let isFirstUser = BOOTSTRAP_ADMIN_EMAILS.includes(email);
  if (!isFirstUser) {
    try {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      isFirstUser = allUsersSnap.empty;
    } catch {
      isFirstUser = false;
    }
  }

  const now = new Date().toISOString();
  const status: UserStatus = isFirstUser ? 'aprovado' : 'pendente';
  const perfil: Role | null = isFirstUser ? 'admin' : null;

  const newProfile: FirebaseUserProfile = {
    uid,
    nome,
    email,
    status,
    perfil,
    avatar,
    createdAt: now,
    ...(isFirstUser
      ? {
          approvedAt: now,
          approvedByName: 'Sistema (Primeiro Administrador Google)',
        }
      : {}),
  };

  try {
    await setDoc(userDocRef, newProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  if (isFirstUser) {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action: 'aprovacao',
        targetUserId: uid,
        targetUserName: nome,
        performedBy: uid,
        performedByName: 'Sistema (Auto-bootstrapping Google)',
        details: 'Primeiro usuário cadastrado via Google: atribuído perfil de Administrador.',
        timestamp: now,
      });
    } catch {}

    clearFailedAttempts();
    return {
      user: {
        id: uid,
        name: nome,
        email,
        role: 'admin',
        status: 'aprovado',
        active: true,
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: now,
        lastLogin: now,
      },
    };
  } else {
    await signOut(auth);
    return {
      pendingMessage: 'Cadastro com Google recebido! Aguarde a aprovação do administrador para liberar seu acesso.',
    };
  }
}

// ========================
// PASSWORD RESET
// ========================
export async function sendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Informe o e-mail cadastrado para redefinir a senha.');
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      const customErr = new Error(
        'O provedor E-mail/Senha precisa ser ativado no Firebase Console para este projeto.'
      );
      (customErr as any).code = 'auth/operation-not-allowed';
      throw customErr;
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('E-mail em formato inválido.');
    }
    throw new Error('Não foi possível enviar o e-mail de redefinição. Verifique o endereço digitado.');
  }
}

// ========================
// SIGNOUT
// ========================
export async function logoutCurrentUser(): Promise<void> {
  await signOut(auth);
}

// ========================
// ADMIN MANAGEMENT METHODS
// ========================
export async function fetchAllUsers(): Promise<FirebaseUserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const list: FirebaseUserProfile[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as FirebaseUserProfile);
    });
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

export async function approveUserRequest(
  adminUser: User,
  targetUid: string,
  targetName: string,
  perfil: Role
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas Administradores podem aprovar usuários.');
  }

  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      status: 'aprovado',
      perfil,
      approvedAt: now,
      approvedBy: adminUser.id,
      approvedByName: adminUser.name,
      rejectionReason: '',
      updatedAt: now,
    });

    // Record audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'aprovacao',
      targetUserId: targetUid,
      targetUserName: targetName,
      performedBy: adminUser.id,
      performedByName: adminUser.name,
      details: `Aprovado com perfil de: ${perfil.toUpperCase()}`,
      timestamp: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function rejectUserRequest(
  adminUser: User,
  targetUid: string,
  targetName: string,
  motivo?: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas Administradores podem rejeitar usuários.');
  }

  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      status: 'rejeitado',
      perfil: null,
      rejectionReason: motivo?.trim() || 'Sem motivo detalhado',
      approvedAt: now,
      approvedBy: adminUser.id,
      approvedByName: adminUser.name,
      updatedAt: now,
    });

    // Record audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: 'rejeicao',
      targetUserId: targetUid,
      targetUserName: targetName,
      performedBy: adminUser.id,
      performedByName: adminUser.name,
      details: `Rejeitado. Motivo: ${motivo?.trim() || 'Nenhum'}`,
      timestamp: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function updateUserRole(
  adminUser: User,
  targetUid: string,
  targetName: string,
  newRole: Role
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas Administradores podem alterar perfis.');
  }

  // Critical constraint: Check that we don't demote the last active administrator!
  if (newRole !== 'admin') {
    const all = await fetchAllUsers();
    const activeAdmins = all.filter(
      (u) => u.status === 'aprovado' && u.perfil === 'admin'
    );
    if (activeAdmins.length <= 1 && activeAdmins.some((u) => u.uid === targetUid)) {
      throw new Error(
        'Operação bloqueada: não é permitido rebaixar o único administrador ativo do sistema.'
      );
    }
  }

  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      perfil: newRole,
      updatedAt: now,
    });

    await addDoc(collection(db, 'auditLogs'), {
      action: 'alteracao_perfil',
      targetUserId: targetUid,
      targetUserName: targetName,
      performedBy: adminUser.id,
      performedByName: adminUser.name,
      details: `Perfil alterado para: ${newRole.toUpperCase()}`,
      timestamp: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function toggleUserStatus(
  adminUser: User,
  targetUid: string,
  targetName: string,
  currentStatus: UserStatus
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Apenas Administradores podem ativar ou desativar usuários.');
  }

  const nextStatus: UserStatus = currentStatus === 'aprovado' ? 'desativado' : 'aprovado';

  // Critical constraint: Ensure we don't deactivate the last administrator
  if (nextStatus === 'desativado') {
    const all = await fetchAllUsers();
    const target = all.find((u) => u.uid === targetUid);
    if (target?.perfil === 'admin') {
      const activeAdmins = all.filter(
        (u) => u.status === 'aprovado' && u.perfil === 'admin'
      );
      if (activeAdmins.length <= 1) {
        throw new Error(
          'Operação bloqueada: não é permitido desativar o último administrador ativo do sistema.'
        );
      }
    }
  }

  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      status: nextStatus,
      updatedAt: now,
    });

    await addDoc(collection(db, 'auditLogs'), {
      action: nextStatus === 'desativado' ? 'desativacao' : 'reativacao',
      targetUserId: targetUid,
      targetUserName: targetName,
      performedBy: adminUser.id,
      performedByName: adminUser.name,
      details: `Status alterado de ${currentStatus} para ${nextStatus}`,
      timestamp: now,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const snapshot = await getDocs(collection(db, 'auditLogs'));
    const list: AuditLog[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'auditLogs');
    return [];
  }
}
