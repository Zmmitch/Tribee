import { SupabaseClient } from '@supabase/supabase-js';
import type { Document, DocumentShare } from './types.js';

export class VaultRepository {
  constructor(private db: SupabaseClient) {}

  async createDocument(
    doc: Omit<Document, 'id' | 'created_at'>,
  ): Promise<Document> {
    const { data, error } = await this.db
      .from('documents')
      .insert(doc)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getDocumentsByTrip(
    tripId: string,
    expiringOnly = false,
  ): Promise<Document[]> {
    let query = this.db
      .from('documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (expiringOnly) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query
        .not('expires_at', 'is', null)
        .lte('expires_at', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getDocumentById(docId: string): Promise<Document | null> {
    const { data, error } = await this.db
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single();
    if (error) return null;
    return data;
  }

  async deleteDocument(docId: string): Promise<void> {
    const { error } = await this.db
      .from('documents')
      .delete()
      .eq('id', docId);
    if (error) throw error;
  }

  async createShare(
    share: Omit<DocumentShare, 'id' | 'created_at'>,
  ): Promise<DocumentShare> {
    const { data, error } = await this.db
      .from('document_shares')
      .insert(share)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.db.storage
      .from('vault')
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async deleteStorageFile(storagePath: string): Promise<void> {
    const { error } = await this.db.storage
      .from('vault')
      .remove([storagePath]);
    if (error) throw error;
  }
}
