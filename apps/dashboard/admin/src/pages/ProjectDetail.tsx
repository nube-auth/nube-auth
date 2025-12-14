import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useProjectMembers, useProjectApps } from '../hooks';
import Button from '../components/Button';
import Table from '../components/Table';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const { data: members } = useProjectMembers(projectId!);
  const { data: apps } = useProjectApps(projectId!);

  if (projectLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!project) {
    return <div className="p-8">Project not found</div>;
  }

  const memberColumns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name' },
    { key: 'email' as const, label: 'Email' },
    { key: 'role' as const, label: 'Role' },
  ];

  const appColumns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'App Name' },
    { key: 'status' as const, label: 'Status' },
  ];

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="text-primary-600 hover:text-primary-700 mb-4"
      >
        ← Back
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h2>
        <p className="text-gray-600">{project.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Members</h3>
            <Button size="sm">+ Add Member</Button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            <Table columns={memberColumns} data={members || []} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Applications</h3>
            <Button size="sm">+ New App</Button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            <Table columns={appColumns} data={apps || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
