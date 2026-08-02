import { Outlet } from 'react-router-dom';
import TopAppBar from './TopAppBar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopAppBar />
      <main className="px-5 py-[24px] pb-28 w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
