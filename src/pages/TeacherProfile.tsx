import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { Save, CheckCircle2 } from 'lucide-react';

export default function TeacherProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [schoolNameMr, setSchoolNameMr] = useState('');
  const [centerNameMr, setCenterNameMr] = useState('');
  const [talukaMr, setTalukaMr] = useState('');
  const [districtMr, setDistrictMr] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setSchoolNameMr((data as any).school_name_mr || '');
        setCenterNameMr((data as any).center_name_mr || '');
        setTalukaMr((data as any).taluka_mr || '');
        setDistrictMr((data as any).district_mr || '');
      }
    } catch (err: any) {
      console.error('Error fetching profile', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setLoading(true);
    setStatus({ type: '', text: '' });
    
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          school_name_mr: schoolNameMr,
          center_name_mr: centerNameMr,
          taluka_mr: talukaMr,
          district_mr: districtMr
        } as any)
        .eq('id', userId);
        
      if (error) throw error;
      
      setStatus({ type: 'success', text: 'प्रोफाइल यशस्वीरित्या अपडेट केले!' });
    } catch (err: any) {
      setStatus({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20">


        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
          <div className="p-5 pb-4 border-b border-slate-50 bg-slate-50/50">
            <h2 className="text-[13px] font-black text-[#474379] uppercase tracking-widest leading-loose">
              School Information (शाळेची माहिती)
            </h2>
          </div>
          
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">शाळेचे नाव (School Name)</label>
              <input 
                type="text"
                value={schoolNameMr}
                onChange={e => setSchoolNameMr(e.target.value)}
                className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
                placeholder="उदा. जि. प. प्राथमिक शाळा..."
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">केंद्राचे नाव (Center Name)</label>
              <input 
                type="text"
                value={centerNameMr}
                onChange={e => setCenterNameMr(e.target.value)}
                className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
                placeholder="उदा. केंद्र..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">तालुका (Taluka)</label>
              <input 
                type="text"
                value={talukaMr}
                onChange={e => setTalukaMr(e.target.value)}
                className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
                placeholder="तालुका"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">जिल्हा (District)</label>
              <input 
                type="text"
                value={districtMr}
                onChange={e => setDistrictMr(e.target.value)}
                className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
                placeholder="जिल्हा"
              />
            </div>
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div>
              {status.text && (
                <div className={`p-2.5 text-[11px] font-black uppercase tracking-widest border rounded flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  {status.type === 'success' && <CheckCircle2 size={16} />} {status.text}
                </div>
              )}
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-2.5 px-6 shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs uppercase tracking-widest transition-all rounded disabled:opacity-50"
            >
              {loading ? 'वाढत आहे...' : <><Save size={16} /> सेव्ह करा (Save Profile)</>}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
