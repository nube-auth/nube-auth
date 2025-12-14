import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

export default function AppDetail() {
  const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="text-primary-600 hover:text-primary-700 mb-4"
      >
        ← Back
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Details</h2>
        <p className="text-gray-600">App ID: {appId}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Status</p>
          <p className="text-lg font-semibold text-green-600">Active</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Created</p>
          <p className="text-lg font-semibold">--</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Last Updated</p>
          <p className="text-lg font-semibold">--</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">License Management</h3>
          <Button size="sm">+ Grant License</Button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
          No licenses granted yet
        </div>
      </div>
    </div>
  );
}
