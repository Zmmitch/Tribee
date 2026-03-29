import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Document {
  id: string;
  trip_id: string;
  title: string;
  doc_type: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  download_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentPayload {
  title: string;
  doc_type: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  expires_at?: string;
}

export interface ShareDocumentPayload {
  share_scope: 'group' | 'individual';
  shared_with?: string;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export function createDocument(tripId: string, payload: CreateDocumentPayload) {
  return api.post<Document>(`/trips/${tripId}/documents`, payload);
}

export function listDocuments(tripId: string, expiring?: boolean) {
  const query = expiring ? '?expiring=true' : '';
  return api.get<Document[]>(`/trips/${tripId}/documents${query}`);
}

export function getDocument(tripId: string, documentId: string) {
  return api.get<Document>(`/trips/${tripId}/documents/${documentId}`);
}

export function deleteDocument(tripId: string, documentId: string) {
  return api.delete<void>(`/trips/${tripId}/documents/${documentId}`);
}

export function shareDocument(
  tripId: string,
  documentId: string,
  payload: ShareDocumentPayload,
) {
  return api.post<void>(`/trips/${tripId}/documents/${documentId}/share`, payload);
}
