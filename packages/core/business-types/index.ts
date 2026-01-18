export type BusinessTypeConfig = {
  // Identity
  id: string;
  name: string;
  nameSw: string;
  icon: string;
  description: string;

  // Data model
  itemType: "product" | "menu_item" | "service";
  itemTable: string;

  // Core features (what this type needs)
  features: string[];

  // Opt-in features (can be enabled/disabled per business)
  enableExpenses: boolean;
  enableInventory: boolean;
  enableSupplierCredit: boolean;
  enableCommissions: boolean;
  enablePayroll: boolean;
  enableAppointments: boolean;
  enableMultiEmployee: boolean;
  enableMultiLocation: boolean;

  // Tiering (what tier unlocks this type)
  minimumTier: "free" | "pro" | "enterprise";

  // Actions allowed for this type
  allowedActions: string[];

  // Parser for WhatsApp messages
  parser: string;

  // UI hints
  posLayout: "grid" | "categories" | "list" | "calculator";
  primaryColor: string;

  // Messaging templates
  messages: {
    welcome: string;
    orderConfirm: string;
    paymentReceipt: string;
    lowStockAlert?: string;
    appointmentConfirm?: string;
    reminderMessage?: string;
  };
};

export const BUSINESS_TYPES: Record<string, BusinessTypeConfig> = {
  RETAIL: {
    id: "retail",
    name: "Retail / Shop",
    nameSw: "Duka",
    icon: "🏪",
    description: "Sell products, track stock, manage suppliers",
    itemType: "product",
    itemTable: "products",
    features: ["inventory", "customer_credit", "product_catalog"],
    enableExpenses: true,
    enableInventory: true,
    enableSupplierCredit: true,
    enableCommissions: true,
    enablePayroll: true,
    enableAppointments: false,
    enableMultiEmployee: true,
    enableMultiLocation: true,
    minimumTier: "free",
    allowedActions: [
      "order.create",
      "payment.record",
      "expense.record",
      "inventory.check",
      "inventory.reserve",
      "inventory.adjust",
      "supplier.record_purchase",
      "supplier.record_payment",
      "employee.record_sale",
      "commission.calculate",
      "whatsapp.send",
      "mpesa.initiate",
      "sms.send",
    ],
    parser: "nairobi_chaos_parser",
    posLayout: "grid",
    primaryColor: "#4CAF50",
    messages: {
      welcome: "Karibu {businessName}! Tuma oda yako.",
      orderConfirm: "Asante! Oda: {items}\nJumla: KSh {total}",
      paymentReceipt: "Malipo yamepokewa: KSh {amount}",
      lowStockAlert: "⚠️ {product} imebaki {qty}. Oda zaidi?",
    },
  },
  RESTAURANT: {
    id: "restaurant",
    name: "Restaurant / Hoteli",
    nameSw: "Hoteli",
    icon: "🍽️",
    description: "Menu items, table management, prep times",
    itemType: "menu_item",
    itemTable: "menu_items",
    features: ["menu_items", "modifiers", "prep_times", "table_management"],
    enableExpenses: true,
    enableInventory: false,
    enableSupplierCredit: true,
    enableCommissions: true,
    enablePayroll: true,
    enableAppointments: false,
    enableMultiEmployee: true,
    enableMultiLocation: true,
    minimumTier: "free",
    allowedActions: [
      "order.create",
      "payment.record",
      "expense.record",
      "menu.update",
      "kitchen.notify",
      "table.assign",
      "supplier.record_purchase",
      "employee.record_sale",
      "whatsapp.send",
      "mpesa.initiate",
    ],
    parser: "restaurant_parser",
    posLayout: "categories",
    primaryColor: "#FF9800",
    messages: {
      welcome: "Karibu {businessName}! Order yako ni gani?",
      orderConfirm: "Order: {items}\nJumla: KSh {total}\nMuda: {time} min",
      paymentReceipt: "Malipo yamepokewa. Asante!",
    },
  },
  SERVICES: {
    id: "services",
    name: "Services / Salon / Fundi",
    nameSw: "Huduma",
    icon: "💈",
    description: "Service bookings, appointments, calendar",
    itemType: "service",
    itemTable: "services",
    features: ["appointments", "calendar", "service_catalog", "reminders"],
    enableExpenses: true,
    enableInventory: false,
    enableSupplierCredit: false,
    enableCommissions: true,
    enablePayroll: true,
    enableAppointments: true,
    enableMultiEmployee: true,
    enableMultiLocation: true,
    minimumTier: "free",
    allowedActions: [
      "service.book",
      "appointment.create",
      "appointment.reminder",
      "order.create",
      "payment.record",
      "expense.record",
      "employee.record_sale",
      "calendar.check_availability",
      "whatsapp.send",
      "mpesa.initiate",
      "sms.send",
    ],
    parser: "services_parser",
    posLayout: "list",
    primaryColor: "#9C27B0",
    messages: {
      welcome: "Karibu {businessName}! Una booking au walk-in?",
      orderConfirm: "Service: {service}\nBei: KSh {price}",
      paymentReceipt: "Malipo yamepokewa. Asante!",
      appointmentConfirm:
        "Booking: {service}\nTarehe: {date} {time}\nMahali: {location}",
      reminderMessage: "📅 Ukumbusho: {service} leo saa {time}",
    },
  },
  REMITTANCE: {
    id: "remittance",
    name: "Remittance / Agent",
    nameSw: "Agent",
    icon: "💸",
    description: "Money transfer, float management, KYC",
    itemType: "service",
    itemTable: "services",
    features: ["float_management", "kyc", "transaction_limits", "commission_per_tx"],
    enableExpenses: true,
    enableInventory: false,
    enableSupplierCredit: false,
    enableCommissions: true,
    enablePayroll: false,
    enableAppointments: false,
    enableMultiEmployee: true,
    enableMultiLocation: true,
    minimumTier: "pro",
    allowedActions: [
      "transfer.initiate",
      "transfer.verify",
      "kyc.check",
      "float.check",
      "float.request",
      "commission.calculate",
      "order.create",
      "payment.record",
      "whatsapp.send",
      "mpesa.initiate",
      "sms.send",
    ],
    parser: "remittance_parser",
    posLayout: "calculator",
    primaryColor: "#2196F3",
    messages: {
      welcome: "Karibu {businessName}. Send, Withdraw, Deposit?",
      orderConfirm: "Transaction: {type}\nAmount: KSh {amount}\nFee: KSh {fee}",
      paymentReceipt: "Transaction complete. Code: {code}",
    },
  },
};

export { TIER_FEATURES, type Tier } from './tiers';
