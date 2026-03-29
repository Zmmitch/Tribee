export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface InviteToken {
  id: string;
  trip_id: string;
  group_id: string;
  invited_by: string;
  invited_email: string | null;
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

// --- Request types ---

export interface SignupRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string | null;
}

export interface CreateInviteRequest {
  trip_id: string;
  group_id: string;
  email?: string;
  expires_in_hours?: number;
}

export interface RedeemInviteRequest {
  token: string;
}
