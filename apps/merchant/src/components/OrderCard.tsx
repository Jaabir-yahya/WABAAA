type OrderCardProps = {
  id: string;
  customer_name?: string;
  customer_phone: string;
  product: string;
  quantity: number;
  unit: string;
  total_amount: number;
  status: string;
  synced: boolean;
};

export default function OrderCard({
  customer_name,
  customer_phone,
  product,
  quantity,
  unit,
  total_amount,
  status,
  synced,
}: OrderCardProps) {
  return (
    <div className={`card ${synced ? "" : "border-dashed border-amber-300"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {customer_name ? customer_name : "Mteja"} · {customer_phone}
          </p>
          <p className="text-lg font-semibold">{product}</p>
        </div>
        <span className="text-sm text-gray-500">{synced ? "Imehifadhiwa" : "Inasubiri"}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
        <span>
          {quantity} {unit}
        </span>
        <span>KES {total_amount.toLocaleString()}</span>
      </div>
      <div className="mt-2 text-xs text-gray-500">Hali: {status}</div>
    </div>
  );
}
