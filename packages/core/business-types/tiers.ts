export type Tier = 'free' | 'pro' | 'enterprise';

export const TIER_FEATURES: Record<
  Tier,
  {
    maxOrders: number | null;
    maxEmployees: number | null;
    maxLocations: number | null;
    businessTypes: string[];
    features: string[];
  }
> = {
  free: {
    maxOrders: 100,
    maxEmployees: 1,
    maxLocations: 1,
    businessTypes: ['retail', 'restaurant', 'services'],
    features: ['basic_pos', 'mpesa', 'whatsapp', 'expenses', 'inventory'],
  },
  pro: {
    maxOrders: null,
    maxEmployees: 10,
    maxLocations: 5,
    businessTypes: ['retail', 'restaurant', 'services', 'remittance'],
    features: [
      'basic_pos',
      'mpesa',
      'whatsapp',
      'sms',
      'expenses',
      'inventory',
      'supplier_credit',
      'commissions',
      'payroll',
      'appointments',
      'multi_location',
      'advanced_reports',
      'remittance',
    ],
  },
  enterprise: {
    maxOrders: null,
    maxEmployees: null,
    maxLocations: null,
    businessTypes: ['retail', 'restaurant', 'services', 'remittance'],
    features: [
      'basic_pos',
      'mpesa',
      'whatsapp',
      'sms',
      'expenses',
      'inventory',
      'supplier_credit',
      'commissions',
      'payroll',
      'appointments',
      'multi_location',
      'advanced_reports',
      'remittance',
      'api_access',
      'webhooks',
      'custom_integrations',
      'white_label',
      'dedicated_support',
    ],
  },
};
