# Salon Domain Migration
# Run this in Supabase SQL Editor in ORDER. Stop if any step errors.

# ─────────────────────────────────────────────────────────────
# STEP 1: Clear existing test data and reseed services
# ─────────────────────────────────────────────────────────────

-- Remove test appointments first (they reference old services)
DELETE FROM appointments;

-- Remove old generic services
DELETE FROM services;

-- Insert salon services
INSERT INTO services (name, duration_minutes, description) VALUES
  ('Haircut',        45, 'Classic haircut, wash, and style'),
  ('Hair Coloring', 120, 'Full hair coloring or highlights'),
  ('Hair Spa',       60, 'Deep conditioning and scalp treatment'),
  ('Beard Trim',     20, 'Beard shaping, trim, and grooming'),
  ('Facial',         60, 'Deep cleansing facial treatment');

# ─────────────────────────────────────────────────────────────
# STEP 2: Create employees table
# ─────────────────────────────────────────────────────────────

CREATE TABLE employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL,
  bio          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  calendar_id  TEXT,               -- Google Calendar ID (set after Calendar setup)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

# ─────────────────────────────────────────────────────────────
# STEP 3: Create employee_services junction table
# ─────────────────────────────────────────────────────────────

CREATE TABLE employee_services (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id)  ON DELETE CASCADE,
  PRIMARY KEY (employee_id, service_id)
);

# ─────────────────────────────────────────────────────────────
# STEP 4: Add employee_id to appointments
# Drop the old unique constraint (slot-level) — now uniqueness
# is per employee (two stylists CAN work the same time slot)
# ─────────────────────────────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN employee_id UUID REFERENCES employees(id);

-- Drop old slot-level uniqueness
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_date_appointment_time_key;

-- New uniqueness: same employee can't have two appointments at same time
CREATE UNIQUE INDEX appointments_employee_slot_unique
  ON appointments (employee_id, appointment_date, appointment_time)
  WHERE status != 'cancelled';

# ─────────────────────────────────────────────────────────────
# STEP 5: Seed employees
# ─────────────────────────────────────────────────────────────

INSERT INTO employees (name, role, bio) VALUES
  ('Sarah', 'Senior Hair Stylist',  'Specializes in cuts and coloring. 8 years experience.'),
  ('Emma',  'Hair & Beauty Expert', 'Expert in hair spa and facials. 5 years experience.'),
  ('David', 'Master Barber',        'Specializes in cuts and beard grooming. 6 years experience.');

# ─────────────────────────────────────────────────────────────
# STEP 6: Assign services to employees
# Sarah: Haircut, Hair Coloring, Hair Spa
# Emma:  Haircut, Hair Spa, Facial
# David: Haircut, Beard Trim
# ─────────────────────────────────────────────────────────────

INSERT INTO employee_services (employee_id, service_id)
SELECT e.id, s.id FROM employees e, services s
WHERE
  (e.name = 'Sarah' AND s.name IN ('Haircut', 'Hair Coloring', 'Hair Spa'))
  OR
  (e.name = 'Emma'  AND s.name IN ('Haircut', 'Hair Spa', 'Facial'))
  OR
  (e.name = 'David' AND s.name IN ('Haircut', 'Beard Trim'));
