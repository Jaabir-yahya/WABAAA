import { useEffect, useMemo, useState } from "react";
import OrderCard from "../components/OrderCard";
import OrderForm, { type OrderFormValues } from "../components/OrderForm";
import { useApiClient } from "../hooks/useApiClient";
import { useSync } from "../hooks/useSync";
import { getPendingActions } from "../lib/offline-queue";

type OrderItem = {
  id: string;
  customer_name?: string;
  customer_phone: string;
  product: string;
  quantity: number;
  unit: string;
  total_amount: number;
  status: string;
  synced: boolean;
  queued_id?: string;
};

const DEFAULT_BUSINESS_ID =
  (import.meta.env.VITE_BUSINESS_ID as string | undefined) ?? "elixosense";

export default function Orders() {
  const api = useApiClient();
  const { lastSuccessId } = useSync();
  const [orders, setOrders] = useState<OrderItem[]>([]);

  useEffect(() => {
    getPendingActions().then((actions) => {
      const pendingOrders = actions
        .filter((action) => action.action === "create_order")
        .map((action) => {
          const data = action.data as Record<string, unknown>;
          const items = (data.items as Array<Record<string, unknown>>) ?? [];
          const firstItem = items[0] ?? {};
          return {
            id: action.id,
            queued_id: action.id,
            customer_name: data.customer_name as string | undefined,
            customer_phone: (data.customer_phone as string) ?? "",
            product: (firstItem.product as string) ?? "Bidhaa",
            quantity: Number(firstItem.quantity ?? 1),
            unit: (firstItem.unit as string) ?? "pcs",
            total_amount: Number(data.total_amount ?? 0),
            status: "pending",
            synced: false,
          } as OrderItem;
        });
      setOrders(pendingOrders);
    });
  }, []);

  useEffect(() => {
    if (!lastSuccessId) return;
    setOrders((prev) =>
      prev.map((order) =>
        order.queued_id === lastSuccessId ? { ...order, synced: true } : order,
      ),
    );
  }, [lastSuccessId]);

  const handleSubmit = async (values: OrderFormValues) => {
    const payload = {
      business_id: DEFAULT_BUSINESS_ID,
      customer_phone: values.customer_phone,
      customer_name: values.customer_name,
      items: [
        {
          product: values.product,
          quantity: values.quantity,
          unit: values.unit,
          price: values.price,
        },
      ],
      total_amount: values.price * values.quantity,
      delivery_address: values.delivery_address,
    };

    const response = await api.createOrder(payload);
    const newOrder: OrderItem = {
      id: response.order_id,
      queued_id: response.queued ? response.order_id : undefined,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      product: values.product,
      quantity: values.quantity,
      unit: values.unit,
      total_amount: payload.total_amount,
      status: response.status,
      synced: !response.queued,
    };

    setOrders((prev) => [newOrder, ...prev]);
  };

  const hasOrders = useMemo(() => orders.length > 0, [orders.length]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold">Oda Zote</h1>
      </header>

      <main className="p-4 space-y-4">
        <OrderForm onSubmit={handleSubmit} />

        <div className="space-y-4">
          {hasOrders ? (
            orders.map((order) => (
              <OrderCard key={order.id} {...order} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              Hakuna oda bado
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
