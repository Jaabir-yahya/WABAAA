import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implement Supabase auth
    // For now, just navigate to dashboard
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">Biashara Yangu</h1>
          <p className="text-primary-700 mt-2">Kenya Commerce OS</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6 text-center">Ingia</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Namba ya Simu
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254712345678"
                className="input w-full"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Inapakua...' : 'Ingia'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Tutakutumia code ya kuingia kwa SMS</p>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Kwa kuingia, unakubali</p>
          <a href="#" className="text-primary-600 hover:underline">Masharti ya Huduma</a>
        </div>
      </div>
    </div>
  );
}
