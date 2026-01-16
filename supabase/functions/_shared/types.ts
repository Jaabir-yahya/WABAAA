export type LockedEventType =
  | "whatsapp_message_in"
  | "whatsapp_message_out"
  | "mpesa_payment_callback"
  | "manual_correction"
  | "customer_proof"
  | "merchant_note";

export type PaymentMethod = "mpesa" | "cash" | "bank";

export type OrderStatus = "pending" | "paid" | "partial" | "fulfilled";
