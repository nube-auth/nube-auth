export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
            P
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Proofa Admin</h1>
            <p className="text-sm text-gray-500">Project & License Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-semibold hover:bg-primary-200 transition-colors">
            A
          </button>
        </div>
      </div>
    </header>
  );
}
