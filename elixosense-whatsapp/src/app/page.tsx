export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: "0 0 8px 0" }}>ElixoSense WhatsApp MVP</h1>
      <p style={{ margin: "0 0 16px 0", maxWidth: 720 }}>
        Server is running. Admin is at <a href="/admin">/admin</a>.
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        <li>
          WhatsApp webhook: <code>/api/whatsapp/webhook</code>
        </li>
        <li>
          M-Pesa callback: <code>/api/payments/mpesa-callback</code>
        </li>
        <li>
          Cron reminders: <code>/api/cron/reminders</code> (requires <code>x-cron-secret</code>)
        </li>
      </ul>
    </main>
  );
}

