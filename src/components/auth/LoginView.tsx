import React, { useState } from 'react';
import { User } from '../../types';
import {
  loginWithEmailAndPassword,
  loginWithGoogle,
  registerNewAccount,
  sendPasswordReset,
  FIREBASE_CONSOLE_AUTH_URL,
} from '../../services/authService';
import {
  Lock,
  Mail,
  User as UserIcon,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmacao, setRegConfirmacao] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password form
  const [resetEmail, setResetEmail] = useState('');

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(FIREBASE_CONSOLE_AUTH_URL);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleGoogleLogin = async () => {
    resetFormState();
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      setLoading(false);
      if (result.user) {
        onLoginSuccess(result.user);
      } else if (result.pendingMessage) {
        setSuccessMessage(result.pendingMessage);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Erro ao autenticar com Google.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    // Auto-complete domain if user typed username without @
    let targetEmail = loginEmail.trim();
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@estoque.com`;
    }

    try {
      const user = await loginWithEmailAndPassword(targetEmail, loginPassword);
      setLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      setLoading(false);
      const isNotAllowed =
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('operation-not-allowed') ||
        err?.message?.includes('provedor E-mail/Senha');
      if (isNotAllowed) {
        setShowSetupGuide(true);
      }
      setErrorMessage(err.message || 'Erro ao realizar login.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    let targetEmail = regEmail.trim();
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@estoque.com`;
    }

    try {
      const result = await registerNewAccount(
        regNome,
        targetEmail,
        regSenha,
        regConfirmacao
      );
      setLoading(false);
      setSuccessMessage(result.message);
      // Switch back to login view with email prefilled
      setLoginEmail(targetEmail);
      setLoginPassword('');
      setRegNome('');
      setRegEmail('');
      setRegSenha('');
      setRegConfirmacao('');
      setMode('login');
    } catch (err: any) {
      setLoading(false);
      const isNotAllowed =
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('operation-not-allowed') ||
        err?.message?.includes('provedor E-mail/Senha');
      if (isNotAllowed) {
        setShowSetupGuide(true);
      }
      setErrorMessage(err.message || 'Erro ao criar conta.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setLoading(true);

    let targetEmail = resetEmail.trim();
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@estoque.com`;
    }

    try {
      await sendPasswordReset(targetEmail);
      setLoading(false);
      setSuccessMessage(
        'E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.'
      );
      setResetEmail('');
    } catch (err: any) {
      setLoading(false);
      const isNotAllowed =
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('operation-not-allowed');
      if (isNotAllowed) {
        setShowSetupGuide(true);
      }
      setErrorMessage(err.message || 'Erro ao solicitar redefinição.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-3xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 mb-3 border border-amber-300/40">
          🍺
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Estoque de Bebidas
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Distribuidora & Depósito • Firebase Authentication & Cloud Firestore
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Quick Google Sign In (Always ready out-of-the-box!) */}
        {mode !== 'forgot_password' && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer border border-slate-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com conta Google</span>
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ou com e-mail e senha
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs (Login vs Criar Conta) */}
        {mode !== 'forgot_password' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                resetFormState();
                setMode('login');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                resetFormState();
                setMode('register');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* Firebase Console Step-by-Step Activation Guide */}
        {showSetupGuide && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-200 text-xs">
            <div className="flex items-start gap-2 mb-2 font-bold text-amber-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>Ativação necessária no Firebase Console</span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              O Firebase exige que o método <strong>E-mail/senha</strong> seja ativado no Console
              do projeto <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">knotted-hydra-hw2pc</code>:
            </p>

            <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-amber-500/20 text-[11px] text-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Acesse a aba <strong>Sign-in method</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Clique em <strong>E-mail/senha</strong> (Email/Password)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Marque a primeira opção <strong>Ativar</strong> e clique em <strong>Salvar</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={FIREBASE_CONSOLE_AUTH_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-center text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
              <span className="text-amber-300">Ou utilize o botão <strong>Entrar com Google</strong> acima para acesso imediato.</span>
              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="text-slate-400 hover:text-white underline ml-2 shrink-0"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Quick Admin Fill Helper */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Admin: <strong>MarcosLeite</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('MarcosLeite');
                  setLoginPassword('58236475');
                }}
                className="py-1 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                Preencher
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail ou Usuário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ex: marcosleite@estoque.com ou MarcosLeite"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Senha</label>
                <button
                  type="button"
                  onClick={() => {
                    resetFormState();
                    setResetEmail(loginEmail);
                    setMode('forgot_password');
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              <span>{loading ? 'Autenticando no Firebase...' : 'Entrar com E-mail'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 2. REGISTER / AUTO-CADASTRO MODE */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* First user bootstrap tip */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Primeiro Acesso:</strong> O primeiro usuário cadastrado nesta base é
                automaticamente aprovado como <strong>Administrador</strong>. Os demais usuários
                aguardam aprovação manual.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail Profissional *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ex: marcosleite@estoque.com ou seu e-mail"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Senha (mínimo 8 caracteres, com letra e número) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={regSenha}
                  onChange={(e) => setRegSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={regConfirmacao}
                  onChange={(e) => setRegConfirmacao(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              <span>{loading ? 'Gravando no Firebase...' : 'Criar Conta e Solicitar Acesso'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="mb-2">
              <h3 className="font-bold text-white text-sm">Redefinir Senha</h3>
              <p className="text-xs text-slate-400 mt-1">
                Informe o e-mail cadastrado para receber o link oficial de redefinição de senha do
                Firebase.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetFormState();
                  setMode('login');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Voltar ao Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
            </div>
          </form>
        )}

        {/* Bottom Helper link */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Instruções para ativar E-mail/Senha no Firebase Console</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 mt-5 text-center max-w-sm">
        🔒 Senhas protegidas por criptografia do Firebase Authentication. Nenhuma senha é armazenada
        em texto puro.
      </div>
    </div>
  );
};
