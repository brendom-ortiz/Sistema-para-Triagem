
import React, { useState } from 'react';
import { Analyst, Client } from '../types';

interface AnalystManagementProps {
  analysts: Analyst[];
  clients: Client[];
  onAdd: (analyst: Analyst) => void;
  onUpdate: (id: string, updates: Partial<Analyst>) => void;
  onRemove: (id: string) => void;
  onUpdateClientInfo: (id: string, updates: Partial<Client>) => void;
}

const AnalystManagement: React.FC<AnalystManagementProps> = ({ analysts, clients, onAdd, onUpdate, onRemove, onUpdateClientInfo }) => {
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Cadastro' as Analyst['role'] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        ...formData
      });
    }
    setFormData({ name: '', email: '', role: 'Cadastro' });
  };

  const handleEdit = (analyst: Analyst) => {
    setEditingId(analyst.id);
    setFormData({ name: analyst.name, email: analyst.email, role: analyst.role });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getClientsForAnalyst = (analystName: string) => {
    if (!analystName || !clients) return [];
    const normalizedAnalystName = analystName.trim().toLowerCase();
    return clients.filter(c => 
      (c.analystName && c.analystName.trim().toLowerCase() === normalizedAnalystName) || 
      (c.analystContemplation && c.analystContemplation.trim().toLowerCase() === normalizedAnalystName)
    );
  };

  const isSameAnalyst = (name1: string | undefined, name2: string | undefined) => {
    if (!name1 || !name2) return false;
    return name1.trim().toLowerCase() === name2.trim().toLowerCase();
  };

  const selectedAnalyst = analysts.find(a => a.id === selectedAnalystId);
  const analystClients = selectedAnalyst ? getClientsForAnalyst(selectedAnalyst.name) : [];
  
  // Total de demandas é a soma das carteiras de todos os analistas
  const totalDemands = analysts.reduce((acc, a) => acc + getClientsForAnalyst(a.name).length, 0);

  // Busca global de clientes para localizar analista responsável
  const searchedClients = clientSearchTerm.length > 2 
    ? clients.filter(c => 
        (c.name?.toLowerCase() || '').includes(clientSearchTerm.toLowerCase()) ||
        (c.cpf || '').includes(clientSearchTerm) ||
        (c.group || '').includes(clientSearchTerm) ||
        (c.quota || '').includes(clientSearchTerm)
      ) 
    : [];

  return (
    <div className="animate-fadeIn pb-12">
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Demanda do Analista</h2>
            <p className="text-gray-500 font-medium">Acompanhamento de carteiras e gestão de demandas.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-xs">
                <i className="fa-solid fa-user-tie"></i>
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Analistas</p>
                <p className="text-sm font-black text-gray-800 leading-none">{analysts.length}</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-xs">
                <i className="fa-solid fa-briefcase"></i>
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Demandas</p>
                <p className="text-sm font-black text-gray-800 leading-none">{totalDemands}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mecanismo de Busca Global de Clientes (Onde está o cliente?) */}
        {!selectedAnalystId && (
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-10 transition-opacity"></div>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"></i>
              <input 
                type="text" 
                placeholder="Localizar analista por cliente/cota..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold shadow-sm"
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
              />
              {clientSearchTerm.length > 0 && (
                <button 
                  onClick={() => setClientSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>

            {/* Resultados da busca rápida */}
            {clientSearchTerm.length > 2 && searchedClients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-80 overflow-y-auto custom-scrollbar animate-slideUp">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resultados Encontrados</span>
                </div>
                {searchedClients.map(client => (
                  <div key={client.id} className="p-4 hover:bg-blue-50/50 border-b border-gray-50 last:border-0 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-black text-gray-800">{client.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">G: {client.group} / C: {client.quota}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                          {client.progress}% Concluído
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Cadastro</p>
                        <p className="text-[10px] font-bold text-gray-700 truncate">{client.analystName || 'Não Atribuído'}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Contemplação</p>
                        <p className="text-[10px] font-bold text-gray-700 truncate">{client.analystContemplation || 'Não Atribuído'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {clientSearchTerm.length > 2 && searchedClients.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-6 text-center">
                <i className="fa-solid fa-face-frown text-gray-200 text-2xl mb-2"></i>
                <p className="text-xs font-bold text-gray-400">Nenhum cliente ou cota localizada.</p>
              </div>
            )}
          </div>
        )}

        {selectedAnalystId && (
          <button 
            onClick={() => setSelectedAnalystId(null)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Voltar para Lista
          </button>
        )}
      </div>

      {!selectedAnalystId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 sticky top-24">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i className={`fa-solid ${editingId ? 'fa-pen-to-square' : 'fa-plus'} text-blue-600`}></i>
                {editingId ? 'Editar Analista' : 'Novo Analista'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Pedro Santos"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="exemplo@consorcioancora.com.br"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Atuação Principal</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Analyst['role']})}
                  >
                    <option value="Cadastro">Cadastro</option>
                    <option value="Contemplação">Contemplação</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => { setEditingId(null); setFormData({ name: '', email: '', role: 'Cadastro' }); }}
                      className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    className={`flex-[2] py-3.5 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95`}
                  >
                    {editingId ? 'Atualizar Perfil' : 'Salvar Analista'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
               <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Analistas Cadastrados</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {analysts.map(analyst => {
                   const analystPortfolio = getClientsForAnalyst(analyst.name);
                   const clientCount = analystPortfolio.length;
                   return (
                     <div key={analyst.id} className="group relative bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-white transition-all overflow-hidden flex flex-col">
                       <div className="p-5 flex items-center justify-between">
                         <div 
                          className="flex items-center gap-4 cursor-pointer flex-grow"
                          onClick={() => setSelectedAnalystId(analyst.id)}
                         >
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm font-black border border-gray-50 group-hover:scale-105 transition-transform">
                             {analyst.name.charAt(0)}
                           </div>
                           <div>
                             <p className="text-sm font-black text-gray-800 group-hover:text-blue-600 transition-colors">{analyst.name}</p>
                             <p className="text-[10px] text-gray-400 font-medium mb-1">{analyst.email}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                  {analyst.role}
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                  clientCount > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                                }`}>
                                  <i className="fa-solid fa-briefcase mr-1"></i>
                                  {clientCount} {clientCount === 1 ? 'Demanda' : 'Demandas'}
                                </span>
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex flex-col gap-1 ml-4">
                           <button 
                            onClick={() => handleEdit(analyst)}
                            className="p-2 text-gray-300 hover:text-amber-500 transition-all rounded-lg hover:bg-amber-50"
                            title="Editar analista"
                           >
                             <i className="fa-solid fa-pen-to-square"></i>
                           </button>
                           <button 
                            onClick={() => onRemove(analyst.id)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                            title="Excluir analista"
                           >
                             <i className="fa-solid fa-trash-can"></i>
                           </button>
                         </div>
                       </div>
                       <div 
                        className="bg-blue-600/5 py-2 px-5 text-center text-[9px] font-black uppercase tracking-widest text-blue-400 cursor-pointer hover:bg-blue-600 hover:text-white transition-all"
                        onClick={() => setSelectedAnalystId(analyst.id)}
                       >
                         Ver demanda detalhada
                       </div>
                     </div>
                   );
                 })}
                 {analysts.length === 0 && (
                   <div className="col-span-full py-20 text-center text-gray-400">
                     <i className="fa-solid fa-user-slash text-4xl mb-4 opacity-20"></i>
                     <p className="font-bold uppercase text-xs tracking-widest">Nenhum analista cadastrado no sistema.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-slideUp bg-white rounded-[32px] shadow-sm border border-gray-100 p-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-[32px] flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-100">
                {selectedAnalyst?.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">{selectedAnalyst?.name}</h3>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">{selectedAnalyst?.email}</p>
                <div className="flex items-center gap-3">
                   <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg border border-blue-100">
                     Analista: {selectedAnalyst?.role}
                   </span>
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">
                     Total de Demandas: {analystClients.length}
                   </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleEdit(selectedAnalyst!)}
              className="px-6 py-3 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-amber-100"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i>
              Editar Perfil
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 border-b border-gray-50 pb-2">Demandas Detalhadas</h4>
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Grupo/Cota</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Responsabilidade</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Link Portal</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Andamento</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analystClients.length > 0 ? analystClients.map(client => {
                  const hasNewDocs = (client.documents?.length || 0) > (client.lastViewedDocsCount || 0);
                  
                  return (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-gray-800 group-hover:text-blue-600 transition-colors">{client.name}</p>
                        {hasNewDocs && (
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Novos documentos enviados!"></span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{client.consortiumType}</p>
                    </td>
                    <td className="py-5 font-bold text-gray-500 text-sm">{client.group} / {client.quota}</td>
                    <td className="py-5">
                      <div className="flex flex-col gap-1">
                        {isSameAnalyst(client.analystName, selectedAnalyst?.name) && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border bg-blue-50 text-blue-600 border-blue-100 w-fit">
                            Cadastro
                          </span>
                        )}
                        {isSameAnalyst(client.analystContemplation, selectedAnalyst?.name) && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border bg-emerald-50 text-emerald-600 border-emerald-100 w-fit">
                            Contemplação
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border w-fit ${
                          client.linkSentDate 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {client.linkSentDate ? `Enviado: ${new Date(client.linkSentDate).toLocaleDateString()}` : 'Não Enviado'}
                        </span>
                        <button 
                          onClick={() => onUpdateClientInfo(client.id, { 
                            linkSentDate: client.linkSentDate ? undefined : new Date().toISOString() 
                          })}
                          className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest text-left"
                        >
                          {client.linkSentDate ? 'Desmarcar Envio' : 'Marcar como Enviado'}
                        </button>
                      </div>
                    </td>
                    <td className="py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all duration-700 ${client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${client.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{client.progress}%</span>
                      </div>
                    </td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        client.progress === 100 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {client.progress === 100 ? 'Finalizado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <i className="fa-solid fa-folder-open text-4xl mb-4"></i>
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum cliente vinculado a este analista.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalystManagement;
