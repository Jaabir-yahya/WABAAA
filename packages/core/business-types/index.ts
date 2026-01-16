export type BusinessTypeConfig = {
  id: string;
  parser: string;
  features: string[];
  tables: string[];
  messages: {
    welcome: string;
    order_confirm: string;
  };
  pricing?: Record<string, number>;
};

export const BUSINESS_TYPES: Record<string, BusinessTypeConfig> = {
  MINI_SUPERMARKET: {
    id: "mini_supermarket",
    parser: "nairobi_chaos_parser",
    features: ["inventory", "immediate_payment", "local_delivery"],
    tables: ["orders", "payments"],
    messages: {
      welcome: "Karibu! Tuma oda yako kwa mfano: sukari 2kg",
      order_confirm: "Asante! Oda yako: {items}\nJumla: KSh {total}",
    },
    pricing: {
      sukari: 200,
      maziwa: 80,
      unga: 180,
      mafuta: 350,
      sabuni: 50,
      dawa: 150,
    },
  },
  RESTAURANT: {
    id: "restaurant",
    parser: "restaurant_parser",
    features: ["modifiers", "menu_items", "prep_time"],
    tables: ["orders", "payments", "menu_items", "order_modifiers"],
    messages: {
      welcome: "Karibu! Tuma order yako kwa mfano: chips mayai na soda",
      order_confirm:
        "Asante! Order yako: {items}\nJumla: KSh {total}\nMuda: {time} dakika",
    },
  },
};
