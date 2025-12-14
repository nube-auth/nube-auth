interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    {
      id: 'projects',
      label: 'Projects',
      icon: '📊',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
    },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              currentPage === item.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">v0.1.0</p>
      </div>
    </aside>
  );
}
