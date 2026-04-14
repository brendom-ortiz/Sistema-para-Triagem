
export enum DocumentStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  REJECTED = 'REJECTED'
}

export enum DocumentType {
  ID = 'Identidade (RG/CNH)',
  RESIDENCE = 'Comprovante de Residência',
  INCOME = 'Comprovante de Renda',
  CONTRACT = 'Contrato de Consórcio',
  REQUEST_EMAIL = 'E-mail de Solicitação',
  CRLV = 'CRLV (Documento do Veículo)',
  BILLING_FORM = 'Ficha de Faturamento',
  INSPECTION = 'Vistoria',
  UNKNOWN = 'Desconhecido'
}

export type DocumentCategory = DocumentType | string;

export interface ClientDocument {
  id: string;
  type: DocumentCategory;
  aiType?: string; // AI's classification
  status: DocumentStatus;
  fileName?: string;
  fileData?: string; // Base64 data for viewing
  fileUrl?: string; // For older documents stored in Storage
  uploadDate?: string;
  confidence?: number;
}

export interface Analyst {
  id: string;
  name: string;
  email: string;
  role: 'Cadastro' | 'Contemplação' | 'Ambos';
}

export interface Note {
  id: string;
  text: string;
  analystName: string;
  date: string;
}

export interface Client {
  id: string;
  name: string;
  email: string; // New field
  cpf: string;
  clientType: 'PF' | 'PJ';
  consortiumType: string;
  group: string;
  quota: string;
  analystName: string;
  analystEmail: string; 
  analystContemplation: string; 
  analystContemplationEmail?: string; 
  progress: number;
  documents: ClientDocument[];
  notes?: Note[]; // New field for annotations
  requiredDocumentTypes: DocumentCategory[];
  phase2RequiredDocumentTypes?: DocumentCategory[]; // New field for Phase 2
  phase2Started?: boolean; // New field to control visibility of Phase 2
  uploadedDocumentTypes: DocumentCategory[]; // New field for caching
  totalDocsCount?: number; // Total number of documents uploaded
  paymentStatus?: 'PENDING' | 'PAID';
  linkSentDate?: string; // Date when the upload link was sent to the client
  lastViewedDocsCount?: number; // To track new document notifications
}
