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
    <div className="flex flex-col h-screen w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 overflow-hidden font-['Inter']">
      
      {/* Glassmorphism Global Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-white/40 p-3 md:p-4 flex justify-between items-center w-full z-20 shadow-sm min-h-[70px] md:min-h-[80px] print:hidden">
        <div className="flex items-center pl-2 md:pl-4">
          <button 
            className="md:hidden mr-3 p-1.5 text-slate-700 bg-white/80 rounded-lg hover:bg-white active:bg-blue-50 transition-all border border-slate-200 shadow-sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tighter uppercase font-['Outfit'] truncate">
            PM-POSHAN Tracker
          </div>
        </div>

        <div className="flex items-center pr-2 md:pr-4">
          {session ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4">
              <span className="hidden sm:inline-block font-extrabold text-slate-700 text-xs bg-white/90 px-4 py-2 rounded-full shadow-sm border border-white">
                Welcome, {session.user?.email ? session.user.email.split('@')[0] : 'User'}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 md:px-5 py-2 font-bold rounded-full flex items-center gap-2 text-xs md:text-sm shadow-md shadow-red-500/20 transition-all hover:-translate-y-0.5"
              >
                Logout <LogOut size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
             <div className="invisible"><button>L</button></div>
          )}
        </div>
      </header>

      {/* Main Body Split */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-sm print:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar (Fully aligned with Application glassmorphism & gradients) */}
        <aside className={`absolute md:relative top-0 left-0 h-full w-64 bg-white/95 md:bg-white/50 backdrop-blur-md border-r border-white/50 flex-shrink-0 flex flex-col z-40 md:z-10 shadow-xl md:shadow-lg transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-4 font-extrabold text-[13px] tracking-widest uppercase text-center shadow-md">
            Application Menu
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4 md:scrollbar-thin scrollbar-thumb-blue-200">
            <ul className="space-y-3">
              {sidebarLinks ? sidebarLinks : (
                <>
                  {standardMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block p-3.5 rounded-xl text-[13px] shadow-sm transition-all border ${
                            isActive 
                              ? 'bg-blue-50 text-[#3c8dbc] border-l-4 border-[#3c8dbc] border-y-transparent border-r-transparent font-black' 
                              : 'text-slate-700 bg-white md:bg-white/60 hover:bg-white hover:text-[#3c8dbc] border-transparent font-bold'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}

                  <li>
                    <Link
                      to="/monthly"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-3.5 rounded-xl text-[13px] shadow-sm transition-all border ${
                        location.pathname === '/monthly'
                          ? 'bg-indigo-100 text-indigo-900 border-l-4 border-indigo-500 border-y-transparent border-r-transparent font-black'
                          : 'text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300 font-bold'
                      }`}
                    >
                      Monthly ZP Report
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/daily-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-3.5 rounded-xl text-[13px] shadow-sm transition-all border ${
                        location.pathname === '/daily-ledger'
                          ? 'bg-emerald-100 text-emerald-900 border-l-4 border-emerald-500 border-y-transparent border-r-transparent font-black'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-300 font-bold'
                      }`}
                    >
                      Daily Ledger (खतावणी)
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/item-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-3.5 rounded-xl text-[13px] shadow-sm transition-all border ${
                        location.pathname === '/item-ledger'
                          ? 'bg-teal-100 text-teal-900 border-l-4 border-teal-500 border-y-transparent border-r-transparent font-black'
                          : 'text-teal-700 bg-teal-50 border-teal-100 hover:bg-teal-100 hover:border-teal-300 font-bold'
                      }`}
                    >
                      Item Ledger (वस्तुनिहाय साठा)
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/credit-ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-3.5 rounded-xl text-[13px] shadow-sm transition-all border ${
                        location.pathname === '/credit-ledger'
                          ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600 border-y-transparent border-r-transparent font-black'
                          : 'text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-300 font-bold'
                      }`}
                    >
                      Credit Ledger (उसणे धान्य)
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/daily-log"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block p-3.5 rounded-xl text-[13px] shadow-md border hover:scale-105 transition-all uppercase tracking-widest text-center mt-4 ${
                        location.pathname === '/daily-log'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 font-black'
                          : 'bg-gradient-to-r from-[#3c8dbc] to-[#2e7da6] text-white border-blue-400 font-black'
                      }`}
                    >
                      Daily Consumption Log
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col relative z-0 w-full h-full print:p-0 print:m-0 print:w-full print:max-w-none print:bg-white overflow-hidden">
          
          {/* Page Header Ribbon */}
          <div className="bg-blue-50/80 border-b border-blue-100 flex-shrink-0 px-8 py-5 flex items-center w-full print:hidden">
            <h1 className="text-2xl md:text-3xl font-black text-[#474379] tracking-tight uppercase italic font-['Outfit']">
              {currentPageTitle}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:px-8 md:py-6 relative">
            {children}
          </div>
        </main>

      </div>

      {/* Footer */}
      {!hideFooter && (
        <footer className="w-full bg-slate-950 text-slate-400 py-4 text-center text-xs font-medium tracking-wide z-20 border-t border-slate-900 print:hidden">
          © {new Date().getFullYear()} PM-POSHAN Tracker - Independent Standalone Project.
        </footer>
      )}
      
    </div>
  );
}
