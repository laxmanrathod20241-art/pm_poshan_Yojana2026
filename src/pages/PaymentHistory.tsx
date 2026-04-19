import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { 
  Download, 
  FileText, 
  ShieldCheck,
  Loader2,
  Calendar,
  History
} from 'lucide-react';
import SubscriptionStatus from '../components/SubscriptionStatus';

interface Subscription {
  id: string;
  plan_type: string;
  amount_paid: number;
  payment_status: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  created_at: string;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Subscription | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user?.id]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await api
        .from('saas_subscriptions')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let finalData = data || [];
      
      // 🛡️ AUTO-BACKFILL: If user is paid but has no history record
      if (finalData.length === 0 && user?.saas_payment_status === 'paid') {
        const virtualSub: Subscription = {
          id: 'migration-record',
          plan_type: user.saas_plan_type || 'primary',
          amount_paid: user.saas_amount_paid || 800,
          payment_status: 'paid',
          razorpay_payment_id: 'LEGACY_TRANS',
          razorpay_order_id: 'LEGACY_ORDER',
          created_at: new Date().toISOString() // Or user.created_at if we had it precisely
        };
        finalData = [virtualSub];
      }
      
      setSubscriptions(finalData);
    } catch (err: any) {
      console.error('Error fetching payment history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-4 md:py-8 space-y-6">
        
        {/* Account Status Banner */}
        <div className="max-w-xl">
           <SubscriptionStatus />
        </div>

        {/* Page Header Ribbon (Desktop Only) */}
        <div className="hidden lg:flex items-center justify-between bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
           <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                 <History size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Payment History</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Subscription Records</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                 <ShieldCheck className="text-emerald-500" size={16} />
                 <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Account Active</span>
              </div>
           </div>
        </div>

        {/* Transaction Table */}
        <div className="hidden lg:block bg-white rounded-[40px] shadow-2xl border border-white overflow-hidden print:hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left">Transaction Date</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left">Subscription Plan</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left">Remittance ID</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-left">Amount Paid</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-sm font-black text-slate-700">
                        {new Date(sub.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                      sub.plan_type === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {sub.plan_type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-tighter">
                      {sub.razorpay_payment_id || 'N/A'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xl font-black text-slate-900 tracking-tighter italic">
                      ₹{sub.amount_paid.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => setSelectedReceipt(sub)}
                      className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm border border-slate-100"
                      title="View Receipt"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center font-black text-slate-300 uppercase tracking-[0.5em] italic">No transaction data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-4 print:hidden">
          <div className="flex items-center gap-3 px-2 mb-2">
            <History className="text-blue-600" size={20} />
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Payment Records</h2>
          </div>
          
          {subscriptions.length > 0 ? (
            subscriptions.map(sub => (
              <div key={sub.id} className="bg-white p-6 rounded-[32px] shadow-xl border border-white flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                    sub.plan_type === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {sub.plan_type}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Subscription Fee</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter italic">₹{sub.amount_paid.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedReceipt(sub)}
                    className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100"
                    title="View Receipt"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
              <History className="mx-auto text-slate-300 mb-4 opacity-50" size={48} />
              <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-xs">No transaction records found yet.</p>
              <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Your payment receipts will appear here after a successful upgrade.</p>
            </div>
          )}
        </div>


        {/* Printable Receipt Modal / View */}
        {(selectedReceipt || (subscriptions.length > 0 && window.matchMedia('print').matches)) && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 print:relative print:z-0 print:p-0 print:block ${!selectedReceipt ? 'hidden' : ''}`}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md print:hidden" onClick={() => setSelectedReceipt(null)}></div>
            <div className="bg-white rounded-[32px] shadow-2xl border border-white w-full max-w-xl relative z-10 overflow-hidden print:shadow-none print:border-0 print:rounded-none print:max-w-none print:w-full">
              
              {/* Receipt Content */}
              <div id="printable-receipt" className="p-8 md:p-10 space-y-8 print:p-6 print:space-y-6">
                {/* Receipt Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                   <div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">PM-POSHAN <span className="text-blue-600">Tracker</span></h2>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Subscription Receipt</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt No</p>
                      <p className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">RE-{selectedReceipt?.id.slice(0, 8) || 'ARCHIVE'}</p>
                   </div>
                </div>

                {/* Personnel Details */}
                <div className="grid grid-cols-2 gap-8 text-[11px]">
                   <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Personnel</p>
                      <p className="font-black text-slate-900 uppercase italic">{user?.first_name} {user?.last_name}</p>
                      <p className="text-slate-500">{user?.email}</p>
                   </div>
                   <div className="space-y-0.5 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Workplace</p>
                      <p className="font-black text-slate-900 uppercase italic">{user?.school_name || 'Individual'}</p>
                      <p className="text-slate-500">UDISE: {user?.school_id || 'N/A'}</p>
                   </div>
                </div>

                {/* Financial Summary Table */}
                <div className="border-y border-slate-100 py-6 space-y-4">
                   <div className="flex justify-between items-center text-[9px] font-black uppercase italic tracking-tighter text-slate-400">
                      <span>Service Description</span>
                      <span>Annual Fee</span>
                   </div>
                   <div className="flex justify-between items-center text-sm font-black">
                      <span className="text-slate-800 uppercase italic truncate pr-4">Annual Cloud Subscription ({selectedReceipt?.plan_type || 'Cloud Access'})</span>
                      <span className="text-slate-900 tracking-tighter whitespace-nowrap">₹{selectedReceipt?.amount_paid?.toLocaleString()}</span>
                   </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end pt-2">
                   <div className="bg-slate-900 text-white p-6 rounded-2xl min-w-[200px] text-right">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid (INR)</p>
                      <p className="text-3xl font-black tracking-tighter italic">₹{selectedReceipt?.amount_paid?.toLocaleString()}</p>
                   </div>
                </div>

                {/* Verification Footer */}
                <div className="grid grid-cols-2 gap-8 pt-6 items-end">
                   <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-600">
                         <ShieldCheck size={16} />
                         <span className="text-[8px] font-black uppercase tracking-widest italic">Digitally Verified</span>
                      </div>
                      <div className="text-[7px] font-bold text-slate-400 uppercase space-y-0.5 leading-none">
                         <p>TXN: {selectedReceipt?.razorpay_payment_id || 'N/A'}</p>
                         <p>ORD: {selectedReceipt?.razorpay_order_id || 'N/A'}</p>
                         <p>TIMESTAMP: {selectedReceipt ? new Date(selectedReceipt.created_at).toLocaleString() : ''}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="w-24 h-0.5 bg-slate-900 ml-auto mb-2"></div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized Signature</p>
                   </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-8 pt-0 flex gap-3 print:hidden">
                 <button 
                   onClick={handlePrint}
                   className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                 >
                   Print Receipt
                 </button>
                 <button 
                   onClick={() => setSelectedReceipt(null)}
                   className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Close
                 </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @media print {
          /* 1. Global Reset */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          /* 2. Hide ALL root-level and nested containers by default */
          #root > div, 
          header, aside, footer, 
          .print\\:hidden, 
          .mb-12, 
          .lg\\:block, 
          .lg\\:hidden,
          button {
            display: none !important;
          }

          /* 3. Force the Receipt Container and its specific lineage to be visible */
          main, 
          .flex-1, 
          .overflow-y-auto,
          #printable-receipt {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 9999 !important;
          }

          #printable-receipt {
            padding: 2mm !important;
            border: none !important;
          }

          /* 4. Ensure text is sharp and appropriately sized */
          #printable-receipt * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>



    </Layout>
  );
}
