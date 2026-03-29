-- ============================================================
-- Indexes
-- ============================================================

-- Identity
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- Trips
CREATE INDEX idx_trips_group ON trips(group_id);
CREATE INDEX idx_itinerary_trip_day ON itinerary_items(trip_id, day_number, sort_order);
CREATE INDEX idx_activity_log_trip ON activity_log(trip_id, created_at DESC);

-- Voting
CREATE INDEX idx_polls_trip ON polls(trip_id, status);

-- Expenses
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_user ON expense_splits(user_id, expense_id);
CREATE INDEX idx_settlements_trip ON settlements(trip_id, status);

-- Documents
CREATE INDEX idx_documents_trip ON documents(trip_id);
CREATE INDEX idx_documents_expiry ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- Realtime subscriptions
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_items;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE ballots;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
