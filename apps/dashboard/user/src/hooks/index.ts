import { useQuery } from '@tanstack/react-query'
import { getMe, getProfile, getSessions } from '../api'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
  })
}
