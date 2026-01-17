# KCOS Industry Workflow Recreation Guide

**How to Recreate Global Commerce Systems Using Your Lego Architecture**

**Date**: January 17, 2026  
**Project**: Kenya Commerce OS (KCOS)  
**Purpose**: Map real-world workflows from industry leaders and show how to build them with KCOS actions  
**Tagline**: "The Cheat Code" - Use what global companies built to power Kenyan commerce

---

## Executive Summary

This document shows you how to recreate the exact workflows that power:

- **Shopify** (e-commerce fulfillment)
- **Stripe** (payment automation & billing)
- **Amazon FBA** (inventory management)
- **DoorDash** (order-to-delivery orchestration)
- **Uber** (dynamic dispatch & completion)

**The insight**: These aren't custom monoliths. They're **orchestrated workflows**.

Your KCOS system can recreate these by:

1. **Identifying the workflow** (customer journey)
2. **Breaking into actions** (triggers + steps + compensations)
3. **Defining expressions** (data flow between steps)
4. **Building locally** (with Kenya-specific APIs)

---

## 1. SHOPIFY ORDER FULFILLMENT WORKFLOW

### What Shopify Does (The Golden Standard)

Shopify handles millions of orders daily through this workflow:

```
Customer Order → Order Routing → Fulfillment Order → Fulfillment → Shipment → Delivery
```

**Key insight**: Shopify doesn't fulfill ONE order. It creates FULFILLMENT ORDERS (groups of items from same location) and treats each as separate workflow.

### How KCOS Recreates It

**Scenario**: Mini supermarket in Nairobi receives order, needs to fulfill from warehouse or store location

#### Step 1: Map the Shopify Flow to KCOS

```yaml
id: "kcos-shopify-fulfillment"
name: "Shopify-Style Order Fulfillment"

# TRIGGER: Order placed
trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.text }}"
      contains: ["order", "nataka"]

# WORKFLOW STEPS
steps:
  # Step 1: Create order record (Shopify: Order Created event)
  - id: create_order
    action: order.create
    input:
      items: "{{ trigger.data.items }}"
      customer: "{{ trigger.data.from }}"
      totalAmount: "{{ $sum(trigger.data.items[*].price) }}"
    output: order
    
  # Step 2: Route to location (Shopify: Order Routing process)
  - id: route_to_location
    action: inventory.resolve_location
    input:
      items: "{{ order.items }}"
      availableLocations: ["warehouse_nairobi", "store_downtown"]
    output: routing
    compensation: order.cancel
    
  # Step 3: Create fulfillment order (Shopify: FulfillmentOrder created)
  - id: create_fulfillment_order
    action: fulfillment.create_order
    input:
      orderId: "{{ order.id }}"
      location: "{{ routing.assignedLocation }}"
      items: "{{ order.items }}"
    output: fulfillmentOrder
    compensation: fulfillment.cancel_order
    
  # Step 4: Notify picker/packer (Shopify internal: warehouse notification)
  - id: notify_warehouse
    action: whatsapp.send
    input:
      to: "{{ warehouse.staffPhone }}"
      message: "Fulfillment Order {{ fulfillmentOrder.id }} ready. Items: {{ order.items[*].name }}"
    compensation: whatsapp.send  # Send cancellation message
    
  # Step 5: Wait for fulfillment (Shopify: Human action - staff packs order)
  - id: wait_for_fulfillment
    action: wait.for
    timeout: 3600000  # 1 hour
    waitForEvent: "fulfillment.completed"
    
  # Step 6: Create shipment with tracking (Shopify: Fulfillment created)
  - id: create_shipment
    action: shipment.create
    input:
      fulfillmentOrderId: "{{ fulfillmentOrder.id }}"
      trackingNumber: "{{ fulfillment.completed.trackingNumber }}"
      carrier: "{{ fulfillment.completed.carrier }}"  # "JungleBus", "Uber", etc.
    output: shipment
    compensation: shipment.cancel
    
  # Step 7: Notify customer (Shopify: Fulfillment notification)
  - id: notify_customer_shipped
    action: whatsapp.send
    input:
      to: "{{ order.customer }}"
      message: |
        Your order is on the way!
        Tracking: {{ shipment.trackingNumber }}
        Carrier: {{ shipment.carrier }}
        Estimated delivery: {{ shipment.estimatedDelivery }}
```

### The KCOS Actions You Need

```typescript
// 1. order.create - Create order record
interface OrderCreateAction extends Action {
  execute(input: {
    items: Array<{ sku: string; quantity: number; price: number }>;
    customer: string;
    totalAmount: number;
  }): Promise<{ id: string; status: 'draft' }>;
}

// 2. inventory.resolve_location - Route to warehouse/store
interface InventoryResolveAction extends Action {
  execute(input: {
    items: Array<{ sku: string; quantity: number }>;
    availableLocations: string[];
  }): Promise<{ assignedLocation: string; available: boolean }>;
}

// 3. fulfillment.create_order - Group items for fulfillment
interface FulfillmentCreateAction extends Action {
  execute(input: {
    orderId: string;
    location: string;
    items: Array<any>;
  }): Promise<{ id: string; status: 'open' }>;
}

// 4. wait.for - Pause workflow for human action
interface WaitForAction extends Action {
  execute(input: {
    timeout: number;
    waitForEvent: string;
  }): Promise<any>;
}

// 5. shipment.create - Activate delivery
interface ShipmentCreateAction extends Action {
  execute(input: {
    fulfillmentOrderId: string;
    trackingNumber: string;
    carrier: string;
  }): Promise<{ trackingNumber: string; status: 'shipped' }>;
}
```

### Shopify vs KCOS Comparison

| Shopify Concept | KCOS Action | Kenya Implementation |
|-----------------|-------------|---------------------|
| Order Created | order.create | WhatsApp/SMS triggers order |
| Order Routing | inventory.resolve_location | Check warehouse in Nairobi, store downtown |
| FulfillmentOrder | fulfillment.create_order | Group items from same warehouse |
| Fulfillment | wait.for + human action | Staff packs items, marks done |
| Shipment | shipment.create | Log with JungleBus/Uber/bike courier |
| Customer Notification | whatsapp.send | Real-time WhatsApp updates |

---

## 2. STRIPE PAYMENT AUTOMATION WORKFLOW

### What Stripe Does

Stripe handles complex billing scenarios:

- Invoice created → Automatically send reminder
- Invoice due in 3 days → Send warning
- Invoice overdue → Escalate to collections
- Subscription payment fails → Retry with backoff
- Payment succeeded → Send receipt

**Key Pattern**: Trigger → Conditions → Actions with delays

### How KCOS Recreates It

**Scenario**: Small business wants to collect recurring payments from customers (e.g., monthly loyalty fees)

#### Stripe's Automation Pattern

```
Trigger: "Invoice created"
  ↓
Filter: "If invoice > 5000 KSh"
  ↓
Actions:
  - Delay 2 days
  - Send reminder email
  - Delay 1 day
  - Send payment link
  - Delay 5 days (if unpaid)
  - Mark uncollectible
```

#### KCOS Implementation

```yaml
id: "kcos-stripe-payment-automation"
name: "Subscription Payment Collection"

# TRIGGER: Monthly subscription due
trigger:
  type: schedule.trigger
  cron: "0 0 1 * *"  # Every 1st of month at midnight
  conditions:
    - field: "{{ customer.hasActiveSubscription }}"
      equals: true

steps:
  # Step 1: Create invoice
  - id: create_invoice
    action: invoice.create
    input:
      customer: "{{ trigger.customerId }}"
      amount: "{{ trigger.subscriptionAmount }}"
      dueDate: "{{ $now() + 7 days }}"  # Due in 7 days
      description: "Monthly subscription - {{ $now().format('MMMM YYYY') }}"
    output: invoice
    
  # Step 2: Determine follow-up strategy based on amount
  - id: determine_strategy
    action: condition.if
    input:
      condition: "{{ invoice.amount > 5000 }}"
      onTrue: "high_value_workflow"
      onFalse: "standard_workflow"
    output: strategy
    
  # PATH A: High-value invoices (> 5000 KSh) - aggressive collection
  - id: high_value_workflow
    action: parallel.all
    input:
      actions:
        # Send immediate payment link
        - action: whatsapp.send
          input:
            to: "{{ customer.phone }}"
            message: |
              Payment due: KSh {{ invoice.amount }}
              Link: {{ invoice.paymentLink }}
              Due: {{ invoice.dueDate }}
        
        # Log as high-priority
        - action: event.log
          input:
            type: "high_value_invoice"
            priority: "high"
            invoiceId: "{{ invoice.id }}"
    
    # Then wait and follow up
    - id: wait_2_days
      action: wait.for
      timeout: 172800000  # 2 days
      
    - id: send_reminder
      action: condition.if
      condition: "{{ invoice.status == 'unpaid' }}"
      onTrue:
        action: whatsapp.send
        input:
          to: "{{ customer.phone }}"
          message: "Reminder: Invoice KSh {{ invoice.amount }} still unpaid. Deadline: {{ invoice.dueDate }}"
      onFalse:
        action: event.log
        input:
          type: "payment_received"
          invoiceId: "{{ invoice.id }}"
    
    - id: wait_3_more_days
      action: wait.for
      timeout: 259200000  # 3 days
      
    - id: final_escalation
      action: condition.if
      condition: "{{ invoice.status == 'unpaid' }}"
      onTrue:
        - action: whatsapp.send
          input:
            to: "{{ customer.phone }}"
            message: |
              FINAL NOTICE: Invoice KSh {{ invoice.amount }} overdue
              Please pay immediately or your subscription will be cancelled
          
        - action: event.log
          input:
            type: "invoice_escalated"
            customerId: "{{ customer.id }}"
            action: "notify_management"
      onFalse: {}
  
  # PATH B: Standard invoices
  - id: standard_workflow
    action: sequential
    input:
      - action: wait.for
        timeout: 432000000  # 5 days before due
      
      - action: whatsapp.send
        input:
          to: "{{ customer.phone }}"
          message: "Upcoming payment: KSh {{ invoice.amount }} due {{ invoice.dueDate }}"

  # Step 3: Handle payment (this runs via M-Pesa webhook callback)
  - id: wait_for_payment
    action: wait.for
    waitForEvent: "mpesa.payment_received"
    
  # Step 4: Verify payment
  - id: verify_payment
    action: mpesa.verify
    input:
      transactionId: "{{ mpesa.payment_received.transactionId }}"
    output: payment
    
  # Step 5: Mark invoice as paid
  - id: mark_invoice_paid
    action: invoice.mark_paid
    input:
      invoiceId: "{{ invoice.id }}"
      transactionId: "{{ payment.transactionId }}"
    output: paidInvoice
    
  # Step 6: Send receipt
  - id: send_receipt
    action: whatsapp.send
    input:
      to: "{{ customer.phone }}"
      message: |
        Payment received!
        Amount: KSh {{ invoice.amount }}
        Reference: {{ payment.transactionId }}
        Receipt: {{ paidInvoice.receiptUrl }}
```

### The KCOS Actions You Need

```typescript
// 1. invoice.create
interface InvoiceCreateAction extends Action {
  execute(input: {
    customer: string;
    amount: number;
    dueDate: Date;
    description: string;
  }): Promise<{ id: string; paymentLink: string; status: 'draft' }>;
}

// 2. condition.if - Route based on logic
interface ConditionalAction extends Action {
  execute(input: {
    condition: boolean;
    onTrue: WorkflowStep | any;
    onFalse: WorkflowStep | any;
  }): Promise<any>;
}

// 3. parallel.all - Execute actions simultaneously
interface ParallelAction extends Action {
  execute(input: {
    actions: WorkflowStep[];
  }): Promise<Array<any>>;
}

// 4. wait.for - Pause for event
interface WaitAction extends Action {
  execute(input: {
    timeout: number;
    waitForEvent?: string;
  }): Promise<any>;
}

// 5. mpesa.verify - Verify payment went through
interface MPesaVerifyAction extends Action {
  execute(input: {
    transactionId: string;
  }): Promise<{ status: 'success' | 'failed'; amount: number }>;
}

// 6. invoice.mark_paid
interface InvoiceMarkPaidAction extends Action {
  execute(input: {
    invoiceId: string;
    transactionId: string;
  }): Promise<{ status: 'paid'; receiptUrl: string }>;
}
```

### Stripe vs KCOS Comparison

| Stripe Concept | KCOS Action | Kenya Implementation |
|----------------|-------------|---------------------|
| Create Automation | Schedule trigger + steps | Monthly cron job |
| Filter conditions | condition.if | Check subscription status |
| Multiple actions | parallel.all | Send WhatsApp + log event |
| Delays between actions | wait.for | 2-3-5 day delays |
| Payment webhook | mpesa.payment_received event | M-Pesa callback endpoint |
| Email notifications | whatsapp.send | WhatsApp instead of email |
| Payment verification | mpesa.verify | Query M-Pesa status |

---

## 3. AMAZON FBA INVENTORY WORKFLOW

### What Amazon Does

Amazon's FBA (Fulfillment by Amazon) manages:

- Inventory forecasting
- Inbound shipments (seller → Amazon warehouse)
- Warehouse storage
- Order picking & packing
- Outbound delivery
- Inventory health metrics

**Key Pattern**: Predictive reorder points + Automated transfers

### How KCOS Recreates It

**Scenario**: Kenyan small business wants to manage inventory across multiple retail locations (like mini supermarkets)

#### KCOS Multi-Location Inventory Workflow

```yaml
id: "kcos-fba-inventory-management"
name: "Distributed Inventory Management"

# CONTINUOUS TRIGGER: Monitor inventory levels
trigger:
  type: schedule.trigger
  cron: "*/30 * * * *"  # Every 30 minutes
  
steps:
  # Step 1: Get all inventory levels across locations
  - id: scan_inventory
    action: inventory.get_levels
    input:
      locations: ["warehouse_main", "shop_downtown", "shop_karen", "shop_westlands"]
    output: inventoryStatus
    
  # Step 2: Check which locations have low stock
  - id: identify_low_stock
    action: condition.if
    condition: "{{ inventoryStatus.any(item => item.level < item.reorderPoint) }}"
    onTrue:
      - action: inventory.analyze_demand
        input:
          sku: "{{ lowStockItem.sku }}"
          historicalSales: "{{ lowStockItem.salesHistory }}"
          leadTime: 3  # days
        output: demand
    onFalse: {}
    
  # Step 3: Calculate reorder quantity (using EOQ formula)
  - id: calculate_reorder
    action: inventory.calculate_quantity
    input:
      sku: "{{ demand.sku }}"
      demandRate: "{{ demand.monthlyDemand }}"
      holdingCost: "{{ demand.holdingCostPerUnit }}"
      orderCost: "{{ demand.orderingCost }}"
    output: reorderQty
    
  # Step 4: Check if we should reorder
  - id: should_reorder
    action: condition.if
    condition: "{{ inventoryStatus.lowestLevel < reorderQty }}"
    onTrue: "execute_reorder"
    onFalse: "log_normal"
    
  # REORDER PATH
  - id: execute_reorder
    action: sequential
    input:
      # Step 4a: Create purchase order
      - id: create_po
        action: order.create
        input:
          supplier: "{{ demand.supplier }}"
          sku: "{{ demand.sku }}"
          quantity: "{{ reorderQty.quantity }}"
          destination: "warehouse_main"
        output: purchaseOrder
      
      # Step 4b: Notify supplier via WhatsApp
      - id: notify_supplier
        action: whatsapp.send
        input:
          to: "{{ demand.supplier.whatsappPhone }}"
          message: |
            PO {{ purchaseOrder.id }} created
            Item: {{ demand.sku }}
            Qty: {{ reorderQty.quantity }}
            Delivery: {{ purchaseOrder.estimatedDelivery }}
      
      # Step 4c: Wait for arrival
      - id: wait_delivery
        action: wait.for
        waitForEvent: "shipment.received"
        timeout: 604800000  # 7 days
      
      # Step 4d: Receive goods
      - id: receive_inventory
        action: inventory.receive
        input:
          purchaseOrderId: "{{ purchaseOrder.id }}"
          location: "warehouse_main"
          scannedUnits: "{{ shipment.received.quantity }}"
        output: reception
      
      # Step 4e: Distribute to locations (like Amazon's outbound routing)
      - id: distribute_stock
        action: parallel.all
        input:
          actions:
            # Send 40% to downtown shop
            - action: inventory.transfer
              input:
                from: "warehouse_main"
                to: "shop_downtown"
                sku: "{{ demand.sku }}"
                quantity: "{{ reorderQty.quantity * 0.4 }}"
            
            # Send 30% to Karen shop
            - action: inventory.transfer
              input:
                from: "warehouse_main"
                to: "shop_karen"
                sku: "{{ demand.sku }}"
                quantity: "{{ reorderQty.quantity * 0.3 }}"
            
            # Send 30% to Westlands shop
            - action: inventory.transfer
              input:
                from: "warehouse_main"
                to: "shop_westlands"
                sku: "{{ demand.sku }}"
                quantity: "{{ reorderQty.quantity * 0.3 }}"
      
      # Step 4f: Notify shop managers
      - action: whatsapp.send
        input:
          to: "{{ shops[*].managerPhone }}"
          message: |
            Stock arrival!
            Item: {{ demand.sku }}
            Your location received: {{ inventory.transfer.quantity }}
            Update POS now
  
  # MONITORING PATH
  - id: log_normal
    action: event.log
    input:
      type: "inventory_check"
      status: "normal"
      timestamp: "{{ $now() }}"
```

### Amazon vs KCOS Comparison

| Amazon Concept | KCOS Action | Kenya Implementation |
|----------------|-------------|---------------------|
| IPI (Inventory Performance Index) | event.log + analytics | Track inventory health |
| Forecasting | inventory.analyze_demand | Historical sales analysis |
| Automated Reordering | inventory.calculate_quantity | EOQ formula |
| Inbound shipments | order.create + wait.for | Buy from supplier, wait delivery |
| Multi-location fulfillment | inventory.transfer + parallel.all | Distribute to retail shops |
| Real-time syncing | Schedule trigger every 30min | Sync inventory levels |
| Storage optimization | inventory.get_levels | Monitor waste/overstock |

---

## 4. DOORDASH ORDER-TO-DELIVERY WORKFLOW

### What DoorDash Does

DoorDash manages the complete journey:

1. Restaurant receives order
2. Kitchen starts prep
3. Dasher assigned (dynamic dispatch)
4. Dasher picks up when ready
5. Real-time tracking
6. Customer receives order
7. Payment settlement

**Key Pattern**: Multi-party coordination with real-time status updates

### How KCOS Recreates It

**Scenario**: Nairobi food delivery startup using motorcycles and bodabodas

#### KCOS Multi-Party Coordination Workflow

```yaml
id: "kcos-doordash-delivery"
name: "Restaurant Order to Delivery"

# TRIGGER: Customer orders via WhatsApp
trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.text }}"
      contains: ["order", "food", "deliver"]

steps:
  # Step 1: Parse order details
  - id: parse_order
    action: document.parse
    input:
      text: "{{ trigger.data.text }}"
      context: "food_order"
      expectedFields: ["items", "address", "time"]
    output: parsedOrder
    
  # Step 2: Validate restaurant can deliver to address
  - id: check_delivery_zone
    action: geo.check_zone
    input:
      restaurantLocation: "{{ trigger.restaurant.coordinates }}"
      customerAddress: "{{ parsedOrder.address }}"
      maxDistance: 10  # km
    output: zoneCheck
    compensation: whatsapp.send
    
  # Step 3: Check restaurant capacity (prep time)
  - id: estimate_prep_time
    action: restaurant.estimate_prep
    input:
      items: "{{ parsedOrder.items }}"
      currentQueueLength: "{{ restaurant.currentOrders }}"
    output: prepEstimate
    
  # Step 4: Calculate total (food + delivery fee)
  - id: calculate_total
    action: order.calculate_price
    input:
      items: "{{ parsedOrder.items }}"
      restaurantLocation: "{{ trigger.restaurant.coordinates }}"
      deliveryAddress: "{{ parsedOrder.address }}"
    output: pricing
    
  # Step 5: Create order and request payment
  - id: create_order_and_pay
    action: parallel.all
    input:
      actions:
        # Create order record
        - action: order.create
          input:
            restaurant: "{{ trigger.restaurant.id }}"
            customer: "{{ trigger.data.from }}"
            items: "{{ parsedOrder.items }}"
            deliveryAddress: "{{ parsedOrder.address }}"
            totalAmount: "{{ pricing.total }}"
            expectedDelivery: "{{ prepEstimate.time + pricing.deliveryTime }}"
          output: order
        
        # Request payment via M-Pesa
        - action: mpesa.initiate
          input:
            phone: "{{ trigger.data.from }}"
            amount: "{{ pricing.total }}"
            reference: "ORDER_{{ order.id }}"
          output: paymentRequest
    compensation: order.cancel
    
  # Step 6: Wait for payment confirmation
  - id: wait_payment
    action: wait.for
    waitForEvent: "mpesa.callback"
    timeout: 300000  # 5 minutes
    
  # Step 7: Verify payment
  - id: verify_payment
    action: mpesa.verify
    input:
      transactionId: "{{ mpesa.callback.transactionId }}"
      expectedAmount: "{{ pricing.total }}"
    output: payment
    compensation: mpesa.refund
    
  # Step 8: Send order to restaurant
  - id: send_to_restaurant_pos
    action: order.forward_to_pos
    input:
      orderId: "{{ order.id }}"
      restaurantPhone: "{{ trigger.restaurant.posPhone }}"
      items: "{{ order.items }}"
      notes: "{{ parsedOrder.specialInstructions }}"
    
  # Step 9: Notify restaurant kitchen
  - id: notify_kitchen
    action: whatsapp.send
    input:
      to: "{{ trigger.restaurant.kitchenPhone }}"
      message: |
        NEW ORDER - {{ order.id }}
        Items: {{ order.items[*].name }}
        Delivery: {{ order.deliveryAddress }}
        Prep time: {{ prepEstimate.time }}min
    
  # Step 10: Notify customer payment confirmed
  - id: notify_customer_confirmed
    action: whatsapp.send
    input:
      to: "{{ order.customer }}"
      message: |
        Order confirmed!
        Order ID: {{ order.id }}
        Estimated delivery: {{ order.expectedDelivery }}
        You'll get delivery updates
    
  # Step 11: Wait for food to be ready
  - id: wait_food_ready
    action: wait.for
    waitForEvent: "restaurant.order_ready"
    timeout: "{{ prepEstimate.time * 60000 }}"
    
  # Step 12: Assign driver (DoorDash: Dasher assignment)
  - id: assign_driver
    action: driver.dispatch
    input:
      location: "{{ order.deliveryAddress }}"
      pickupLocation: "{{ trigger.restaurant.coordinates }}"
      estimatedTime: "{{ pricing.deliveryTime }}"
      payoutAmount: "{{ pricing.driverFee }}"
      orderType: "food_delivery"
    output: driverAssignment
    compensation: driver.cancel_assignment
    
  # Step 13: Notify driver
  - id: notify_driver
    action: whatsapp.send
    input:
      to: "{{ driverAssignment.driver.phone }}"
      message: |
        New delivery!
        Restaurant: {{ trigger.restaurant.name }}
        Pickup: {{ trigger.restaurant.address }}
        Dropoff: {{ order.deliveryAddress }}
        Earning: KSh {{ pricing.driverFee }}
        Location: [MAP_LINK]
    
  # Step 14: Wait for driver to reach restaurant
  - id: wait_driver_arrival
    action: wait.for
    waitForEvent: "driver.arrived_at_restaurant"
    timeout: "{{ pricing.deliveryTime * 60000 }}"
    
  # Step 15: Notify restaurant to hand over food
  - id: notify_handover
    action: whatsapp.send
    input:
      to: "{{ trigger.restaurant.posPhone }}"
      message: |
        Driver arrived!
        Order {{ order.id }}
        Driver: {{ driverAssignment.driver.name }}
        Phone: {{ driverAssignment.driver.phone }}
    
  # Step 16: Start delivery tracking
  - id: start_tracking
    action: geo.track_route
    input:
      driverId: "{{ driverAssignment.driver.id }}"
      destination: "{{ order.deliveryAddress }}"
      customer: "{{ order.customer }}"
    output: tracking
    
  # Step 17: Send real-time tracking to customer
  - id: send_tracking_updates
    action: loop.interval
    input:
      interval: 60000  # Every minute
      while: "{{ tracking.status != 'delivered' }}"
      actions:
        - action: whatsapp.send
          input:
            to: "{{ order.customer }}"
            message: |
              Driver on the way
              ETA: {{ tracking.estimatedArrival }}
              Location: [MAP_LINK]
              Driver: {{ driverAssignment.driver.name }}
    
  # Step 18: Wait for delivery completion
  - id: wait_delivery
    action: wait.for
    waitForEvent: "driver.delivered"
    timeout: "{{ pricing.deliveryTime * 120000 }}"  # 2x estimated time
    
  # Step 19: Mark order as delivered
  - id: mark_delivered
    action: order.mark_delivered
    input:
      orderId: "{{ order.id }}"
      deliveredTime: "{{ $now() }}"
      photoproof: "{{ driver.delivered.photoProof }}"
    
  # Step 20: Send delivery confirmation to all parties
  - id: send_completion_notifications
    action: parallel.all
    input:
      actions:
        # Customer
        - action: whatsapp.send
          input:
            to: "{{ order.customer }}"
            message: |
              Order delivered!
              Driver: {{ driverAssignment.driver.name }}
              Enjoy your meal!
              Rate: [REVIEW_LINK]
        
        # Restaurant
        - action: whatsapp.send
          input:
            to: "{{ trigger.restaurant.posPhone }}"
            message: |
              Order {{ order.id }} delivered
        
        # Driver
        - action: whatsapp.send
          input:
            to: "{{ driverAssignment.driver.phone }}"
            message: |
              Delivery complete
              Earning: KSh {{ pricing.driverFee }} (pending settlement)
              Total rating: {{ driver.averageRating }}
  
  # Step 21: Process settlements
  - id: settle_payments
    action: payment.settle_trio
    input:
      orderId: "{{ order.id }}"
      totalAmount: "{{ pricing.total }}"
      driverFee: "{{ pricing.driverFee }}"
      platformFee: "{{ pricing.platformFee }}"
      restaurantPayout: "{{ pricing.total - pricing.driverFee - pricing.platformFee }}"
    output: settlement
```

### The KCOS Actions You Need

```typescript
// 1. geo.check_zone - Is address within delivery zone?
interface GeoCheckZoneAction extends Action {
  execute(input: {
    restaurantLocation: Coordinates;
    customerAddress: Coordinates;
    maxDistance: number;
  }): Promise<{ inZone: boolean; distance: number; fee: number }>;
}

// 2. restaurant.estimate_prep - How long until food is ready?
interface RestaurantEstimatePrepAction extends Action {
  execute(input: {
    items: MenuItem[];
    currentQueueLength: number;
  }): Promise<{ time: number; inMinutes: string }>;
}

// 3. order.calculate_price - Food + delivery fee
interface OrderCalculatePriceAction extends Action {
  execute(input: {
    items: MenuItem[];
    restaurantLocation: Coordinates;
    deliveryAddress: Coordinates;
  }): Promise<{ subtotal: number; deliveryFee: number; total: number; driverFee: number; platformFee: number }>;
}

// 4. driver.dispatch - Find available driver
interface DriverDispatchAction extends Action {
  execute(input: {
    location: Coordinates;
    pickupLocation: Coordinates;
    estimatedTime: number;
    payoutAmount: number;
    orderType: string;
  }): Promise<{ driver: Driver; assignmentId: string }>;
}

// 5. geo.track_route - Real-time GPS tracking
interface GeoTrackRouteAction extends Action {
  execute(input: {
    driverId: string;
    destination: Coordinates;
    customer: string;
  }): Promise<{ status: string; estimatedArrival: Date }>;
}

// 6. payment.settle_trio - Split payment 3 ways
interface PaymentSettleTrio extends Action {
  execute(input: {
    orderId: string;
    totalAmount: number;
    driverFee: number;
    platformFee: number;
    restaurantPayout: number;
  }): Promise<{ settled: boolean; transactionId: string }>;
}
```

### DoorDash vs KCOS Comparison

| DoorDash Concept | KCOS Action | Kenya Implementation |
|------------------|-------------|---------------------|
| Order placement | whatsapp.received trigger | WhatsApp instead of app |
| Restaurant receipt | order.forward_to_pos | Send to restaurant tablet |
| Prep time estimate | restaurant.estimate_prep | Track kitchen queue |
| Dasher assignment | driver.dispatch | Bodaboda/motorcycle dispatch |
| Real-time tracking | geo.track_route | GPS from driver phone |
| Continuous updates | loop.interval | WhatsApp updates every minute |
| Payment settlement | payment.settle_trio | 3-way split instantly |

---

## 5. UBER-STYLE DYNAMIC DISPATCH

### What Uber Does

- Driver location broadcast
- Demand-based assignment
- Real-time ETA calculation
- Dynamic pricing
- Completion with rating

### KCOS Implementation (for ride-hailing or delivery)

```yaml
id: "kcos-uber-dispatch"
name: "Dynamic Ride Dispatch"

trigger:
  type: whatsapp.received
  conditions:
    - field: "{{ data.text }}"
      contains: ["ride", "need driver", "pickup"]

steps:
  # Find nearby available drivers
  - id: find_nearby_drivers
    action: geo.find_nearby
    input:
      location: "{{ trigger.userLocation }}"
      radius: 5  # km
      availability: "available"
    output: nearbyDrivers
    
  # Calculate price based on distance and demand
  - id: calculate_price
    action: pricing.dynamic
    input:
      pickupLocation: "{{ trigger.userLocation }}"
      dropoffLocation: "{{ trigger.destination }}"
      demandMultiplier: "{{ pricing.getCurrentMultiplier() }}"
    output: quote
    
  # Find best driver (closest + highest rating)
  - id: select_best_driver
    action: driver.select_optimal
    input:
      candidates: "{{ nearbyDrivers }}"
      criteria: ["distance", "rating", "availability"]
    output: selectedDriver
    
  # Send to driver
  - id: send_ride_request
    action: whatsapp.send
    input:
      to: "{{ selectedDriver.phone }}"
      message: |
        Ride request!
        Pickup: {{ trigger.userLocation }}
        Dropoff: {{ trigger.destination }}
        Fare: KSh {{ quote.total }}
        Accept: [LINK]
    
  # Wait for driver acceptance
  - id: wait_driver_response
    action: wait.for
    waitForEvent: "driver.accepted"
    timeout: 60000  # 60 seconds
    compensation: driver.dispatch  # Try next driver if timeout
```

---

## 6. ACTIONABLE NEXT STEPS

### For Each Industry, Create These Actions:

**E-Commerce (Shopify Pattern):**
- order.create
- inventory.resolve_location
- fulfillment.create_order
- shipment.create
- wait.for (human actions)

**Payments (Stripe Pattern):**
- invoice.create
- condition.if (routing)
- parallel.all (concurrent actions)
- mpesa.verify
- schedule.trigger

**Inventory (Amazon Pattern):**
- inventory.get_levels
- inventory.analyze_demand
- inventory.calculate_quantity
- inventory.transfer
- schedule.trigger (continuous monitoring)

**Delivery (DoorDash/Uber Pattern):**
- geo.check_zone
- geo.track_route
- driver.dispatch
- payment.settle_trio
- loop.interval (repeated actions)

---

## 7. THE MASTER WORKFLOW TEMPLATE

Use this template to recreate ANY industry workflow:

```yaml
id: "industry_workflow_name"
name: "Your Descriptive Name"

# 1. TRIGGER: What starts this?
trigger:
  type: [whatsapp.received | schedule.trigger | webhook | mpesa.callback]
  conditions: []  # Optional filters

# 2. MAIN FLOW: Sequential steps
steps:
  - id: step_1_name
    action: action.name
    input: {}
    output: variable_name
    compensation: action.on_failure  # Optional undo action
  
  - id: step_2_conditional
    action: condition.if
    input:
      condition: "{{ logic }}"
      onTrue: "path_a"
      onFalse: "path_b"
  
  - id: step_3_parallel
    action: parallel.all
    input:
      actions:
        - action: parallel_action_1
        - action: parallel_action_2
  
  - id: step_4_wait
    action: wait.for
    waitForEvent: "external_event"
    timeout: 60000

# 3. ERROR HANDLING: Compensation runs in reverse
# (automatic if action fails)
```

---

## Summary: The "Cheat Code"

Instead of building payment orchestration from scratch:

1. **Study Stripe's automation patterns**
2. **Map to KCOS actions** (condition.if, wait.for, parallel.all)
3. **Implement with Kenya APIs** (M-Pesa, WhatsApp, SMS)
4. **Deploy to Temporal** (durability + replay)

**Result**: You've recreated Stripe's core logic locally.

Do this for 5-10 industries:
- Shopify (e-commerce)
- Stripe (payments)
- Amazon (inventory)
- DoorDash (delivery)
- Uber (dispatch)
- Slack (async workflows)
- Zapier (integrations)

And you have a platform that powers any Kenyan commerce use case.

---

## Next Phase: Reference Implementations

These workflows will be implemented as:

```
actions/
  ├── commerce/
  │   ├── shopify-fulfillment.ts
  │   ├── amazon-inventory.ts
  │   └── doordash-delivery.ts
  ├── payments/
  │   ├── stripe-automation.ts
  │   └── mpesa-collections.ts
  └── utilities/
      ├── geo-dispatch.ts
      ├── settlement.ts
      └── tracking.ts
```

Each file contains the exact workflow YAML + action implementations.

---

**This is how you cheat: Recreate what billion-dollar companies built, but for Kenya.**
