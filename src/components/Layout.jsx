import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, Users, FileText, 
  Settings, LogOut, ChevronRight, Bell
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Jobs', icon: Briefcase, path: '/jobs' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Quotes', icon: FileText, path: '/quotes' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: 'hsl(var(--sidebar-background))' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">hoops</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Print & Promo CRM</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group ${
                  active 
                    ? 'bg-primary text-white' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                }`}
                style={!active ? { color: 'hsl(var(--sidebar-foreground))' } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-4 border-t space-y-1" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
            style={{ color: 'hsl(var(--sidebar-foreground))' }}
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}