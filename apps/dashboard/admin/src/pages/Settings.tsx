import { Input } from '../components/Form';
import Button from '../components/Button';

export default function Settings() {
  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Account</h3>
          <Input label="Full Name" placeholder="Admin Name" />
          <Input label="Email Address" type="email" placeholder="admin@example.com" />
          <Button className="mt-4">Save Changes</Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
          <Button variant="secondary">Change Password</Button>
          <Button variant="secondary" className="mt-3">
            Enable Two-Factor Authentication
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="text-gray-700">Email me about license expiration</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="text-gray-700">Email me about project updates</span>
          </label>
        </div>
      </div>
    </div>
  );
}
