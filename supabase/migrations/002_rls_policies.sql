-- ============================================================
-- Row-Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- ---- Profiles ----
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
  )
);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- ---- Groups ----
CREATE POLICY groups_select ON groups FOR SELECT USING (is_group_member(id));
CREATE POLICY groups_insert ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY groups_update ON groups FOR UPDATE USING (is_group_admin(id));

-- ---- Group Members ----
CREATE POLICY group_members_select ON group_members FOR SELECT USING (is_group_member(group_id));
CREATE POLICY group_members_insert ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY group_members_update ON group_members FOR UPDATE USING (is_group_admin(group_id));
CREATE POLICY group_members_delete ON group_members FOR DELETE USING (is_group_admin(group_id));

-- ---- Invite Tokens ----
CREATE POLICY invite_tokens_select ON invite_tokens FOR SELECT USING (invited_by = auth.uid());
CREATE POLICY invite_tokens_insert ON invite_tokens FOR INSERT WITH CHECK (is_group_admin(group_id));
CREATE POLICY invite_tokens_update ON invite_tokens FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ---- Trips ----
CREATE POLICY trips_select ON trips FOR SELECT USING (is_group_member(group_id));
CREATE POLICY trips_insert ON trips FOR INSERT WITH CHECK (is_group_member(group_id));
CREATE POLICY trips_update ON trips FOR UPDATE USING (is_group_member(group_id));
CREATE POLICY trips_delete ON trips FOR DELETE USING (is_group_admin(group_id));

-- ---- Itinerary Items ----
CREATE POLICY itinerary_items_select ON itinerary_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE id = itinerary_items.trip_id AND is_group_member(group_id))
);
CREATE POLICY itinerary_items_insert ON itinerary_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE id = itinerary_items.trip_id AND is_group_member(group_id))
);
CREATE POLICY itinerary_items_update ON itinerary_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trips WHERE id = itinerary_items.trip_id AND is_group_member(group_id))
);
CREATE POLICY itinerary_items_delete ON itinerary_items FOR DELETE USING (
  created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM trips t WHERE t.id = itinerary_items.trip_id AND is_group_admin(t.group_id)
  )
);

-- ---- Activity Log ----
CREATE POLICY activity_log_select ON activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE id = activity_log.trip_id AND is_group_member(group_id))
);
CREATE POLICY activity_log_insert ON activity_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE id = activity_log.trip_id AND is_group_member(group_id))
);

-- ---- Polls ----
CREATE POLICY polls_select ON polls FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE id = polls.trip_id AND is_group_member(group_id))
);
CREATE POLICY polls_insert ON polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE id = polls.trip_id AND is_group_member(group_id))
);
CREATE POLICY polls_update ON polls FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM trips t WHERE t.id = polls.trip_id AND is_group_admin(t.group_id)
  )
);
CREATE POLICY polls_delete ON polls FOR DELETE USING (
  created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM trips t WHERE t.id = polls.trip_id AND is_group_admin(t.group_id)
  )
);

-- ---- Poll Options ----
CREATE POLICY poll_options_select ON poll_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM polls p JOIN trips t ON t.id = p.trip_id
    WHERE p.id = poll_options.poll_id AND is_group_member(t.group_id)
  )
);
CREATE POLICY poll_options_insert ON poll_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM polls p JOIN trips t ON t.id = p.trip_id
    WHERE p.id = poll_options.poll_id AND p.status = 'open' AND is_group_member(t.group_id)
  )
);
CREATE POLICY poll_options_delete ON poll_options FOR DELETE USING (
  created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM polls WHERE id = poll_options.poll_id AND status = 'open'
  )
);

-- ---- Ballots ----
CREATE POLICY ballots_select ON ballots FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ballots_insert ON ballots FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM polls WHERE id = ballots.poll_id AND status = 'open')
);
CREATE POLICY ballots_update ON ballots FOR UPDATE USING (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM polls WHERE id = ballots.poll_id AND status = 'open')
);

-- ---- Ballot Rankings ----
CREATE POLICY ballot_rankings_select ON ballot_rankings FOR SELECT USING (
  EXISTS (SELECT 1 FROM ballots WHERE id = ballot_rankings.ballot_id AND user_id = auth.uid())
);
CREATE POLICY ballot_rankings_insert ON ballot_rankings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM ballots WHERE id = ballot_rankings.ballot_id AND user_id = auth.uid())
);
CREATE POLICY ballot_rankings_update ON ballot_rankings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM ballots WHERE id = ballot_rankings.ballot_id AND user_id = auth.uid())
);

-- ---- Expenses ----
CREATE POLICY expenses_select ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE id = expenses.trip_id AND is_group_member(group_id))
);
CREATE POLICY expenses_insert ON expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE id = expenses.trip_id AND is_group_member(group_id))
);
CREATE POLICY expenses_update ON expenses FOR UPDATE USING (paid_by = auth.uid());
CREATE POLICY expenses_delete ON expenses FOR DELETE USING (paid_by = auth.uid());

-- ---- Expense Splits ----
CREATE POLICY expense_splits_select ON expense_splits FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expenses e JOIN trips t ON t.id = e.trip_id
    WHERE e.id = expense_splits.expense_id AND is_group_member(t.group_id)
  )
);
CREATE POLICY expense_splits_insert ON expense_splits FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);
CREATE POLICY expense_splits_update ON expense_splits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);
CREATE POLICY expense_splits_delete ON expense_splits FOR DELETE USING (
  EXISTS (SELECT 1 FROM expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);

-- ---- Settlements ----
CREATE POLICY settlements_select ON settlements FOR SELECT USING (
  from_user = auth.uid() OR to_user = auth.uid()
);
CREATE POLICY settlements_update ON settlements FOR UPDATE USING (to_user = auth.uid());

-- ---- Documents ----
CREATE POLICY documents_select ON documents FOR SELECT USING (
  uploaded_by = auth.uid() OR EXISTS (
    SELECT 1 FROM document_shares ds WHERE ds.document_id = documents.id
    AND (ds.share_scope = 'group' OR (ds.share_scope = 'individual' AND ds.shared_with = auth.uid()))
  )
);
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE id = documents.trip_id AND is_group_member(group_id))
);
CREATE POLICY documents_update ON documents FOR UPDATE USING (uploaded_by = auth.uid());
CREATE POLICY documents_delete ON documents FOR DELETE USING (uploaded_by = auth.uid());

-- ---- Document Shares ----
CREATE POLICY document_shares_select ON document_shares FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents WHERE id = document_shares.document_id AND uploaded_by = auth.uid())
);
CREATE POLICY document_shares_insert ON document_shares FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents WHERE id = document_shares.document_id AND uploaded_by = auth.uid())
);
CREATE POLICY document_shares_delete ON document_shares FOR DELETE USING (
  EXISTS (SELECT 1 FROM documents WHERE id = document_shares.document_id AND uploaded_by = auth.uid())
);
