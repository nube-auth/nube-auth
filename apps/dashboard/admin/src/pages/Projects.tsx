import { useState } from 'react';
import { useProjects, useCreateProject } from '../hooks/api';

export function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const createProjectMutation = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({ name: '', description: '' });
        setShowForm(false);
      },
    });
  };

  if (isLoading) return <div className="p-4">Loading projects...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading projects</div>;

  return (
    <div className="py-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg border space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {projects?.map((project) => (
          <div key={project.id} className="bg-white p-4 rounded-lg border hover:shadow-md">
            <h2 className="font-bold text-lg">{project.name}</h2>
            <p className="text-gray-600 text-sm">{project.description}</p>
            <p className="text-gray-500 text-xs mt-2">ID: {project.public_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
