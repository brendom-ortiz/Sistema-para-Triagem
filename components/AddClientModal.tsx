
import React, { useState } from 'react';
import { Client, DocumentType, Analyst } from '../types';

interface AddClientModalProps {
  onClose: () => void;
  onAdd: (client: Client) => void;
  analysts: Analyst[];
}

const consortiumOptions = ['Imobiliário', 'Automotivo', 'Pesados', 'Serviços', 'Motos', 'Consórcio de Ouro', 'Outros Bens'];
const DEFAULT_REQUIRED = [DocumentType.ID, DocumentType.RESIDENCE, DocumentType.INCOME, DocumentType.CONTRACT];

const AddClientModal: React.FC<AddClientModalProps> = ({ onClose, onAdd, analysts }) => {
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    consortiumType: 'Imobiliário',
    group: '',
    quota: '',
    analystName: '',
    analystEmail: '',
    analystContemplation: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cpf || !formData.group || !formData.quota || !formData.email) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      clientType,
      progress: 0,
      documents: [],
      requiredDocumentTypes: DEFAULT_REQUIRED
    };

    onAdd(newClient);
  };

  const handleAnalystChange = (name: string) => {
    const selected = analysts.find(a => a.name === name);
    setFormData({
      ...formData,
      analystName: name,
      analystEmail: selected ? selected.email : ''
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden animate-slideUp flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-user-plus text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">NOVO CADASTRO</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Identificação da Cota</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="px-8 pt-8">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                type="button"
                onClick={() => setClientType('PF')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  clientType === 'PF' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Pessoa Física (PF)
              </button>
              <button 
                type="button"
                onClick={() => setClientType('PJ')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  clientType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Pessoa Jurídica (PJ)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {clientType === 'PF' ? 'Nome Completo *' : 'Razão Social *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={clientType === 'PF' ? "Ex: João Silva Oliveira" : "Ex: Âncora Transportes LTDA"}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="col-span-full">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">E-mail do Cliente *</label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {clientType === 'PF' ? 'CPF *' : 'CNPJ *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={clientType === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tipo de Consórcio</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium appearance-none"
                  value={formData.consortiumType}
                  onChange={(e) => setFormData({...formData, consortiumType: e.target.value})}
                >
                  {consortiumOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Grupo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: A100"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
                  value={formData.group}
                  onChange={(e) => setFormData({...formData, group: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cota *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 001"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
                  value={formData.quota}
                  onChange={(e) => setFormData({...formData, quota: e.target.value})}
                />
              </div>

              <div className="col-span-full border-t border-gray-100 pt-6 mt-2">
                <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-4">Responsáveis Internos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Analista (Cadastro)</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium appearance-none"
                      value={formData.analystName}
                      onChange={(e) => handleAnalystChange(e.target.value)}
                    >
                      <option value="">Selecione um analista...</option>
                      {analysts.filter(a => a.role === 'Cadastro' || a.role === 'Ambos').map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Analista (Contemplação)</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium appearance-none"
                      value={formData.analystContemplation}
                      onChange={(e) => setFormData({...formData, analystContemplation: e.target.value})}
                    >
                      <option value="">Selecione um analista...</option>
                      {analysts.filter(a => a.role === 'Contemplação' || a.role === 'Ambos').map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-end gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-500 font-bold text-sm hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
              >
                <i className="fa-solid fa-check"></i>
                Criar Cadastro
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;
