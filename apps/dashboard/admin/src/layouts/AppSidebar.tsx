import { useLocation, useParams, Link } from 'react-router-dom';
import config from '../config';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarList,
  SidebarItem,
  SidebarItemButton,
  SidebarLogo,
  Avatar,
  AvatarFallback,
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  Icon,
  IconType,
} from '@nube-auth/components';
import { useProjects } from '../hooks/api';

interface AppSidebarProps {
  user: {
    name?: string;
    email?: string;
    primary_email?: string;
  };
  onLogout: () => void;
  isLoggingOut: boolean;
}

export function AppSidebar({ user, onLogout, isLoggingOut }: AppSidebarProps) {
  const location = useLocation();
  const { projectId, appId } = useParams<{ projectId?: string; appId?: string }>();
  const { data: projects = [] } = useProjects();

  // User initials
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email || user.primary_email)?.charAt(0).toUpperCase() || 'U';

  // Check if link is active
  const isLinkActive = (path: string) => {
    if (path === '/projects' && location.pathname === '/projects') return true;
    if (path !== '/projects' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <Sidebar size="loose" className="bg-background xl:bg-transparent max-lg:border-r border-border">
      <SidebarHeader>
        {/* Logo */}
        <Link to="/projects" className="flex items-center gap-2 no-underline">
          <SidebarLogo>
            <img src="/favicon.png" alt="Nube Auth" className="size-8" />
            <span className="font-semibold">Nube Auth</span>
          </SidebarLogo>
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{config.envTag}</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarList>
            <Navigation location={location} projectId={projectId} appId={appId} isLinkActive={isLinkActive} />
          </SidebarList>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarList>
            <SidebarItem>
              <Menu>
                <MenuTrigger
                  data-slot="sidebar-item-button"
                  render={
                    <SidebarItemButton className="border border-border">
                      <Avatar className="bg-primary text-white">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{user.name || 'Admin'}</span>
                        <span className="text-xs text-muted">
                          {user.email || user.primary_email}
                        </span>
                      </div>
                      <Icon icon={IconType.ArrowDown} className="ml-auto" size={16} />
                    </SidebarItemButton>
                  }
                />
                <MenuPopup 
                  className="w-(--anchor-width)" 
                  side="top"
                >
                  <MenuItem render={<Link to="/profile" />}>
                    <Icon icon={IconType.User} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={onLogout} disabled={isLoggingOut}>
                    <Icon icon={IconType.Logout} />
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </SidebarItem>
          </SidebarList>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Navigation Component
function Navigation({ 
  location, 
  projectId, 
  appId,
  isLinkActive 
}: { 
  location: ReturnType<typeof useLocation>; 
  projectId?: string; 
  appId?: string;
  isLinkActive: (path: string) => boolean;
}) {
  // Determine which items to show based on context
  let items: Array<{ to: string; label: string; icon: typeof IconType[keyof typeof IconType] }> = [];

  // Global context navigation items
  const globalItems = [
    { to: '/projects', label: 'Projects', icon: IconType.Home },
    { to: '/billing', label: 'Billing', icon: IconType.CreditCard },
    { to: '/licenses', label: 'Licenses', icon: IconType.License },
    { to: '/webhooks', label: 'Webhooks', icon: IconType.CloudUpload },
    { to: '/refunds', label: 'Refunds', icon: IconType.ReturnRequest },
    { to: '/export', label: 'Export', icon: IconType.FileExport },
    { to: '/playground/payments', label: 'Test Playground', icon: IconType.TestTube },
  ];

  // Project context navigation items
  const projectItems = projectId ? [
    {
      to: `/projects/${projectId}`,
      label: 'Overview',
      icon: IconType.Dashboard,
    },
    {
      to: `/projects/${projectId}/stats`,
      label: 'Statistics',
      icon: IconType.ChartColumn,
    },
    {
      to: `/projects/${projectId}/apps`,
      label: 'Apps',
      icon: IconType.LayoutGrid,
    },
    {
      to: `/projects/${projectId}/team`,
      label: 'Team',
      icon: IconType.UserGroup,
    },
    {
      to: `/projects/${projectId}/payment-providers`,
      label: 'Payment Providers',
      icon: IconType.CreditCard,
    },
    {
      to: `/projects/${projectId}/settings`,
      label: 'Settings',
      icon: IconType.Settings,
    },
  ] : [];

  // App context navigation items
  const appItems = projectId && appId ? [
    {
      to: `/projects/${projectId}/apps/${appId}`,
      label: 'Dashboard',
      icon: IconType.Dashboard,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/users`,
      label: 'Users',
      icon: IconType.User,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/licenses`,
      label: 'Licenses & Plans',
      icon: IconType.License,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/subscriptions`,
      label: 'Subscriptions',
      icon: IconType.CreditCard,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/promotions`,
      label: 'Promotions',
      icon: IconType.Ticket,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/api-keys`,
      label: 'API Keys',
      icon: IconType.Key,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/oauth`,
      label: 'OAuth Config',
      icon: IconType.ShieldKey,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/payment`,
      label: 'Payment Config',
      icon: IconType.CreditCard,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/developers`,
      label: 'Integration Guide',
      icon: IconType.Code,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/webhooks`,
      label: 'Webhooks',
      icon: IconType.CloudUpload,
    },
    {
      to: `/projects/${projectId}/apps/${appId}/settings`,
      label: 'App Settings',
      icon: IconType.Settings,
    },
  ] : [];

  // Determine which items to show based on context
  if (location.pathname.includes('/apps/') && projectId && appId) {
    items = appItems;
  } else if (projectId && location.pathname.includes(`/projects/${projectId}`) && !location.pathname.includes('/apps/')) {
    items = projectItems;
  } else {
    items = globalItems;
  }

  return (
    <>
      {items.map((item) => (
        <SidebarItem key={item.to}>
          <SidebarItemButton
            render={<Link to={item.to} />}
            active={isLinkActive(item.to)}
          >
            <Icon icon={item.icon} />
            {item.label}
          </SidebarItemButton>
        </SidebarItem>
      ))}
    </>
  );
}
