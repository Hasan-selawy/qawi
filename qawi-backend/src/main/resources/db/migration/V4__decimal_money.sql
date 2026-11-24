-- JOD uses three fractional digits. Preserve legacy amounts; reject material precision loss.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM subscription_histories
             WHERE price::text IN ('NaN', 'Infinity', '-Infinity')
                OR abs(price::numeric) >= 10000000000000000
                OR abs(price::numeric - round(price::numeric, 3)) > 0.000000001) THEN
    RAISE EXCEPTION 'Subscription prices exceed numeric(19,3) precision. Review before migration; no prices changed.';
  END IF;
END $$;

ALTER TABLE subscription_histories ALTER COLUMN price TYPE numeric(19,3) USING round(price::numeric, 3);
ALTER TABLE platform_tiers ALTER COLUMN price_1m TYPE numeric(19,3);
ALTER TABLE platform_tiers ALTER COLUMN price_3m TYPE numeric(19,3);
ALTER TABLE platform_tiers ALTER COLUMN price_6m TYPE numeric(19,3);
ALTER TABLE platform_tiers ALTER COLUMN price_12m TYPE numeric(19,3);
ALTER TABLE gym_member_plans ALTER COLUMN price TYPE numeric(19,3);
ALTER TABLE staff_profiles ALTER COLUMN salary TYPE numeric(19,3);
