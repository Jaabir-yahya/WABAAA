import { Request, Response, NextFunction } from 'express';
import { TIER_FEATURES, Tier } from '@kenya-commerce-os/core/business-types';
import { getSupabaseWithContext } from '../routes/supabase';

export function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as Request & { tenantId?: string }).tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Missing tenant context' });
      }

      const supabase = await getSupabaseWithContext(tenantId);
      const { data, error } = await supabase
        .from('businesses')
        .select('tier')
        .eq('id', tenantId)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to load tier' });
      }

      const tier = (data?.tier as Tier) || 'free';
      const allowed = TIER_FEATURES[tier]?.features?.includes(feature);

      if (!allowed) {
        return res.status(403).json({
          error: 'Feature not available for current tier',
          feature,
          tier,
        });
      }

      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Tier check failed' });
    }
  };
}
