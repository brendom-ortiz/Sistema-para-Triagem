
import React, { useState, useEffect } from 'react';
import { Client, DocumentStatus, DocumentType, ClientDocument, Analyst, DocumentCategory } from './types';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import Header from './components/Header';
import Reports from './components/Reports';
import Segments from './components/Segments';
import AddClientModal from './components/AddClientModal';
import AnalystManagement from './components/AnalystManagement';
import DocumentManagement from './components/DocumentManagement';
import ClientPortal from './components/ClientPortal';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  getDocs,
  query, 
  orderBy,
  deleteField,
  increment
} from 'firebase/firestore';

const DEFAULT_REQUIRED = [
  DocumentType.ID, 
  DocumentType.RESIDENCE, 
  DocumentType.INCOME, 
  DocumentType.CONTRACT,
  DocumentType.REQUEST_EMAIL
];

export type ViewType = 'dashboard' | 'reports' | 'segments' | 'analysts' | 'management';

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientDocuments, setSelectedClientDocuments] = useState<ClientDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isClientPortal, setIsClientPortal] = useState(false);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);
  const [clientListTab, setClientListTab] = useState<'all' | 'notifications'>('all');

  // Check for client portal in URL
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get('clientId');
      if (clientId) {
        setIsClientPortal(true);
        setPortalClientId(clientId);
      } else {
        setIsClientPortal(false);
        setPortalClientId(null);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Sync Analysts from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'analysts'), (snapshot) => {
      const analystsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Analyst));
      setAnalysts(analystsData);
      setLastSaved(new Date());
    });
    return () => unsubscribe();
  }, []);

  // Sync Clients from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(clientsData);
      setLastSaved(new Date());
    });
    return () => unsubscribe();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientWithDocs = selectedClient ? { ...selectedClient, documents: selectedClientDocuments } : null;

  // Sync Documents for the SELECTED client
  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientDocuments([]);
      return;
    }

    const docsRef = collection(db, 'clients', selectedClientId, 'documents');
    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientDocument));
      setSelectedClientDocuments(docs);
      
      // Update progress in Firestore if needed - using a more targeted check
      // We don't want to depend on the whole 'clients' array here to avoid loops
      const clientRef = doc(db, 'clients', selectedClientId);
      getDoc(clientRef).then(docSnap => {
        if (docSnap.exists()) {
          const clientData = docSnap.data() as Client;
          const newProgress = calculateProgress(docs, clientData.requiredDocumentTypes, clientData.phase2RequiredDocumentTypes || [], clientData.phase2Started);
          if (newProgress !== clientData.progress) {
            console.log(`Updating progress for ${clientData.name} to ${newProgress}%`);
            updateDoc(clientRef, { 
              progress: newProgress,
              lastUpdate: new Date().toISOString()
            });
          }
        }
      }).catch(err => console.error("Error checking client progress:", err));
    }, (err) => {
      console.error("Error syncing documents for selected client:", err);
    });

    return () => unsubscribe();
  }, [selectedClientId, selectedClient?.phase2Started, selectedClient?.requiredDocumentTypes, selectedClient?.phase2RequiredDocumentTypes]); 

  const calculateProgress = (docs: ClientDocument[], requiredTypes: DocumentCategory[], phase2RequiredTypes: DocumentCategory[] = [], phase2Started: boolean = false) => {
    const allRequired = phase2Started ? [...requiredTypes, ...phase2RequiredTypes] : requiredTypes;
    if (allRequired.length === 0) return 100;
    const completedTypes = allRequired.filter(type => 
      docs.some(doc => doc.type === type && doc.status === DocumentStatus.UPLOADED)
    );
    return Math.round((completedTypes.length / allRequired.length) * 100);
  };

  const handleAddClient = async (newClient: Client) => {
    console.log("Attempting to add client:", newClient);
    
    try {
      const { id, documents, ...clientData } = newClient;
      const clientRef = doc(db, 'clients', id);
      console.log("Setting doc at path: clients/", id);
      await setDoc(clientRef, {
        ...clientData,
        uploadedDocumentTypes: [],
        totalDocsCount: 0,
        lastViewedDocsCount: 0
      });
      console.log("Doc saved successfully");
      setSelectedClientId(id);
      setIsAddModalOpen(false);
    } catch (error: any) {
      console.error("Detailed error adding client:", error);
      alert(`Erro técnico ao salvar: ${error.code || 'Erro'} - ${error.message}`);
    }
  };

  const handleAddAnalyst = async (analyst: Analyst) => {
    const { id, ...data } = analyst;
    await setDoc(doc(db, 'analysts', id), data);
  };

  const handleUpdateAnalyst = async (id: string, updates: Partial<Analyst>) => {
    await updateDoc(doc(db, 'analysts', id), updates);
  };

  const handleRemoveAnalyst = async (id: string) => {
    if (window.confirm("Deseja realmente remover este analista?")) {
      await deleteDoc(doc(db, 'analysts', id));
    }
  };

  const handleAddDocument = async (clientId: string, newDoc: ClientDocument) => {
    const { id, ...docData } = newDoc;
    await addDoc(collection(db, 'clients', clientId, 'documents'), docData);
    
    // Update uploadedDocumentTypes cache and totalDocsCount on the client
    const clientRef = doc(db, 'clients', clientId);
    const docSnap = await getDoc(clientRef);
    if (docSnap.exists()) {
      const clientData = docSnap.data() as Client;
      const currentUploaded = clientData.uploadedDocumentTypes || [];
      const currentTotal = clientData.totalDocsCount || 0;
      
      const updates: any = {
        totalDocsCount: increment(1),
        lastUpdate: new Date().toISOString()
      };

      if (!currentUploaded.includes(newDoc.type)) {
        updates.uploadedDocumentTypes = [...currentUploaded, newDoc.type];
      }

      await updateDoc(clientRef, updates);
    }
  };

  const handleRemoveDocument = async (clientId: string, docId: string) => {
    const docRef = doc(db, 'clients', clientId, 'documents', docId);
    const docSnap = await getDoc(docRef);
    const typeToRemove = docSnap.exists() ? (docSnap.data() as ClientDocument).type : null;
    
    await deleteDoc(docRef);
    
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.data() as Client;
      const currentTotal = clientData.totalDocsCount || 0;
      const updates: any = {
        totalDocsCount: increment(-1),
        lastUpdate: new Date().toISOString()
      };

      if (typeToRemove) {
        // Re-check if any other document of this type exists
        const docsRef = collection(db, 'clients', clientId, 'documents');
        const q = query(docsRef);
        const remainingDocsSnap = await getDocs(q);
        const stillHasType = remainingDocsSnap.docs.some(d => (d.data() as ClientDocument).type === typeToRemove);
        
        if (!stillHasType) {
          const currentUploaded = clientData.uploadedDocumentTypes || [];
          updates.uploadedDocumentTypes = currentUploaded.filter(t => t !== typeToRemove);
        }
      }

      await updateDoc(clientRef, updates);
    }
  };

  const handleUpdateClientInfo = async (clientId: string, updates: Partial<Client>) => {
    const firestoreUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
      if (val === undefined) {
        firestoreUpdates[key] = deleteField();
      } else {
        firestoreUpdates[key] = val;
      }
    });

    await updateDoc(doc(db, 'clients', clientId), firestoreUpdates);
  };

  const handleToggleRequirement = async (clientId: string, docType: DocumentCategory) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const isCurrentlyRequired = client.requiredDocumentTypes.includes(docType);
    const newRequired = isCurrentlyRequired 
      ? client.requiredDocumentTypes.filter(t => t !== docType)
      : [...client.requiredDocumentTypes, docType];
    
    await updateDoc(doc(db, 'clients', clientId), {
      requiredDocumentTypes: newRequired
    });
  };

  const handleTogglePhase2Requirement = async (clientId: string, docType: DocumentCategory) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const phase2Required = client.phase2RequiredDocumentTypes || [];
    const isCurrentlyRequired = phase2Required.includes(docType);
    const newRequired = isCurrentlyRequired 
      ? phase2Required.filter(t => t !== docType)
      : [...phase2Required, docType];
    
    await updateDoc(doc(db, 'clients', clientId), {
      phase2RequiredDocumentTypes: newRequired
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    await deleteDoc(doc(db, 'clients', clientId));
    setSelectedClientId(null);
  };

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (c.cpf || '').includes(searchTerm) ||
    (c.group || '').includes(searchTerm) ||
    (c.quota || '').includes(searchTerm)
  );

  if (isClientPortal && portalClientId) {
    return (
      <ClientPortal clientId={portalClientId} />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
        <Header activeView={activeView} onViewChange={setActiveView} />
        
        <main className="flex-grow container mx-auto px-4 py-8 relative">
          {/* Indicador de Salvamento Automático */}
          <div className="absolute top-0 right-4 flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest pointer-events-none opacity-60">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            Sincronizado {lastSaved && lastSaved.toLocaleTimeString()}
          </div>

          {activeView === 'dashboard' && (
            <div className="flex flex-col lg:flex-row gap-8 animate-fadeIn">
              <div className="w-full lg:w-1/3 xl:w-1/4">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/50 overflow-hidden">
                  <div className="p-5 border-b border-slate-800/50 space-y-4">
                    <div className="relative group">
                      <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar cliente ou cota..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm text-slate-200 placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] active:scale-[0.98]"
                    >
                      <i className="fa-solid fa-plus"></i>
                      Novo Cadastro
                    </button>

                    <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800/50">
                      <button 
                        onClick={() => setClientListTab('all')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          clientListTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Todos ({filteredClients.length})
                      </button>
                      <button 
                        onClick={() => setClientListTab('notifications')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                          clientListTab === 'notifications' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Novos ({filteredClients.filter(c => (c.totalDocsCount || 0) > (c.lastViewedDocsCount || 0)).length})
                        {filteredClients.some(c => (c.totalDocsCount || 0) > (c.lastViewedDocsCount || 0)) && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar">
                    <ClientList 
                      clients={clientListTab === 'all' 
                        ? filteredClients 
                        : filteredClients.filter(c => (c.totalDocsCount || 0) > (c.lastViewedDocsCount || 0))
                      } 
                      selectedId={selectedClientId} 
                      onSelect={setSelectedClientId} 
                      onDelete={handleDeleteClient}
                    />
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-2/3 xl:w-3/4">
                {selectedClientWithDocs ? (
                  <ClientDetails 
                    client={selectedClientWithDocs} 
                    analysts={analysts}
                    onAddDocument={(newDoc) => handleAddDocument(selectedClientWithDocs.id, newDoc)}
                    onRemoveDocument={(docId) => handleRemoveDocument(selectedClientWithDocs.id, docId)}
                    onUpdateClientInfo={(updates) => handleUpdateClientInfo(selectedClientWithDocs.id, updates)}
                    onDeleteClient={() => handleDeleteClient(selectedClientWithDocs.id)}
                    onToggleRequirement={(docType) => handleToggleRequirement(selectedClientWithDocs.id, docType)}
                    onTogglePhase2Requirement={(docType) => handleTogglePhase2Requirement(selectedClientWithDocs.id, docType)}
                  />
                ) : (
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/50 p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mb-8 border border-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                      <i className="fa-solid fa-anchor text-4xl animate-float"></i>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3 font-outfit tracking-tight">Selecione um Cliente</h2>
                    <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                      Escolha um cliente da lista ao lado para gerenciar documentos e acompanhar o status da triagem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'reports' && <Reports clients={clients} />}
          {activeView === 'segments' && <Segments clients={clients} onSelectClient={(id) => { setSelectedClientId(id); setActiveView('dashboard'); }} />}
          {activeView === 'analysts' && (
            <AnalystManagement 
              analysts={analysts} 
              onAdd={handleAddAnalyst} 
              onUpdate={handleUpdateAnalyst}
              onRemove={handleRemoveAnalyst} 
              clients={clients} 
              onUpdateClientInfo={handleUpdateClientInfo}
              onSelectClient={(id) => { setSelectedClientId(id); setActiveView('dashboard'); }}
            />
          )}
          {activeView === 'management' && <DocumentManagement clients={clients} onUpdateClientInfo={handleUpdateClientInfo} />}
        </main>

        {isAddModalOpen && (
          <AddClientModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddClient} 
            analysts={analysts}
          />
        )}

        <footer className="bg-slate-950/50 border-t border-slate-900 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <i className="fa-solid fa-anchor text-blue-500/50 text-xs"></i>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Triagem Ancorada</p>
            <i className="fa-solid fa-anchor text-blue-500/50 text-xs"></i>
          </div>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">&copy; 2024 Tecnologia para Gestão Documental Inteligente</p>
        </footer>
      </div>
  );
};

export default App;
