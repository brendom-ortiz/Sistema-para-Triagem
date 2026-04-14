
import React from 'react';
import { Client, DocumentStatus } from '../types';

interface ReportsProps {
  clients: Client[];
}

const Reports: React.FC<ReportsProps> = ({ clients }) => {
  const totalClients = clients.length;
  const completedProposals = clients.filter(c => c.progress === 100).length;
  const averageProgress = totalClients > 0 
    ? clients.reduce((acc, c) => acc + c.progress, 0) / totalClients 
    : 0;
  
  const totalDocs = clients.reduce((acc, c) => acc + (c.uploadedDocumentTypes?.length || 0), 0);
  const uploadedDocs = totalDocs;
  const pendingDocs = clients.reduce((acc, c) => {
    const missing = (c.requiredDocumentTypes || []).filter(t => !(c.uploadedDocumentTypes || []).includes(t));
    return acc + missing.length;
  }, 0);

  const analystStats = clients.reduce((acc: any, c) => {
    if (!acc[c.analystName]) acc[c.analystName] = { count: 0, completed: 0 };
    acc[c.analystName].count += 1;
    if (c.progress === 100) acc[c.analystName].completed += 1;
    return acc;
  }, {});

  return (
    <div className="animate-fadeIn">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-white tracking-tight font-outfit uppercase">RELATÓRIO DE DESEMPENHO</h2>
        <p className="text-slate-400 font-medium">Métricas operacionais e status do fluxo documental.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] shadow-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all duration-300 group">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg border border-blue-500/20">
            <i className="fa-solid fa-users text-2xl"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total de Clientes</p>
          <p className="text-4xl font-black text-white">{totalClients}</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] shadow-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-300 group">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg border border-emerald-500/20">
            <i className="fa-solid fa-circle-check text-2xl"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Cotas Finalizadas</p>
          <p className="text-4xl font-black text-white">{completedProposals}</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] shadow-2xl border border-slate-800/50 hover:border-amber-500/30 transition-all duration-300 group">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg border border-amber-500/20">
            <i className="fa-solid fa-file-signature text-2xl"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Docs Pendentes</p>
          <p className="text-4xl font-black text-white">{pendingDocs}</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[32px] shadow-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all duration-300 group">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg border border-blue-500/20">
            <i className="fa-solid fa-chart-pie text-2xl"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Progresso Médio</p>
          <p className="text-4xl font-black text-white">{averageProgress.toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[40px] shadow-2xl border border-slate-800/50 p-10">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 font-outfit uppercase tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-user-tie"></i>
            </div>
            PRODUTIVIDADE POR ANALISTA
          </h3>
          <div className="space-y-8">
            {Object.keys(analystStats).length > 0 ? Object.keys(analystStats).map((name) => {
              const stat = analystStats[name];
              const perc = (stat.completed / stat.count) * 100;
              return (
                <div key={name} className="group">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <span className="text-sm font-black text-slate-200 uppercase tracking-tight">{name}</span>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Analista de Operações</p>
                    </div>
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 uppercase tracking-widest">
                      {stat.completed} de {stat.count} concluídas
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/50 h-3 rounded-full overflow-hidden shadow-inner border border-slate-800">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 group-hover:brightness-110 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                      style={{ width: `${perc}%` }}
                    ></div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-slate-600 font-black uppercase tracking-widest text-xs">Nenhuma métrica disponível.</div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[40px] shadow-2xl border border-slate-800/50 p-10 overflow-hidden">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 font-outfit uppercase tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-table-list"></i>
            </div>
            STATUS GERAL DE COTAS
          </h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Cliente</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">G/C</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Progresso</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {clients.length > 0 ? clients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-5">
                      <p className="text-sm font-black text-slate-200 group-hover:text-blue-400 transition-colors">{client.name}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{client.consortiumType}</p>
                    </td>
                    <td className="py-5 font-bold text-slate-400 text-sm">{client.group}/{client.quota}</td>
                    <td className="py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-slate-950/50 rounded-full overflow-hidden shadow-inner border border-slate-800">
                          <div className={`h-full ${client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${client.progress}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500">{client.progress}%</span>
                      </div>
                    </td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        client.progress === 100 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                      }`}>
                        {client.progress === 100 ? 'Finalizado' : 'Em Análise'}
                      </span>
                    </td>
                  </tr>
                )) : (
                   <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-600 font-black uppercase tracking-widest text-xs">Sem dados para exibir.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
