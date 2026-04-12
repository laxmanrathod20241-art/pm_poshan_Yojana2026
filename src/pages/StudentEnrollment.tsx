import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { Save, CheckCircle2, Loader2, Info } from 'lucide-react';

export default function StudentEnrollment() {
  const [userId, setUserId] = useState<string | null>(null);
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
  const grandTotal = totalPrimary + totalUpperPrimary;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEnrollment();
    }
  }, [userId]);

  const fetchEnrollment = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', userId)
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
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('has_primary, has_upper_primary')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setHasPrimary(profileData.has_primary ?? true);
        setHasUpperPrimary(profileData.has_upper_primary ?? true);
      }
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
      const { error } = await (supabase as any)
        .from('student_enrollment')
        .upsert(
          {
            teacher_id: userId,
            std_1: std1,
            std_2: std2,
            std_3: std3,
            std_4: std4,
            std_5: std5,
            std_6: std6,
            std_7: std7,
            std_8: std8
          },
          { onConflict: 'teacher_id' }
        );

      if (error) throw error;

      // Also save configuration flags to profiles table
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          has_primary: hasPrimary,
          has_upper_primary: hasUpperPrimary
        })
        .eq('id', userId);

      if (profileError) throw profileError;
      setMessage({ type: 'success', text: 'Enrollment registry updated successfully.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Update failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</label>
      <input
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

  if (fetchLoading) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center p-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative pb-20 mt-6">
        
        {/* School Category Configuration */}
        <div className="bg-white border-2 border-slate-100 shadow-sm p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2 text-blue-600">
                 System Configuration: School Sections
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Toggle visibility of school sections across Enrollment and Daily Logs</p>
           </div>
           
           <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 px-4 py-3 border-2 border-slate-100 transition-all hover:border-blue-200">
                 <input 
                    type="checkbox" 
                    checked={hasPrimary} 
                    onChange={(e) => setHasPrimary(e.target.checked)}
                    className="w-5 h-5 rounded-none border-2 border-slate-300 text-blue-600 focus:ring-0 transition-all cursor-pointer"
                 />
                 <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Primary Section (1st - 5th)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 px-4 py-3 border-2 border-slate-100 transition-all hover:border-[#474379]">
                 <input 
                    type="checkbox" 
                    checked={hasUpperPrimary} 
                    onChange={(e) => setHasUpperPrimary(e.target.checked)}
                    className="w-5 h-5 rounded-none border-2 border-slate-300 text-[#474379] focus:ring-0 transition-all cursor-pointer"
                 />
                 <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest group-hover:text-[#474379] transition-colors">Upper Primary Section (6th - 8th)</span>
              </label>
           </div>
        </div>

        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-end border-b border-slate-200 pb-4 gap-4">
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-2.5 flex flex-col items-center min-w-[120px] shadow-sm">
             <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Grand Total</span>
             <span className="text-2xl font-black text-slate-800 leading-none">{grandTotal}</span>
          </div>
        </div>

        {message.text && (
          <div className={`mb-8 p-4 text-xs font-black uppercase tracking-widest border-l-4 shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'success' 
              ? 'bg-[#00a65a]/10 border-[#00a65a] text-[#00a65a]' 
              : 'bg-red-50 border-red-500 text-red-600'
          }`}>
            <CheckCircle2 size={16} /> {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          
          {/* Primary Card */}
          {hasPrimary && (
            <div className="bg-white border-t-[6px] border-[#3c8dbc] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
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

          {/* Upper Primary Card */}
          {hasUpperPrimary && (
            <div className="bg-white border-t-[6px] border-[#474379] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
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
             <p className="text-[12px] font-medium opacity-80 leading-relaxed max-w-2xl">
                Please ensure student counts match the official UDISE+ registry. This baseline is utilized for secondary validation of daily food consumption logs and month-end auditing.
             </p>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full md:w-auto bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-8 py-3.5 rounded-none font-black shadow-2xl shadow-blue-900/50 transition-all flex justify-center items-center gap-3 text-xs uppercase tracking-widest active:scale-95 z-10"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Synchronize Unified Enrollment
          </button>
        </div>

      </div>
    </Layout>
  );
}
