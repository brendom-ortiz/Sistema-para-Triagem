
import React, { useState, useEffect } from 'react';
import { ViewType } from '../App';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

interface HeaderProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, onViewChange }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error:", error);
      alert(`Erro ao fazer login: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-2xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div 
          className="group flex items-center gap-4 cursor-pointer select-none" 
          onClick={() => onViewChange('dashboard')}
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-900 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 animate-float">
              <i className="fa-solid fa-anchor text-xl animate-anchor-swing"></i>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter font-outfit bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] bg-clip-text text-transparent group-hover:tracking-normal transition-all duration-500">
              TRIAGEM ANCORADA
            </h1>
            <div className="flex items-center gap-2 -mt-1">
              <span className="h-[1px] w-4 bg-blue-500/50"></span>
              <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.3em] group-hover:text-blue-300 transition-colors">
                Gestão Documental
              </span>
            </div>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50">
          <button 
            onClick={() => onViewChange('dashboard')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative group/btn ${
              activeView === 'dashboard' 
                ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Painel Central
            {activeView === 'dashboard' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-full blur-[2px]"></span>}
          </button>
          <button 
            onClick={() => onViewChange('management')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative group/btn ${
              activeView === 'management' 
                ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Gestão de Envios
            {activeView === 'management' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-full blur-[2px]"></span>}
          </button>
          <button 
            onClick={() => onViewChange('segments')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative group/btn ${
              activeView === 'segments' 
                ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Segmentos
            {activeView === 'segments' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-full blur-[2px]"></span>}
          </button>
          <button 
            onClick={() => onViewChange('analysts')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative group/btn ${
              activeView === 'analysts' 
                ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Analistas
            {activeView === 'analysts' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-full blur-[2px]"></span>}
          </button>
          <button 
            onClick={() => onViewChange('reports')}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative group/btn ${
              activeView === 'reports' 
                ? 'text-white bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Relatórios
            {activeView === 'reports' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-full blur-[2px]"></span>}
          </button>
        </nav>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right border-r border-slate-800 pr-6">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">SISTEMA ATIVO</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase">Admin Root</p>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="" className="w-9 h-9 rounded-full border-2 border-blue-500/30 shadow-lg" />
              <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg"
            >
              Acessar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
