-- Custom SQL migration file, put your code below! --

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