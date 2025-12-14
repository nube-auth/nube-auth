import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  getProjects,
  getProject,
  getProjectMembers,
  getProjectApps,
  getProjectActivity,
} from '../api';

export const useProjects = (): UseQueryResult<any, Error> =>
  useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

export const useProject = (id: string): UseQueryResult<any, Error> =>
  useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });

export const useProjectMembers = (projectId: string): UseQueryResult<any, Error> =>
  useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });

export const useProjectApps = (projectId: string): UseQueryResult<any, Error> =>
  useQuery({
    queryKey: ['projects', projectId, 'apps'],
    queryFn: () => getProjectApps(projectId),
    enabled: !!projectId,
  });

export const useProjectActivity = (projectId: string): UseQueryResult<any, Error> =>
  useQuery({
    queryKey: ['projects', projectId, 'activity'],
    queryFn: () => getProjectActivity(projectId),
    enabled: !!projectId,
  });
