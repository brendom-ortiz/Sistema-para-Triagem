
import React, { useState, useEffect } from 'react';
import { Client, DocumentStatus, DocumentType, ClientDocument, Analyst, DocumentCategory } from '../types';
import { classifyDocument } from '../services/geminiService';
import { compressImage } from '../services/imageService';
import JSZip from 'jszip';

interface ClientDetailsProps {
  client: Client;
  analysts: Analyst[];
  onAddDocument: (newDoc: ClientDocument) => void;
  onRemoveDocument: (docId: string) => void;
  onUpdateClientInfo: (updates: Partial<Client>) => void;
  onDeleteClient: () => void;
  onToggleRequirement: (docType: DocumentCategory) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ 
  client, 
  analysts,
  onAddDocument, 
  onRemoveDocument, 
  onUpdateClientInfo, 
  onDeleteClient,
  onToggleRequirement
}) => {
  const [isProcessing, setIsProcessing] = useState<DocumentCategory | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customRequirement, setCustomRequirement] = useState('');
  const [viewingDoc, setViewingDoc] = useState<ClientDocument | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    cpf: '',
    group: '',
    quota: '',
    consortiumType: '',
    clientType: 'PF' as 'PF' | 'PJ',
    analystName: '',
    analystEmail: '',
    analystContemplation: '',
    analystContemplationEmail: '',
    paymentStatus: 'PENDING' as 'PENDING' | 'PAID'
  });

  const defaultCategories = [
    DocumentType.ID,
    DocumentType.RESIDENCE,
    DocumentType.INCOME,
    DocumentType.CONTRACT,
    DocumentType.REQUEST_EMAIL
  ];

  // Combine default categories with any custom ones already in the client's required list or that have documents
  const categoriesWithDocs = (client.documents || []).map(d => d.type);
  const allCategories = Array.from(new Set([...defaultCategories, ...(client.requiredDocumentTypes || []), ...categoriesWithDocs])).filter(Boolean) as DocumentCategory[];

  const handleAddCustomRequirement = () => {
    if (!customRequirement.trim()) return;
    onToggleRequirement(customRequirement.trim());
    setCustomRequirement('');
    setIsAddingCustom(false);
  };

  const consortiumOptions = ['Imobiliário', 'Automotivo', 'Pesados', 'Serviços', 'Motos', 'Consórcio de Ouro', 'Outros Bens'];

  useEffect(() => {
    // Clear "new documents" notification when viewing client details
    if (client.documents && (client.documents.length !== client.lastViewedDocsCount)) {
      onUpdateClientInfo({ lastViewedDocsCount: client.documents.length });
    }
  }, [client.id, client.documents?.length]);

  useEffect(() => {
    setEditForm({
      name: client.name,
      email: client.email || '',
      cpf: client.cpf,
      group: client.group,
      quota: client.quota,
      consortiumType: client.consortiumType,
      clientType: client.clientType,
      analystName: client.analystName || '',
      analystEmail: client.analystEmail || `${(client.analystName || '').toLowerCase().replace(/\s+/g, '.')}@consorcioancora.com.br`,
      analystContemplation: client.analystContemplation || '',
      analystContemplationEmail: client.analystContemplationEmail || `${(client.analystContemplation || '').toLowerCase().replace(/\s+/g, '.')}@consorcioancora.com.br`,
      paymentStatus: client.paymentStatus || 'PENDING'
    });
  }, [client, isEditing]);

  const handleSaveInfo = () => {
    onUpdateClientInfo(editForm);
    setIsEditing(false);
  };

  const handleAnalystTransfer = (name: string) => {
    const selected = analysts.find(a => a.name === name);
    setEditForm({
      ...editForm,
      analystName: name,
      analystEmail: selected ? selected.email : editForm.analystEmail
    });
  };

  const handleContemplationAnalystTransfer = (name: string) => {
    const selected = analysts.find(a => a.name === name);
    setEditForm({
      ...editForm,
      analystContemplation: name,
      analystContemplationEmail: selected ? selected.email : editForm.analystContemplationEmail
    });
  };

  const handleDeleteConfirm = () => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${client.name}? Esta ação não pode ser desfeita.`)) {
      onDeleteClient();
    }
  };

  const getPortalUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?clientId=${client.id}`;
  };

  const handleCopyLink = () => {
    const url = getPortalUrl();
    navigator.clipboard.writeText(url);
    onUpdateClientInfo({ linkSentDate: new Date().toISOString() });
    alert("Link de upload copiado para a área de transferência!");
  };

  const handleCobrarDocumentos = () => {
    const missingDocs = allCategories.filter(cat => 
      (client.requiredDocumentTypes || []).includes(cat) && 
      !(client.documents || []).some(d => d.type === cat)
    );

    if (missingDocs.length === 0) {
      alert("Nenhuma documentação obrigatória pendente para cobrança.");
      return;
    }

    const docsList = missingDocs.map(d => `- ${d}`).join('\r\n');
    const portalUrl = getPortalUrl();
    const subject = encodeURIComponent(`[TRIAGEM ANCORADA] Pendência de Documentos - ${client.name}`);
    const body = encodeURIComponent(
      `Olá, ${client.name}.\r\n\r\n` +
      `Identificamos que ainda faltam alguns documentos obrigatórios para prosseguirmos com o seu processo de consórcio (Grupo: ${client.group} / Cota: ${client.quota}).\r\n\r\n` +
      `DOCUMENTOS PENDENTES:\r\n` +
      `${docsList}\r\n\r\n` +
      `Você pode enviar os documentos diretamente pelo nosso portal seguro clicando no link abaixo:\r\n` +
      `${portalUrl}\r\n\r\n` +
      `Por favor, envie os documentos acima o mais breve possível para evitarmos atrasos na sua análise.\r\n\r\n` +
      `Atenciosamente,\r\n` +
      `Triagem Ancorada`
    );

    const mailtoUrl = `mailto:${client.email}?subject=${subject}&body=${body}`;
    onUpdateClientInfo({ linkSentDate: new Date().toISOString() });
    window.location.href = mailtoUrl;
  };

  const handleFinalizeProcess = async () => {
    if (client.progress < 100) {
      const confirmIncomplete = window.confirm(
        `Atenção: A documentação está apenas ${client.progress}% completa. Deseja enviar o e-mail com os documentos atuais assim mesmo?`
      );
      if (!confirmIncomplete) return;
    }

    setIsFinalizing(true);

    try {
      const zip = new JSZip();
      const safeName = client.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      const folderName = `Documentos_${safeName}`;
      const folder = zip.folder(folderName);

      if (folder) {
        for (const doc of client.documents) {
          if (doc.fileData) {
            const base64Content = doc.fileData.split(',')[1];
            folder.file(`${doc.type.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.fileName}`, base64Content, { base64: true });
          } else if (doc.fileUrl) {
            // Fallback for older documents in Storage
            try {
              const response = await fetch(doc.fileUrl);
              const blob = await response.blob();
              folder.file(`${doc.type.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.fileName}`, blob);
            } catch (fetchErr) {
              console.warn(`Could not fetch file from URL for ${doc.fileName}:`, fetchErr);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = `${folderName}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      const statusText = client.progress === 100 ? "COMPLETA" : `PARCIAL (${client.progress}%)`;
      const subject = encodeURIComponent(`[TRIAGEM ANCORADA] Documentação ${statusText} - ${client.name} (G: ${client.group} / C: ${client.quota})`);
      
      const missingDocsList = allCategories
        .filter(cat => (client.requiredDocumentTypes || []).includes(cat) && !(client.documents || []).some(d => d.type === cat))
        .map(cat => `- ${cat}`)
        .join('\r\n');

      const body = encodeURIComponent(
        `Prezado(a) ${client.analystName},\r\n\r\n` +
        `A documentação do cliente ${client.name} foi processada no sistema TRIAGEM ANCORADA.\r\n\r\n` +
        `STATUS ATUAL: ${statusText}\r\n\r\n` +
        (client.progress < 100 ? `DOCUMENTOS PENDENTES:\r\n${missingDocsList}\r\n\r\n` : '') +
        `>>> AÇÃO NECESSÁRIA: O arquivo ZIP com os documentos disponíveis foi baixado automaticamente. FAVOR ANEXAR O ARQUIVO '${folderName}.zip' A ESTE E-MAIL ANTES DE ENVIAR.\r\n\r\n` +
        `DADOS DO CLIENTE:\r\n` +
        `- Nome: ${client.name}\r\n` +
        `- Documento: ${client.cpf}\r\n` +
        `- Grupo/Cota: ${client.group} / ${client.quota}\r\n` +
        `- Segmento: ${client.consortiumType}\r\n\r\n` +
        `Atenciosamente,\r\n` +
        `Plataforma Triagem Ancorada`
      );

      const recipients = [client.analystEmail];
      if (client.analystContemplationEmail && client.analystContemplationEmail !== client.analystEmail) {
        recipients.push(client.analystContemplationEmail);
      }

      const mailtoUrl = `mailto:${recipients.join(',')}?subject=${subject}&body=${body}`;

      setTimeout(() => {
        setIsFinalizing(false);
        window.location.href = mailtoUrl;
        alert(`Processo Finalizado!\n\n1. O arquivo ZIP foi baixado.\n2. O Outlook será aberto.\n\nIMPORTANTE: Anexe o ZIP baixado manualmente ao e-mail.`);
      }, 1000);

    } catch (error) {
      console.error("Erro ao gerar pacote de documentos:", error);
      alert("Erro ao preparar os documentos para envio. Tente novamente.");
      setIsFinalizing(false);
    }
  };

  const handleDownloadDocument = (doc: ClientDocument) => {
    if (!doc.fileData && !doc.fileUrl) {
      alert("Arquivo original não disponível para download.");
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = doc.fileData || doc.fileUrl || '';
      link.download = doc.fileName || `${doc.type.replace(/[^a-zA-Z0-9]/g, '_')}_document`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao baixar documento:", err);
      alert("Não foi possível baixar o arquivo.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, category: DocumentCategory) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size for non-images (PDFs)
    if (!file.type.startsWith('image/') && file.size > 1000000) {
      alert('Arquivos PDF devem ter menos de 1MB. Por favor, comprima o arquivo ou envie uma foto.');
      return;
    }

    setIsProcessing(category);

    try {
      let fileData: string;
      
      if (file.type.startsWith('image/')) {
        console.log("Compressing image...");
        fileData = await compressImage(file);
      } else {
        // For PDFs, just read as base64
        fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const base64Data = fileData.split(',')[1];
      
      // Final safety check for Firestore 1MB limit
      if (fileData.length > 1000000) {
        alert('O arquivo ainda é muito grande para o banco de dados (limite de 1MB). Por favor, tente tirar uma foto com menor resolução ou use um compressor de PDF.');
        setIsProcessing(null);
        return;
      }

      const result = await classifyDocument(base64Data);
      
      const newDoc: ClientDocument = {
        id: Math.random().toString(36).substr(2, 9),
        type: category,
        aiType: result.type,
        status: DocumentStatus.UPLOADED,
        fileName: file.name,
        fileData: fileData,
        uploadDate: new Date().toISOString().split('T')[0],
        confidence: result.confidence
      };

      onAddDocument(newDoc);
      alert("Documento adicionado com sucesso!");

      if (event.target) {
        (event.target as HTMLInputElement).value = '';
      }

      if (result.type !== category && result.type !== DocumentType.UNKNOWN) {
        alert(`Aviso de IA: O documento parece ser um "${result.type}", mas você está salvando em "${category}". Verifique se está correto.`);
      }
      
      setIsProcessing(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      setIsProcessing(null);
      if (event.target) {
        (event.target as HTMLInputElement).value = '';
      }
      alert(`Erro ao enviar: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-24">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
        <div className="flex items-center gap-6 w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-gray-600 rounded-3xl flex-shrink-0 flex items-center justify-center text-white text-3xl shadow-xl border-4 border-white">
            <i className={`fa-solid ${client.clientType === 'PF' ? 'fa-user' : 'fa-building-shield'}`}></i>
          </div>
          
          <div className="flex-grow">
            {!isEditing ? (
              <>
                <div className="flex items-center flex-wrap gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                    client.clientType === 'PF' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {client.clientType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </span>
                  <h2 className="text-3xl font-black text-gray-800 tracking-tight">{client.name}</h2>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-full uppercase border border-blue-100">
                    {client.consortiumType}
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-full uppercase border border-blue-100">
                    <i className="fa-solid fa-user-tie"></i>
                    <span className="opacity-60 mr-1">Cadastro:</span>
                    {client.analystName || 'Não Atribuído'}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full uppercase border border-emerald-100">
                    <i className="fa-solid fa-star"></i>
                    <span className="opacity-60 mr-1">Contemplação:</span>
                    {client.analystContemplation || 'Não Atribuído'}
                  </div>
                  
                  <button 
                    onClick={() => onUpdateClientInfo({ paymentStatus: client.paymentStatus === 'PAID' ? 'PENDING' : 'PAID' })}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                      client.paymentStatus === 'PAID' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={client.paymentStatus === 'PAID' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                  >
                    <i className={`fa-solid ${client.paymentStatus === 'PAID' ? 'fa-circle-check' : 'fa-circle-dollar-to-slot'}`}></i>
                    {client.paymentStatus === 'PAID' ? 'Pago / Enviado' : 'Pendente Pagamento'}
                  </button>

                  <button 
                    onClick={() => setIsEditing(true)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-blue-100"
                    title="Editar ou Transferir"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    Editar Cadastro
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-2"><i className="fa-solid fa-envelope text-gray-400"></i> Cliente: <b className="text-gray-700">{client.email}</b></span>
                  <span className="flex items-center gap-2"><i className="fa-solid fa-id-card text-gray-400"></i> {client.clientType === 'PF' ? 'CPF' : 'CNPJ'}: {client.cpf}</span>
                  <span className="flex items-center gap-2"><i className="fa-solid fa-tags text-gray-400"></i> G/C: <b className="text-gray-700">{client.group} / {client.quota}</b></span>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full pr-12 animate-slideUp">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome / Razão Social</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail do Cliente</label>
                  <input type="email" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold appearance-none outline-none"
                    value={editForm.clientType}
                    onChange={(e) => setEditForm({...editForm, clientType: e.target.value as 'PF' | 'PJ'})}
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editForm.clientType === 'PF' ? 'CPF' : 'CNPJ'}</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" value={editForm.cpf} onChange={(e) => setEditForm({...editForm, cpf: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grupo</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" value={editForm.group} onChange={(e) => setEditForm({...editForm, group: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cota</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" value={editForm.quota} onChange={(e) => setEditForm({...editForm, quota: e.target.value})} />
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Consórcio</label>
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold appearance-none outline-none"
                    value={editForm.consortiumType}
                    onChange={(e) => setEditForm({...editForm, consortiumType: e.target.value})}
                  >
                    {consortiumOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status de Pagamento</label>
                  <select 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold appearance-none outline-none"
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value as 'PENDING' | 'PAID'})}
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago / Enviado</option>
                  </select>
                </div>
                
                <div className="col-span-full border-t border-gray-100 pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-right-left text-blue-500 text-xs"></i>
                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Transferir / Alterar Analistas</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analista de Cadastro</label>
                      <select 
                        className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.analystName}
                        onChange={(e) => handleAnalystTransfer(e.target.value)}
                      >
                        <option value="">Nenhum analista atribuído</option>
                        {analysts.filter(a => a.role === 'Cadastro' || a.role === 'Ambos').map(a => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analista de Contemplação</label>
                      <select 
                        className="w-full px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.analystContemplation}
                        onChange={(e) => handleContemplationAnalystTransfer(e.target.value)}
                      >
                        <option value="">Nenhum analista atribuído</option>
                        {analysts.filter(a => a.role === 'Contemplação' || a.role === 'Ambos').map(a => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-2 col-span-full justify-between mt-6 pt-6 border-t border-gray-100">
                  <button 
                    onClick={handleDeleteConfirm}
                    className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl text-sm font-black hover:bg-red-100 transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    EXCLUIR CADASTRO
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-500 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Cancelar</button>
                    <button onClick={handleSaveInfo} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">SALVAR E TRANSFERIR</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="w-full md:w-auto flex items-center gap-6">
            <div className="flex flex-col items-end gap-2 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documentação</span>
              <div className="w-full md:w-48 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ${client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                  style={{ width: `${client.progress}%` }}
                ></div>
              </div>
              <span className={`text-lg font-black ${client.progress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{client.progress}% <span className="text-xs uppercase ml-1">concluído</span></span>
            </div>
            
            {client.progress < 100 && (
              <div className="flex gap-2">
                <button 
                  onClick={handleCopyLink}
                  className="w-16 h-16 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 transition-all active:scale-95 group"
                  title="Copiar link de upload para o cliente"
                >
                  <i className="fa-solid fa-link text-2xl group-hover:rotate-12 transition-transform"></i>
                </button>
                <button 
                  onClick={handleCobrarDocumentos}
                  className="w-16 h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 transition-all active:scale-95 group"
                  title="Cobrar documentos faltantes via e-mail"
                >
                  <i className="fa-solid fa-envelope-open-text text-2xl group-hover:rotate-12 transition-transform"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Checklist de Documentos</h2>
        <button 
          onClick={() => setIsAddingCustom(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <i className="fa-solid fa-plus"></i>
          Novo Requisito
        </button>
      </div>

      {isAddingCustom && (
        <div className="mb-8 bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 animate-fadeIn">
          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Adicionar Novo Requisito Personalizado</h4>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={customRequirement}
              onChange={(e) => setCustomRequirement(e.target.value)}
              placeholder="Ex: Certidão de Casamento, Contrato Social..."
              className="flex-1 bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              autoFocus
            />
            <button 
              onClick={handleAddCustomRequirement}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
            >
              Adicionar
            </button>
            <button 
              onClick={() => setIsAddingCustom(false)}
              className="bg-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-300 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {allCategories.map((category) => {
          const categoryDocs = (client.documents || []).filter(d => d.type === category);
          const isComplete = categoryDocs.length > 0;
          const isRequired = (client.requiredDocumentTypes || []).includes(category);
          const isDefault = defaultCategories.includes(category as DocumentType);
          
          return (
            <div key={category} className={`bg-white rounded-3xl border-2 p-8 transition-all duration-300 shadow-sm ${!isRequired ? 'border-gray-50 opacity-80' : isComplete ? 'border-emerald-100' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105 ${!isRequired ? 'bg-gray-200 text-gray-400' : isComplete ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <i className={`fa-solid ${
                      category === DocumentType.ID ? 'fa-address-card' :
                      category === DocumentType.RESIDENCE ? 'fa-house' :
                      category === DocumentType.INCOME ? 'fa-receipt' : 
                      category === DocumentType.CONTRACT ? 'fa-file-signature' : 
                      category === DocumentType.REQUEST_EMAIL ? 'fa-envelope-open-text' : 'fa-file-circle-plus'
                    }`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-gray-800 tracking-tight">{category}</h3>
                      {!isRequired && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-gray-200">OPCIONAL</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                      {isComplete ? `${categoryDocs.length} ARQUIVO(S) ENVIADO(S)` : isRequired ? 'PENDENTE DE ENVIO' : 'REQUISITO DESATIVADO'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onToggleRequirement(category)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isRequired 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <i className={`fa-solid ${isRequired ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg`}></i>
                    {isRequired ? 'Obrigatório' : 'Caso Especial'}
                  </button>

                  <label className="flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-700 px-6 py-3.5 rounded-2xl text-sm font-black cursor-pointer transition-all shadow-lg shadow-blue-100 active:scale-95 group">
                    {isProcessing === category ? (
                      <i className="fa-solid fa-circle-notch animate-spin"></i>
                    ) : (
                      <i className="fa-solid fa-arrow-up-from-bracket group-hover:-translate-y-1 transition-transform"></i>
                    )}
                    <span>{isComplete ? 'Substituir' : 'Enviar'}</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, category)} disabled={isProcessing !== null} />
                  </label>
                </div>
              </div>

              {categoryDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryDocs.map((doc) => (
                    <div key={doc.id} className="group bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 hover:border-blue-300 hover:bg-white transition-all shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 border border-gray-100">
                             <i className="fa-solid fa-file-pdf"></i>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-black text-gray-700 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest">{doc.uploadDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewingDoc(doc)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><i className="fa-solid fa-eye"></i></button>
                          <button onClick={() => onRemoveDocument(doc.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><i className="fa-solid fa-trash-can"></i></button>
                        </div>
                      </div>
                      {doc.confidence && (
                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-black bg-blue-50/70 py-1.5 px-3 rounded-xl border border-blue-100">
                          <i className="fa-solid fa-brain"></i>
                          <span>IA VALIDOU COM {(doc.confidence * 100).toFixed(0)}% DE PRECISÃO</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-100 rounded-3xl py-12 text-center bg-gray-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-200 mx-auto mb-4 shadow-sm border border-gray-50">
                    <i className={`fa-solid ${isRequired ? 'fa-file-shield' : 'fa-circle-info'} text-3xl`}></i>
                  </div>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                    {isRequired ? 'Documento Obrigatório' : 'Documento Opcional'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BARRA DE AÇÕES INFERIOR - REDIMENSIONADA */}
      <div className="fixed bottom-6 right-6 left-6 lg:left-1/3 xl:left-1/4 z-40">
        <div className="bg-gray-900 rounded-[24px] text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl border border-gray-800 max-w-4xl mx-auto overflow-hidden animate-slideUp">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${client.progress === 100 ? 'bg-emerald-500 shadow-emerald-500/20 shadow-lg' : 'bg-blue-600 text-white'}`}>
              <i className={`fa-solid ${client.progress === 100 ? 'fa-check-double' : 'fa-hourglass-half'}`}></i>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight leading-tight uppercase">{client.progress === 100 ? 'Status: Documentação Completa' : 'Status: Pendente'}</p>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{client.progress === 100 ? 'Pronto para envio final' : 'Envio parcial disponível'}</p>
            </div>
          </div>
          
          <button 
            disabled={isFinalizing} 
            onClick={handleFinalizeProcess}
            className={`px-6 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center gap-2.5 relative overflow-hidden group ${
              isFinalizing 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : client.progress === 100
                ? 'bg-gradient-to-r from-blue-600 to-gray-600 hover:from-blue-500 hover:to-gray-500 active:scale-95' 
                : 'bg-gradient-to-r from-blue-700 to-blue-900 hover:brightness-110 active:scale-95'
            }`}
          >
            {isFinalizing ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>
                <span>{client.progress === 100 ? 'Finalizar e Enviar' : 'Enviar Parcial'}</span>
              </>
            )}
            {!isFinalizing && (
              <span className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></span>
            )}
          </button>
        </div>
      </div>

      {viewingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-file-contract text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">{viewingDoc.type}</h3>
                  <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">{viewingDoc.fileName}</p>
                </div>
              </div>
              <button onClick={() => setViewingDoc(null)} className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors rounded-full hover:bg-white shadow-sm border border-gray-100">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>
            <div className="flex-grow bg-gray-200 p-12 flex items-center justify-center overflow-auto custom-scrollbar">
              {viewingDoc.fileData || viewingDoc.fileUrl ? (
                (viewingDoc.fileData?.startsWith('data:application/pdf') || viewingDoc.fileName?.toLowerCase().endsWith('.pdf')) ? (
                  <iframe 
                    src={viewingDoc.fileData || viewingDoc.fileUrl} 
                    className="w-full h-[60vh] rounded-2xl border-4 border-white shadow-2xl"
                    title="Documento PDF"
                  />
                ) : (
                  <div className="relative group">
                    <img src={viewingDoc.fileData || viewingDoc.fileUrl} alt="Documento" className="max-w-full rounded-2xl shadow-2xl border-4 border-white" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400">
                  <i className="fa-solid fa-eye-slash text-6xl mb-6 opacity-20"></i>
                  <p className="font-bold">Prévia indisponível para este arquivo.</p>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-white">
               <button onClick={() => setViewingDoc(null)} className="px-8 py-3 bg-gray-100 text-gray-600 font-black rounded-2xl text-xs tracking-widest uppercase hover:bg-gray-200 transition-all">Fechar</button>
               <button 
                onClick={() => handleDownloadDocument(viewingDoc)}
                className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg shadow-blue-100 flex items-center gap-3 hover:bg-blue-700 transition-all active:scale-95"
               >
                 <i className="fa-solid fa-download"></i> Baixar Original
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
