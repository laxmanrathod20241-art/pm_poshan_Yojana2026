import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  ChevronRight,
  CreditCard,
  X,
  ShieldCheck,
  ArrowLeft,
  Activity,
  Zap,
  Ticket,
  Lock,
  Globe,
  Calendar,
  FileText
} from 'lucide-react';

interface PricingConfig {
  id: string;
  section_type: string;
  base_price: number;
  description: string;
  updated_at: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  promoter_name: string;
  usage_count: number;
  usage_limit: number | null;
  is_active: boolean;
  created_at: string;
}

interface Subscriber {
  id: string;
  first_name: string | null;
  last_name: string | null;
  school_name: string | null;
  school_id: string | null;
  email: string;
  saas_plan_type: string | null;
  saas_payment_status: string | null;
  saas_amount_paid: number | null;
  created_at: string;
}

export default function AdminSaaSDashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'pricing' | 'coupons' | 'crm' | 'logs'>('overview');
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Stats
  const [totalSchools, setTotalSchools] = useState(0);
  const [paidSubs, setPaidSubs] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // CRM Search/Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);

  useEffect(() => {
    fetchSaaSData();
  }, []);

  const fetchSaaSData = async () => {
    setLoading(true);
    try {
      const [pricingRes, couponsRes, subsRes] = await Promise.all([
        (api as any).from('saas_pricing').select('*').order('base_price', { ascending: true }),
        (api as any).from('saas_coupons').select('*').order('created_at', { ascending: false }),
        (api as any).from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false })
      ]);

      if (pricingRes.data) setPricing(pricingRes.data as PricingConfig[]);
      if (couponsRes.data) setCoupons(couponsRes.data as Coupon[]);
      if (subsRes.data) {
        const subsData = subsRes.data as Subscriber[];
        setSubscribers(subsData);
        setTotalSchools(subsData.length);
        const paid = subsData.filter(s => s.saas_payment_status === 'paid');
        setPaidSubs(paid.length);
        setTotalRevenue(paid.reduce((acc, curr) => acc + (curr.saas_amount_paid || 0), 0));
      }
    } catch (err) {
      console.error('Error fetching SaaS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.get('/api/payments/logs');
      setTransactionLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleUpdatePricing = async (id: string, newPrice: number) => {
    try {
      const { error } = await api.from('saas_pricing').update({ base_price: newPrice }).eq('id', id);
      if (error) throw error;
      
      setPricing(prev => prev.map(p => p.id === id ? { ...p, base_price: newPrice } : p));
      alert('Success: Pricing Matrix Updated.');
    } catch (err: any) {
      alert('Update Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeView === 'logs') {
      fetchTransactionLogs();
    }
  }, [activeView]);

  const handleUpdateSubscriber = async (uid: string, updates: Partial<Subscriber>) => {
    try {
      const { error } = await api.from('profiles').update(updates).eq('id', uid);
      if (error) throw error;
      
      // Update local state
      setSubscribers(prev => prev.map(s => s.id === uid ? { ...s, ...updates } : s));
      if (selectedSub?.id === uid) {
        setSelectedSub({ ...selectedSub, ...updates });
      }
      
      // Refresh stats
      const paid = subscribers.filter(s => s.saas_payment_status === 'paid');
      setPaidSubs(paid.length);
      setTotalRevenue(paid.reduce((acc, curr) => acc + (curr.saas_amount_paid || 0), 0));
      
      alert('Success: User Protocol Updated.');
    } catch (err: any) {
      alert('Update Error: ' + err.message);
    }
  };

  const sidebarLinks = (
    <div className="space-y-2 py-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Commercial Control</p>
      {[
        { id: 'overview', label: 'Commercial Pulse', icon: Activity },
        { id: 'pricing', label: 'Fee Matrix', icon: Zap },
        { id: 'coupons', label: 'Promo Assets', icon: Ticket },
        { id: 'crm', label: 'Subscriber CRM', icon: Users },
        { id: 'logs', label: 'Payment Ledger', icon: FileText },
      ].map((view) => (
        <button
          key={view.id}
          onClick={() => setActiveView(view.id as any)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all ${
            activeView === view.id 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
          }`}
        >
          <view.icon size={18} />
          {view.label}
        </button>
      ))}
      <div className="mt-8 pt-8 border-t border-slate-100 px-4">
        <a 
          href="/admin"
          className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:translate-x-1 transition-transform"
        >
          <ArrowLeft size={14} /> Back to Command Hub
        </a>
      </div>
    </div>
  );

  return (
    <Layout sidebarLinks={sidebarLinks}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
        
        {/* SaaS Top Bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">SaaS <span className="text-indigo-600 italic underline decoration-indigo-100 underline-offset-4">Billing Matrix</span></h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Commercial Revenue Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
                <TrendingUp size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">Growth +24%</span>
             </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full">
          {loading && subscribers.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
              <Loader2 size={48} className="animate-spin text-indigo-600" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Querying Ledger...</p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-500">
              
              {/* VIEW: OVERVIEW */}
              {activeView === 'overview' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { label: 'Total Registrations', value: totalSchools, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Paid Subscriptions', value: paidSubs, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Gross Remittance', value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-50 group hover:scale-[1.02] transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`${kpi.bg} ${kpi.color} p-5 rounded-3xl`}>
                            <kpi.icon size={32} />
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Efficiency</p>
                             <p className="text-sm font-black text-slate-900 tracking-tighter">98.2%</p>
                          </div>
                        </div>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{kpi.label}</h3>
                        <p className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 p-12 rounded-[56px] text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-600/30 transition-all duration-700" />
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-300 mb-4 italic underline decoration-indigo-400 underline-offset-8">Strategic Insight</p>
                          <h2 className="text-4xl font-black italic tracking-tighter leading-tight mb-6 uppercase">Revenue Vector <br/> Optimization <span className="text-indigo-400 font-black">Q2-2026</span></h2>
                          <p className="text-slate-400 font-bold leading-relaxed mb-10 text-lg">
                             Our conversion metrics indicate a strong preference for the **Upper Primary Expansion** tier. Platform churn is at an all-time low (less than 2%). Focus for this sprint: Finalizing automated coupon redemption for cluster-level onboarding.
                          </p>
                          <button onClick={() => setActiveView('crm')} className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-3">
                             Execute CRM Analysis <ChevronRight size={18} />
                          </button>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                          {[
                            { label: 'Avg Ticket', value: '₹1,250', desc: 'Per School' },
                            { label: 'Churn Rate', value: '1.4%', desc: 'Platform Global' },
                            { label: 'Conversion', value: '42%', desc: 'Trial to Paid' },
                            { label: 'LTV', value: '₹8,400', desc: 'Projected' },
                          ].map((s, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                               <p className="text-2xl font-black italic tracking-tighter mb-1">{s.value}</p>
                               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{s.label}</p>
                               <p className="text-[9px] font-bold text-slate-500 uppercase mt-2">{s.desc}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: PRICING */}
              {activeView === 'pricing' && (
                <div className="space-y-10">
                   <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-600 p-4 rounded-3xl text-white">
                        <Zap size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">Global Fee Matrix</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Section-based Dynamic Pricing</p>
                      </div>
                    </div>
                    <div className="bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Lock size={12}/> Authorized Access Only</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {pricing.map(plan => (
                      <div key={plan.id} className="bg-white p-12 rounded-[56px] shadow-2xl border border-slate-50 relative overflow-hidden group hover:border-indigo-200 transition-all duration-500 h-full flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-100 transition-all" />
                        
                        <div className="mb-10 relative z-10">
                          <span className="text-[10px] font-black px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl uppercase tracking-[0.2em]">{plan.section_type}</span>
                        </div>

                        <div className="flex-1 relative z-10 space-y-4 mb-12">
                          <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">{plan.description}</h3>
                          <div className="flex items-center gap-2 py-4">
                            <span className="text-4xl font-black text-indigo-600 italic tracking-tighter">₹</span>
                            <input 
                              type="number" 
                              value={plan.base_price}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setPricing(prev => prev.map(p => p.id === plan.id ? { ...p, base_price: val } : p));
                              }}
                              aria-label={`Base price for ${plan.description}`}
                              className="text-5xl font-black text-slate-900 italic tracking-tighter w-full bg-transparent border-b-4 border-slate-100 focus:border-indigo-600 focus:outline-none transition-all py-2"
                            />
                          </div>
                          <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tight">Global base rate for this school section. Valid across all regional clusters.</p>
                        </div>

                        <div className="pt-8 border-t border-slate-50 relative z-10 flex flex-col gap-6">
                           <div className="flex items-center gap-2 text-slate-400">
                              <Clock size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Last Update: {new Date(plan.updated_at).toLocaleDateString()}</span>
                           </div>
                           <button 
                             onClick={() => handleUpdatePricing(plan.id, plan.base_price)}
                             className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                           >
                              Update Protocol
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW: COUPONS */}
              {activeView === 'coupons' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                   <div className="lg:col-span-1 space-y-8">
                      <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600" />
                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-10 flex items-center gap-3">
                          <Plus className="text-indigo-600" size={32} /> Asset Generation
                        </h3>
                        <form className="space-y-8">
                          <div className="space-y-2">
                             <label htmlFor="promo-code" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Universal Promo Code</label>
                             <input id="promo-code" type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl text-sm font-black focus:outline-none focus:border-indigo-500 transition-all uppercase" placeholder="e.g. MASTER2026" />
                          </div>
                          <div className="space-y-2">
                             <label htmlFor="discount-percent" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Remittance Deduction %</label>
                             <input id="discount-percent" type="number" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl text-sm font-black focus:outline-none focus:border-indigo-500 transition-all" placeholder="15" />
                          </div>
                          <div className="space-y-2">
                             <label htmlFor="promoter-name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Protocol Promoter</label>
                             <input id="promoter-name" type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl text-sm font-black focus:outline-none focus:border-indigo-500 transition-all" placeholder="Rahul Patil (Admin)" />
                          </div>
                          <button className="w-full bg-indigo-600 text-white py-6 rounded-[32px] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
                             Authorize Asset
                          </button>
                        </form>
                      </div>
                   </div>

                   <div className="lg:col-span-2">
                      <div className="bg-white rounded-[48px] shadow-2xl border border-slate-50 overflow-hidden">
                         <div className="p-8 border-b border-slate-50 bg-slate-900 text-white flex justify-between items-center">
                            <span className="font-black uppercase tracking-widest text-sm italic">Active Protocol Coupons</span>
                            <span className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-full border border-white/10">{coupons.length} Global Nodes</span>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full">
                               <thead>
                                  <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-left">Node Identifier</th>
                                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-left">Promoter Entity</th>
                                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-left">Delta %</th>
                                     <th className="p-6 text-[10px] font-black uppercase tracking-widest text-left">Activation</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {coupons.map(c => (
                                    <tr key={c.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-all group">
                                       <td className="p-6 font-black text-xl italic text-indigo-600 tracking-tighter uppercase group-hover:scale-110 origin-left transition-transform">{c.code}</td>
                                       <td className="p-6 text-sm font-black text-slate-700 uppercase">{c.promoter_name}</td>
                                       <td className="p-6">
                                          <span className="text-lg font-black text-slate-900">{c.discount_percent}%</span>
                                       </td>
                                       <td className="p-6">
                                          <div className="flex items-center gap-4">
                                             <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${c.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                {c.is_active ? 'Online' : 'Halted'}
                                             </span>
                                          </div>
                                       </td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* VIEW: CRM */}
              {activeView === 'crm' && (
                <div className="space-y-8">
                  {/* CRM Control Hub */}
                  <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[48px] shadow-2xl border border-white flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                       <div className="bg-indigo-600 p-5 rounded-[28px] text-white">
                          <Users size={28} />
                       </div>
                       <div className="flex-1 lg:flex-none">
                          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-4">Subscriber CRM</h2>
                          <div className="relative group">
                             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                             <input 
                                type="text" 
                                placeholder="Search the Ecosystem..."
                                aria-label="Search subscribers"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-50 border-2 border-slate-100 py-4 pl-14 pr-8 rounded-3xl w-full lg:w-96 text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-600 transition-all"
                             />
                          </div>
                       </div>
                    </div>
                    <div className="flex bg-slate-100 p-2 rounded-[32px] border border-slate-200">
                       {(['all', 'paid', 'unpaid'] as const).map(f => (
                         <button
                           key={f} onClick={() => setStatusFilter(f)}
                           className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                           {f} Protocols
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* CRM Matrix */}
                  <div className="bg-white rounded-[56px] shadow-2xl border border-slate-50 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                           <thead>
                              <tr className="bg-slate-950 text-white">
                                 <th className="p-8 text-[11px] font-black uppercase tracking-widest text-left">Identity Protocol</th>
                                 <th className="p-8 text-[11px] font-black uppercase tracking-widest text-left">Deployment Station</th>
                                 <th className="p-8 text-[11px] font-black uppercase tracking-widest text-left">Service Tier</th>
                                 <th className="p-8 text-[11px] font-black uppercase tracking-widest text-left">Remittance Status</th>
                                 <th className="p-8 text-[11px] font-black uppercase tracking-widest text-right pr-12">Authorized Total</th>
                              </tr>
                           </thead>
                           <tbody>
                              {subscribers
                                .filter(s => {
                                  const matchSearch = searchTerm === '' || 
                                                    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (s.school_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                                  const matchFilter = statusFilter === 'all' || s.saas_payment_status === statusFilter;
                                  return matchSearch && matchFilter;
                                })
                                .map(sub => (
                                  <tr 
                                    key={sub.id} 
                                    onClick={() => setSelectedSub(sub)}
                                    className="border-b border-slate-50 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                  >
                                     <td className="p-8">
                                        <div className="flex items-center gap-5">
                                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl italic uppercase tracking-tighter transition-all ${sub.saas_payment_status === 'paid' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400'}`}>
                                              {(sub.first_name || 'U')[0]}
                                           </div>
                                           <div>
                                              <p className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                                 {sub.first_name} {sub.last_name}
                                              </p>
                                              <p className="text-[11px] font-bold text-slate-400 tracking-tight lowercase">{sub.email}</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="p-8">
                                        <p className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">{sub.school_name || 'Standby Status'}</p>
                                        <p className="text-[10px] font-mono text-slate-300 uppercase mt-1">ID: {sub.school_id || '—'}</p>
                                     </td>
                                     <td className="p-8">
                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${sub.saas_payment_status === 'paid' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                           {sub.saas_plan_type || 'Trial Node'}
                                        </span>
                                     </td>
                                     <td className="p-8">
                                        <div className="flex items-center gap-3">
                                           <div className={`w-2 h-2 rounded-full animate-pulse ${sub.saas_payment_status === 'paid' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                           <span className={`text-[10px] font-black uppercase tracking-widest ${sub.saas_payment_status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>
                                              {sub.saas_payment_status || 'Pending'}
                                           </span>
                                        </div>
                                     </td>
                                     <td className="p-8 text-right pr-12">
                                        <span className="text-2xl font-black text-slate-900 tracking-tighter italic">₹{sub.saas_amount_paid?.toLocaleString() || 0}</span>
                                     </td>
                                  </tr>
                                ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
                </div>
              )}

              {/* VIEW: TRANSACTION LOGS */}
              {activeView === 'logs' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Transaction <span className="text-indigo-600">Ledger</span></h2>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Remittance Monitoring</p>
                    </div>
                    <button 
                      onClick={fetchTransactionLogs}
                      title="Refresh transaction logs"
                      aria-label="Refresh transaction logs"
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-slate-500 hover:text-indigo-600 transition-all hover:shadow-md"
                    >
                      <Activity size={20} className={logsLoading ? 'animate-pulse' : ''} />
                    </button>
                  </div>

                  {logsLoading && transactionLogs.length === 0 ? (
                    <div className="bg-white rounded-[48px] p-20 flex flex-col items-center justify-center gap-6 border border-slate-50 shadow-2xl">
                       <Loader2 size={48} className="animate-spin text-indigo-600" />
                       <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Querying Node Ledger...</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[48px] shadow-2xl border border-slate-50 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
                              <th className="px-10 py-8 italic underline decoration-white/10 underline-offset-8">Timestamp</th>
                              <th className="px-10 py-8">School / Teacher</th>
                              <th className="px-10 py-8">Order ID</th>
                              <th className="px-10 py-8">Amount</th>
                              <th className="px-10 py-8">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {transactionLogs.map((log) => (
                              <tr key={log.id} className="group hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-8">
                                  <div className="text-xs font-black text-slate-900 tracking-tight">
                                    {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                    {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="text-xs font-black text-slate-800 tracking-tight uppercase">
                                    {log.school_name || 'Individual Profile'}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    UID: {log.user_id?.substring(0, 8)}...
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 font-mono tracking-tighter">
                                    {log.razorpay_order_id}
                                  </code>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="text-lg font-black text-slate-900 tracking-tighter italic">
                                    ₹{(log.amount / 100).toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="space-y-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      log.status === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                                      'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                      <span className={`w-1 h-1 rounded-full ${
                                        log.status === 'SUCCESS' ? 'bg-emerald-500' :
                                        log.status === 'FAILED' ? 'bg-red-500' :
                                        'bg-amber-500'
                                      }`} />
                                      {log.status}
                                    </span>
                                    {log.status === 'FAILED' && (
                                      <div className="max-w-[200px]">
                                        <p className="text-[9px] font-black text-red-600 uppercase tracking-tighter leading-tight">
                                          {log.error_code}: {log.error_description}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {transactionLogs.length === 0 && !logsLoading && (
                          <div className="p-20 text-center">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No payment vectors recorded in this cycle.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* CRM Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[64px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="bg-slate-900 p-12 text-white relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <button 
                  aria-label="Close detail modal"
                  onClick={() => setSelectedSub(null)} 
                  className="absolute top-10 right-10 text-white/40 hover:text-white transition-all p-2 hover:bg-white/10 rounded-2xl"
                >
                   <X size={32} />
                </button>
                <div className="flex items-center gap-10 relative z-10">
                   <div className="w-28 h-28 rounded-[40px] bg-indigo-600 flex items-center justify-center text-4xl font-black italic shadow-2xl shadow-indigo-500/30">
                      {selectedSub.first_name?.[0]}
                   </div>
                   <div className="space-y-2">
                      <p className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.4em] italic underline decoration-indigo-400/30 underline-offset-8 mb-4">Master Subscriber Detail</p>
                      <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                         {selectedSub.first_name} <span className="text-indigo-300">{selectedSub.last_name}</span>
                      </h3>
                      <p className="text-slate-400 font-bold uppercase text-sm tracking-widest pt-2">
                         {selectedSub.school_name || 'Station Unassigned'}
                      </p>
                   </div>
                </div>
             </div>

             <div className="p-16 space-y-12">
                <div className="grid grid-cols-2 gap-12">
                   {[
                     { label: 'UDISE Protocol', value: selectedSub.school_id || 'Not Assigned', icon: ShieldCheck },
                     { label: 'Communications', value: selectedSub.email, icon: Globe },
                     { label: 'Registration Vector', value: new Date(selectedSub.created_at).toLocaleDateString(), icon: Calendar },
                     { 
                       label: 'Operational Tier', 
                       value: (
                         <select 
                           value={selectedSub.saas_plan_type || ''} 
                           title="Select Operational Tier"
                           onChange={(e) => handleUpdateSubscriber(selectedSub.id, { saas_plan_type: e.target.value })}
                           className="bg-transparent text-xl font-black text-slate-800 tracking-tight uppercase outline-none cursor-pointer hover:text-indigo-600 transition-colors w-full"
                         >
                           <option value="">Trial Node</option>
                           {pricing.map(p => (
                             <option key={p.id} value={p.description}>{p.description}</option>
                           ))}
                         </select>
                       ), 
                       icon: Zap 
                     },
                   ].map((d, i) => (
                     <div key={i} className="space-y-2 group">
                        <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                           <d.icon size={14} />
                           <p className="text-[10px] font-black uppercase tracking-widest">{d.label}</p>
                        </div>
                        <div className="text-xl font-black text-slate-800 tracking-tight uppercase truncate">{d.value}</div>
                     </div>
                   ))}
                </div>

                <div className="bg-slate-50 p-10 rounded-[48px] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <CreditCard className="text-indigo-500" size={20} />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Remittance</span>
                      </div>
                      <p className="text-5xl font-black text-slate-900 tracking-tighter italic">₹{selectedSub.saas_amount_paid?.toLocaleString() || 0}</p>
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedSub.saas_payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                         {selectedSub.saas_payment_status === 'paid' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                         Status: {selectedSub.saas_payment_status}
                      </span>
                   </div>
                   
                   <div className="space-y-4">
                      {selectedSub.saas_payment_status !== 'paid' ? (
                        <button 
                          onClick={() => {
                            const amount = prompt("Enter manual remittance amount:", "500");
                            if (amount !== null) {
                              handleUpdateSubscriber(selectedSub.id, { 
                                saas_payment_status: 'paid', 
                                saas_amount_paid: Number(amount) 
                              });
                            }
                          }}
                          className="w-full bg-emerald-600 text-white py-5 rounded-[28px] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                        >
                          Authorize Manual Clearance
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            if (confirm("Revoke access and set status to unpaid?")) {
                              handleUpdateSubscriber(selectedSub.id, { 
                                saas_payment_status: 'unpaid', 
                                saas_amount_paid: 0 
                              });
                            }
                          }}
                          className="w-full bg-red-600 text-white py-5 rounded-[28px] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-red-100 hover:bg-red-700 transition-all active:scale-[0.98]"
                        >
                          Revoke Access Protocol
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedSub(null)}
                        className="w-full bg-white text-slate-400 border-2 border-slate-50 py-5 rounded-[28px] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-50 transition-all"
                      >
                        Cancel Analysis
                      </button>
                    </div>
                </div>

                <button 
                  onClick={() => setSelectedSub(null)}
                  className="w-full bg-slate-900 text-white py-6 rounded-[32px] font-black uppercase text-xs md:text-sm tracking-[0.4em] hover:bg-black transition-all shadow-2xl active:scale-[0.98]"
                >
                  Return to Matrix
                </button>
             </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
