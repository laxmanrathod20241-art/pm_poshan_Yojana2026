import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LogOut, Menu, X } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  sidebarLinks?: React.ReactNode;
}

export default function Layout({ children, hideFooter, sidebarLinks }: LayoutProps) {
  const [session, setSession] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitles: Record<string, string> = {
    '/': 'Control Dashboard',
    '/profile': 'Teacher Profile Settings',
    '/enrollment': 'Enrollment Registry',
    '/menu': 'Menu Settings',
    '/schedule': 'Weekly Schedule',
    '/stock': 'Stock & Inventory Register',
    '/staff': 'Staff & Logistics',
    '/demand': 'Demand Report',
    '/monthly': 'Monthly ZP Report',
    '/daily-ledger': 'Daily Ledger (खतावणी)',
    '/item-ledger': 'Item Ledger (वस्तुनिहाय साठा)',
    '/credit-ledger': 'Credit Ledger (उसणे धान्य)',
    '/daily-log': 'Daily Consumption Log'
  };
  const currentPageTitle = pageTitles[location.pathname] || 'PM-POSHAN Tracker';


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const standardMenuItems = [
    { path: '/', name: 'Dashboard Home' },
    { path: '/profile', name: 'शिक्षक प्रोफाइल' },
    { path: '/enrollment', name: 'Enrollment Registry' },
    { path: '/menu', name: 'Menu Settings' },
    { path: '/schedule', name: 'Weekly Schedule' },
    { path: '/stock', name: 'Stock Register' },
    { path: '/staff', name: 'Staff & Logistics' },
    { path: '/demand', name: 'Demand Report' },
  ];

  return (
    <div className="flex flex-col h-screen print:h-auto w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 overflow-hidden print:overflow-visible font-['Inter']">
      
      {/* Glassmorphism Global Header */}
      {/* Glassmorphism Global Header - Sticky on Mobile */}
      <header className="sticky top-0 bg-white/70 backdrop-blur-lg border-b border-white/40 p-3 md:p-4 flex justify-between items-center w-full z-[60] shadow-sm min-h-[60px] md:min-h-[80px] print:hidden">
        <div className="flex items-center pl-1 md:pl-4">
          <button 
            className="md:hidden mr-3 p-2 text-slate-700 bg-white/80 rounded-xl hover:bg-white active:bg-blue-50 transition-all border border-slate-200 shadow-sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-lg md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tighter uppercase font-['Outfit'] truncate">
            PM-POSHAN Tracker
          </div>
        </div>

        <div className="flex items-center pr-1 md:pr-4">
          {session ? (
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden lg:inline-block font-extrabold text-slate-700 text-[10px] bg-white/90 px-4 py-2 rounded-full shadow-sm border border-white">
                {session.user?.email ? session.user.email.split('@')[0] : 'User'}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 md:px-5 py-2 font-bold rounded-full flex items-center gap-2 text-[10px] md:text-sm shadow-md shadow-red-500/20 transition-all active:scale-95"
              >
                <LogOut size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Body Split */}
      <div className="flex flex-1 print:flex-none overflow-hidden print:overflow-visible relative print:h-auto">
        
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 z-50 md:hidden backdrop-blur-md transition-opacity duration-300 print:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar (Advanced Swipe-Feel Drawer) */}
        <aside className={`fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-white/95 md:bg-white/50 backdrop-blur-xl border-r border-white/50 flex-shrink-0 flex flex-col z-50 md:z-10 shadow-2xl md:shadow-lg transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-5 font-extrabold text-[12px] tracking-widest uppercase text-center shadow-lg">
            Navigation System
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-2">
              {sidebarLinks ? sidebarLinks : (
                <>
                  {standardMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <div key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block p-4 rounded-2xl text-[12px] shadow-sm transition-all border ${
                            isActive 
                              ? 'bg-blue-600 text-white border-blue-400 font-extrabold scale-[1.02]' 
                              : 'text-slate-700 bg-white/60 hover:bg-white hover:text-blue-600 border-transparent font-bold hover:scale-[1.01]'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </div>
                    );
                  })}
                  <div className="list-none">
                    <div className="h-px bg-slate-200 my-4 mx-2" />
                  </div>
                  <div>
                    <Link
                      to="/monthly"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-4 rounded-2xl text-[12px] shadow-sm transition-all border ${
                        location.pathname === '/monthly'
                          ? 'bg-indigo-600 text-white border-indigo-400 font-extrabold'
                          : 'text-indigo-700 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100 font-bold'
                      }`}
                    >
                      Monthly ZP Report
                    </Link>
                  </div>
                  <div>
                    <Link
                      to="/daily-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-4 rounded-2xl text-[12px] shadow-sm transition-all border ${
                        location.pathname === '/daily-ledger'
                          ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold'
                          : 'text-emerald-700 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 font-bold'
                      }`}
                    >
                      Daily Ledger (खतावणी)
                    </Link>
                  </div>
                  <div>
                    <Link
                      to="/item-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-4 rounded-2xl text-[12px] shadow-sm transition-all border ${
                        location.pathname === '/item-ledger'
                          ? 'bg-teal-600 text-white border-teal-400 font-extrabold'
                          : 'text-teal-700 bg-teal-50/50 border-teal-100 hover:bg-teal-100 font-bold'
                      }`}
                    >
                      Item Ledger (वस्तुनिहाय साठा)
                    </Link>
                  </div>
                  <div>
                    <Link
                      to="/credit-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-4 rounded-2xl text-[12px] shadow-sm transition-all border ${
                        location.pathname === '/credit-ledger'
                          ? 'bg-amber-600 text-white border-amber-400 font-extrabold'
                          : 'text-amber-700 bg-amber-50/50 border-amber-100 hover:bg-amber-100 font-bold'
                      }`}
                    >
                      Credit Ledger (उसणे धान्य)
                    </Link>
                  </div>
                  {/* Hiding the Consumption Log button per user request - Set to 'true' to restore */}
                  {false && (
                    <div className="mt-auto px-4 pb-6">
                      <button 
                        onClick={() => navigate('/daily-log')}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                      >
                        CONSUMPTION LOG
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col relative z-0 w-full h-full print:h-auto print:p-0 print:m-0 print:w-full print:max-w-none print:bg-white overflow-hidden print:overflow-visible">
          
          {/* Page Header Ribbon - Compressed on Mobile */}
          <div className="flex-shrink-0 print:hidden relative z-10 w-full">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-800 py-4 px-4 md:px-8 w-full shadow-lg border-b border-white/10">
              <h1 className="text-white text-sm md:text-base font-black uppercase tracking-[0.2em] font-['Outfit']">
                {currentPageTitle}
              </h1>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible p-3 md:px-8 md:py-6 relative flex flex-col print:h-auto">
            {children}
            {!hideFooter && (
              <footer className="mt-auto py-3 text-center text-[10px] text-slate-500 border-t border-slate-100 print:hidden">
                © {new Date().getFullYear()} PM-POSHAN Tracker - Independent Standalone Project.
              </footer>
            )}
          </div>
        </main>

      </div>


      
    </div>
  );
}
