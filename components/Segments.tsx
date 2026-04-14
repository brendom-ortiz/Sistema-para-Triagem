
import React, { useState } from 'react';
import { Client } from '../types';

interface SegmentsProps {
  clients: Client[];
  onSelectClient: (id: string) => void;
}

const consortiumOptions = [
  { name: 'Imobiliário', icon: 'fa-house-chimney', color: 'bg-blue-500' },
  { name: 'Automotivo', icon: 'fa-car-side', color: 'bg-indigo-500' },
  { name: 'Pesados', icon: 'fa-truck-moving', color: 'bg-orange-500' },
  { name: 'Serviços', icon: 'fa-briefcase', color: 'bg-emerald-500' },
  { name: 'Motos', icon: 'fa-motorcycle', color: 'bg-rose-500' },
  { name: 'Consórcio de Ouro', icon: 'fa-coins', color: 'bg-yellow-400' },
  { name: 'Outros Bens', icon: 'fa-box-archive', color: 'bg-teal-600' }
];

const Segments: React.FC<SegmentsProps> = ({ clients, onSelectClient }) => {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClientsBySegment = activeSegment 
    ? clients.filter(c => c.consortiumType === activeSegment)
    : [];

  const finalFilteredClients = filteredClientsBySegment.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (c.cpf || '').includes(searchTerm) ||
    (c.quota || '').includes(searchTerm)
  );

  return (
    <div className="animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight font-outfit uppercase">Segmentos de Consórcio</h2>
        <p className="text-slate-400 font-medium">Filtre e gerencie propostas por tipo de bem ou serviço.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6 mb-12">
        {consortiumOptions.map((opt) => {
          const count = clients.filter(c => c.consortiumType === opt.name).length;
          const isActive = activeSegment === opt.name;
          
          return (
            <button
              key={opt.name}
              onClick={() => {
                setActiveSegment(isActive ? null : opt.name);
                setSearchTerm(''); // Clear search when switching segments
              }}
              className={`group relative p-6 rounded-3xl border transition-all duration-300 text-left ${
                isActive 
                  ? 'border-blue-500 bg-blue-600/10 shadow-2xl scale-105' 
                  : 'border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-sm hover:border-blue-500/30 hover:shadow-lg'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg ${opt.color} group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${opt.icon} text-xl`}></i>
              </div>
              <h3 className="font-black text-white mb-1 text-sm font-outfit uppercase tracking-tight">{opt.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{count} Clientes</span>
                {isActive && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeSegment ? (
        <div className="animate-slideUp">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm shadow-lg ${consortiumOptions.find(o => o.name === activeSegment)?.color}`}>
                 <i className={`fa-solid ${consortiumOptions.find(o => o.name === activeSegment)?.icon}`}></i>
              </div>
              <h3 className="text-xl font-black text-white font-outfit uppercase tracking-tight">Lista de Clientes: {activeSegment}</h3>
            </div>
            
            <div className="relative w-full md:w-96">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              <input 
                type="text" 
                placeholder="Pesquisar por Nome, CPF ou Cota..."
                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm shadow-inner text-white placeholder:text-slate-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {finalFilteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {finalFilteredClients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-[32px] border border-slate-800/50 shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="overflow-hidden">
                      <h4 className="font-black text-slate-200 group-hover:text-blue-400 transition-colors truncate font-outfit uppercase tracking-tight">{client.name}</h4>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">CPF: {client.cpf}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 uppercase tracking-widest border ${
                      client.progress === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {client.progress}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-4 font-black uppercase tracking-widest">
                    <span className="bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800">G: <b className="text-slate-300">{client.group}</b> / C: <b className="text-slate-300">{client.quota}</b></span>
                    <span className="flex items-center gap-2"><i className="fa-solid fa-user-tie text-blue-500/50"></i> {client.analystName}</span>
                  </div>

                  <div className="w-full h-2 bg-slate-950/50 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-700 shadow-[0_0_10px_rgba(37,99,235,0.3)] ${client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                      style={{ width: `${client.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[40px] p-16 text-center border-2 border-dashed border-slate-800">
               <div className="w-20 h-20 bg-slate-950/50 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6 border border-slate-800 shadow-inner">
                 <i className="fa-solid fa-folder-open text-3xl"></i>
               </div>
               <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Nenhum cliente encontrado com os critérios de busca.</p>
               {searchTerm && (
                 <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-6 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-blue-300 transition-colors"
                 >
                   Limpar busca
                 </button>
               )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-900/20 backdrop-blur-sm rounded-[40px] border-2 border-dashed border-slate-800/50">
          <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center text-slate-700 mx-auto mb-6 border border-slate-800 animate-pulse">
            <i className="fa-solid fa-hand-pointer text-3xl"></i>
          </div>
          <p className="text-slate-500 font-black text-lg font-outfit uppercase tracking-tight">Selecione um segmento acima para visualizar os clientes</p>
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Clique em um dos cards para começar</p>
        </div>
      )}
    </div>
  );
};

export default Segments;
