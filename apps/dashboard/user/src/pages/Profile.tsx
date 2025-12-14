import React, { useState } from 'react';
import { useMe, useUpdateProfile } from '../hooks/api';

export function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [name, setName] = useState('');

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4">User not found</div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-gray-900">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
