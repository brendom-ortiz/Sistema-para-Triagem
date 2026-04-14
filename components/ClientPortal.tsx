import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc, increment } from 'firebase/firestore';
import { Client, ClientDocument, DocumentType, DocumentStatus, DocumentCategory } from '../types';
import { classifyDocument } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface ClientPortalProps {
  clientId: string;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ clientId }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientRef = doc(db, 'clients', clientId);
    
    // Listen to client info
    const unsubscribeClient = onSnapshot(clientRef, (docSnap) => {
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() } as Client);
      } else {
        setError('Cliente não encontrado.');
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching client:", err);
      setError('Erro ao carregar dados do cliente.');
      setLoading(false);
    });

    // Listen to documents
    const docsRef = collection(db, 'clients', clientId, 'documents');
    const unsubscribeDocs = onSnapshot(docsRef, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientDocument));
      setDocuments(docsData);
    }, (err) => {
      console.error("Firestore snapshot error:", err);
    });

    return () => {
      unsubscribeClient();
      unsubscribeDocs();
    };
  }, [clientId]);
  // Separate effect for progress sync to avoid stale closures
  useEffect(() => {
    if (client) {
      const allRequired = client.phase2Started 
        ? [...(client.requiredDocumentTypes || []), ...(client.phase2RequiredDocumentTypes || [])]
        : (client.requiredDocumentTypes || []);
      const completedTypes = allRequired.filter(type => 
        documents.some(d => d.type === type && d.status === DocumentStatus.UPLOADED)
      );
      const newProgress = allRequired.length > 0 
        ? Math.round((completedTypes.length / allRequired.length) * 100)
        : 100;
      
      if (newProgress !== client.progress) {
        console.log(`Updating progress for ${client.name}: ${newProgress}%`);
        const clientRef = doc(db, 'clients', clientId);
        updateDoc(clientRef, { 
          progress: newProgress,
          lastUpdate: new Date().toISOString()
        }).catch(err => console.error("Error updating progress:", err));
      }
    }
  }, [client?.requiredDocumentTypes, client?.phase2RequiredDocumentTypes, documents, clientId, client?.progress, client?.name]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentCategory) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    // Check file size for non-images (PDFs)
    if (!file.type.startsWith('image/') && file.size > 1000000) {
      alert('Arquivos PDF devem ter menos de 1MB. Por favor, comprima o arquivo ou envie uma foto.');
      return;
    }

    setUploading(type);
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
      
      // Final safety check for Firestore 1MB limit (approx 1,048,576 bytes)
      if (fileData.length > 1000000) {
        alert('O arquivo ainda é muito grande para o banco de dados (limite de 1MB). Por favor, tente tirar uma foto com menor resolução ou use um compressor de PDF.');
        setUploading(null);
        return;
      }
      
      console.log("Analyzing document with Gemini...");
      let analysis = { type: type, confidence: 0 };
      try {
        analysis = await classifyDocument(base64Data);
      } catch (aiErr) {
        console.warn("AI Classification failed, using default type:", aiErr);
      }
      
      const newDoc: Omit<ClientDocument, 'id'> = {
        type: type,
        aiType: analysis.type,
        status: DocumentStatus.UPLOADED,
        fileName: file.name,
        fileData: fileData,
        uploadDate: new Date().toISOString().split('T')[0],
        confidence: analysis.confidence || 0
      };

      await addDoc(collection(db, 'clients', clientId, 'documents'), newDoc);
      
      const clientRef = doc(db, 'clients', clientId);
      const currentUploaded = client.uploadedDocumentTypes || [];
      const currentTotal = client.totalDocsCount || 0;
      
      const updates: any = {
        totalDocsCount: increment(1),
        lastUpdate: new Date().toISOString()
      };

      if (!currentUploaded.includes(type)) {
        updates.uploadedDocumentTypes = [...currentUploaded, type];
      }

      await updateDoc(clientRef, updates);

      alert("Documento enviado com sucesso!");
      setUploading(null);
      
      if (e.target) {
        (e.target as HTMLInputElement).value = '';
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploading(null);
      if (e.target) {
        (e.target as HTMLInputElement).value = '';
      }
      alert(`Erro ao enviar: ${err.message || 'Verifique sua conexão'}`);
    }
  };

  const handleExitPortal = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('clientId');
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-black animate-pulse uppercase tracking-widest text-[10px]">Carregando Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl border border-slate-800/50 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg border border-red-500/20">
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 font-outfit uppercase tracking-tight">ACESSO NEGADO</h2>
          <p className="text-slate-400 mb-8 font-medium">{error || 'Link inválido ou expirado.'}</p>
          <button 
            onClick={handleExitPortal}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
          >
            Voltar ao Sistema
          </button>
        </div>
      </div>
    );
  }

  const isAnalyst = auth.currentUser !== null;
  
  const phase1DefaultCategories = [
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

  const categoriesWithDocs = Array.from(new Set(documents.map(d => d.type)));

  const phase1Categories = Array.from(new Set([
    ...phase1DefaultCategories,
    ...(client.requiredDocumentTypes || []),
    ...categoriesWithDocs.filter(t => !phase2DefaultCategories.includes(t as DocumentType) && !(client.phase2RequiredDocumentTypes || []).includes(t))
  ])).filter(Boolean) as DocumentCategory[];

  const phase2Categories = Array.from(new Set([
    ...phase2DefaultCategories,
    ...(client.phase2RequiredDocumentTypes || [])
  ])).filter(Boolean) as DocumentCategory[];

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-blue-500/30">
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-anchor text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white font-outfit">TRIAGEM ANCORADA</h1>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Portal do Cliente</p>
            </div>
          </div>
          
          {isAnalyst && (
            <button 
              onClick={handleExitPortal}
              className="px-6 py-2.5 bg-slate-900 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 border border-slate-800"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Sair do Portal
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto pt-12 px-4">
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[40px] shadow-2xl border border-slate-800/50 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-12 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_0%,transparent_70%)]"></div>
            </div>
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20 shadow-2xl animate-float">
              <i className="fa-solid fa-anchor text-4xl"></i>
            </div>
            <h1 className="text-3xl font-black mb-2 font-outfit uppercase tracking-tight">Olá, {client.name}</h1>
            <p className="opacity-80 text-sm font-medium max-w-md mx-auto">
              Seja bem-vindo ao seu portal seguro de envio de documentos. Acompanhe abaixo o status da sua documentação.
            </p>
            
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="w-full max-w-xs h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                  style={{ width: `${client.progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em]">{client.progress}% CONCLUÍDO</span>
            </div>
          </div>

          <div className="p-10">
            <div className="space-y-12">
              {/* Phase 1 */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <span className="font-black text-xs">01</span>
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight font-outfit">Primeira Fase: Documentação Básica</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {phase1Categories.map((type) => {
                    const categoryDocs = documents.filter(d => d.type === type);
                    const isUploaded = categoryDocs.length > 0;
                    const isRequired = (client.requiredDocumentTypes || []).includes(type);

                    return (
                      <div 
                        key={type}
                        className={`p-6 rounded-3xl border transition-all duration-300 ${
                          isUploaded 
                            ? 'border-emerald-500/30 bg-emerald-500/5' 
                            : isRequired
                            ? 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                            : 'border-slate-800/50 bg-slate-950/10 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                              isUploaded 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}>
                              <i className={`fa-solid ${isUploaded ? 'fa-check' : 'fa-file-arrow-up'}`}></i>
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-sm">{type}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className={`text-[10px] uppercase font-black tracking-widest ${isUploaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {isUploaded ? `${categoryDocs.length} arquivo(s) enviado(s)` : 'Aguardando envio'}
                                </p>
                                {!isUploaded && (
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isRequired ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {isRequired ? 'Obrigatório' : 'Opcional'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <label className="cursor-pointer group">
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, type)}
                              disabled={uploading === type}
                              accept="image/*,application/pdf"
                            />
                            <div className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                              uploading === type 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : isUploaded 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                            }`}>
                              {uploading === type ? 'Enviando...' : isUploaded ? 'Enviar Mais' : 'Enviar Arquivo'}
                            </div>
                          </label>
                        </div>
                        
                        {isUploaded && (
                          <div className="mt-4 pt-4 border-t border-emerald-500/10 space-y-2">
                            {categoryDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between text-[10px] text-emerald-400/80 font-bold">
                                <span className="truncate max-w-[200px] flex items-center gap-2">
                                  <i className="fa-solid fa-file-circle-check"></i>
                                  {doc.fileName}
                                </span>
                                <span className="opacity-50">{doc.uploadDate}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase 2 */}
              {client.phase2Started && (
                <div className="pt-8 border-t border-slate-800/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 border border-amber-500/20">
                      <span className="font-black text-xs">02</span>
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-outfit">Segunda Fase: Faturamento e Vistoria</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {phase2Categories.map((type) => {
                      const categoryDocs = documents.filter(d => d.type === type);
                      const isUploaded = categoryDocs.length > 0;
                      const isRequired = (client.phase2RequiredDocumentTypes || []).includes(type);

                      return (
                        <div 
                          key={type}
                          className={`p-6 rounded-3xl border transition-all duration-300 ${
                            isUploaded 
                              ? 'border-emerald-500/30 bg-emerald-500/5' 
                              : isRequired
                              ? 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                              : 'border-slate-800/50 bg-slate-950/10 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                                isUploaded 
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}>
                                <i className={`fa-solid ${isUploaded ? 'fa-check' : 'fa-file-arrow-up'}`}></i>
                              </div>
                              <div>
                                <p className="font-bold text-slate-200 text-sm">{type}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className={`text-[10px] uppercase font-black tracking-widest ${isUploaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {isUploaded ? `${categoryDocs.length} arquivo(s) enviado(s)` : 'Aguardando envio'}
                                  </p>
                                  {!isUploaded && (
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isRequired ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                                      {isRequired ? 'Obrigatório' : 'Opcional'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                              <label className="cursor-pointer group">
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={(e) => handleFileUpload(e, type)}
                                  disabled={uploading === type}
                                  accept="image/*,application/pdf"
                                />
                                <div className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                  uploading === type 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : isUploaded 
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                }`}>
                                  {uploading === type ? 'Enviando...' : isUploaded ? 'Enviar Mais' : 'Enviar Arquivo'}
                                </div>
                              </label>
                            </div>
                            
                            {isUploaded && (
                              <div className="mt-4 pt-4 border-t border-emerald-500/10 space-y-2">
                                {categoryDocs.map(doc => (
                                  <div key={doc.id} className="flex items-center justify-between text-[10px] text-emerald-400/80 font-bold">
                                    <span className="truncate max-w-[200px] flex items-center gap-2">
                                      <i className="fa-solid fa-file-circle-check"></i>
                                      {doc.fileName}
                                    </span>
                                    <span className="opacity-50">{doc.uploadDate}</span>
                                  </div>
                                ))}
                              </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-16 pt-10 border-t border-slate-800 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <i className="fa-solid fa-shield-halved text-blue-500/50"></i>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ambiente Seguro e Criptografado</p>
              </div>
              <p className="text-[10px] text-slate-600 font-bold max-w-sm mx-auto leading-relaxed">
                Seus documentos são processados com segurança por nossa Inteligência Artificial e armazenados em servidores protegidos.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <i className="fa-solid fa-anchor text-blue-500/30 text-[10px]"></i>
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">Triagem Ancorada</p>
            <i className="fa-solid fa-anchor text-blue-500/30 text-[10px]"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
