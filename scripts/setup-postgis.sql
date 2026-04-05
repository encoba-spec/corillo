-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Trigger function: auto-populate geometry from lat/lng on Activity
CREATE OR REPLACE FUNCTION activity_set_start_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."startLatitude" IS NOT NULL AND NEW."startLongitude" IS NOT NULL THEN
    NEW."startPoint" := ST_SetSRID(ST_MakePoint(NEW."startLongitude", NEW."startLatitude"), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: auto-populate geometry from lat/lng on RunningZone
CREATE OR REPLACE FUNCTION running_zone_set_center()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."center" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: auto-populate geometry from lat/lng on PlannedRun
CREATE OR REPLACE FUNCTION planned_run_set_meeting_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."meetingPoint" := ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
