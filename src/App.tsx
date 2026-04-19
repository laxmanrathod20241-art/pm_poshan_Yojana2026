import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import React, { Suspense } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Register from './pages/Register'

const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const AdminSaaSDashboard = React.lazy(() => import('./pages/AdminSaaSDashboard'))
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'))
const TeacherMenuMaster = React.lazy(() => import('./pages/TeacherMenuMaster'))
const StockRegister = React.lazy(() => import('./pages/StockRegister'))
const WeeklyMenuSchedule = React.lazy(() => import('./pages/WeeklyMenuSchedule'))
const ConsumptionLog = React.lazy(() => import('./pages/ConsumptionLog'))
const StudentEnrollment = React.lazy(() => import('./pages/StudentEnrollment'))
const TeacherProfile = React.lazy(() => import('./pages/TeacherProfile'))
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'))
const StockDemandReport = React.lazy(() => import('./pages/StockDemandReport'))
const MonthlyReport = React.lazy(() => import('./pages/MonthlyReport'))
const DailyLedgerReport = React.lazy(() => import('./pages/DailyLedgerReport'))
const ItemLedgerReport = React.lazy(() => import('./pages/ItemLedgerReport'))
const CreditLedgerReport = React.lazy(() => import('./pages/CreditLedgerReport'))
const PaymentEntry = React.lazy(() => import('./pages/PaymentEntry'))
const PaymentLedgerReport = React.lazy(() => import('./pages/PaymentLedgerReport'))
const PaymentHistory = React.lazy(() => import('./pages/PaymentHistory'))
const MandhanManager = React.lazy(() => import('./pages/MandhanManager'))
const SaaSSubscription = React.lazy(() => import('./pages/SaaSSubscription'))
import { useAuth } from './contexts/AuthProvider'
import { Toaster } from 'react-hot-toast'

function AppRoutes() {
  const { session, loading: authLoading, role, signOut } = useAuth();
  const [forceLoadingFinished, setForceLoadingFinished] = React.useState(false);

  // 🛠️ FAIL-SAFE: If auth check hangs for more than 5s, bypass it
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn("AppRoutes: Auth initialization timed out. Bypassing...");
        setForceLoadingFinished(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  // 🔍 DIAGNOSTICS: Log state transition
  React.useEffect(() => {
    console.log("AppRoutes: [Diagnostics]", { authLoading, forceLoadingFinished, sessionActive: !!session });
  }, [authLoading, forceLoadingFinished, session]);

  const loading = authLoading && !forceLoadingFinished;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50">
        <div className="flex flex-col items-center gap-6 bg-white/70 backdrop-blur-md p-10 rounded-3xl shadow-xl border border-white/20">
          <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-bold text-slate-800 tracking-tight">🔒 Initializing Local Portal...</span>
          <button 
            onClick={() => setForceLoadingFinished(true)}
            className="text-xs font-bold text-blue-600 hover:underline mt-2"
          >
            Taking too long? Click here to bypass
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (session && role === 'master') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-[#474379]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      }>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/saas" element={<AdminSaaSDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    )
  }

  if (session && role === 'teacher') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      }>
        <Routes>
          <Route path="/" element={<TeacherDashboard />} />
          <Route path="/profile" element={<TeacherProfile />} />
          <Route path="/enrollment" element={<StudentEnrollment />} />
          
          {/* Premium Features (Locked) */}
          <Route path="/menu" element={<TeacherMenuMaster />} />
          <Route path="/stock" element={<StockRegister />} />
          <Route path="/schedule" element={<WeeklyMenuSchedule />} />
          <Route path="/daily-log" element={<ConsumptionLog />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/demand" element={<StockDemandReport />} />
          <Route path="/monthly" element={<MonthlyReport />} />
          <Route path="/daily-ledger" element={<DailyLedgerReport />} />
          <Route path="/item-ledger" element={<ItemLedgerReport />} />
          <Route path="/credit-ledger" element={<CreditLedgerReport />} />
          <Route path="/payments" element={<PaymentEntry />} />
          <Route path="/payment-ledger-report" element={<PaymentLedgerReport />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/mandhan" element={<MandhanManager />} />
          <Route path="/subscription" element={<SaaSSubscription />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-10 max-w-lg text-center bg-white shadow-2xl rounded-3xl border border-red-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-slate-600">Your account is active, but no role exists in the profiles database. Please contact the system administrator.</p>
        <button 
          onClick={() => signOut()} 
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
      <Toaster position="top-right" />
      <Analytics />
    </>
  )
}

export default App
