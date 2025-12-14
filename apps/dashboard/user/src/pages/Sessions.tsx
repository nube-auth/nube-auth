import { useSessions } from '../hooks'
import { deleteSession } from '../api'
import LoadingSpinner from '../components/LoadingSpinner'

interface Session {
  id: string
  userAgent: string
  ipAddress: string
  createdAt: string
  lastActivity: string
}

export default function Sessions() {
  const { data: sessions, isLoading, error, refetch } = useSessions()

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      await deleteSession(id)
      refetch()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="p-8 text-red-600">Failed to load sessions</div>

  const sessionList: Session[] = sessions || []

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Active Sessions</h2>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {sessionList.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No active sessions.
          </div>
        ) : (
          sessionList.map((session) => (
            <div key={session.id} className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {session.userAgent || 'Unknown Device'}
                </p>
                {session.ipAddress && (
                  <p className="text-sm text-gray-600">IP: {session.ipAddress}</p>
                )}
                <p className="text-xs text-gray-500">
                  Created {new Date(session.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  Last active {new Date(session.lastActivity).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteSession(session.id)}
                className="ml-4 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
