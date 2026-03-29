import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDocuments,
  getDocument,
  createDocument,
  deleteDocument,
  shareDocument,
  CreateDocumentPayload,
  ShareDocumentPayload,
} from '../services/vault';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  documents: (tripId: string) => ['trips', tripId, 'documents'] as const,
  expiring: (tripId: string) => ['trips', tripId, 'documents', 'expiring'] as const,
  document: (tripId: string, id: string) => ['trips', tripId, 'documents', id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useDocuments(tripId: string) {
  return useQuery({
    queryKey: keys.documents(tripId),
    queryFn: () => listDocuments(tripId),
  });
}

export function useExpiringDocuments(tripId: string) {
  return useQuery({
    queryKey: keys.expiring(tripId),
    queryFn: () => listDocuments(tripId, true),
  });
}

export function useDocument(tripId: string, documentId: string) {
  return useQuery({
    queryKey: keys.document(tripId, documentId),
    queryFn: () => getDocument(tripId, documentId),
    enabled: !!documentId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => createDocument(tripId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.documents(tripId) });
    },
  });
}

export function useDeleteDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(tripId, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.documents(tripId) });
    },
  });
}

export function useShareDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: ShareDocumentPayload }) =>
      shareDocument(tripId, documentId, payload),
    onSuccess: (_, { documentId }) => {
      qc.invalidateQueries({ queryKey: keys.document(tripId, documentId) });
    },
  });
}
