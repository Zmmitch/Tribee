import { randomBytes } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../shared/supabase.js';
import { eventBus } from '../../shared/event-bus.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors.js';
import { IdentityRepository } from './repository.js';
import { IdentityEvents } from './events.js';
import type {
  SignupRequest,
  LoginRequest,
  MagicLinkRequest,
  UpdateProfileRequest,
  CreateInviteRequest,
  RedeemInviteRequest,
  Profile,
} from './types.js';

export class IdentityService {
  private repo: IdentityRepository;

  constructor(userClient: SupabaseClient) {
    this.repo = new IdentityRepository(userClient);
  }

  // --- Auth ---

  async signup(req: SignupRequest) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: req.email,
      password: req.password,
      user_metadata: { display_name: req.display_name },
      email_confirm: true,
    });
    if (error) throw new BadRequestError(error.message);

    // Profile row is created by the DB trigger; update display_name
    await supabaseAdmin
      .from('profiles')
      .update({ display_name: req.display_name })
      .eq('id', data.user.id);

    return { user_id: data.user.id, message: 'Account created successfully.' };
  }

  async login(req: LoginRequest) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: req.email,
      password: req.password,
    });
    if (error) throw new BadRequestError(error.message);
    return {
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
      expires_at: data.session!.expires_at,
      user: { id: data.user!.id, email: data.user!.email },
    };
  }

  async sendMagicLink(req: MagicLinkRequest) {
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email: req.email,
    });
    if (error) throw new BadRequestError(error.message);
    return { message: 'Magic link sent to email.' };
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw new BadRequestError(error.message);
    return {
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
      expires_at: data.session!.expires_at,
    };
  }

  // --- Profile ---

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.repo.getProfile(userId);
    if (!profile) throw new NotFoundError('Profile', userId);
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: UpdateProfileRequest,
  ): Promise<Profile> {
    const profile = await this.repo.updateProfile(userId, updates);
    eventBus.emit(IdentityEvents.PROFILE_UPDATED, { userId, updates });
    return profile;
  }

  // --- Groups ---

  async getMyGroups(userId: string) {
    return this.repo.getGroupsByUser(userId);
  }

  async getGroupMembers(groupId: string, userId: string) {
    const isMember = await this.repo.isGroupMember(groupId, userId);
    if (!isMember) throw new ForbiddenError('Not a member of this group');
    return this.repo.getGroupMembers(groupId);
  }

  // --- Invites ---

  async createInvite(userId: string, req: CreateInviteRequest) {
    const isAdmin = await this.repo.isGroupAdmin(req.group_id, userId);
    if (!isAdmin) throw new ForbiddenError('Only group admins can create invites');

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (req.expires_in_hours ?? 72));

    const invite = await this.repo.createInviteToken({
      trip_id: req.trip_id,
      group_id: req.group_id,
      invited_by: userId,
      invited_email: req.email ?? null,
      token,
      expires_at: expiresAt.toISOString(),
    });

    eventBus.emit(IdentityEvents.INVITE_CREATED, { invite });
    return invite;
  }

  async redeemInvite(userId: string, req: RedeemInviteRequest) {
    const invite = await this.repo.getInviteByToken(req.token);
    if (!invite) throw new NotFoundError('Invite token');
    if (new Date(invite.expires_at) < new Date()) {
      throw new BadRequestError('Invite has expired');
    }

    const isMember = await this.repo.isGroupMember(invite.group_id, userId);
    if (isMember) throw new BadRequestError('Already a member of this group');

    await this.repo.addGroupMember(invite.group_id, userId, 'member');
    await this.repo.redeemInviteToken(invite.id, userId);

    eventBus.emit(IdentityEvents.INVITE_REDEEMED, { invite, userId });
    eventBus.emit(IdentityEvents.MEMBER_JOINED, {
      groupId: invite.group_id,
      userId,
    });

    return { group_id: invite.group_id, trip_id: invite.trip_id };
  }
}
