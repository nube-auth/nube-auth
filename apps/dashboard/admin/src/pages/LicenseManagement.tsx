export default function LicenseManagement() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">License Management</h2>
      <p className="text-gray-600 mb-6">Grant, edit, and revoke licenses for your applications</p>

      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-gray-600">Select a project and application to manage licenses</p>
      </div>
    </div>
  );
}
