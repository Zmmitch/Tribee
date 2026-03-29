import { SupabaseClient } from '@supabase/supabase-js';
import { eventBus } from '../../shared/event-bus.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors.js';
import { VaultRepository } from './repository.js';
import { VaultEvents } from './events.js';
import type {
  Document,
  CreateDocumentRequest,
  ShareDocumentRequest,
} from './types.js';

export class VaultService {
  private repo: VaultRepository;

  constructor(userClient: SupabaseClient) {
    this.repo = new VaultRepository(userClient);
  }

  async uploadDocument(
    userId: string,
    tripId: string,
    storagePath: string,
    req: CreateDocumentRequest,
  ): Promise<Document> {
    const doc = await this.repo.createDocument({
      trip_id: tripId,
      uploaded_by: userId,
      title: req.title,
      doc_type: req.doc_type,
      storage_path: storagePath,
      file_name: req.file_name,
      file_size: req.file_size ?? null,
      mime_type: req.mime_type ?? null,
      expires_at: req.expires_at ?? null,
      metadata: req.metadata ?? {},
    });

    eventBus.emit(VaultEvents.DOCUMENT_UPLOADED, { doc, userId });
    return doc;
  }

  async getDocuments(tripId: string, expiringOnly = false): Promise<Document[]> {
    return this.repo.getDocumentsByTrip(tripId, expiringOnly);
  }

  async getDocumentDetail(docId: string) {
    const doc = await this.repo.getDocumentById(docId);
    if (!doc) throw new NotFoundError('Document', docId);

    let downloadUrl: string | null = null;
    try {
      downloadUrl = await this.repo.getSignedUrl(doc.storage_path);
    } catch {
      // Storage might not be configured yet
    }

    return { ...doc, download_url: downloadUrl };
  }

  async deleteDocument(userId: string, docId: string): Promise<void> {
    const doc = await this.repo.getDocumentById(docId);
    if (!doc) throw new NotFoundError('Document', docId);
    if (doc.uploaded_by !== userId) {
      throw new ForbiddenError('Only the uploader can delete this document');
    }

    try {
      await this.repo.deleteStorageFile(doc.storage_path);
    } catch {
      // Continue even if storage delete fails
    }

    await this.repo.deleteDocument(docId);
    eventBus.emit(VaultEvents.DOCUMENT_DELETED, { docId, userId });
  }

  async shareDocument(
    userId: string,
    docId: string,
    req: ShareDocumentRequest,
  ) {
    const doc = await this.repo.getDocumentById(docId);
    if (!doc) throw new NotFoundError('Document', docId);
    if (doc.uploaded_by !== userId) {
      throw new ForbiddenError('Only the uploader can share this document');
    }

    if (req.share_scope === 'individual' && !req.shared_with) {
      throw new BadRequestError(
        'shared_with is required for individual shares',
      );
    }

    const share = await this.repo.createShare({
      document_id: docId,
      share_scope: req.share_scope,
      shared_with: req.shared_with ?? null,
    });

    eventBus.emit(VaultEvents.DOCUMENT_SHARED, { docId, share, userId });
    return share;
  }
}
