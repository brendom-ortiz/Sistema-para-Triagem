
import React, { useState } from 'react';
import { Client, DocumentType, DocumentCategory } from '../types';

interface DocumentManagementProps {
  clients: Client[];
  onUpdateClientInfo: (id: string, updates: Partial<Client>) => void;
}

type FilterType = 'pendentes' | 'concluidos';

const DocumentManagement: React.FC<DocumentManagementProps> = ({ clients, onUpdateClientInfo }) => {
  const [activeTab, setActiveTab] = useState<FilterType>('pendentes');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const pendentes = clients.filter(c => c.progress < 100);
  const concluidos = clients.filter(c => c.progress === 100);
  
  const displayedClients = (activeTab === 'pendentes' ? pendentes : concluidos).filter(c =>
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.cpf || '').includes(searchTerm) ||
    (c.group || '').includes(searchTerm) ||
    (c.quota || '').includes(searchTerm)
  );

  const defaultCategories = [
    DocumentType.ID,
    DocumentType.RESIDENCE,
    DocumentType.INCOME,
    DocumentType.CONTRACT,
    DocumentType.REQUEST_EMAIL
  ];

  const allRequiredTypes = Array.from(new Set(clients.flatMap(c => c.requiredDocumentTypes || []))) as DocumentCategory[];
  const allUploadedTypes = Array.from(new Set(clients.flatMap(c => (c.documents || []).map(d => d.type)))) as DocumentCategory[];
  const categories: DocumentCategory[] = Array.from(new Set([...defaultCategories, ...allRequiredTypes, ...allUploadedTypes])).filter(Boolean) as DocumentCategory[];

  const handleSelectAll = () => {
    if (selectedIds.size === displayedClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedClients.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getMissingDocs = (client: Client) => {
    return categories.filter(cat => 
      (client.requiredDocumentTypes || []).includes(cat) && 
      !(client.uploadedDocumentTypes || []).includes(cat)
    );
  };

  const getPortalUrl = (client: Client) => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?clientId=${client.id}`;
  };

  const triggerEmail = (client: Client) => {
    if (activeTab === 'pendentes') {
      const missing = getMissingDocs(client);
      const docsList = missing.map(d => `- ${d}`).join('\r\n');
      const portalUrl = getPortalUrl(client);
      const subject = encodeURIComponent(`[TRIAGEM ANCORADA] Pendência de Documentos - ${client.name || ''}`);
      const body = encodeURIComponent(
        `Olá, ${client.name || ''}.\r\n\r\n` +
        `Identificamos que ainda faltam documentos obrigatórios para o seu processo (G: ${client.group || ''} / C: ${client.quota || ''}).\r\n\r\n` +
        `DOCUMENTOS PENDENTES:\r\n${docsList}\r\n\r\n` +
        `Você pode enviar os documentos diretamente pelo nosso portal seguro clicando no link abaixo:\r\n` +
        `${portalUrl}\r\n\r\n` +
        `Por favor, envie-os o quanto antes.\r\n\r\n` +
        `Atenciosamente,\r\nTriagem Ancorada`
      );
      onUpdateClientInfo(client.id, { linkSentDate: new Date().toISOString() });
      window.location.href = `mailto:${client.email || ''}?subject=${subject}&body=${body}`;
    } else {
      const subject = encodeURIComponent(`[TRIAGEM ANCORADA] Documentação Concluída - ${client.name || ''}`);
      const body = encodeURIComponent(
        `Prezado(a) ${client.analystName || ''},\r\n\r\n` +
        `A documentação do cliente ${client.name || ''} está completa no sistema Triagem Ancorada.\r\n\r\n` +
        `DADOS: G: ${client.group || ''} / C: ${client.quota || ''}\r\n` +
        `STATUS: 100% CONCLUÍDO\r\n\r\n` +
        `Favor prosseguir com a análise.\r\n\r\n` +
        `Atenciosamente,\r\nPlataforma de Triagem`
      );
      window.location.href = `mailto:${client.analystEmail || ''}?subject=${subject}&body=${body}`;
    }
  };

  const handleMassAction = () => {
    const selectedClients = clients.filter(c => selectedIds.has(c.id));
    if (selectedClients.length === 0) return;

    if (window.confirm(`Deseja iniciar o disparo de e-mails para ${selectedClients.length} clientes selecionados? (Serão abertas várias janelas de e-mail sequencialmente)`)) {
      selectedClients.forEach((c, index) => {
        setTimeout(() => triggerEmail(c), index * 800);
      });
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Gestão de Envios</h2>
          <p className="text-gray-500 font-medium">Ações centralizadas para cobranças e notificações de analistas.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200">
          <button 
            onClick={() => { setActiveTab('pendentes'); setSelectedIds(new Set()); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'pendentes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <i className="fa-solid fa-hourglass-half"></i>
            Pendentes ({pendentes.length})
          </button>
          <button 
            onClick={() => { setActiveTab('concluidos'); setSelectedIds(new Set()); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'concluidos' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <i className="fa-solid fa-circle-check"></i>
            Concluídos ({concluidos.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mb-12">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Pesquisar por nome, cota ou CPF..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
             {selectedIds.size > 0 && (
               <button 
                onClick={handleMassAction}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                  activeTab === 'pendentes' ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-blue-600 text-white shadow-blue-100'
                }`}
               >
                 <i className="fa-solid fa-paper-plane"></i>
                 Disparar Selecionados ({selectedIds.size})
               </button>
             )}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400">
                <th className="px-8 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={selectedIds.size === displayedClients.length && displayedClients.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Grupo/Cota</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">
                  {activeTab === 'pendentes' ? 'Pendências' : 'Finalizado em'}
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-right pr-8">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedClients.length > 0 ? displayedClients.map(client => (
                <tr key={client.id} className={`hover:bg-gray-50/80 transition-colors group ${selectedIds.has(client.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleSelect(client.id)}
                    />
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                        client.clientType === 'PF' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {(client.name || 'C').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800 group-hover:text-blue-600 transition-colors">{client.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 font-bold text-gray-500 text-sm">
                    {client.group} / {client.quota}
                  </td>
                  <td className="px-4 py-5">
                    {activeTab === 'pendentes' ? (
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {getMissingDocs(client).map(doc => (
                          <span key={doc} className="px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-black uppercase rounded border border-red-100">
                            {(doc as string).split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                        Pronto para análise
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-5 text-right pr-8">
                    <button 
                      onClick={() => triggerEmail(client)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border ${
                        activeTab === 'pendentes' 
                          ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                      }`}
                    >
                      <i className={`fa-solid ${activeTab === 'pendentes' ? 'fa-envelope-open-text' : 'fa-paper-plane'} mr-2`}></i>
                      {activeTab === 'pendentes' ? 'Cobrar' : 'Notificar'}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                        <i className="fa-solid fa-folder-open text-3xl"></i>
                      </div>
                      <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <i className="fa-solid fa-envelope-circle-check text-[180px]"></i>
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black tracking-tight mb-2 uppercase">Fluxo de Cobrança Automática</h4>
            <p className="text-blue-100/70 text-sm font-medium mb-6 max-w-sm">Use as ações individuais ou em massa para manter os clientes engajados e sua esteira de documentação em dia.</p>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Média de Pendentes</p>
                <p className="text-2xl font-black">{clients.length > 0 ? Math.round((pendentes.length / clients.length) * 100) : 0}%</p>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Cotas no Alvo</p>
                <p className="text-2xl font-black">{concluidos.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex items-center gap-8">
           <div className="w-24 h-24 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-4xl shadow-lg border-2 border-white">
             <i className="fa-solid fa-check-double"></i>
           </div>
           <div>
              <h4 className="text-xl font-black text-gray-800 tracking-tight uppercase">Eficiência de Triagem</h4>
              <p className="text-gray-400 text-sm font-medium mb-4">A Triagem Ancorada valida documentos em segundos, reduzindo o tempo de espera do cliente final em até 40%.</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sistema Operacional Online</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;
