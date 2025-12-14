import { useMe } from '../hooks'
import LoadingSpinner from '../components/LoadingSpinner'

interface Identity {
  provider: string
  email?: string
  linkedAt: string
}

export default function Identities() {
  const { data: user, isLoading, error } = useMe()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="p-8 text-red-600">Failed to load identities</div>

  const identities: Identity[] = user?.linkedIdentities || []

  const providerLogos: Record<string, string> = {
    google: '🔵',
    github: '⬛',
    github_app: '⬛',
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Linked Identities</h2>

      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {identities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No linked identities. Connect an OAuth provider to link your account.
          </div>
        ) : (
          identities.map((identity, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">
                  {providerLogos[identity.provider] || '🔗'}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {identity.provider.replace('_', ' ')}
                  </p>
                  {identity.email && (
                    <p className="text-sm text-gray-600">{identity.email}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Linked {new Date(identity.linkedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                Unlink
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
