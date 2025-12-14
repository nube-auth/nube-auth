const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3001';

const request = async (method: string, endpoint: string, body?: any) => {
  const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
};

// Project endpoints
export const getProjects = () =>
  request('GET', '/admin/projects');

export const createProject = (data: any) =>
  request('POST', '/admin/projects', data);

export const getProject = (id: string) =>
  request('GET', `/admin/projects/${id}`);

export const updateProject = (id: string, data: any) =>
  request('PATCH', `/admin/projects/${id}`, data);

export const deleteProject = (id: string) =>
  request('DELETE', `/admin/projects/${id}`);

// Project members endpoints
export const getProjectMembers = (projectId: string) =>
  request('GET', `/admin/projects/${projectId}/members`);

export const addProjectMember = (projectId: string, data: any) =>
  request('POST', `/admin/projects/${projectId}/members`, data);

export const removeProjectMember = (projectId: string, userId: string) =>
  request('DELETE', `/admin/projects/${projectId}/members/${userId}`);

// Project apps endpoints
export const getProjectApps = (projectId: string) =>
  request('GET', `/admin/projects/${projectId}/apps`);

export const createApp = (projectId: string, data: any) =>
  request('POST', `/admin/projects/${projectId}/apps`, data);

export const updateApp = (projectId: string, appId: string, data: any) =>
  request('PATCH', `/admin/projects/${projectId}/apps/${appId}`, data);

export const deleteApp = (projectId: string, appId: string) =>
  request('DELETE', `/admin/projects/${projectId}/apps/${appId}`);

// License endpoints
export const grantLicense = (projectId: string, appId: string, data: any) =>
  request('POST', `/admin/projects/${projectId}/apps/${appId}/licenses`, data);

// Activity endpoints
export const getProjectActivity = (projectId: string) =>
  request('GET', `/admin/projects/${projectId}/activity`);
