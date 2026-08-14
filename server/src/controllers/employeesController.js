import { supabase } from '../db/supabase.js';

/**
 * GET /api/employees
 * Returns all active employees with the services they provide.
 */
export async function getEmployees(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        role,
        bio,
        employee_services (
          services ( id, name, duration_minutes )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Flatten the nested structure for easier frontend consumption
    const employees = data.map(emp => ({
      id:       emp.id,
      name:     emp.name,
      role:     emp.role,
      bio:      emp.bio,
      services: emp.employee_services.map(es => es.services),
    }));

    res.json({ employees });
  } catch (err) {
    next(err);
  }
}
