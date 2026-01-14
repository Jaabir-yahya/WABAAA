export default function AdminHome() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: "0 0 8px 0" }}>Admin</h1>
      <p style={{ margin: 0 }}>
        You’re authenticated if you can see this page. If you get redirected to{" "}
        <code>/admin/login</code>, set Supabase env vars and sign in.
      </p>
    </main>
  );
}

