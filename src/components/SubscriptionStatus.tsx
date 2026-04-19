import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { ShieldCheck, Clock, AlertTriangle, CreditCard, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubscriptionStatus: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const status = user.saas_payment_status || 'unpaid';
  const plan = user.saas_plan_type || 'Free';
  const expiryDate = user.saas_expiry_date ? new Date(user.saas_expiry_date) : null;
  
  const isPaid = status === 'paid';
  const daysToExpiry = expiryDate 
    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = isPaid && daysToExpiry !== null && daysToExpiry > 0 && daysToExpiry <= 7;
  const isExpired = isPaid && daysToExpiry !== null && daysToExpiry <= 0;

  let badgeColor = "bg-slate-100 text-slate-500";
  let badgeText = "Inactive";
  let Icon = CreditCard;

  if (isPaid) {
    if (isExpired) {
      badgeColor = "bg-red-50 text-red-600 border-red-100";
      badgeText = "Expired";
      Icon = AlertTriangle;
    } else if (isExpiringSoon) {
      badgeColor = "bg-amber-50 text-amber-600 border-amber-100";
      badgeText = "Expiring Soon";
      Icon = Clock;
    } else {
      badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
      badgeText = "Active";
      Icon = ShieldCheck;
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center justify-between group hover:shadow-xl transition-all duration-500">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${isPaid ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Subscription Status
          </p>
        </div>
      </div>

      <div className="text-right">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {badgeText}
        </div>
        {expiryDate && (
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-2">
            Valid till: {expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
        <Link 
          to="/subscription" 
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200"
        >
          {isPaid ? 'Renew / Manage' : 'Pay Subscription'} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
