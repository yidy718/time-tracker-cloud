-- Fix location assignment issues for project creation
-- The problem is likely RLS policies on locations and project_locations tables

BEGIN;

-- Check current location table policies
SELECT 'Current location policies that might be blocking access:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'locations';

-- Fix locations table RLS policies
DROP POLICY IF EXISTS "Organization members can view locations" ON locations;
DROP POLICY IF EXISTS "Locations are viewable by organization members" ON locations;
DROP POLICY IF EXISTS "Enable authenticated users to view locations" ON locations;

CREATE POLICY "Authenticated users can view locations" ON locations
  FOR SELECT 
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM organizations)
  );

DROP POLICY IF EXISTS "Organization members can create locations" ON locations;
DROP POLICY IF EXISTS "Enable admins to create locations" ON locations;

CREATE POLICY "Authenticated users can create locations" ON locations
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT id FROM organizations)
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Organization members can update locations" ON locations;
DROP POLICY IF EXISTS "Enable admins to update locations" ON locations;

CREATE POLICY "Authenticated users can update locations" ON locations
  FOR UPDATE 
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM organizations)
  );

DROP POLICY IF EXISTS "Organization members can delete locations" ON locations;
DROP POLICY IF EXISTS "Enable admins to delete locations" ON locations;

CREATE POLICY "Authenticated users can delete locations" ON locations
  FOR DELETE 
  TO authenticated
  USING (
    organization_id IN (SELECT id FROM organizations)
  );

-- Fix project_locations table RLS policies
DROP POLICY IF EXISTS "Organization members can view project locations" ON project_locations;
DROP POLICY IF EXISTS "Project locations are viewable by organization members" ON project_locations;

CREATE POLICY "Authenticated users can view project locations" ON project_locations
  FOR SELECT 
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations))
  );

DROP POLICY IF EXISTS "Organization members can create project locations" ON project_locations;
DROP POLICY IF EXISTS "Enable admins to create project locations" ON project_locations;

CREATE POLICY "Authenticated users can create project locations" ON project_locations
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations))
    AND location_id IN (SELECT id FROM locations WHERE organization_id IN (SELECT id FROM organizations))
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Organization members can update project locations" ON project_locations;
DROP POLICY IF EXISTS "Enable admins to update project locations" ON project_locations;

CREATE POLICY "Authenticated users can update project locations" ON project_locations
  FOR UPDATE 
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations))
  );

DROP POLICY IF EXISTS "Organization members can delete project locations" ON project_locations;
DROP POLICY IF EXISTS "Enable admins to delete project locations" ON project_locations;

CREATE POLICY "Authenticated users can delete project locations" ON project_locations
  FOR DELETE 
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations))
  );

-- Grant necessary table permissions
GRANT ALL ON locations TO authenticated;
GRANT ALL ON project_locations TO authenticated;

-- Find and grant sequence permissions
DO $$
DECLARE
    seq_name text;
BEGIN
    -- Grant sequence permissions for locations
    SELECT pg_get_serial_sequence('locations', 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE ' || seq_name || ' TO authenticated';
        RAISE NOTICE 'Granted usage on locations sequence: %', seq_name;
    END IF;
    
    -- Grant sequence permissions for project_locations  
    SELECT pg_get_serial_sequence('project_locations', 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
        EXECUTE 'GRANT USAGE ON SEQUENCE ' || seq_name || ' TO authenticated';
        RAISE NOTICE 'Granted usage on project_locations sequence: %', seq_name;
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;

-- Test the policies
SELECT 'Location and project_locations RLS policies updated!' as status;

COMMIT;

-- Show updated policies
SELECT 'Updated location policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'locations'
ORDER BY cmd, policyname;

SELECT 'Updated project_locations policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'project_locations'
ORDER BY cmd, policyname;