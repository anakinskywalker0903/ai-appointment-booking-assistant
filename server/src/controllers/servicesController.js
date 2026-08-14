import { supabase } from '../db/supabase.js';

/**
 * GET /api/services
 * Returns all active services.
 */
export async function getServices(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, duration_minutes, description')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    res.json({ services: data });
  } catch (err) {
    next(err);
  }
}
