# Scenario Test Plan (Manual)

This checklist validates core flows across the main business archetypes.

## Kamau (Solo Retail)
- Create a retail business with `enableSupplierCredit=false`, `enableCommissions=false`.
- Create product and record inventory.
- Create order (WhatsApp or API) and confirm `orders` row.
- Record expense and verify `expenses` row.
- Confirm daily-operations workflow excludes commissions/supplier steps.

## Njeri (Multi-Employee Retail)
- Create a retail business with `enableSupplierCredit=true`, `enableCommissions=true`.
- Record supplier purchase and payment; verify balances update.
- Record employee sale and commission; verify employee_sales rows.
- Generate payroll summary and verify totals.

## Restaurant
- Create restaurant business and menu items.
- Create order and call `kitchen.notify` and `table.assign` (no-op placeholders).
- Verify menu updates persist in `menu_items`.

## Services
- Create service catalog item.
- Create appointment and confirm status update.
- Run appointment reminder workflow and ensure reminder_sent_at updates.

## Offline Mode
- Queue actions client-side (PWA) while offline.
- Sync and verify action execution order once online.

## M-Pesa Retries
- Send duplicate payment callback.
- Verify idempotency (no duplicate payment records).
