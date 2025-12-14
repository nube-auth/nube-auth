import { useProfile } from '../hooks'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Profile() {
  const { data: profile, isLoading, error } = useProfile()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="p-8 text-red-600">Failed to load profile</div>

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Profile</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
          {profile?.avatar && (
            <img
              src={profile.avatar}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
          )}
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {profile?.name || 'User'}
            </h3>
            <p className="text-gray-600">{profile?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{profile?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <p className="text-gray-900">{profile?.name || '-'}</p>
          </div>
        </div>

        {profile?.createdAt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Created
            </label>
            <p className="text-gray-900">
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
