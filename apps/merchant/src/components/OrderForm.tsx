import { useState, type FormEvent } from "react";

export type OrderFormValues = {
  customer_phone: string;
  customer_name?: string;
  product: string;
  quantity: number;
  unit: string;
  price: number;
  delivery_address?: string;
};

type Props = {
  onSubmit: (values: OrderFormValues) => void;
};

export default function OrderForm({ onSubmit }: Props) {
  const [form, setForm] = useState<OrderFormValues>({
    customer_phone: "",
    customer_name: "",
    product: "",
    quantity: 1,
    unit: "pcs",
    price: 0,
    delivery_address: "",
  });

  const update = (field: keyof OrderFormValues, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.customer_phone || !form.product || form.price <= 0) {
      return;
    }
    onSubmit(form);
    setForm((prev) => ({
      ...prev,
      product: "",
      quantity: 1,
      price: 0,
    }));
  };

  return (
    <form className="card space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Namba ya Mteja</label>
        <input
          className="input"
          placeholder="+2547XXXXXXXX"
          value={form.customer_phone}
          onChange={(event) => update("customer_phone", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Jina la Mteja</label>
        <input
          className="input"
          placeholder="Jina (hiari)"
          value={form.customer_name}
          onChange={(event) => update("customer_name", event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Bidhaa</label>
        <input
          className="input"
          placeholder="Mfano: Sukari"
          value={form.product}
          onChange={(event) => update("product", event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <label className="text-sm text-gray-600">Kiasi</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(event) => update("quantity", Number(event.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-600">Kipimo</label>
          <input
            className="input"
            placeholder="kg / pcs"
            value={form.unit}
            onChange={(event) => update("unit", event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Bei kwa Kipimo</label>
        <input
          className="input"
          type="number"
          min={0}
          value={form.price}
          onChange={(event) => update("price", Number(event.target.value))}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Mahali pa Kupeleka</label>
        <input
          className="input"
          placeholder="Anuani (hiari)"
          value={form.delivery_address}
          onChange={(event) => update("delivery_address", event.target.value)}
        />
      </div>
      <button className="btn-primary w-full" type="submit">
        Hifadhi Oda
      </button>
    </form>
  );
}
