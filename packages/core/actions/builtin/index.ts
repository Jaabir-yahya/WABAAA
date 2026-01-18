/**
 * KCOS Built-in Actions
 * 
 * Core actions that ship with KCOS.
 * These provide the foundational building blocks for workflows.
 */

import { Action } from '../types';
import { ActionRegistry } from '../registry';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Core actions
import { debugLogAction } from './debug-log';
import { eventLogAction } from './event-log';
import { conditionIfAction } from './condition-if';
import { dataTransformAction } from './data-transform';
import { httpRequestAction } from './http-request';
import { documentParseAction } from './document-parse';
import { inventoryCheckAction } from './inventory-check';
import { priceCalculateAction } from './price-calculate';
import { customerSegmentAction } from './customer-segment';
import { complianceLogAction } from './compliance-log';
import { inventoryReserveAction } from './inventory-reserve';
import { inventoryReleaseAction } from './inventory-release';
import { customerAddPointsAction } from './customer-add-points';
import { productCreateAction } from './product-create';
import { productUpdateAction } from './product-update';
import { catalogSearchAction } from './catalog-search';
import { catalogBrowseAction } from './catalog-browse';
import { catalogResolveItemsAction } from './catalog-resolve-items';
import { expenseRecordAction } from './expense-record';
import { expenseCategorizeAction } from './expense-categorize';
import { expenseLinkToSupplierAction } from './expense-link-to-supplier';
import { supplierCreateAction } from './supplier-create';
import { supplierRecordPurchaseAction } from './supplier-record-purchase';
import { supplierRecordPaymentAction } from './supplier-record-payment';
import { supplierCheckDebtAction } from './supplier-check-debt';
import { employeeRecordSaleAction } from './employee-record-sale';
import { commissionCalculateAction } from './commission-calculate';
import { wageRecordPaymentAction } from './wage-record-payment';
import { payrollGenerateSummaryAction } from './payroll-generate-summary';
import { serviceCreateAction } from './service-create';
import { appointmentCreateAction } from './appointment-create';
import { appointmentConfirmAction } from './appointment-confirm';
import { appointmentReminderAction } from './appointment-reminder';
import { calendarCheckAvailabilityAction } from './calendar-check-availability';
import { transferInitiateAction } from './transfer-initiate';
import { transferVerifyAction } from './transfer-verify';
import { kycCheckAction } from './kyc-check';
import { floatCheckAction } from './float-check';
import { floatRequestAction } from './float-request';
import { menuUpdateAction } from './menu-update';
import { kitchenNotifyAction } from './kitchen-notify';
import { tableAssignAction } from './table-assign';
import { paymentRecordAction } from './payment-record';
import { smsSendAction } from './sms-send';
import { loopEachAction } from './loop-each';
import { cashReconcileAction } from './cash-reconcile';

// Kenya-specific actions
import { whatsappSendAction } from './whatsapp-send';
import { mpesaInitiateAction } from './mpesa-initiate';
import { mpesaVerifyAction } from './mpesa-verify';
import { orderCreateAction } from './order-create';
import { actorResolveAction } from './actor-resolve';
import { qrGenerateAction } from './qr-generate';
import { qrDecodeAction } from './qr-decode';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Core actions
export { debugLogAction } from './debug-log';
export { eventLogAction } from './event-log';
export { conditionIfAction } from './condition-if';
export { dataTransformAction } from './data-transform';
export { httpRequestAction } from './http-request';
export { documentParseAction } from './document-parse';
export { inventoryCheckAction } from './inventory-check';
export { priceCalculateAction } from './price-calculate';
export { customerSegmentAction } from './customer-segment';
export { complianceLogAction } from './compliance-log';
export { inventoryReserveAction } from './inventory-reserve';
export { inventoryReleaseAction } from './inventory-release';
export { customerAddPointsAction } from './customer-add-points';
export { productCreateAction } from './product-create';
export { productUpdateAction } from './product-update';
export { catalogSearchAction } from './catalog-search';
export { catalogBrowseAction } from './catalog-browse';
export { catalogResolveItemsAction } from './catalog-resolve-items';
export { expenseRecordAction } from './expense-record';
export { expenseCategorizeAction } from './expense-categorize';
export { expenseLinkToSupplierAction } from './expense-link-to-supplier';
export { supplierCreateAction } from './supplier-create';
export { supplierRecordPurchaseAction } from './supplier-record-purchase';
export { supplierRecordPaymentAction } from './supplier-record-payment';
export { supplierCheckDebtAction } from './supplier-check-debt';
export { employeeRecordSaleAction } from './employee-record-sale';
export { commissionCalculateAction } from './commission-calculate';
export { wageRecordPaymentAction } from './wage-record-payment';
export { payrollGenerateSummaryAction } from './payroll-generate-summary';
export { serviceCreateAction } from './service-create';
export { appointmentCreateAction } from './appointment-create';
export { appointmentConfirmAction } from './appointment-confirm';
export { appointmentReminderAction } from './appointment-reminder';
export { calendarCheckAvailabilityAction } from './calendar-check-availability';
export { transferInitiateAction } from './transfer-initiate';
export { transferVerifyAction } from './transfer-verify';
export { kycCheckAction } from './kyc-check';
export { floatCheckAction } from './float-check';
export { floatRequestAction } from './float-request';
export { menuUpdateAction } from './menu-update';
export { kitchenNotifyAction } from './kitchen-notify';
export { tableAssignAction } from './table-assign';
export { paymentRecordAction } from './payment-record';
export { smsSendAction } from './sms-send';
export { loopEachAction } from './loop-each';
export { cashReconcileAction } from './cash-reconcile';

// Kenya-specific actions
export { whatsappSendAction } from './whatsapp-send';
export { mpesaInitiateAction } from './mpesa-initiate';
export { mpesaVerifyAction } from './mpesa-verify';
export { orderCreateAction } from './order-create';
export { actorResolveAction } from './actor-resolve';
export { qrGenerateAction } from './qr-generate';
export { qrDecodeAction } from './qr-decode';

// ═══════════════════════════════════════════════════════════════════════════════
// ALL BUILT-IN ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Array of all built-in actions
 */
export const builtinActions: Action[] = [
  // Core
  debugLogAction,
  eventLogAction,
  conditionIfAction,
  dataTransformAction,
  httpRequestAction,
  documentParseAction,
  inventoryCheckAction,
  priceCalculateAction,
  customerSegmentAction,
  complianceLogAction,
  inventoryReserveAction,
  inventoryReleaseAction,
  customerAddPointsAction,
  productCreateAction,
  productUpdateAction,
  catalogSearchAction,
  catalogBrowseAction,
  catalogResolveItemsAction,
  expenseRecordAction,
  expenseCategorizeAction,
  expenseLinkToSupplierAction,
  supplierCreateAction,
  supplierRecordPurchaseAction,
  supplierRecordPaymentAction,
  supplierCheckDebtAction,
  employeeRecordSaleAction,
  commissionCalculateAction,
  wageRecordPaymentAction,
  payrollGenerateSummaryAction,
  serviceCreateAction,
  appointmentCreateAction,
  appointmentConfirmAction,
  appointmentReminderAction,
  calendarCheckAvailabilityAction,
  transferInitiateAction,
  transferVerifyAction,
  kycCheckAction,
  floatCheckAction,
  floatRequestAction,
  menuUpdateAction,
  kitchenNotifyAction,
  tableAssignAction,
  paymentRecordAction,
  smsSendAction,
  loopEachAction,
  cashReconcileAction,
  // Kenya-specific
  whatsappSendAction,
  mpesaInitiateAction,
  mpesaVerifyAction,
  orderCreateAction,
  actorResolveAction,
  qrGenerateAction,
  qrDecodeAction,
];

/**
 * Register all built-in actions to a registry
 */
export function registerBuiltinActions(registry: ActionRegistry): void {
  for (const action of builtinActions) {
    registry.register(action);
  }
  console.log(`[KCOS] Registered ${builtinActions.length} built-in actions`);
}

/**
 * Get a list of built-in action IDs
 */
export function getBuiltinActionIds(): string[] {
  return builtinActions.map(a => a.id);
}
