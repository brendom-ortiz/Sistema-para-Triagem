
import React, { useState } from 'react';
import { Client, DocumentType, Analyst } from '../types';

interface AddClientModalProps {
  onClose: () => void;
  onAdd: (client: Client) => void;
  analysts: Analyst[];
}

const consortiumOptions = ['Imobiliário', 'Automotivo', 'Pesados', 'Serviços', 'Motos', 'Consórcio de Ouro', 'Outros Bens'];
const DEFAULT_REQUIRED = [DocumentType.ID, DocumentType.RESIDENCE, DocumentType.INCOME, DocumentType.CONTRACT];
const DEFAULT_PHASE2_REQUIRED = [DocumentType.CRLV, DocumentType.BILLING_FORM, DocumentType.INSPECTION];

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
    analystContemplation: '',
    analystContemplationEmail: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.cpf || !formData.group || !formData.quota || !formData.email) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        clientType,
        progress: 0,
        documents: [],
        requiredDocumentTypes: DEFAULT_REQUIRED,
        phase2RequiredDocumentTypes: DEFAULT_PHASE2_REQUIRED,
        totalDocsCount: 0,
        lastViewedDocsCount: 0,
        paymentStatus: 'PENDING',
        uploadedDocumentTypes: []
      };

      await onAdd(newClient);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalystChange = (name: string) => {
    const selected = analysts.find(a => a.name === name);
    setFormData({
      ...formData,
      analystName: name,
      analystEmail: selected ? selected.email : ''
    });
  };

  const handleContemplationAnalystChange = (name: string) => {
    const selected = analysts.find(a => a.name === name);
    setFormData({
      ...formData,
      analystContemplation: name,
      analystContemplationEmail: selected ? selected.email : ''
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 rounded-[32px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden animate-slideUp flex flex-col border border-slate-800/50">
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-user-plus text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight font-outfit uppercase">NOVO CADASTRO</h2>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Identificação da Cota</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="px-8 pt-8">
            <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-slate-800">
              <button 
                type="button"
                onClick={() => setClientType('PF')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  clientType === 'PF' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Pessoa Física (PF)
              </button>
              <button 
                type="button"
                onClick={() => setClientType('PJ')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  clientType === 'PJ' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Pessoa Jurídica (PJ)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  {clientType === 'PF' ? 'Nome Completo *' : 'Razão Social *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={clientType === 'PF' ? "Ex: João Silva Oliveira" : "Ex: Âncora Transportes LTDA"}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="col-span-full">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">E-mail do Cliente *</label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                  {clientType === 'PF' ? 'CPF *' : 'CNPJ *'}
                </label>
                <input 
                  type="text" 
                  required
                  placeholder={clientType === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Consórcio</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white appearance-none"
                  value={formData.consortiumType}
                  onChange={(e) => setFormData({...formData, consortiumType: e.target.value})}
                >
                  {consortiumOptions.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Grupo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: A100"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white"
                  value={formData.group}
                  onChange={(e) => setFormData({...formData, group: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Cota *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 001"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium text-white"
                  value={formData.quota}
                  onChange={(e) => setFormData({...formData, quota: e.target.value})}
                />
              </div>

              <div className="col-span-full border-t border-slate-800 pt-6 mt-2">
                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Responsáveis Internos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Analista (Cadastro)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white appearance-none"
                      value={formData.analystName}
                      onChange={(e) => handleAnalystChange(e.target.value)}
                    >
                      <option value="" className="bg-slate-900">Selecione um analista...</option>
                      {analysts.filter(a => a.role === 'Cadastro' || a.role === 'Ambos').map(a => (
                        <option key={a.id} value={a.name} className="bg-slate-900">{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Analista (Contemplação)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white appearance-none"
                      value={formData.analystContemplation}
                      onChange={(e) => handleContemplationAnalystChange(e.target.value)}
                    >
                      <option value="" className="bg-slate-900">Selecione um analista...</option>
                      {analysts.filter(a => a.role === 'Contemplação' || a.role === 'Ambos').map(a => (
                        <option key={a.id} value={a.name} className="bg-slate-900">{a.name}</option>
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
                className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Criar Cadastro
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;
