import { useState } from 'react';
import { useProjects } from '../hooks';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Table from '../components/Table';
import { Input } from '../components/Form';

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateProject = () => {
    // TODO: Call createProject API
    console.log('Creating project:', formData);
    setIsCreateModalOpen(false);
    setFormData({ name: '', description: '' });
  };

  const columns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Project Name' },
    { key: 'description' as const, label: 'Description' },
    {
      key: 'createdAt' as const,
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-gray-600">Manage all your projects and applications</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + New Project
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Table columns={columns} data={projects || []} loading={isLoading} />
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create</Button>
          </>
        }
      >
        <Input
          label="Project Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="My Awesome Project"
        />
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Project description..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={4}
        />
      </Modal>
    </div>
  );
}
