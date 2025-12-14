import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Projects from './pages/Projects';
import Settings from './pages/Settings';

type PageType = 'projects' | 'settings' | 'profile';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('projects');

  return (
    <div className="flex h-full">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'projects' && <Projects />}
          {currentPage === 'settings' && <Settings />}
          {currentPage === 'profile' && <div className="p-8">Profile Page</div>}
        </main>
      </div>
    </div>
  );
}
