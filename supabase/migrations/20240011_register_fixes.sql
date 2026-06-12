-- ── 1. Función para reclamar pre-registro atómicamente ────────────────────────
-- Evita el conflicto de UNIQUE en user_accounts.dni cuando el jugador
-- pre-cargado tiene el mismo DNI que ya existe en la tabla.
CREATE OR REPLACE FUNCTION public.claim_pre_registration(
  p_pre_reg_id   UUID,
  p_dni          TEXT,
  p_display_name TEXT,
  p_phone        TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Liberar el DNI del registro pre-cargado anterior
  UPDATE user_accounts
    SET dni = NULL
  WHERE dni = p_dni AND status = 'pre_registered';

  -- Activar la cuenta del usuario actual (auth.uid())
  UPDATE user_accounts
    SET dni          = p_dni,
        display_name = p_display_name,
        phone        = p_phone,
        status       = 'active'
  WHERE id = auth.uid();

  -- Marcar el pre-registro como reclamado
  UPDATE pre_registrations
    SET claimed    = true,
        claimed_by = auth.uid(),
        claimed_at = NOW()
  WHERE id = p_pre_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pre_registration TO authenticated;


-- ── 2. Vista player_payment_status con gracia del mes de alta ─────────────────
-- Los usuarios sin pagos que se registraron en el mes en curso NO deben
-- mostrar deuda (se les da el mes de alta sin cargo).
CREATE OR REPLACE VIEW player_payment_status AS
WITH latest_payments AS (
    SELECT
        player_id,
        MAX(period_year * 100 + period_month) AS latest_period
    FROM payments
    WHERE type = 'monthly'
    GROUP BY player_id
),
current_period AS (
    SELECT
        EXTRACT(YEAR  FROM NOW())::INTEGER AS cur_year,
        EXTRACT(MONTH FROM NOW())::INTEGER AS cur_month
)
SELECT
    ua.id AS player_id,
    ua.display_name,
    lp.latest_period,
    cp.cur_year * 100 + cp.cur_month AS current_period,
    CASE
        -- Mes de alta: sin deuda
        WHEN ua.created_at >= DATE_TRUNC('month', NOW()) THEN 'current'
        -- Tiene pagos al día
        WHEN lp.latest_period >= cp.cur_year * 100 + cp.cur_month THEN 'current'
        -- Debe el mes actual (pagó el anterior)
        WHEN lp.latest_period = (
            CASE WHEN cp.cur_month = 1
                 THEN (cp.cur_year - 1) * 100 + 12
                 ELSE cp.cur_year * 100 + cp.cur_month - 1
            END
        ) THEN 'owes_month'
        -- Sin pagos y ya pasó el mes de alta → debe meses anteriores
        ELSE 'owes_previous'
    END AS payment_status
FROM user_accounts ua
LEFT JOIN latest_payments lp ON lp.player_id = ua.id
CROSS JOIN current_period cp
WHERE 'player' = ANY(ua.roles);
