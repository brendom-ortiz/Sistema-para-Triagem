
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
  UNKNOWN = 'Desconhecido'
}

export interface ClientDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  fileName?: string;
  fileData?: string; // Base64 data for viewing
  uploadDate?: string;
  confidence?: number;
}

export interface Analyst {
  id: string;
  name: string;
  email: string;
  role: 'Cadastro' | 'Contemplação' | 'Ambos';
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
  progress: number;
  documents: ClientDocument[];
  requiredDocumentTypes: DocumentType[];
}
