// Triggers that cannot be expressed in Drizzle schema.
// Used by test-server-db.ts to apply production-parity triggers to PGlite.
// When modifying, also create a new SQL migration with the updated trigger.

export const ORG_ADMIN_IMMUTABLE_TRIGGER = `
  CREATE OR REPLACE FUNCTION validate_org_admin_immutable()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id THEN
      RAISE EXCEPTION 'admin_user_id cannot be changed';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_validate_org_admin_immutable
    BEFORE UPDATE ON "organizations"
    FOR EACH ROW
    EXECUTE FUNCTION validate_org_admin_immutable();
`
