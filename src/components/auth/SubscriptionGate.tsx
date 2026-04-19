import React from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { Lock, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { user, role } = useAuth();
  const location = useLocation();
  
  const isPaid = user?.saas_payment_status === 'paid';
  const isMaster = role === 'master';

  // 🚪 FREE ROUTES: These pages are NEVER locked
  const freeRoutes = ['/', '/profile', '/payment-history', '/enrollment'];
  const isFreeRoute = freeRoutes.includes(location.pathname);

  // 🛡️ BYPASS LOGIC: Master users or Paid teachers or Free routes
  if (isMaster || isPaid || isFreeRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col">
      {/* 🛡️ BACKGROUND CONTENT: Blurred and Inactive */}
      <div className="flex-1 pointer-events-none select-none filter blur-md opacity-30">
        {children}
      </div>
      
      {/* 🧊 TARGETED LOCK OVERLAY: Absolute to main content area only */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-white/20 backdrop-blur-sm">
        
        {/* 🔒 THE LOCK CARD: Professional Pro Upgrade UI */}
        <div className="max-w-xl w-full bg-white/95 rounded-[3rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.2)] border border-white/50 relative overflow-hidden animate-in fade-in zoom-in-95 duration-700 scale-[0.85] sm:scale-90 md:scale-100">
          
          {/* Aesthetic Background Pattern */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Lock size={180} />
          </div>
          
          <div className="p-10 md:p-14 text-center relative z-10">
            <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-500/30 rotate-[5deg] hover:rotate-0 transition-transform duration-500">
              <Lock className="text-white" size={40} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-[0.85] mb-6">
              Feature <span className="text-blue-600">Locked</span>
            </h2>
            
            <p className="text-slate-600 font-bold leading-relaxed mb-10 max-w-sm mx-auto text-sm md:text-lg">
              Unlock the full <span className="text-blue-600 italic">Pro Tracker</span> experience. Automated reports & digital logs require an active subscription.
            </p>
            
            <Link 
              to="/enrollment" 
              className="group relative inline-flex items-center justify-center gap-4 bg-slate-900 text-white w-full py-6 rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] hover:bg-blue-600 transition-all duration-500 shadow-2xl hover:shadow-blue-500/40"
            >
              Upgrade Account Now
              <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                <Lock size={16} />
              </div>
            </Link>
            
            <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic flex items-center justify-center gap-2 opacity-50">
              <ShieldCheck size={12} /> PMPY Cloud Security Standards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
