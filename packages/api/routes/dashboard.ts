import { Router } from 'express';
import { getSupabaseWithContext } from './supabase';

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

const STATUS_MESSAGES: Partial<Record<ValidStatus, (order: any) => string>> = {
  confirmed: (order) =>
    `✅ Tumepokea oda yako!\n${formatItems(order.items)}\nJumla: KSh ${order.total_amount}`,
  preparing: () => `🍳 Tunaandaa oda yako sasa! Tutakujulisha ikiisha.`,
  ready: (order) =>
    `✓ Oda yako iko tayari! Unaweza kuchukua.\nJumla: KSh ${order.total_amount}`,
  delivered: () => `🎉 Asante sana! Karibu tena.`,
  cancelled: () => `Samahani, oda yako imesitishwa. Wasiliana nasi kwa maswali.`,
};

function formatItems(items: unknown): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((item: any) => {
      const quantity = item?.quantity ?? 1;
      const name = item?.name ?? item?.product_name ?? 'Item';
      return `- ${quantity}x ${name}`;
    })
    .join('\n');
}

export function createDashboardRouter(): Router {
  const router = Router();

  router.get('/live', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { status, customer_phone } = req.query;

      let query = supabase
        .from('kcos_core.dashboard_live')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (customer_phone) query = query.eq('customer_phone', customer_phone);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ orders: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const today = new Date().toISOString().split('T')[0];

      const { data: todayOrders, error: ordersError } = await supabase
        .from('kcos_core.orders')
        .select('total_amount, outstanding_amount, status')
        .gte('created_at', today);

      if (ordersError) return res.status(500).json({ error: ordersError.message });

      const { data: todayExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', today);

      if (expensesError) return res.status(500).json({ error: expensesError.message });

      const totalRevenue =
        todayOrders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) ||
        0;
      const totalExpenses =
        todayExpenses?.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) ||
        0;

      const summary = {
        today: {
          orders: todayOrders?.length || 0,
          revenue: totalRevenue,
          paid: todayOrders?.filter((o) => Number(o.outstanding_amount || 0) === 0).length || 0,
          pending: todayOrders?.filter((o) => o.status === 'pending').length || 0,
          expenses: totalExpenses,
        },
        profit: totalRevenue - totalExpenses,
      };

      return res.json(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.get('/customers/:phone/orders', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { phone } = req.params;
      const limit = Number(req.query.limit) || 20;

      const { data, error } = await supabase.rpc('kcos_core.get_customer_orders', {
        p_business_id: tenantId,
        p_customer_phone: phone,
        p_limit: limit,
      });

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ orders: data || [] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.put('/orders/:orderId/status', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { status } = req.body as { status?: ValidStatus };
      const { orderId } = req.params;

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { data: order, error: updateError } = await supabase
        .from('kcos_core.orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) return res.status(500).json({ error: updateError.message });

      await supabase.from('kcos_system.commerce_events').insert({
        business_id: tenantId,
        event_type: 'manual_correction',
        payload: {
          action: 'status_updated',
          order_id: orderId,
          status,
          updated_by: 'dashboard',
        },
      });

      const messageBuilder = STATUS_MESSAGES[status];
      if (messageBuilder && order.customer_phone) {
        const { data: existingNotifications, error: notificationError } =
          await supabase
            .from('kcos_core.order_notifications')
            .select('sent_at')
            .eq('order_id', orderId)
            .eq('status', status)
            .eq('channel', 'whatsapp')
            .limit(1);

        const alreadyNotified = (existingNotifications || []).length > 0;

        if (notificationError) {
          console.error('Failed to check notification state:', notificationError);
        } else if (!alreadyNotified) {
          try {
            const response = await fetch(
              `${process.env.SUPABASE_URL}/functions/v1/whatsapp-webhook`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'send_message',
                  to: order.customer_phone,
                  message: messageBuilder(order),
                  business_id: tenantId,
                }),
              }
            );

            if (response.ok) {
              await supabase.from('kcos_core.order_notifications').insert({
                order_id: orderId,
                status,
                channel: 'whatsapp',
                business_id: tenantId,
              });
            }
          } catch (error) {
            console.error('Failed to send status notification:', error);
          }
        }
      }

      return res.json({ order });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  router.put('/customers/:phone/notes', async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const supabase = await getSupabaseWithContext(tenantId);
      const { phone } = req.params;
      const { notes, preferences } = req.body as {
        notes?: string;
        preferences?: Record<string, unknown>;
      };

      const { data, error } = await supabase
        .from('kcos_core.customer_notes')
        .upsert({
          business_id: tenantId,
          customer_phone: phone,
          notes,
          preferences: preferences || {},
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ notes: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
