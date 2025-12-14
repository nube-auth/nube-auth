const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3001'

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>
}

async function fetchAPI(endpoint: string, options: FetchOptions = {}) {
  const url = `${GATEWAY_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

export async function getMe() {
  return fetchAPI('/me')
}

export async function getProfile() {
  return fetchAPI('/profile')
}

export async function updateProfile(data: Record<string, unknown>) {
  return fetchAPI('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getSessions() {
  return fetchAPI('/sessions')
}

export async function deleteSession(id: string) {
  return fetchAPI(`/sessions/${id}`, {
    method: 'DELETE',
  })
}

export async function logout() {
  return fetchAPI('/logout', {
    method: 'POST',
  })
}
