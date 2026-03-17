
import React from 'react';
import { Client } from '../types';

interface ClientListProps {
  clients: Client[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, selectedId, onSelect }) => {
  return (
    <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
      {clients.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {clients.map((client) => (
            <button
              key={client.id}
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
              <div className="flex items-center gap-1.5 mt-1 text-[10px] pl-8">
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <i className="fa-solid fa-user-tie text-[9px]"></i>
                  {client.analystName}
                </span>
                <span className="text-blue-600 font-medium truncate">{client.consortiumType}</span>
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
