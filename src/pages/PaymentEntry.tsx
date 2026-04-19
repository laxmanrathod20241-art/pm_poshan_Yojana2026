import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { 
  CreditCard, 
  History, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Users
} from 'lucide-react';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface PaymentReceipt {
  id: string;
  receipt_date: string;
  amount: number;
  section_type: string;
  remarks: string | null;
}

export default function PaymentEntry() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Form State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sectionType, setSectionType] = useState<'primary' | 'upper_primary' | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
      fetchPayments(userId);
    }
  }, [userId]);

  const fetchProfile = async (uid: string) => {
    const { data } = await api.from('profiles').select('*').eq('id', uid).single();
    const profileData = data as any;
    if (profileData) {
      setProfile(profileData);
      // Auto-select first available
      if (profileData.has_primary) setSectionType('primary');
      else if (profileData.has_upper_primary) setSectionType('upper_primary');
    }
  };

  const fetchPayments = async (uid: string) => {
    setFetchLoading(true);
    try {
      const { data, error } = await (api.from('payment_receipts' as any) as any)
        .select('*')
        .eq('teacher_id', uid)
        .order('receipt_date', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !amount || !date) return;

    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      // Using as any for the table name to bypass the current 'never' inference issue 
      // while the global types are re-indexing.
      const { error } = await (api.from('payment_receipts' as any) as any).insert({
        teacher_id: userId as string,
        amount: parseFloat(amount),
        receipt_date: date,
        section_type: sectionType,
        remarks: remarks || null
      });

      if (error) throw error;

      setMsg({ type: 'success', text: 'जमा नोंद यशस्वीरित्या जतन केली!' });
      setAmount('');
      setRemarks('');
      fetchPayments(userId);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'त्रुटी: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId || !window.confirm('ही नोंद हटवायची आहे का?')) return;

    try {
      const { error } = await (api.from('payment_receipts' as any) as any)
        .delete()
        .eq('id', id)
        .eq('teacher_id', userId);
      
      if (error) throw error;
      fetchPayments(userId);
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-200">
            <CreditCard className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">Payment Entry</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Fund Receipt Management System</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Section */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Plus className="text-blue-600" size={20} />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">नवीन जमा नोंद</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">प्राप्त रक्कम (Amount)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IndianRupee size={16} />
                    </div>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-balance font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">प्राप्ती तारीख (Date)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Calendar size={16} />
                    </div>
                    <input 
                      type="date" 
                      title="प्राप्ती तारीख"
                      aria-label="Date of Receipt"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Section selection */}
                {(profile?.has_primary || profile?.has_upper_primary) && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">वर्ग गट (Section)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {profile?.has_primary && (
                        <button
                          type="button"
                          onClick={() => setSectionType('primary')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all font-bold text-xs ${
                            sectionType === 'primary' 
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md shadow-blue-50' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <Users size={14} />
                          १ ते ५ वी
                        </button>
                      )}
                      {profile?.has_upper_primary && (
                        <button
                          type="button"
                          onClick={() => setSectionType('upper_primary')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all font-bold text-xs ${
                            sectionType === 'upper_primary' 
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md shadow-blue-50' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          <Users size={14} />
                          ६ ते ८ वी
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">शेरा / संदर्भ (Remarks)</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="उदा. बिलाचा प्रकार, चेक क्रमांक इ."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none min-h-[100px] resize-none"
                  />
                </div>

                {msg.text && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-xs font-bold">{msg.text}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  जमा नोंदवा
                </button>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] border border-slate-100 min-h-[400px]">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="text-indigo-600" size={20} />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">नुकत्याच केलेल्या नोंदी</h2>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 tracking-tighter uppercase">
                  {payments.length} नोंदी
                </div>
              </div>

              <div className="p-4">
                {fetchLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={32} className="animate-spin text-slate-200" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">माहिती लोड होत आहे...</span>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 text-center px-8">
                    <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                      <CreditCard size={32} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">अद्याप कोणतीही जमा नोंद केलेली नाही.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div key={p.id} className="group p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 border border-transparent hover:border-slate-100 rounded-[24px] transition-all flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-blue-50 transition-colors">
                            <Calendar size={18} className="text-slate-400 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-700">{new Date(p.receipt_date).toLocaleDateString('mr-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                p.section_type === 'upper_primary' 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-blue-100 text-blue-700'
                              }`}>
                                {p.section_type === 'upper_primary' ? '६ ते ८ वी' : '१ ते ५ वी'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{p.remarks || '---'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <p className="text-lg font-black text-slate-900 tracking-tighter">₹{p.amount.toLocaleString()}</p>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="नोंद हटवा"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
