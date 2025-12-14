export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface App {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface License {
  id: string;
  appId: string;
  grantedTo: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface Activity {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: Record<string, any>;
}
