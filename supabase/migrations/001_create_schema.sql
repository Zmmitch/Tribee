-- ============================================================
-- Tribee MVP Schema — All tables, functions, and triggers
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Groups
CREATE TABLE groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Group members
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Trips
CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  destination text,
  start_date date,
  end_date date,
  currency text DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('planning', 'confirmed', 'active', 'completed', 'cancelled')) DEFAULT 'planning',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invite tokens
CREATE TABLE invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id),
  invited_email text,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Itinerary items
CREATE TABLE itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('transport', 'accommodation', 'activity', 'food', 'other')),
  location text,
  start_time timestamptz,
  end_time timestamptz,
  sort_order float8 NOT NULL DEFAULT 0,
  day_number integer,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Polls
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  poll_type text NOT NULL CHECK (poll_type IN ('destination', 'activity', 'date', 'custom')),
  status text NOT NULL CHECK (status IN ('open', 'resolved', 'cancelled')) DEFAULT 'open',
  deadline timestamptz,
  resolved_option_id uuid,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Poll options
CREATE TABLE poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- FK for resolved_option_id (after poll_options exists)
ALTER TABLE polls ADD CONSTRAINT polls_resolved_option_fk
  FOREIGN KEY (resolved_option_id) REFERENCES poll_options(id);

-- Ballots
CREATE TABLE ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Ballot rankings
CREATE TABLE ballot_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  UNIQUE(ballot_id, option_id)
);

-- Expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text CHECK (category IN ('transport', 'accommodation', 'food', 'activity', 'shopping', 'other')),
  split_type text NOT NULL CHECK (split_type IN ('equal', 'percentage', 'exact', 'by_attendee')) DEFAULT 'equal',
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense splits
CREATE TABLE expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  percentage numeric(5,2),
  UNIQUE(expense_id, user_id)
);

-- Settlements
CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES profiles(id),
  to_user uuid NOT NULL REFERENCES profiles(id),
  amount numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'confirmed')) DEFAULT 'pending',
  paid_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('passport', 'visa', 'insurance', 'booking', 'ticket', 'other')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  expires_at date,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Document shares
CREATE TABLE document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  share_scope text NOT NULL CHECK (share_scope IN ('group', 'individual')),
  shared_with uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_doc_shares_individual
  ON document_shares(document_id, shared_with) WHERE share_scope = 'individual';
CREATE UNIQUE INDEX idx_doc_shares_group
  ON document_shares(document_id) WHERE share_scope = 'group';

-- ============================================================
-- Functions
-- ============================================================

-- RLS helper: check group membership (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS helper: check group admin
CREATE OR REPLACE FUNCTION is_group_admin(p_group_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
