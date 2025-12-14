import { useMe } from '../hooks'
import { logout } from '../api'

export default function Header() {
  const { data: user } = useMe()

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proofa</h1>
          <p className="text-sm text-gray-500">Account Management</p>
        </div>
        <div className="flex items-center gap-4">
          {user?.email && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
