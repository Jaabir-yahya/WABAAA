import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' });
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const businessId = data.user.user_metadata?.business_id || data.user.id;

  (req as Request & { user?: typeof data.user }).user = data.user;
  (req as Request & { tenantId?: string }).tenantId = businessId;

  return next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }
  return requireAuth(req, res, next);
}
