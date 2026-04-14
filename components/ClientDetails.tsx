
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
  onTogglePhase2Requirement: (docType: DocumentCategory) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ 
  client, 
  analysts,
  onAddDocument, 
  onRemoveDocument, 
  onUpdateClientInfo, 
  onDeleteClient,
  onToggleRequirement,
  onTogglePhase2Requirement
}) => {
  const [isProcessing, setIsProcessing] = useState<DocumentCategory | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isAddingCustomPhase2, setIsAddingCustomPhase2] = useState(false);
  const [customRequirement, setCustomRequirement] = useState('');
  const [customRequirementPhase2, setCustomRequirementPhase2] = useState('');
  const [viewingDoc, setViewingDoc] = useState<ClientDocument | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedNoteAnalyst, setSelectedNoteAnalyst] = useState('');
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

  const phase2DefaultCategories = [
    DocumentType.CRLV,
    DocumentType.BILLING_FORM,
    DocumentType.INSPECTION
  ];

  // Combine default categories with any custom ones
  const categoriesWithDocs = (client.documents || []).map(d => d.type);
  
  const phase1Categories = Array.from(new Set([
    ...defaultCategories, 
    ...(client.requiredDocumentTypes || []),
    ...categoriesWithDocs.filter(t => !phase2DefaultCategories.includes(t as DocumentType) && !(client.phase2RequiredDocumentTypes || []).includes(t))
  ])).filter(Boolean) as DocumentCategory[];

  const phase2Categories = Array.from(new Set([
    ...phase2DefaultCategories,
    ...(client.phase2RequiredDocumentTypes || []),
    ...categoriesWithDocs.filter(t => phase2DefaultCategories.includes(t as DocumentType) || (client.phase2RequiredDocumentTypes || []).includes(t))
  ])).filter(Boolean) as DocumentCategory[];

  const handleAddCustomRequirement = () => {
    if (!customRequirement.trim()) return;
    onToggleRequirement(customRequirement.trim());
    setCustomRequirement('');
    setIsAddingCustom(false);
  };

  const handleAddCustomRequirementPhase2 = () => {
    if (!customRequirementPhase2.trim()) return;
    onTogglePhase2Requirement(customRequirementPhase2.trim());
    setCustomRequirementPhase2('');
    setIsAddingCustomPhase2(false);
  };

  const consortiumOptions = ['Imobiliário', 'Automotivo', 'Pesados', 'Serviços', 'Motos', 'Consórcio de Ouro', 'Outros Bens'];

  useEffect(() => {
    // Clear "new documents" notification when viewing client details
    const totalDocs = client.totalDocsCount || 0;
    if (totalDocs !== client.lastViewedDocsCount) {
      onUpdateClientInfo({ lastViewedDocsCount: totalDocs });
    }
  }, [client.id, client.totalDocsCount]);

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

  useEffect(() => {
    if (isAddingNote && !selectedNoteAnalyst) {
      setSelectedNoteAnalyst(client.analystName || '');
    }
  }, [isAddingNote, client.analystName]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    // Use selected analyst or fallback to client's default analyst
    const analystName = selectedNoteAnalyst || client.analystName || "Analista";
    
    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      analystName: analystName,
      date: new Date().toLocaleString('pt-BR')
    };
    
    const updatedNotes = [...(client.notes || []), note];
    onUpdateClientInfo({ notes: updatedNotes });
    setNewNote('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = (client.notes || []).filter(n => n.id !== noteId);
    onUpdateClientInfo({ notes: updatedNotes });
  };

  const getAnalystColor = (name: string) => {
    const colors = [
      { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
      { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
      { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
      { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
      { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
      { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    ];
    
    // Simple hash function to pick a consistent color for the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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
    const allRequired = [...(client.requiredDocumentTypes || []), ...(client.phase2RequiredDocumentTypes || [])];
    const missingDocs = Array.from(new Set([...phase1Categories, ...phase2Categories])).filter(cat => 
      allRequired.includes(cat) && 
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
      
      const allRequired = [...(client.requiredDocumentTypes || []), ...(client.phase2RequiredDocumentTypes || [])];
      const missingDocsList = Array.from(new Set([...phase1Categories, ...phase2Categories]))
        .filter(cat => allRequired.includes(cat) && !(client.documents || []).some(d => d.type === cat))
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

  const handleDownloadDocument = async (doc: ClientDocument) => {
    if (!doc.fileData && !doc.fileUrl) {
      alert("Arquivo original não disponível para download.");
      return;
    }

    try {
      const url = doc.fileData || doc.fileUrl;
      if (!url) return;

      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName || `${doc.type.replace(/[^a-zA-Z0-9]/g, '_')}_document`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For external URLs, try to fetch as blob to force download
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = doc.fileName || `${doc.type.replace(/[^a-zA-Z0-9]/g, '_')}_document`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch (fetchErr) {
          console.warn("Fetch download failed, falling back to window.open:", fetchErr);
          window.open(url, '_blank');
        }
      }
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
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[32px] shadow-2xl border border-slate-800/50 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
        <div className="flex items-center gap-6 w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-slate-700 rounded-3xl flex-shrink-0 flex items-center justify-center text-white text-3xl shadow-2xl border-4 border-slate-900">
            <i className={`fa-solid ${client.clientType === 'PF' ? 'fa-user' : 'fa-building-shield'}`}></i>
          </div>
          
          <div className="flex-grow">
            {!isEditing ? (
              <>
                <div className="flex items-center flex-wrap gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                    client.clientType === 'PF' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'
                  }`}>
                    {client.clientType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight font-outfit uppercase">{client.name}</h2>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-black rounded-full uppercase border border-blue-500/20">
                    {client.consortiumType}
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-black rounded-full uppercase border border-blue-500/20">
                    <i className="fa-solid fa-user-tie"></i>
                    <span className="opacity-60 mr-1">Cadastro:</span>
                    {client.analystName || 'Não Atribuído'}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-full uppercase border border-emerald-500/20">
                    <i className="fa-solid fa-star"></i>
                    <span className="opacity-60 mr-1">Contemplação:</span>
                    {client.analystContemplation || 'Não Atribuído'}
                  </div>
                  
                  <button 
                    onClick={() => onUpdateClientInfo({ paymentStatus: client.paymentStatus === 'PAID' ? 'PENDING' : 'PAID' })}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                      client.paymentStatus === 'PAID' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:bg-slate-800'
                    }`}
                    title={client.paymentStatus === 'PAID' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                  >
                    <i className={`fa-solid ${client.paymentStatus === 'PAID' ? 'fa-circle-check' : 'fa-circle-dollar-to-slot'}`}></i>
                    {client.paymentStatus === 'PAID' ? 'Pago / Enviado' : 'Pendente Pagamento'}
                  </button>

                  <button 
                    onClick={() => setIsEditing(true)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700/50 hover:border-blue-500/20"
                    title="Editar ou Transferir"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    Editar Cadastro
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-400 font-medium">
                  <span className="flex items-center gap-2"><i className="fa-solid fa-envelope text-slate-500"></i> Cliente: <b className="text-slate-200">{client.email}</b></span>
                  <span className="flex items-center gap-2"><i className="fa-solid fa-id-card text-slate-500"></i> {client.clientType === 'PF' ? 'CPF' : 'CNPJ'}: {client.cpf}</span>
                  <span className="flex items-center gap-2"><i className="fa-solid fa-tags text-slate-500"></i> G/C: <b className="text-slate-200">{client.group} / {client.quota}</b></span>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full pr-12 animate-slideUp">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome / Razão Social</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail do Cliente</label>
                  <input type="email" className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.clientType}
                    onChange={(e) => setEditForm({...editForm, clientType: e.target.value as 'PF' | 'PJ'})}
                  >
                    <option value="PF" className="bg-slate-900">Pessoa Física (PF)</option>
                    <option value="PJ" className="bg-slate-900">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{editForm.clientType === 'PF' ? 'CPF' : 'CNPJ'}</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" value={editForm.cpf} onChange={(e) => setEditForm({...editForm, cpf: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grupo</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" value={editForm.group} onChange={(e) => setEditForm({...editForm, group: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cota</label>
                  <input type="text" className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" value={editForm.quota} onChange={(e) => setEditForm({...editForm, quota: e.target.value})} />
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Consórcio</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.consortiumType}
                    onChange={(e) => setEditForm({...editForm, consortiumType: e.target.value})}
                  >
                    {consortiumOptions.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>

                <div className="col-span-full">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status de Pagamento</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value as 'PENDING' | 'PAID'})}
                  >
                    <option value="PENDING" className="bg-slate-900">Pendente</option>
                    <option value="PAID" className="bg-slate-900">Pago / Enviado</option>
                  </select>
                </div>
                
                <div className="col-span-full border-t border-slate-800 pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-right-left text-blue-400 text-xs"></i>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Transferir / Alterar Analistas</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analista de Cadastro</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.analystName}
                        onChange={(e) => handleAnalystTransfer(e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Nenhum analista atribuído</option>
                        {analysts.filter(a => a.role === 'Cadastro' || a.role === 'Ambos').map(a => (
                          <option key={a.id} value={a.name} className="bg-slate-900">{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analista de Contemplação</label>
                      <select 
                        className="w-full px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.analystContemplation}
                        onChange={(e) => handleContemplationAnalystTransfer(e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Nenhum analista atribuído</option>
                        {analysts.filter(a => a.role === 'Contemplação' || a.role === 'Ambos').map(a => (
                          <option key={a.id} value={a.name} className="bg-slate-900">{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-2 col-span-full justify-between mt-6 pt-6 border-t border-slate-800">
                  <button 
                    onClick={handleDeleteConfirm}
                    className="bg-red-500/10 text-red-500 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2 border border-red-500/20"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    EXCLUIR CADASTRO
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsEditing(false)} className="bg-slate-800 text-slate-400 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
                    <button onClick={handleSaveInfo} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">SALVAR E TRANSFERIR</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="w-full md:w-auto flex items-center gap-6">
            <div className="flex flex-col items-end gap-2 bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-inner">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso Total</span>
              <div className="w-full md:w-48 h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700/30">
                <div 
                  className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.3)] ${client.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                  style={{ width: `${client.progress}%` }}
                ></div>
              </div>
              <span className={`text-lg font-black ${client.progress === 100 ? 'text-emerald-500' : 'text-blue-400'}`}>{client.progress}% <span className="text-xs uppercase ml-1">concluído</span></span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleCopyLink}
                className="w-16 h-16 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30 transition-all active:scale-95 group shadow-lg shadow-blue-500/10"
                title="Copiar link de upload para o cliente"
              >
                <i className="fa-solid fa-link text-2xl group-hover:rotate-12 transition-transform"></i>
              </button>
              <button 
                onClick={handleCobrarDocumentos}
                className="w-16 h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 transition-all active:scale-95 group"
                title="Cobrar documentos faltantes via e-mail"
              >
                <i className="fa-solid fa-envelope-open-text text-2xl group-hover:rotate-12 transition-transform"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO DE ANOTAÇÕES - COMPACTA */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[24px] border border-slate-800/50 p-6 mb-8 animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/20">
              <i className="fa-solid fa-note-sticky text-sm"></i>
            </div>
            <h2 className="text-sm font-black text-white tracking-tight uppercase font-outfit">Anotações</h2>
          </div>
          <button 
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-slate-700"
          >
            <i className={`fa-solid ${isAddingNote ? 'fa-xmark' : 'fa-plus'}`}></i>
            {isAddingNote ? 'Cancelar' : 'Nova'}
          </button>
        </div>

        {isAddingNote && (
          <div className="mb-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Analista</label>
                <select 
                  value={selectedNoteAnalyst}
                  onChange={(e) => setSelectedNoteAnalyst(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Selecione</option>
                  {analysts.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                >
                  Salvar
                </button>
              </div>
            </div>
            <textarea 
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Digite sua anotação..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 min-h-[80px]"
              autoFocus
            />
          </div>
        )}

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {client.notes && client.notes.length > 0 ? (
            client.notes.map((note) => {
              const color = getAnalystColor(note.analystName);
              return (
                <div key={note.id} className="bg-slate-950/20 border border-slate-800/30 rounded-xl p-3 hover:bg-slate-900/40 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 ${color.bg} ${color.text} text-[9px] font-black rounded-md uppercase tracking-widest border ${color.border}`}>
                        {note.analystName}
                      </span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                        {note.date}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                      title="Excluir"
                    >
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
              <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Sem anotações</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase font-outfit">Checklist Primeira Fase</h2>
        <button 
          onClick={() => setIsAddingCustom(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <i className="fa-solid fa-plus"></i>
          Novo Requisito P1
        </button>
      </div>

      {isAddingCustom && (
        <div className="mb-8 bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20 animate-fadeIn">
          <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Adicionar Novo Requisito Fase 1</h4>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={customRequirement}
              onChange={(e) => setCustomRequirement(e.target.value)}
              placeholder="Ex: Certidão de Casamento, Contrato Social..."
              className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
              className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-12">
        {phase1Categories.map((category) => {
          const categoryDocs = (client.documents || []).filter(d => d.type === category);
          const isComplete = categoryDocs.length > 0;
          const isRequired = (client.requiredDocumentTypes || []).includes(category);
          
          return (
            <div key={category} className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl border-2 p-8 transition-all duration-300 shadow-sm ${!isRequired ? 'border-slate-800/50 opacity-60' : isComplete ? 'border-emerald-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105 ${!isRequired ? 'bg-slate-800 text-slate-500' : isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
                      <h3 className="text-xl font-black text-white tracking-tight">{category}</h3>
                      {!isRequired && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-700">OPCIONAL</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                      {isComplete ? `${categoryDocs.length} ARQUIVO(S) ENVIADO(S)` : isRequired ? 'PENDENTE DE ENVIO' : 'REQUISITO DESATIVADO'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onToggleRequirement(category)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isRequired 
                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 hover:bg-blue-600/20' 
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <i className={`fa-solid ${isRequired ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg`}></i>
                    {isRequired ? 'Obrigatório' : 'Caso Especial'}
                  </button>

                  <label className="flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-700 px-6 py-3.5 rounded-2xl text-sm font-black cursor-pointer transition-all shadow-lg shadow-blue-500/20 active:scale-95 group">
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
                    <div key={doc.id} className="group bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-blue-500/50 hover:bg-slate-900 transition-all shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-red-500 border border-slate-700">
                             <i className="fa-solid fa-file-pdf"></i>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-black text-slate-200 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-slate-500 font-bold tracking-widest">{doc.uploadDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewingDoc(doc)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"><i className="fa-solid fa-eye"></i></button>
                          <button onClick={() => onRemoveDocument(doc.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><i className="fa-solid fa-trash-can"></i></button>
                        </div>
                      </div>
                      {doc.confidence && (
                        <div className="flex items-center gap-2 text-[10px] text-blue-400 font-black bg-blue-400/10 py-1.5 px-3 rounded-xl border border-blue-500/20">
                          <i className="fa-solid fa-brain"></i>
                          <span>IA VALIDOU COM {(doc.confidence * 100).toFixed(0)}% DE PRECISÃO</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-800 rounded-3xl py-12 text-center bg-slate-950/20">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mx-auto mb-4 shadow-sm border border-slate-800">
                    <i className={`fa-solid ${isRequired ? 'fa-file-shield' : 'fa-circle-info'} text-3xl`}></i>
                  </div>
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">
                    {isRequired ? 'Documento Obrigatório' : 'Documento Opcional'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SEGUNDA FASE */}
      {!client.phase2Started ? (
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[32px] border border-slate-800/50 p-12 text-center animate-fadeIn">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <i className="fa-solid fa-flag-checkered text-3xl"></i>
          </div>
          <h3 className="text-2xl font-black text-white mb-3 font-outfit uppercase tracking-tight">Segunda Fase: Contemplação</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            A segunda fase inclui documentos de faturamento, vistoria e CRLV. Inicie esta fase apenas quando o cliente estiver pronto para a contemplação.
          </p>
          <button 
            onClick={() => onUpdateClientInfo({ phase2Started: true })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-3 mx-auto"
          >
            <i className="fa-solid fa-play"></i>
            Iniciar Segunda Fase
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase font-outfit">Checklist Segunda Fase</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCopyLink}
                className="bg-slate-800 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700"
                title="Copiar link específico para a Fase 2"
              >
                <i className="fa-solid fa-link"></i>
                Link Fase 2
              </button>
              <button 
                onClick={() => onUpdateClientInfo({ phase2Started: false })}
                className="bg-red-600/10 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600/20 transition-all flex items-center gap-2 border border-red-500/30"
                title="Cancelar e ocultar a Segunda Fase"
              >
                <i className="fa-solid fa-xmark"></i>
                Cancelar Fase 2
              </button>
              <button 
                onClick={() => setIsAddingCustomPhase2(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <i className="fa-solid fa-plus"></i>
                Novo Requisito P2
              </button>
            </div>
          </div>

          {isAddingCustomPhase2 && (
            <div className="mb-8 bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/20 animate-fadeIn">
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Adicionar Novo Requisito Fase 2</h4>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={customRequirementPhase2}
                  onChange={(e) => setCustomRequirementPhase2(e.target.value)}
                  placeholder="Ex: Nota Fiscal, Termo de Entrega..."
                  className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button 
                  onClick={handleAddCustomRequirementPhase2}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Adicionar
                </button>
                <button 
                  onClick={() => setIsAddingCustomPhase2(false)}
                  className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {phase2Categories.map((category) => {
              const categoryDocs = (client.documents || []).filter(d => d.type === category);
              const isComplete = categoryDocs.length > 0;
              const isRequired = (client.phase2RequiredDocumentTypes || []).includes(category);
              
              return (
                <div key={category} className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl border-2 p-8 transition-all duration-300 shadow-sm ${!isRequired ? 'border-slate-800/50 opacity-60' : isComplete ? 'border-emerald-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-105 ${!isRequired ? 'bg-slate-800 text-slate-500' : isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <i className={`fa-solid ${
                          category === DocumentType.CRLV ? 'fa-car' :
                          category === DocumentType.BILLING_FORM ? 'fa-file-invoice-dollar' :
                          category === DocumentType.INSPECTION ? 'fa-magnifying-glass-chart' : 'fa-file-circle-plus'
                        }`}></i>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-white tracking-tight">{category}</h3>
                          {!isRequired && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-700">OPCIONAL</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                          {isComplete ? `${categoryDocs.length} ARQUIVO(S) ENVIADO(S)` : isRequired ? 'PENDENTE DE ENVIO' : 'REQUISITO DESATIVADO'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => onTogglePhase2Requirement(category)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          isRequired 
                            ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/20' 
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <i className={`fa-solid ${isRequired ? 'fa-toggle-on' : 'fa-toggle-off'} text-lg`}></i>
                        {isRequired ? 'Obrigatório' : 'Caso Especial'}
                      </button>

                      <label className="flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3.5 rounded-2xl text-sm font-black cursor-pointer transition-all shadow-lg shadow-indigo-500/20 active:scale-95 group">
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
                        <div key={doc.id} className="group bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-red-500 border border-slate-700">
                                 <i className="fa-solid fa-file-pdf"></i>
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-black text-slate-200 truncate">{doc.fileName}</p>
                                <p className="text-[10px] text-slate-500 font-bold tracking-widest">{doc.uploadDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingDoc(doc)} className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"><i className="fa-solid fa-eye"></i></button>
                              <button onClick={() => onRemoveDocument(doc.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-800 rounded-3xl py-12 text-center bg-slate-950/20">
                      <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mx-auto mb-4 shadow-sm border border-slate-800">
                        <i className={`fa-solid ${isRequired ? 'fa-file-shield' : 'fa-circle-info'} text-3xl`}></i>
                      </div>
                      <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">
                        {isRequired ? 'Documento Obrigatório' : 'Documento Opcional'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* BARRA DE AÇÕES INFERIOR - REDIMENSIONADA */}
      <div className="fixed bottom-6 right-6 left-6 lg:left-1/3 xl:left-1/4 z-40">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[24px] text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl border border-slate-800 max-w-4xl mx-auto overflow-hidden animate-slideUp">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${client.progress === 100 ? 'bg-emerald-500 shadow-emerald-500/20 shadow-lg' : 'bg-blue-600 text-white shadow-blue-500/20 shadow-lg'}`}>
              <i className={`fa-solid ${client.progress === 100 ? 'fa-check-double' : 'fa-hourglass-half'}`}></i>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight leading-tight uppercase font-outfit">{client.progress === 100 ? 'Status: Documentação Completa' : 'Status: Pendente'}</p>
              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{client.progress === 100 ? 'Pronto para envio final' : 'Envio parcial disponível'}</p>
            </div>
          </div>
          
          <button 
            disabled={isFinalizing} 
            onClick={handleFinalizeProcess}
            className={`px-6 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center gap-2.5 relative overflow-hidden group ${
              isFinalizing 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : client.progress === 100
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 active:scale-95' 
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden animate-slideUp">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <i className="fa-solid fa-file-contract text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight font-outfit uppercase">{viewingDoc.type}</h3>
                  <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">{viewingDoc.fileName}</p>
                </div>
              </div>
              <button onClick={() => setViewingDoc(null)} className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-800 shadow-sm border border-slate-800">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>
            <div className="flex-grow bg-slate-950 p-12 flex items-center justify-center overflow-auto custom-scrollbar">
              {viewingDoc.fileData || viewingDoc.fileUrl ? (
                (viewingDoc.fileData?.startsWith('data:application/pdf') || viewingDoc.fileName?.toLowerCase().endsWith('.pdf')) ? (
                  <iframe 
                    src={viewingDoc.fileData || viewingDoc.fileUrl} 
                    className="w-full h-[60vh] rounded-2xl border-4 border-slate-800 shadow-2xl"
                    title="Documento PDF"
                  />
                ) : (
                  <div className="relative group">
                    <img src={viewingDoc.fileData || viewingDoc.fileUrl} alt="Documento" className="max-w-full rounded-2xl shadow-2xl border-4 border-slate-800" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  </div>
                )
              ) : (
                <div className="text-center text-slate-600">
                  <i className="fa-solid fa-eye-slash text-6xl mb-6 opacity-20"></i>
                  <p className="font-bold uppercase tracking-widest text-sm">Prévia indisponível para este arquivo.</p>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-slate-800 flex justify-end gap-4 bg-slate-950/50">
               <button onClick={() => setViewingDoc(null)} className="px-8 py-3 bg-slate-800 text-slate-400 font-black rounded-2xl text-xs tracking-widest uppercase hover:bg-slate-700 transition-all">Fechar</button>
               <button 
                onClick={() => handleDownloadDocument(viewingDoc)}
                className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg shadow-blue-500/20 flex items-center gap-3 hover:bg-blue-700 transition-all active:scale-95"
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
