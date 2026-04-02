
import React from 'react';
import { Client } from '../types';

interface ClientListProps {
  clients: Client[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, selectedId, onSelect, onDelete }) => {
  return (
    <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
      {clients.length > 0 ? (
        <div className="divide-y divide-slate-800/50">
          {clients.map((client) => (
            <div key={client.id} className="relative group/item">
              <button
                onClick={() => onSelect(client.id)}
                className={`w-full text-left p-5 hover:bg-slate-800/30 transition-all flex flex-col gap-2 border-l-4 ${
                  selectedId === client.id 
                    ? 'bg-blue-600/10 border-blue-500 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]' 
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black border shadow-sm ${
                      client.clientType === 'PF' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {client.clientType}
                    </span>
                    <span className={`font-bold truncate tracking-tight ${selectedId === client.id ? 'text-white' : 'text-slate-300 group-hover/item:text-white'}`}>
                      {client.name}
                    </span>
                    {(client.totalDocsCount || 0) > (client.lastViewedDocsCount || 0) && (
                      <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" title="Novos documentos"></span>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-lg font-black tracking-tighter border ${
                    client.progress === 100 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                  }`}>
                    {client.progress}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-slate-500 pl-10">
                  <span className="font-medium">{client.clientType === 'PF' ? 'CPF' : 'CNPJ'}: {client.cpf}</span>
                  <span className="font-black text-slate-400 tracking-wider">G: {client.group} / C: {client.quota}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] pl-10">
                  <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-2 w-fit border ${client.analystName ? 'bg-blue-500/5 text-blue-400/80 border-blue-500/10' : 'bg-slate-900/50 text-slate-600 border-slate-800'}`}>
                      <i className={`fa-solid ${client.analystName ? 'fa-user-tie' : 'fa-user-slash'} text-[10px]`}></i>
                      <span className="font-black uppercase text-[8px] opacity-60 tracking-widest">CAD:</span>
                      <span className="font-bold">{client.analystName || 'Pendente'}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-2 w-fit border ${client.analystContemplation ? 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10' : 'bg-slate-900/50 text-slate-600 border-slate-800'}`}>
                      <i className={`fa-solid ${client.analystContemplation ? 'fa-user-tie' : 'fa-user-slash'} text-[10px]`}></i>
                      <span className="font-black uppercase text-[8px] opacity-60 tracking-widest">CON:</span>
                      <span className="font-bold">{client.analystContemplation || 'Pendente'}</span>
                    </span>
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-1.5">
                    <span className="text-blue-400 font-black uppercase text-[9px] tracking-[0.2em]">{client.consortiumType}</span>
                    {client.paymentStatus === 'PAID' && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-emerald-500/20 font-black text-[8px] uppercase tracking-widest shadow-sm">
                        <i className="fa-solid fa-circle-check text-[10px]"></i>
                        PAGO
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 w-full bg-slate-800/50 h-1 rounded-full overflow-hidden border border-slate-700/30">
                  <div 
                    className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)] ${
                      client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} 
                    style={{ width: `${client.progress}%` }}
                  ></div>
                </div>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Excluir permanentemente o cadastro de ${client.name}?`)) {
                    onDelete(client.id);
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-900 text-red-400 hover:text-white hover:bg-red-600 rounded-xl flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-xl border border-slate-800"
                title="Excluir Cliente"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-600 text-sm font-bold uppercase tracking-widest">
          <i className="fa-solid fa-ghost text-2xl mb-4 block opacity-20"></i>
          Nenhum cliente encontrado
        </div>
      )}
    </div>
  );
};

export default ClientList;
