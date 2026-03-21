
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
        <div className="divide-y divide-gray-100">
          {clients.map((client) => (
            <div key={client.id} className="relative group/item">
              <button
                onClick={() => onSelect(client.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex flex-col gap-1 ${
                  selectedId === client.id ? 'bg-blue-50/50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[8px] font-black border ${
                      client.clientType === 'PF' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {client.clientType}
                    </span>
                    <span className="font-semibold text-gray-800 truncate">{client.name}</span>
                    {(client.totalDocsCount || 0) > (client.lastViewedDocsCount || 0) && (
                      <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Novos documentos"></span>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    client.progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {client.progress}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 pl-8">
                  <span>{client.clientType === 'PF' ? 'CPF' : 'CNPJ'}: {client.cpf}</span>
                  <span className="font-medium text-gray-700">G: {client.group} / C: {client.quota}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] pl-8">
                  <div className="flex flex-col gap-1">
                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 w-fit ${client.analystName ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                      <i className={`fa-solid ${client.analystName ? 'fa-user-tie' : 'fa-user-slash'} text-[9px]`}></i>
                      <span className="font-black uppercase text-[8px] mr-1">CAD:</span>
                      {client.analystName || 'Não Atribuído'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 w-fit ${client.analystContemplation ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                      <i className={`fa-solid ${client.analystContemplation ? 'fa-user-tie' : 'fa-user-slash'} text-[9px]`}></i>
                      <span className="font-black uppercase text-[8px] mr-1">CON:</span>
                      {client.analystContemplation || 'Não Atribuído'}
                    </span>
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <span className="text-blue-600 font-black uppercase text-[9px] tracking-widest">{client.consortiumType}</span>
                    {client.paymentStatus === 'PAID' && (
                      <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-100 font-black text-[8px] uppercase tracking-widest">
                        <i className="fa-solid fa-circle-check text-[9px]"></i>
                        PAGO
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
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
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-sm border border-gray-100"
                title="Excluir Cliente"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400 text-sm">
          Nenhum cliente encontrado com esses critérios.
        </div>
      )}
    </div>
  );
};

export default ClientList;
