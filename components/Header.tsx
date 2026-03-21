
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="group flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => onViewChange('dashboard')}
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300 animate-float">
              <i className="fa-solid fa-anchor text-lg animate-anchor-swing"></i>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-700 via-gray-600 to-blue-700 bg-[length:200%_auto] animate-[gradient_3s_linear_infinite] bg-clip-text text-transparent group-hover:tracking-wider transition-all duration-500">
              TRIAGEM ANCORADA
            </h1>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] -mt-1 group-hover:text-blue-500 transition-colors">
              Gestão Documental
            </span>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center gap-1">
          <button 
            onClick={() => onViewChange('dashboard')}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg relative ${
              activeView === 'dashboard' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Painel Central
            {activeView === 'dashboard' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>}
          </button>
          <button 
            onClick={() => onViewChange('management')}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg relative ${
              activeView === 'management' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Gestão de Envios
            {activeView === 'management' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>}
          </button>
          <button 
            onClick={() => onViewChange('segments')}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg relative ${
              activeView === 'segments' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Segmentos
            {activeView === 'segments' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>}
          </button>
          <button 
            onClick={() => onViewChange('analysts')}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg relative ${
              activeView === 'analysts' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Demanda do Analista
            {activeView === 'analysts' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>}
          </button>
          <button 
            onClick={() => onViewChange('reports')}
            className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg relative ${
              activeView === 'reports' 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Relatórios
            {activeView === 'reports' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>}
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-gray-800">SISTEMA ABERTO</p>
            <p className="text-[10px] text-gray-400">Acesso Administrativo</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
