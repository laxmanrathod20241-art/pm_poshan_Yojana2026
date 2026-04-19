import React, { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { 
  ShieldCheck, 
  Zap, 
  Star, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  Crown,
  Lock,
  Calendar
} from 'lucide-react';
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

interface PricingPlan {
  id: string;
  section_type: string;
  base_price: number;
  description: string;
}

const SaaSSubscription: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingPlan[]>([]);
  const [fetchingPlans, setFetchingPlans] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data } = await api.from('saas_pricing').select('*');
      if (data) setPricing(data as PricingPlan[]);
    } catch (err) {
      console.error("Failed to fetch pricing:", err);
    } finally {
      setFetchingPlans(false);
    }
  };

  const handlePayment = async (plan: PricingPlan) => {
    setLoading(true);
    const res = await loadRazorpayScript();

    if (!res) {
      toast.error("Razorpay SDK failed to load. Check your internet connection.");
      setLoading(false);
      return;
    }

    try {
      // Step A: Create Order on Backend
      const orderRes = await api.post('/api/payments/create-order', {
        plan_type: plan.id, // plan.id is 'primary', 'upper_primary', or 'combo'
        amount: Number(plan.base_price)
      });

      if (!orderRes.razorpay_order_id) {
        throw new Error("Failed to initialize order with backend");
      }

      // Step B: Initialize Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderRes.amount,
        currency: "INR",
        name: "PM-POSHAN Tracker",
        description: `Annual SaaS Subscription - ${plan.section_type.toUpperCase()}`,
        image: "https://pmposhan.gov.in/assets/img/logo.png",
        order_id: orderRes.razorpay_order_id,
        handler: async (response: any) => {
          // Success Handler
          try {
            const verifyRes = await api.post('/api/payments/verify-success', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.status === "SUCCESS") {
              toast.success("Payment Successful! Your subscription is active.");
              await refreshProfile(); // Refresh local UI state
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            toast.error("Verification error. Please contact support.");
          }
        },
        prefill: {
          name: `${user?.first_name || ''} ${user?.last_name || ''}`,
          email: user?.email || '',
          contact: user?.mobile_number || ''
        },
        theme: {
          color: "#2563eb"
        },
        modal: {
          ondismiss: () => setLoading(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on('payment.failed', async (response: any) => {
        // Failure Handler
        try {
          await api.post('/api/payments/log-failure', {
            razorpay_order_id: orderRes.razorpay_order_id,
            error_code: response.error.code,
            error_description: response.error.description
          });
          toast.error(`Payment Failed: ${response.error.description}`);
        } catch (err) {
          console.error("Log failure error:", err);
        } finally {
          setLoading(false);
        }
      });

      rzp.open();
    } catch (err: any) {
      console.error("Payment Start Error:", err);
      toast.error("Error starting payment process: " + (err.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const isPaid = user?.saas_payment_status === 'PAID' || user?.saas_payment_status === 'paid';

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-8 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <Crown size={16} className="text-blue-600 fill-blue-600" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Premium Upgrade</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-4">
            UNLOCK FULL <span className="text-blue-600">CAPABILITIES</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest max-w-2xl mx-auto leading-relaxed">
            डिजिटल पीएम-पोषण ट्रॅकरची सर्व वैशिष्ट्ये वापरण्यासाठी तुमची वार्षिक वर्गणी आजच भरा.
          </p>
        </div>

        {/* Current Status Banner */}
        {isPaid && (
          <div className="max-w-4xl mx-auto mb-12 bg-emerald-500 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-emerald-200/50 border border-emerald-400/30 overflow-hidden relative group">
            <Zap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Your Subscription is Active!</h3>
                <p className="text-white/80 font-bold text-xs uppercase tracking-widest mt-1">Thank you for supporting digital PM-POSHAN reporting.</p>
              </div>
            </div>
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-md relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Valid Until</p>
               <p className="text-lg font-black tracking-tighter">
                 {user?.saas_expiry_date ? new Date(user.saas_expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
               </p>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {fetchingPlans ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl h-[500px] animate-pulse">
                <div className="h-8 w-32 bg-slate-100 rounded-full mb-6" />
                <div className="h-12 w-48 bg-slate-100 rounded-lg mb-4" />
                <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
              </div>
            ))
          ) : (
            pricing.map((plan) => (
              <div 
                key={plan.section_type}
                className={`group relative bg-white p-8 rounded-[40px] border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
                  plan.section_type === 'combo' 
                  ? 'border-blue-600 shadow-blue-100' 
                  : 'border-slate-100 shadow-slate-100'
                }`}
              >
                {plan.section_type === 'combo' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                    plan.section_type === 'combo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}>
                    {plan.section_type === 'primary' ? <Star size={28} /> : plan.section_type === 'upper_primary' ? <Zap size={28} /> : <Crown size={28} />}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{plan.section_type === 'combo' ? 'Combo' : plan.section_type.replace('_', ' ')}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{plan.description}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{plan.base_price}</span>
                  <span className="text-sm font-bold text-slate-400 uppercase">/ year</span>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">सर्व रिपोर्ट जनरेशन</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">स्वयंचलित हजेरी सिंक</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">दैनंदिन व मासिक रजिस्टर</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">मोबाईल व डेस्कटॉप सपोर्ट</span>
                  </div>
                </div>

                <button
                  disabled={loading || isPaid}
                  onClick={() => handlePayment(plan)}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all ${
                    isPaid 
                    ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-xl active:scale-95 disabled:opacity-50'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isPaid ? (
                    <>Active <CheckCircle2 size={18} /></>
                  ) : (
                    <>वर्गणी भरा (Pay Now) <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Security & Features Footer */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto border-t border-slate-100 pt-16">
          <div className="flex items-start gap-5">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Lock size={24} /></div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">Secure Payments</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">Processed by Razorpay with 256-bit encryption. We never store your card details.</p>
            </div>
          </div>
          <div className="flex items-start gap-5">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><Zap size={24} /></div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">Instant Activation</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">Your dashboard unlocks immediately after successful payment verification.</p>
            </div>
          </div>
          <div className="flex items-start gap-5">
            <div className="bg-amber-50 p-4 rounded-2xl text-amber-600"><Calendar size={24} /></div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">Annual Validity</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">One simple payment covers your entire academic year of digital reporting.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SaaSSubscription;
