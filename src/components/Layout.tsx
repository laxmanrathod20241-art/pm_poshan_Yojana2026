import { useState } from 'react';
import { Menu, X, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import SubscriptionGate from './auth/SubscriptionGate';

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  sidebarLinks?: React.ReactNode;
}

export default function Layout({ children, hideFooter, sidebarLinks }: LayoutProps) {
  const { session, signOut } = useAuth();
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
    '/payments': 'Financial Fund Entries (जमा नोंद)',
    '/payment-ledger-report': 'Payment & Expense Ledger (मानधन आणि खर्च नोंदवही)',
    '/payment-history': 'Payment & Subscription History',
    '/daily-log': 'Daily Consumption Log'
  };
  const currentPageTitle = pageTitles[location.pathname] || 'PM-POSHAN Tracker';

  const [isReportsOpen, setIsReportsOpen] = useState(() => {
    return localStorage.getItem('pmpy_sidebar_reports') === 'true';
  });
  const [isMandhanOpen, setIsMandhanOpen] = useState(() => {
    return localStorage.getItem('pmpy_sidebar_mandhan') === 'true';
  });
  const [isMDMOpen, setIsMDMOpen] = useState(() => {
    return localStorage.getItem('pmpy_sidebar_mdm') === 'true';
  });

  const toggleReports = () => {
    const newState = !isReportsOpen;
    setIsReportsOpen(newState);
    localStorage.setItem('pmpy_sidebar_reports', String(newState));
    if (newState) {
      setIsMandhanOpen(false);
      setIsMDMOpen(false);
      localStorage.setItem('pmpy_sidebar_mandhan', 'false');
      localStorage.setItem('pmpy_sidebar_mdm', 'false');
    }
  };

  const toggleMandhan = () => {
    const newState = !isMandhanOpen;
    setIsMandhanOpen(newState);
    localStorage.setItem('pmpy_sidebar_mandhan', String(newState));
    if (newState) {
      setIsReportsOpen(false);
      setIsMDMOpen(false);
      localStorage.setItem('pmpy_sidebar_reports', 'false');
      localStorage.setItem('pmpy_sidebar_mdm', 'false');
    }
  };

  const toggleMDM = () => {
    const newState = !isMDMOpen;
    setIsMDMOpen(newState);
    localStorage.setItem('pmpy_sidebar_mdm', String(newState));
    if (newState) {
      setIsReportsOpen(false);
      setIsMandhanOpen(false);
      localStorage.setItem('pmpy_sidebar_reports', 'false');
      localStorage.setItem('pmpy_sidebar_mandhan', 'false');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const standardMenuItems = [
    { path: '/', name: 'Dashboard Home' },
    { path: '/profile', name: 'शिक्षक प्रोफाइल' },
    { path: '/enrollment', name: 'Enrollment Registry' },
    { path: '/payment-history', name: 'Payment History' },
  ];

  return (
    <div className="flex flex-col h-screen print:h-auto w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 overflow-hidden print:overflow-visible font-['Inter']">
      
      {/* Glassmorphism Global Header */}
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
            className="fixed inset-0 bg-slate-900/40 z-[55] md:hidden backdrop-blur-md transition-opacity duration-300 print:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-white/95 md:bg-white/50 backdrop-blur-xl border-r border-white/50 flex-shrink-0 flex flex-col z-[60] md:z-40 shadow-2xl md:shadow-lg transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} print:hidden`}>
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-5 font-extrabold text-[12px] tracking-widest uppercase text-center shadow-lg">
            Navigation System
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-1.5">
              {sidebarLinks ? sidebarLinks : (
                <>
                  {standardMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <div key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[12px] shadow-sm transition-all border ${
                            isActive 
                              ? 'bg-blue-600 text-white border-blue-400 font-extrabold scale-[1.01]' 
                              : 'text-slate-700 bg-white/60 hover:bg-white hover:text-blue-600 border-transparent font-bold'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </div>
                    );
                  })}

                  {/* 🥘 MDM SECTION */}
                  <div className="pt-4">
                    <button 
                      onClick={toggleMDM}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all mb-2 ${
                        isMDMOpen ? 'bg-orange-900 text-white' : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${isMDMOpen ? 'bg-orange-400 animate-pulse' : 'bg-slate-600'}`} />
                         <span>MDM Section</span>
                      </div>
                      {isMDMOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    
                    {isMDMOpen && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                        <Link
                          to="/menu"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/menu'
                              ? 'bg-orange-600 text-white border-orange-400 font-extrabold'
                              : 'text-orange-700 bg-orange-50/50 border-orange-100 hover:bg-orange-100 font-bold'
                          }`}
                        >
                          Menu Settings
                        </Link>
                        <Link
                          to="/schedule"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/schedule'
                              ? 'bg-amber-600 text-white border-amber-400 font-extrabold'
                              : 'text-amber-700 bg-amber-50/50 border-amber-100 hover:bg-amber-100 font-bold'
                          }`}
                        >
                          Weekly Schedule
                        </Link>
                        <Link
                          to="/stock"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/stock'
                              ? 'bg-yellow-600 text-white border-yellow-400 font-extrabold'
                              : 'text-yellow-700 bg-yellow-50/50 border-yellow-100 hover:bg-yellow-100 font-bold'
                          }`}
                        >
                          Stock Register
                        </Link>
                        <Link
                          to="/staff"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/staff'
                              ? 'bg-blue-600 text-white border-blue-400 font-extrabold'
                              : 'text-blue-700 bg-blue-50/50 border-blue-100 hover:bg-blue-100 font-bold'
                          }`}
                        >
                          Staff & Logistics
                        </Link>
                        <Link
                          to="/demand"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/demand'
                              ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold'
                              : 'text-emerald-700 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 font-bold'
                          }`}
                        >
                          Demand Report
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* 📊 REPORT SECTION */}
                  <div className="pt-4">
                    <button 
                      onClick={toggleReports}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all mb-2 ${
                        isReportsOpen ? 'bg-indigo-900 text-white' : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${isReportsOpen ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                         <span>Report Section</span>
                      </div>
                      {isReportsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    
                    {isReportsOpen && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                        <Link
                          to="/monthly"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/monthly'
                              ? 'bg-indigo-600 text-white border-indigo-400 font-extrabold'
                              : 'text-indigo-700 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100 font-bold'
                          }`}
                        >
                          Monthly Report ZP
                        </Link>
                        <Link
                          to="/daily-ledger"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/daily-ledger'
                              ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold'
                              : 'text-emerald-700 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 font-bold'
                          }`}
                        >
                          Daily Ledger (खतावणी)
                        </Link>
                        <Link
                          to="/item-ledger"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/item-ledger'
                              ? 'bg-teal-600 text-white border-teal-400 font-extrabold'
                              : 'text-teal-700 bg-teal-50/50 border-teal-100 hover:bg-teal-100 font-bold'
                          }`}
                        >
                          Item Ledger (वस्तुनिहाय साठा)
                        </Link>
                        <Link
                          to="/credit-ledger"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/credit-ledger'
                              ? 'bg-amber-600 text-white border-amber-400 font-extrabold'
                              : 'text-amber-700 bg-amber-50/50 border-amber-100 hover:bg-amber-100 font-bold'
                          }`}
                        >
                          Credit Ledger (उसणे धान्य)
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* 💰 MANDHAN SECTION */}
                  <div className="pt-4">
                    <button 
                      onClick={toggleMandhan}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all mb-2 ${
                        isMandhanOpen ? 'bg-blue-900 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${isMandhanOpen ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                         <span>Mandhan Section</span>
                      </div>
                      {isMandhanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isMandhanOpen && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                        <Link
                          to="/payments"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/payments'
                              ? 'bg-blue-700 text-white border-blue-500 font-extrabold'
                              : 'text-blue-800 bg-blue-50/50 border-blue-100 hover:bg-blue-100 font-bold'
                          }`}
                        >
                          जमा नोंद (Jama Nond)
                        </Link>
                        <Link
                          to="/payment-ledger-report"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/payment-ledger-report'
                              ? 'bg-rose-700 text-white border-rose-500 font-extrabold'
                              : 'text-rose-800 bg-rose-50/50 border-rose-100 hover:bg-rose-100 font-bold'
                          }`}
                        >
                          मानधन नोंदवही (Mandhan Nond)
                        </Link>
                        <Link
                          to="/mandhan"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`block py-2.5 px-4 rounded-xl text-[11px] shadow-sm transition-all border ${
                            location.pathname === '/mandhan'
                              ? 'bg-indigo-700 text-white border-indigo-500 font-extrabold'
                              : 'text-indigo-800 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100 font-bold'
                          }`}
                        >
                          मानधन व्यवस्थापन (Mandhan Manager)
                        </Link>
                      </div>
                    )}
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
            <SubscriptionGate>
              {children}
            </SubscriptionGate>
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
