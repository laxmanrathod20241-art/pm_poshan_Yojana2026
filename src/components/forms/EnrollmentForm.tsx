import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthProvider';
import { Save, CheckCircle2, Loader2, Info, CreditCard, ChevronRight } from 'lucide-react';
import type { Database } from '../../types/database.types';
import toast from 'react-hot-toast';

// Dynamic Script Injection
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

type Enrollment = Database['public']['Tables']['student_enrollment']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EnrollmentFormProps {
  userId: string;
  onSuccess?: () => void;
}

export default function EnrollmentForm({ userId, onSuccess }: EnrollmentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Enrollment States (Std 1-8)
  const [std1, setStd1] = useState<number>(0);
  const [std2, setStd2] = useState<number>(0);
  const [std3, setStd3] = useState<number>(0);
  const [std4, setStd4] = useState<number>(0);
  const [std5, setStd5] = useState<number>(0);
  const [std6, setStd6] = useState<number>(0);
  const [std7, setStd7] = useState<number>(0);
  const [std8, setStd8] = useState<number>(0);
  
  // Section Configuration States
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  // Calculations
  const totalPrimary = std1 + std2 + std3 + std4 + std5;
  const totalUpperPrimary = std6 + std7 + std8;
  const grandTotal = (hasPrimary ? totalPrimary : 0) + (hasUpperPrimary ? totalUpperPrimary : 0);

  // SaaS / Subscription States
  const [pricing, setPricing] = useState<{id: string, section_type: string, base_price: number}[]>([]);
  const isPaid = user?.saas_payment_status === 'paid';
  const currentPlan = user?.saas_plan_type || 'primary';
  const { refreshProfile } = useAuth();
  
  // Logic to determine if we are in an "Upgrade" scenario
  const isUpgrade = isPaid && (
    (currentPlan === 'primary' && hasUpperPrimary) || 
    (currentPlan === 'upper_primary' && hasPrimary)
  );

  const finalPrice = (() => {
    // 1. Upgrade scenario: If already paid for one, and selecting the other, it's a 400 upgrade
    if (isUpgrade) return 400;

    // 2. New payment scenario
    if (hasPrimary && hasUpperPrimary) return pricing.find(p => p.section_type === 'combo')?.base_price || 1200;
    if (hasPrimary) return pricing.find(p => p.section_type === 'primary')?.base_price || 800;
    if (hasUpperPrimary) return pricing.find(p => p.section_type === 'upper_primary')?.base_price || 800;
    return 0;
  })();

  useEffect(() => {
    if (userId) {
      fetchEnrollment();
    }
  }, [userId]);

  const updateSectionConfig = async (primary: boolean, upper: boolean) => {
    if (!primary && !upper) {
      alert("Error: A school must have at least one active section (Primary or Upper Primary).");
      return;
    }

    setHasPrimary(primary);
    setHasUpperPrimary(upper);

    if (!userId) return;

    try {
      const { error } = await api
        .from('profiles')
        .update({
          has_primary: primary,
          has_upper_primary: upper
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Section update error:', err.message);
    }
  };

  const fetchEnrollment = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data, error } = await api
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', userId)
        .returns<Enrollment[]>()
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setStd1(data.std_1 || 0);
        setStd2(data.std_2 || 0);
        setStd3(data.std_3 || 0);
        setStd4(data.std_4 || 0);
        setStd5(data.std_5 || 0);
        setStd6(data.std_6 || 0);
        setStd7(data.std_7 || 0);
        setStd8(data.std_8 || 0);
      }

      // Also fetch configuration flags from profiles
      const { data: profileData } = await api
        .from('profiles')
        .select('has_primary, has_upper_primary, saas_plan_type, saas_payment_status')
        .eq('id', userId)
        .returns<Profile[]>()
        .single();
      
      if (profileData) {
        // Priority: Use the actual saved booleans from the database if they exist (not null)
        const savedPrimary = profileData.has_primary;
        const savedUpper = profileData.has_upper_primary;

        if (savedPrimary !== null && savedUpper !== null) {
          setHasPrimary(savedPrimary);
          setHasUpperPrimary(savedUpper);
        } else {
          // Fallback: If DB columns are fresh/null, default based on plan or show both
          if (profileData.saas_payment_status === 'paid') {
            const plan = profileData.saas_plan_type;
            if (plan === 'primary') {
              setHasPrimary(true);
              setHasUpperPrimary(false);
            } else if (plan === 'upper_primary') {
              setHasPrimary(false);
              setHasUpperPrimary(true);
            } else {
              setHasPrimary(true);
              setHasUpperPrimary(true);
            }
          } else {
            setHasPrimary(true);
            setHasUpperPrimary(true);
          }
        }
      }

      // Fetch SaaS Pricing
      const { data: pricingData } = await api.from('saas_pricing').select('*');
      if (pricingData) setPricing(pricingData);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const enrollmentPayload: Database['public']['Tables']['student_enrollment']['Insert'] = {
        teacher_id: userId,
        std_1: std1,
        std_2: std2,
        std_3: std3,
        std_4: std4,
        std_5: std5,
        std_6: std6,
        std_7: std7,
        std_8: std8
      };

      const { error } = await (api
        .from('student_enrollment') as any)
        .upsert(enrollmentPayload, { onConflict: 'teacher_id' });

      if (error) throw error;

      // Also save configuration flags to profiles table
      // Note: If they are paid, they can only "save" the configuration if it matches their plan
      // OR if they are checking a new box, we don't save it yet - they must pay first.
      // So here we only save if it's NOT an upgrade attempt.
      if (isUpgrade) {
        throw new Error('Please complete the upgrade payment to enable the additional section.');
      }

      const profilePayload: Database['public']['Tables']['profiles']['Update'] = {
        has_primary: hasPrimary,
        has_upper_primary: hasUpperPrimary
      };

      const { error: profileError } = await (api
        .from('profiles') as any)
        .update(profilePayload)
        .eq('id', userId);

      if (profileError) throw profileError;

      // 🔄 BUG FIX: Synchronize Unified Enrollment with Edge Function
      const { error: syncError } = await api.functions.invoke('sync-enrollment', {
        body: {
          teacher_id: userId,
          enrollment: enrollmentPayload,
          timestamp: new Date().toISOString()
        }
      });

      if (syncError) {
        console.error('Edge Function Sync Error:', syncError);
      }

      setMessage({ type: 'success', text: 'Enrollment registry updated successfully.' });
      if (onSuccess) onSuccess();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!userId) return;
    setLoading(true);
    
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error("Razorpay SDK failed to load.");
      setLoading(false);
      return;
    }

    try {
      // Step A: Create Order on Backend
      // 🛡️ SECURITY: Send plan_type so backend can look up real price
      let planType = 'primary';
      if (isUpgrade) planType = 'upgrade';
      else if (hasPrimary && hasUpperPrimary) planType = 'combo';
      else if (hasUpperPrimary) planType = 'upper_primary';

      const orderRes = await api.post('/api/payments/create-order', {
        plan_type: planType,
        amount: finalPrice // Still sent as fallback but backend will prioritize plan_type
      });

      if (!orderRes.razorpay_order_id) {
        throw new Error("Failed to initialize order");
      }

      // Determine new plan for logic after success
      const newPlan = (hasPrimary && hasUpperPrimary) ? 'combo' : (hasPrimary ? 'primary' : 'upper_primary');

      // Step B: Initialize Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.amount,
        currency: "INR",
        name: "PM-POSHAN Tracker",
        description: `Plan Upgrade / Activation - ${newPlan.toUpperCase()}`,
        order_id: orderRes.razorpay_order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await api.post('/api/payments/verify-success', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.status === "SUCCESS") {
              // Special case: Ensure profiles has correct has_primary flags after payment
              await api.from('profiles').update({
                has_primary: hasPrimary,
                has_upper_primary: hasUpperPrimary,
                saas_plan_type: newPlan
              }).eq('id', userId);

              toast.success("Payment Successful!");
              if (refreshProfile) await refreshProfile();
              setTimeout(() => window.location.reload(), 1500);
            }
          } catch (err) {
            toast.error("Verification failed.");
          }
        },
        prefill: {
          name: `${user?.first_name || ''} ${user?.last_name || ''}`,
          email: user?.email || '',
          contact: user?.mobile_number || ''
        },
        theme: { color: "#2563eb" },
        modal: { ondismiss: () => setLoading(false) }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async (response: any) => {
        await api.post('/api/payments/log-failure', {
          razorpay_order_id: orderRes.razorpay_order_id,
          error_code: response.error.code,
          error_description: response.error.description
        });
        toast.error(`Payment Failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error("Error starting payment: " + err.message);
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
    const fieldId = `std-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</label>
        <input
          id={fieldId}
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          title={label}
          placeholder="0"
          className="w-full border-2 border-slate-100 bg-slate-50 p-2 text-sm font-black text-slate-800 focus:border-blue-500 transition-all outline-none rounded-none shadow-sm"
        />
      </div>
    );
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* School Category Configuration */}
      <div className="bg-white border-2 border-slate-100 shadow-sm p-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2 text-blue-600">
                System Configuration: School Sections
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Toggle visibility of school sections across Enrollment and Daily Logs</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <label className={`flex items-center gap-3 cursor-pointer group bg-slate-50 px-4 py-3 border-2 transition-all ${
              isPaid && (currentPlan === 'primary' || currentPlan === 'combo') 
                ? 'opacity-60 cursor-not-allowed border-blue-200 bg-blue-50/30' 
                : 'border-slate-100 hover:border-blue-200'
            }`}>
                <input 
                  type="checkbox" 
                  checked={hasPrimary} 
                  onChange={(e) => updateSectionConfig(e.target.checked, hasUpperPrimary)}
                  disabled={isPaid && currentPlan === 'primary'}
                  className="w-5 h-5 rounded-none border-2 border-slate-300 text-blue-600 focus:ring-0 transition-all cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Primary Section (1st - 5th)</span>
                  {isPaid && (currentPlan === 'primary' || currentPlan === 'combo') && (
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">Already Activated</span>
                  )}
                </div>
            </label>

            <label className={`flex items-center gap-3 cursor-pointer group bg-slate-50 px-4 py-3 border-2 transition-all ${
              isPaid && (currentPlan === 'upper_primary' || currentPlan === 'combo') 
                ? 'opacity-60 cursor-not-allowed border-[#474379]/30 bg-[#474379]/5' 
                : 'border-slate-100 hover:border-[#474379]'
            }`}>
                <input 
                  type="checkbox" 
                  checked={hasUpperPrimary} 
                  onChange={(e) => updateSectionConfig(hasPrimary, e.target.checked)}
                  disabled={isPaid && currentPlan === 'upper_primary'}
                  className="w-5 h-5 rounded-none border-2 border-slate-300 text-[#474379] focus:ring-0 transition-all cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-[#474379] transition-colors">Upper Primary Section (6th - 8th)</span>
                  {isPaid && (currentPlan === 'upper_primary' || currentPlan === 'combo') && (
                    <span className="text-[8px] font-black text-[#474379] uppercase tracking-tighter">Already Activated</span>
                  )}
                </div>
            </label>
          </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-end border-b border-slate-200 pb-4 gap-4">
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-2.5 flex flex-col items-center min-w-[120px] shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Grand Total</span>
            <span className="text-2xl font-black text-slate-800 leading-none">{grandTotal}</span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 text-xs font-black uppercase tracking-widest border-l-4 shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-[#00a65a]/10 border-[#00a65a] text-[#00a65a]' 
            : 'bg-red-50 border-red-500 text-red-600'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />} {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hasPrimary && (
          <div className="bg-white border-t-[6px] border-[#3c8dbc] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-4 bg-blue-50/50 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#3c8dbc] uppercase tracking-wider flex items-center gap-2">
                    Standard 1st - 5th (Primary)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField label="Std 1st" value={std1} onChange={setStd1} />
                    <InputField label="Std 2nd" value={std2} onChange={setStd2} />
                    <InputField label="Std 3rd" value={std3} onChange={setStd3} />
                    <InputField label="Std 4th" value={std4} onChange={setStd4} />
                    <InputField label="Std 5th" value={std5} onChange={setStd5} />
                </div>
                <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Sub-Total</span>
                    <span className="text-3xl font-black text-[#3c8dbc]">{totalPrimary}</span>
                </div>
              </div>
          </div>
        )}

        {hasUpperPrimary && (
          <div className="bg-white border-t-[6px] border-[#474379] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#474379] uppercase tracking-wider flex items-center gap-2">
                    Standard 6th - 8th (Upper Primary)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InputField label="Std 6th" value={std6} onChange={setStd6} />
                    <InputField label="Std 7th" value={std7} onChange={setStd7} />
                    <InputField label="Std 8th" value={std8} onChange={setStd8} />
                </div>
                <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Sub-Total</span>
                    <span className="text-3xl font-black text-[#474379]">{totalUpperPrimary}</span>
                </div>
              </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#474379] p-5 text-white relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-full aspect-square bg-white/5 -mr-16 -mt-16 rounded-full blur-3xl transition-all group-hover:scale-125 duration-700"></div>
        <div className="flex-1 z-10">
            <div className="flex items-center gap-2 mb-1">
              <Info size={16} className="text-blue-300" />
              <h4 className="text-xs font-black uppercase tracking-widest">Notice to Personnel</h4>
            </div>
            <p className="text-[12px] font-medium opacity-80 leading-relaxed max-w-2xl text-slate-100">
              Please ensure student counts match the official UDISE+ registry. This baseline is utilized for secondary validation.
            </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full md:w-auto bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-8 py-3.5 rounded-none font-black shadow-2xl shadow-blue-900/50 transition-all flex justify-center items-center gap-3 text-xs uppercase tracking-widest active:scale-95 z-10 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Synchronize Unified Enrollment
        </button>
      </div>

      {/* Subscription Checkout Card */}
      {(!isPaid || isUpgrade) && (
        <div className="bg-white border-[3px] border-slate-900 rounded-[40px] shadow-2xl p-10 mt-12 overflow-hidden relative group animate-in slide-in-from-bottom-8 duration-700">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
            <CreditCard size={150} />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[10px] font-black px-4 py-2 bg-blue-50 text-blue-600 rounded-full uppercase tracking-widest mb-4 inline-block">
                {isUpgrade ? 'Combo Upgrade Offer' : 'Service Activation Required'}
              </span>
              <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-4">
                {isUpgrade ? 'Upgrade to' : 'Unlock'} <span className="text-blue-600 underline decoration-blue-200">{isUpgrade ? 'Combo Package' : 'Full Access'}</span>
              </h3>
              <p className="text-slate-500 font-bold leading-relaxed max-w-md">
                {isUpgrade 
                  ? 'Get full access to both Primary and Upper Primary sections at a discounted combo rate. Pay only the difference amount.'
                  : 'Based on your selected sections, your annual subscription fee has been calculated. Activate now to unlock Menu Management, Stock Tracking, and ZP Monthly Reports.'
                }
              </p>
              
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase italic">
                  <div className={`w-2 h-2 rounded-full ${hasPrimary ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  इ. १ ते ५ वी (Primary): ₹{pricing.find(p => p.section_type === 'primary')?.base_price || 800}
                </div>
                <div className="flex items-center gap-3 text-sm font-black text-slate-700 uppercase italic">
                  <div className={`w-2 h-2 rounded-full ${hasUpperPrimary ? 'bg-[#474379]' : 'bg-slate-200'}`}></div>
                  इ. ६ ते ८ वी (Upper Primary): ₹{pricing.find(p => p.section_type === 'upper_primary')?.base_price || 800}
                </div>
                {isUpgrade && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Already Paid: ₹800</p>
                    <span className="text-sm font-black text-slate-400 uppercase tracking-tighter italic">Adjustment: -₹800 (One section)</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-900 p-10 rounded-[40px] text-white flex flex-col items-center text-center shadow-2xl">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                 {isUpgrade ? 'Additional Amount Due' : 'Final Annual Amount'}
               </p>
               <h4 className="text-6xl font-black italic tracking-tighter mb-8">₹{finalPrice}</h4>
               
               <button 
                 onClick={handlePayment}
                 disabled={loading || finalPrice === 0}
                 className="w-full py-5 bg-blue-600 hover:bg-white hover:text-slate-900 transition-all rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
               >
                 {isUpgrade ? 'Complete Upgrade' : 'Initialize Razorpay'} <ChevronRight className="inline-block ml-2" size={18} />
               </button>
               
               <p className="mt-6 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                 Instant activation upon remittance • GST Inclusive <br />
                 Managed by Central PMPY Cloud
               </p>
            </div>
          </div>
        </div>
      )}

      {isPaid && !isUpgrade && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[40px] p-8 flex items-center justify-between gap-6 mt-12 animate-in fade-in zoom-in duration-500">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                 <CheckCircle2 size={32} />
              </div>
              <div>
                 <h4 className="text-xl font-black text-emerald-900 uppercase italic tracking-tighter">Account Fully Activated</h4>
                 <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest opacity-70">Status: Paid • Valid till {user?.saas_expiry_date ? new Date(user.saas_expiry_date).toLocaleDateString() : 'Next Year'}</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Remittance ID</p>
              <p className="text-sm font-black text-emerald-800 tracking-tighter uppercase italic">{user?.id?.slice(0, 8)}-SUBS</p>
           </div>
        </div>
      )}
    </div>
  );
}
