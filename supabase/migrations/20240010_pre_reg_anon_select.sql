-- Permite a usuarios no autenticados consultar pre_registrations por DNI
-- para el flujo de auto-registro. Solo registros no reclamados son visibles.
CREATE POLICY "pre_reg_select_unclaimed_public"
  ON pre_registrations FOR SELECT
  USING (claimed = false);
