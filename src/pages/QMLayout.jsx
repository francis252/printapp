import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/qm/Sidebar';

export default function QMLayout() {
  return (
    <div className="flex h-screen bg-[#fdfcf9] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}