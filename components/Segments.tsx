
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
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cpf.includes(searchTerm) ||
    c.quota.includes(searchTerm)
  );

  return (
    <div className="animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Segmentos de Consórcio</h2>
        <p className="text-slate-500">Filtre e gerencie propostas por tipo de bem ou serviço.</p>
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
              className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                isActive 
                  ? 'border-indigo-600 bg-white shadow-xl scale-105' 
                  : 'border-white bg-white shadow-sm hover:border-indigo-200 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg ${opt.color} group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${opt.icon} text-xl`}></i>
              </div>
              <h3 className="font-bold text-slate-800 mb-1 text-sm">{opt.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{count} Clientes</span>
                {isActive && (
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {activeSegment ? (
        <div className="animate-slideUp">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-200 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs ${consortiumOptions.find(o => o.name === activeSegment)?.color}`}>
                 <i className={`fa-solid ${consortiumOptions.find(o => o.name === activeSegment)?.icon}`}></i>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Lista de Clientes: {activeSegment}</h3>
            </div>
            
            <div className="relative w-full md:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input 
                type="text" 
                placeholder="Pesquisar por Nome, CPF ou Cota..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {finalFilteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {finalFilteredClients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{client.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">CPF: {client.cpf}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      client.progress === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {client.progress}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="bg-slate-50 px-2 py-1 rounded">G: <b>{client.group}</b> / C: <b>{client.quota}</b></span>
                    <span className="flex items-center gap-1"><i className="fa-solid fa-user-tie text-[10px]"></i> {client.analystName}</span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${client.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${client.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-100">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                 <i className="fa-solid fa-folder-open text-2xl"></i>
               </div>
               <p className="text-slate-400 font-medium">Nenhum cliente encontrado com os critérios de busca.</p>
               {searchTerm && (
                 <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
                 >
                   Limpar busca
                 </button>
               )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-100/50 rounded-[40px] border-2 border-dashed border-slate-200">
          <i className="fa-solid fa-hand-pointer text-4xl text-slate-300 mb-4 animate-bounce"></i>
          <p className="text-slate-400 font-bold text-lg">Selecione um segmento acima para visualizar os clientes</p>
        </div>
      )}
    </div>
  );
};

export default Segments;
