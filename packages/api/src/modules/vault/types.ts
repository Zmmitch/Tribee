export interface Document {
  id: string;
  trip_id: string;
  uploaded_by: string;
  title: string;
  doc_type: 'passport' | 'visa' | 'insurance' | 'booking' | 'ticket' | 'other';
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  share_scope: 'group' | 'individual';
  shared_with: string | null;
  created_at: string;
}

// --- Request types ---

export interface CreateDocumentRequest {
  title: string;
  doc_type: Document['doc_type'];
  file_name: string;
  file_size?: number;
  mime_type?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ShareDocumentRequest {
  share_scope: 'group' | 'individual';
  shared_with?: string;
}
