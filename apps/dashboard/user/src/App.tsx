import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Profile from './pages/Profile'
import Identities from './pages/Identities'
import Sessions from './pages/Sessions'

type ActivePage = 'profile' | 'identities' | 'sessions'

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('profile')

  const renderPage = () => {
    switch (activePage) {
      case 'profile':
        return <Profile />
      case 'identities':
        return <Identities />
      case 'sessions':
        return <Sessions />
      default:
        return <Profile />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
