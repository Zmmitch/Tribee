import { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Group, GroupMember, InviteToken } from './types.js';

export class IdentityRepository {
  constructor(private db: SupabaseClient) {}

  // --- Profiles ---

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  }

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>,
  ): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Groups ---

  async getGroupsByUser(userId: string): Promise<Group[]> {
    const { data, error } = await this.db
      .from('groups')
      .select('id, name, avatar_url, created_by, created_at, group_members!inner(user_id)')
      .eq('group_members.user_id', userId);
    if (error) throw error;
    return (data ?? []).map(({ group_members: _, ...group }) => group) as Group[];
  }

  async getGroupMembers(
    groupId: string,
  ): Promise<(GroupMember & { profile: Profile })[]> {
    const { data, error } = await this.db
      .from('group_members')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId);
    if (error) throw error;
    return data ?? [];
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const { data } = await this.db
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    return !!data;
  }

  async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    const { data } = await this.db
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    return !!data;
  }

  async addGroupMember(
    groupId: string,
    userId: string,
    role: 'admin' | 'member' = 'member',
  ): Promise<GroupMember> {
    const { data, error } = await this.db
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Invites ---

  async createInviteToken(
    invite: Omit<InviteToken, 'id' | 'used_at' | 'used_by' | 'created_at'>,
  ): Promise<InviteToken> {
    const { data, error } = await this.db
      .from('invite_tokens')
      .insert(invite)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getInviteByToken(token: string): Promise<InviteToken | null> {
    const { data, error } = await this.db
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();
    if (error) return null;
    return data;
  }

  async redeemInviteToken(tokenId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('invite_tokens')
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq('id', tokenId);
    if (error) throw error;
  }
}
