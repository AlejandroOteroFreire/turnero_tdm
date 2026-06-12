-- ============================================================
-- Turnero TDM — Migración 004: registration_requests
-- ============================================================

CREATE TABLE registration_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID REFERENCES user_accounts(id) NOT NULL,
  days_per_week  INT NOT NULL CHECK (days_per_week BETWEEN 1 AND 5),
  option_a       UUID[] NOT NULL,
  option_b       UUID[] NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  assigned_slots UUID[],
  reviewed_by    UUID REFERENCES user_accounts(id),
  reviewed_at    TIMESTAMPTZ,
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- El jugador puede ver/insertar su propia solicitud
CREATE POLICY "player_own" ON registration_requests
  FOR ALL USING (player_id = auth.uid());

-- Admin/collab pueden ver y modificar todas
CREATE POLICY "admin_collab_all" ON registration_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_accounts
      WHERE id = auth.uid()
      AND roles && ARRAY['admin','collaborator']::user_role[]
    )
  );

-- Nuevas claves de config
INSERT INTO app_config (key, value, description) VALUES
  ('cancel_cutoff_hours',    '2',  'Horas límite para cancelación normal'),
  ('booking_window_days',    '7',  'Días de anticipación para reservas extra'),
  ('waitlist_offer_minutes', '30', 'Minutos para confirmar cupo liberado'),
  ('default_slot_capacity',  '10', 'Cupo default para nuevos turnos')
ON CONFLICT (key) DO NOTHING;

-- GRANTs para PostgREST
GRANT SELECT, INSERT, UPDATE, DELETE ON registration_requests TO authenticated;
GRANT SELECT ON registration_requests TO anon;
ALTER PUBLICATION supabase_realtime ADD TABLE registration_requests;
