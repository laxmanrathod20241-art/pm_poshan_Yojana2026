import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import TeacherMenuMaster from './pages/TeacherMenuMaster'
import StockRegister from './pages/StockRegister'
import WeeklyMenuSchedule from './pages/WeeklyMenuSchedule'
import ConsumptionLog from './pages/ConsumptionLog'
import StudentEnrollment from './pages/StudentEnrollment'
import TeacherProfile from './pages/TeacherProfile'
import StaffManagement from './pages/StaffManagement'
import StockDemandReport from './pages/StockDemandReport'
import MonthlyReport from './pages/MonthlyReport'
import DailyLedgerReport from './pages/DailyLedgerReport'
import ItemLedgerReport from './pages/ItemLedgerReport'
import CreditLedgerReport from './pages/CreditLedgerReport'
import { supabase } from './lib/supabaseClient'

function AppRoutes() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching role:', error.message);
        return;
      }
      
      if (data) {
        setUserRole((data as any).role);
      }
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          setIsLoading(true);
          fetchUserRole(session.user.id).finally(() => setIsLoading(false));
        } else {
          setUserRole(null);
          setIsLoading(false);
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-6 bg-white/70 backdrop-blur-md p-10 rounded-3xl shadow-xl border border-white/20">
          <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-bold text-slate-800 tracking-tight">Authenticating Securely...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (session && userRole === 'master') {
    return <AdminDashboard />
  }

  if (session && userRole === 'teacher') {
    return (
      <Routes>
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/menu" element={<TeacherMenuMaster />} />
        <Route path="/stock" element={<StockRegister />} />
        <Route path="/schedule" element={<WeeklyMenuSchedule />} />
        <Route path="/daily-log" element={<ConsumptionLog />} />
        <Route path="/enrollment" element={<StudentEnrollment />} />
        <Route path="/profile" element={<TeacherProfile />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/demand" element={<StockDemandReport />} />
        <Route path="/monthly" element={<MonthlyReport />} />
        <Route path="/daily-ledger" element={<DailyLedgerReport />} />
        <Route path="/item-ledger" element={<ItemLedgerReport />} />
        <Route path="/credit-ledger" element={<CreditLedgerReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-10 max-w-lg text-center bg-white shadow-2xl rounded-3xl border border-red-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-slate-600">Your account is active, but no role exists in the profiles database. Please contact the system administrator.</p>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="mt-6 bg-red-50 text-red-600 font-bold py-2.5 px-6 rounded-full hover:bg-red-100 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
    </>
  )
}

export default App
