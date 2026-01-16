import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    today_orders: 0,
    pending_payments: 0,
    today_revenue: 0,
    active_customers: 0
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white p-4">
        <h1 className="text-2xl font-bold">Biashara Yangu</h1>
        <p className="text-primary-100">Dashboard ya Leo</p>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <p className="text-gray-600 text-sm">Oda za Leo</p>
            <p className="text-3xl font-bold text-primary-600">{stats.today_orders}</p>
          </div>
          <div className="card">
            <p className="text-gray-600 text-sm">Inasubiri Malipo</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pending_payments}</p>
          </div>
          <div className="card">
            <p className="text-gray-600 text-sm">Mapato ya Leo</p>
            <p className="text-3xl font-bold text-green-600">
              KES {stats.today_revenue.toLocaleString()}
            </p>
          </div>
          <div className="card">
            <p className="text-gray-600 text-sm">Wateja</p>
            <p className="text-3xl font-bold text-blue-600">{stats.active_customers}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Haraka</h2>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary">
              Tuma Ombi la Malipo
            </button>
            <button className="btn-secondary">
              Onyesha Oda Mpya
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Oda za Hivi Karibuni</h2>
          <div className="text-center py-8 text-gray-500">
            Hakuna oda bado
          </div>
          <Link to="/orders" className="block text-center text-primary-600 font-medium mt-2">
            Onyesha Zote →
          </Link>
        </div>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <Link to="/" className="flex flex-col items-center gap-1 text-primary-600">
            <span className="text-2xl">🏠</span>
            <span className="text-xs">Nyumbani</span>
          </Link>
          <Link to="/orders" className="flex flex-col items-center gap-1 text-gray-600">
            <span className="text-2xl">📦</span>
            <span className="text-xs">Oda</span>
          </Link>
          <Link to="/customers" className="flex flex-col items-center gap-1 text-gray-600">
            <span className="text-2xl">👥</span>
            <span className="text-xs">Wateja</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center gap-1 text-gray-600">
            <span className="text-2xl">⚙️</span>
            <span className="text-xs">Mipangilio</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
