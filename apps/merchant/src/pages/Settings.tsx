export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold">Mipangilio</h1>
      </header>

      <main className="p-4 space-y-4">
        <div className="card">
          <h2 className="font-semibold mb-2">Lugha</h2>
          <select className="input w-full">
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2">Habari za Biashara</h2>
          <p className="text-sm text-gray-600">Jina: ElixoSense Kenya</p>
          <p className="text-sm text-gray-600">Simu: +254XXXXXXXXX</p>
        </div>

        <button className="btn-secondary w-full">
          Toka
        </button>
      </main>
    </div>
  );
}
