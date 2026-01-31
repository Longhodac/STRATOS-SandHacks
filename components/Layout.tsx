
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { id: '01', label: 'HOME', path: '/' },
  { id: '02', label: 'SPONSORS', path: '/leads' },
  { id: '03', label: 'ANALYTICS', path: '/analytics' },
  { id: '04', label: 'DATA SCAN', path: '/scan' },
  { id: '05', label: 'ADVISOR', path: '/advisor' },
  { id: '06', label: 'SETTINGS', path: '/settings' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body">
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 border-r border-border bg-background flex flex-col justify-between shrink-0 z-20 transition-all duration-300">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3 mb-6 px-1 lg:px-2 pt-2">
            <div className="bg-white aspect-square rounded-sm size-8 flex items-center justify-center text-background shrink-0">
              <span className="material-symbols-outlined text-[20px] font-bold">hub</span>
            </div>
            <div className="flex-col hidden lg:flex">
              <h1 className="text-white text-sm font-bold tracking-wider font-display leading-none">STRATOS</h1>
              <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mt-1">Outreach Edition</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors font-mono text-xs tracking-wide ${
                  location.pathname === item.path
                    ? 'bg-surface border border-border text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <span className="hidden lg:block">{item.id} // {item.label}</span>
                <span className="lg:hidden">{item.id}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="size-8 rounded-sm bg-surface overflow-hidden shrink-0 border border-border grayscale flex items-center justify-center">
               <span className="text-[10px] font-mono text-gray-500">AE</span>
            </div>
            <div className="flex-col hidden lg:flex">
              <p className="text-white text-xs font-mono font-bold leading-none uppercase">ALEX</p>
              <p className="text-gray-500 text-[10px] font-mono mt-1 uppercase">ENGINEER</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};

export default Layout;
