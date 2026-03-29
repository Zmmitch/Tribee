import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hsxutsatptikxjrffplt.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeHV0c2F0cHRpa3hqcmZmcGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTk2MTEsImV4cCI6MjA5MDMzNTYxMX0.lZE1Sc7RAmIaW3_RCX7hmjOEoTUDQsgTlU9m2q4M0Yo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
