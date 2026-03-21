
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
  deleteField
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
          const newProgress = calculateProgress(docs, clientData.requiredDocumentTypes);
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
  }, [selectedClientId]); // Removed 'clients' dependency to avoid infinite loop

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedClientWithDocs = selectedClient ? { ...selectedClient, documents: selectedClientDocuments } : null;

  const calculateProgress = (docs: ClientDocument[], requiredTypes: DocumentCategory[]) => {
    if (requiredTypes.length === 0) return 100;
    const completedTypes = requiredTypes.filter(type => 
      docs.some(doc => doc.type === type && doc.status === DocumentStatus.UPLOADED)
    );
    return Math.round((completedTypes.length / requiredTypes.length) * 100);
  };

  const handleAddClient = async (newClient: Client) => {
    console.log("Attempting to add client:", newClient);
    
    try {
      const { id, documents, ...clientData } = newClient;
      const clientRef = doc(db, 'clients', id);
      console.log("Setting doc at path: clients/", id);
      await setDoc(clientRef, {
        ...clientData,
        uploadedDocumentTypes: []
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
        totalDocsCount: currentTotal + 1,
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
        totalDocsCount: Math.max(0, currentTotal - 1),
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
    const firestoreUpdates: any = { ...updates };
    
    // If linkSentDate is explicitly undefined, we want to remove it from Firestore
    if (updates.hasOwnProperty('linkSentDate') && updates.linkSentDate === undefined) {
      firestoreUpdates.linkSentDate = deleteField();
    }

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header activeView={activeView} onViewChange={setActiveView} />
        
        <main className="flex-grow container mx-auto px-4 py-8 relative">
          {/* Indicador de Salvamento Automático */}
          <div className="absolute top-0 right-4 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest pointer-events-none opacity-50">
            <i className="fa-solid fa-cloud-arrow-up animate-pulse"></i>
            Sincronizado {lastSaved && lastSaved.toLocaleTimeString()}
          </div>

          {activeView === 'dashboard' && (
            <div className="flex flex-col lg:flex-row gap-8 animate-fadeIn">
              <div className="w-full lg:w-1/3 xl:w-1/4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar cliente ou cota..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <i className="fa-solid fa-plus"></i>
                      Novo Cadastro
                    </button>
                  </div>
                  <ClientList 
                    clients={filteredClients} 
                    selectedId={selectedClientId} 
                    onSelect={setSelectedClientId} 
                    onDelete={handleDeleteClient}
                  />
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
                  />
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6">
                      <i className="fa-solid fa-users text-3xl"></i>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecione um Cliente</h2>
                    <p className="text-gray-500 max-w-xs mx-auto">
                      Escolha um cliente da lista ao lado para gerenciar documentos e acompanhar o status.
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

        <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-400 text-sm">
          <p>&copy; 2024 Triagem Ancorada - Tecnologia para Gestão Documental</p>
        </footer>
      </div>
  );
};

export default App;
