import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

router.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  console.log('[GlobalConfig] GET request for key:', key);
  console.log('[GlobalConfig] Request URL:', req.url);
  console.log('[GlobalConfig] Request headers:', req.headers);
  
  try {
    console.log('[GlobalConfig] About to get Supabase client...');
    const supabaseClient = supabaseServer();
    console.log('[GlobalConfig] Supabase client obtained:', !!supabaseClient);
    
    const { data, error } = await (supabaseServer() as any)
      .from('global_config')
      .select('value')
      .eq('key', key)
      .single();
    
    console.log('[GlobalConfig] Query result:', { data: data, error: error });
    
    if (error && error.code === 'PGRST116') {
      // No rows found — return empty object
      console.log('[GlobalConfig] No config found for key:', key);
      return res.json({});
    }
    
    if (error) {
      console.error('[GlobalConfig] Database error:', error);
      return res.status(500).json({ error: 'Internal server error', details: error });
    }
    
    if (!data) {
      console.log('[GlobalConfig] No data for key:', key);
      return res.json({});
    }
    
    try {
      const parsedValue = JSON.parse((data as any).value);
      console.log('[GlobalConfig] Returning parsed config:', parsedValue);
      return res.json(parsedValue);
    } catch (parseError: any) {
      console.error('[GlobalConfig] JSON parse error:', parseError);
      return res.json((data as any).value);
    }
  } catch (err: any) {
    console.error('[GlobalConfig] Unexpected error:', err);
    console.error('[GlobalConfig] Error stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.put('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const adminToken = req.headers['x-admin-token'];
  const ADMIN_SECRET = 'system_admin_2025';
  
  if (adminToken !== ADMIN_SECRET) {
    console.log('[GlobalConfig] Unauthorized admin access attempt');
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { value } = req.body;
    console.log('[GlobalConfig] Updating config for key:', key, 'to value:', value);
    
    const { data, error } = await (supabaseServer() as any)
      .from('global_config')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .single();
    
    console.log('[GlobalConfig] Upsert result:', { data, error });
    
    if (error) {
      console.error('[GlobalConfig PUT] Database error:', error);
      return res.status(500).json({ error: 'Internal server error', details: error });
    }
    
    console.log('[GlobalConfig] Config updated successfully');
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[GlobalConfig PUT] Unexpected error:', err);
    console.error('[GlobalConfig PUT] Error stack:', err.stack);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
