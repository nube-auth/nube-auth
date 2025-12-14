import { User, Shield, LogOut } from 'lucide-react'

interface SidebarProps {
  activePage: 'profile' | 'identities' | 'sessions'
  setActivePage: (page: 'profile' | 'identities' | 'sessions') => void
}

const menuItems = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'identities', label: 'Linked Identities', icon: Shield },
  { id: 'sessions', label: 'Active Sessions', icon: LogOut },
] as const

export default function Sidebar({ activePage, setActivePage }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6">
      <nav className="space-y-2">
        {menuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activePage === id
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
