import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@proofa/components';
import { Button, Icon, IconType } from '@proofa/components';

export interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  topBar?: ReactNode;
}

export function DashboardLayout({ children, sidebar, topBar }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const windowResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    windowResize();
    window.addEventListener('resize', windowResize);
    return () => window.removeEventListener('resize', windowResize);
  }, []);

  function handleSidebarToggle() {
    setSidebarOpen(!sidebarOpen);
  }

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black backdrop-blur-sm z-10 transition-all',
          'max-lg:block hidden',
          sidebarOpen ? 'opacity-40 visible' : 'opacity-0 invisible',
        )}
        onClick={handleSidebarToggle}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 z-50 w-full max-w-72 md:w-72 h-dvh *:h-full transition-all',
          sidebarOpen ? 'left-0' : '-left-full',
        )}
      >
        {sidebar}
      </div>

      {/* Main content */}
      <main
        className={cn('transition-all', sidebarOpen ? 'xl:ml-72' : 'xl:ml-0')}
      >
        {/* Top navigation bar */}
        <nav
          className={cn(
            'h-16 flex items-center gap-2.5 max-lg:px-4 border-b border-border',
            sidebarOpen ? 'xl:pr-4' : 'xl:px-4',
          )}
        >
          <Button
            variant="plain"
            size="sm-icon"
            onClick={handleSidebarToggle}
          >
            <Icon icon={sidebarOpen ? IconType.ArrowLeft : IconType.ArrowRight} />
          </Button>
          {topBar}
        </nav>

        {/* Page content */}
        <div
          className={cn(
            'min-h-[calc(100vh-4rem)] flex flex-col gap-6 max-lg:px-4 pb-6 pt-6',
            sidebarOpen ? 'xl:pr-4' : 'xl:px-4',
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
