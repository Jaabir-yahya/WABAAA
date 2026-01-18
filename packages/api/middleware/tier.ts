import { Request, Response, NextFunction } from 'express';
import { TIER_FEATURES, Tier } from '@kenya-commerce-os/core/business-types';

export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = (req.headers['x-tier'] as Tier) || 'free';
    const allowed = TIER_FEATURES[tier]?.features?.includes(feature);

    if (!allowed) {
      return res.status(403).json({
        error: 'Feature not available for current tier',
        feature,
        tier,
      });
    }

    return next();
  };
}
