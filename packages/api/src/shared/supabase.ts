import { createClient } from '@supabase/supabase-js';
import { config } from '../app/config/index.js';

/** Admin client — bypasses RLS. Use for server-side operations only. */
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
);

/** Creates a per-request client scoped to the user's JWT (respects RLS). */
export function createUserClient(accessToken: string) {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
