import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { Client, ClientDocument, DocumentType, DocumentStatus } from '../types';
import { classifyDocument } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface ClientPortalProps {
  clientId: string;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ clientId }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
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
      const completedTypes = client.requiredDocumentTypes.filter(type => 
        documents.some(d => d.type === type && d.status === DocumentStatus.UPLOADED)
      );
      const newProgress = client.requiredDocumentTypes.length > 0 
        ? Math.round((completedTypes.length / client.requiredDocumentTypes.length) * 100)
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
  }, [client?.requiredDocumentTypes, documents, clientId, client?.progress, client?.name]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
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
      // Base64 is ~33% larger than binary, so 1MB limit is roughly 1.3MB of base64 string
      if (fileData.length > 1000000) {
        alert('O arquivo ainda é muito grande para o banco de dados (limite de 1MB). Por favor, tente tirar uma foto com menor resolução ou use um compressor de PDF.');
        setUploading(null);
        return;
      }
      
      console.log("Analyzing document with Gemini...");
      // Analyze with Gemini - wrap in try/catch to not block upload if AI fails
      let analysis = { type: type, confidence: 0 };
      try {
        analysis = await classifyDocument(base64Data);
      } catch (aiErr) {
        console.warn("AI Classification failed, using default type:", aiErr);
      }
      
      const newDoc: Omit<ClientDocument, 'id'> = {
        type: type, // Always use the type the user intended
        aiType: analysis.type, // Store AI's guess separately
        status: DocumentStatus.UPLOADED,
        fileName: file.name,
        fileData: fileData,
        uploadDate: new Date().toISOString().split('T')[0],
        confidence: analysis.confidence || 0
      };

      console.log(`Saving document to Firestore path: clients/${clientId}/documents`);
      await addDoc(collection(db, 'clients', clientId, 'documents'), newDoc);
      
      // Update uploadedDocumentTypes cache on the client document
      const clientRef = doc(db, 'clients', clientId);
      const currentUploaded = client.uploadedDocumentTypes || [];
      if (!currentUploaded.includes(type)) {
        await updateDoc(clientRef, {
          uploadedDocumentTypes: [...currentUploaded, type],
          lastUpdate: new Date().toISOString()
        });
      }

      console.log("Document saved successfully");
      alert("Documento enviado com sucesso!");
      setUploading(null);
      
      // Clear input value to allow re-uploading the same file
      if (event.target) {
        (event.target as HTMLInputElement).value = '';
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploading(null);
      if (event.target) {
        (event.target as HTMLInputElement).value = '';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-xl border border-gray-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg border-2 border-white">
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">ACESSO NEGADO</h2>
          <p className="text-gray-500 mb-8 font-medium">{error || 'Link inválido ou expirado.'}</p>
          <button 
            onClick={handleExitPortal}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
          >
            Voltar ao Sistema
          </button>
        </div>
      </div>
    );
  }

  const isAnalyst = auth.currentUser !== null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fa-solid fa-anchor text-lg"></i>
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-800">TRIAGEM ANCORADA</h1>
          </div>
          
          {isAnalyst && (
            <button 
              onClick={handleExitPortal}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Sair do Portal
            </button>
          )}
        </div>
      </div>
      <div className="max-w-2xl mx-auto pt-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <i className="fa-solid fa-anchor text-3xl"></i>
            </div>
            <h1 className="text-2xl font-bold mb-1">Portal do Cliente</h1>
            <p className="opacity-80 text-sm">Triagem Ancorada - Envio de Documentos</p>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Olá, {client.name}</h2>
              <p className="text-gray-500 text-sm">
                Por favor, envie os documentos listados abaixo para dar continuidade ao seu processo de consórcio.
              </p>
            </div>

            <div className="space-y-4">
              {client.requiredDocumentTypes.map((type) => {
                const categoryDocs = documents.filter(d => d.type === type);
                const isUploaded = categoryDocs.length > 0;

                return (
                  <div 
                    key={type}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isUploaded ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isUploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 border border-gray-200'
                        }`}>
                          <i className={`fa-solid ${isUploaded ? 'fa-check' : 'fa-file-arrow-up'}`}></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{type}</p>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                            {isUploaded ? `${categoryDocs.length} arquivo(s) enviado(s)` : 'Pendente'}
                          </p>
                        </div>
                      </div>

                      <label className="cursor-pointer">
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, type)}
                          disabled={uploading === type}
                          accept="image/*,application/pdf"
                        />
                        <div className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          uploading === type 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : isUploaded 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}>
                          {uploading === type ? 'Enviando...' : isUploaded ? 'Enviar Mais' : 'Enviar'}
                        </div>
                      </label>
                    </div>
                    
                    {isUploaded && (
                      <div className="mt-3 pt-3 border-t border-emerald-100/50 space-y-2">
                        {categoryDocs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                            <span className="truncate max-w-[180px] flex items-center gap-1">
                              <i className="fa-solid fa-file-circle-check"></i>
                              {doc.fileName}
                            </span>
                            <span className="opacity-60">{doc.uploadDate}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Seus documentos são processados com segurança por nossa Inteligência Artificial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
