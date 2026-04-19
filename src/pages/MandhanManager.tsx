import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { 
  CreditCard, 
  Calendar, 
  IndianRupee, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Clock,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

type MonthlyMandhan = {
  id?: string;
  report_month: number;
  report_year: number;
  standard_group: string;
  staff_total: number;
  fuel_total: number;
  veg_total: number;
  is_applicable: boolean;
};

export default function MandhanManager() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [syncing, setSyncing] = useState<number | null>(null); // Month index being synced
  const [saving, setSaving] = useState<number | null>(null); // Month index being saved
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [mandhanData, setMandhanData] = useState<MonthlyMandhan[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [savedMonths, setSavedMonths] = useState<Set<number>>(new Set());

  const marathiMonths = [
    { name: 'एप्रिल (April)', index: 4 },
    { name: 'मे (May)', index: 5 },
    { name: 'जून (June)', index: 6 },
    { name: 'जुलै (July)', index: 7 },
    { name: 'ऑगस्ट (August)', index: 8 },
    { name: 'सप्टेंबर (September)', index: 9 },
    { name: 'ऑक्टोबर (October)', index: 10 },
    { name: 'नोव्हेंबर (November)', index: 11 },
    { name: 'डिसेंबर (December)', index: 12 },
    { name: 'जानेवारी (January)', index: 1 },
    { name: 'फेब्रुवारी (February)', index: 2 },
    { name: 'मार्च (March)', index: 3 }
  ];

  const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const { data } = await api.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data);
        if (!data.has_primary && data.has_upper_primary) {
          setSelectedScope('upper_primary');
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      setSavedMonths(new Set());
      fetchProfile();
      fetchMandhanData(userId, selectedYear, selectedScope);
    }
  }, [userId, selectedYear, selectedScope]);

  const fetchMandhanData = async (uid: string, year: number, scope: string) => {
    try {
      // 1. Fetch saved records
      const { data: savedData } = await api.from('monthly_mandhan')
        .select('*')
        .eq('teacher_id', uid)
        .eq('report_year', year)
        .eq('standard_group', scope);
      
      const existing = savedData || [];

      // 2. Fetch everything for the entire year to calculate missing ones
      const yearStart = `${year}-04-01`;
      const yearEnd = `${year + 1}-03-31`;

      const [logsRes, staffRes, fuelRes] = await Promise.all([
        api.from('daily_logs').select('*').eq('teacher_id', uid).gte('log_date', yearStart).lte('log_date', yearEnd),
        api.from('cooking_staff').select('*').eq('teacher_id', uid).eq('standard_group', scope),
        api.from('fuel_tracking').select('*').eq('teacher_id', uid).eq('standard_group', scope)
      ]);

      const allLogs = logsRes.data || [];
      const staffConfigs = staffRes.data || [];
      const fuelConfigs = fuelRes.data || [];

      const fullList: MonthlyMandhan[] = marathiMonths.map(m => {
        const found = existing.find(e => e.report_month === m.index);
        if (found) return found;

        // If not found, calculate
        const mIdx = m.index;
        const mYear = mIdx >= 4 ? year : year + 1;
        
        const monthLogs = allLogs.filter(l => {
          const d = new Date(l.log_date);
          return d.getMonth() + 1 === mIdx && d.getFullYear() === mYear;
        });

        let totalMeals = 0;
        let workingDays = 0;
        monthLogs.forEach(l => {
          const meals = scope === 'primary' ? Number(l.meals_served_primary || 0) : Number(l.meals_served_upper_primary || 0);
          if (meals > 0) {
            totalMeals += meals;
            workingDays++;
          }
        });

        // Staff Total
        let sTotal = 0;
        staffConfigs.forEach(s => {
          const rate = scope === 'primary' ? Number(s.rate_primary || 0) : Number(s.rate_upper || 0);
          if (s.payment_type === 'per_student') sTotal += (rate * totalMeals);
          else if (s.payment_type === 'per_day') sTotal += (rate * workingDays);
          else sTotal += (rate || Number(s.monthly_cost || 0));
        });

        // Fuel Total
        let fTotal = 0, vTotal = 0;
        fuelConfigs.forEach(f => {
          const fr = scope === 'primary' ? Number(f.fuel_rate_primary || 0) : Number(f.fuel_rate_upper || 0);
          const vr = scope === 'primary' ? Number(f.veg_rate_primary || 0) : Number(f.veg_rate_upper || 0);
          if (fr > 0 || vr > 0) {
            fTotal += (fr * totalMeals);
            vTotal += (vr * totalMeals);
          } else {
            fTotal += Number(f.monthly_cost || 0);
          }
        });

        return {
          report_month: m.index,
          report_year: year,
          standard_group: scope,
          staff_total: Math.round(sTotal),
          fuel_total: Math.round(fTotal),
          veg_total: Math.round(vTotal),
          is_applicable: totalMeals > 0 || sTotal > 0 || fTotal > 0
        };
      });

      setMandhanData(fullList);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleSyncMonth = async (monthIdx: number, actualMonth: number) => {
    if (!userId) return;
    setSyncing(monthIdx);
    try {
      const year = actualMonth >= 4 ? selectedYear : selectedYear + 1;
      const monthStart = `${year}-${String(actualMonth).padStart(2, '0')}-01`;
      const nextM = actualMonth === 12 ? 1 : actualMonth + 1;
      const nextY = actualMonth === 12 ? year + 1 : year;
      const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

      // Fetch logs and configs to calculate expected values
      const [logsRes, staffRes, fuelRes] = await Promise.all([
        api.from('daily_logs').select('*').eq('teacher_id', userId).gte('log_date', monthStart).lt('log_date', monthEnd),
        api.from('cooking_staff').select('*').eq('teacher_id', userId).eq('standard_group', selectedScope),
        api.from('fuel_tracking').select('*').eq('teacher_id', userId).eq('standard_group', selectedScope)
      ]);

      const logs = logsRes.data || [];
      const staff = staffRes.data || [];
      const fuel = fuelRes.data || [];

      let totalMeals = 0;
      let workingDays = 0;
      logs.forEach(l => {
        const m = selectedScope === 'primary' ? Number(l.meals_served_primary || 0) : Number(l.meals_served_upper_primary || 0);
        if (m > 0) {
          totalMeals += m;
          workingDays++;
        }
      });

      // Staff Total
      let sTotal = 0;
      staff.forEach(s => {
        const rate = selectedScope === 'primary' ? Number(s.rate_primary || 0) : Number(s.rate_upper || 0);
        if (s.payment_type === 'per_student') sTotal += (rate * totalMeals);
        else if (s.payment_type === 'per_day') sTotal += (rate * workingDays);
        else sTotal += (rate || Number(s.monthly_cost || 0));
      });

      // Fuel Total
      let fTotal = 0, vTotal = 0;
      fuel.forEach(f => {
        const fr = selectedScope === 'primary' ? Number(f.fuel_rate_primary || 0) : Number(f.fuel_rate_upper || 0);
        const vr = selectedScope === 'primary' ? Number(f.veg_rate_primary || 0) : Number(f.veg_rate_upper || 0);
        if (fr > 0 || vr > 0) {
          fTotal += (fr * totalMeals);
          vTotal += (vr * totalMeals);
        } else {
          fTotal += Number(f.monthly_cost || 0);
        }
      });

      const newData = [...mandhanData];
      newData[monthIdx] = {
        ...newData[monthIdx],
        staff_total: Math.round(sTotal),
        fuel_total: Math.round(fTotal + vTotal),
        veg_total: 0,
        is_applicable: true // Ensure it stays active if user is syncing
      };
      setMandhanData(newData);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(null);
    }
  };

  const handleSaveMonth = async (monthIdx: number) => {
    if (!userId) return;
    const item = mandhanData[monthIdx];
    setSaving(monthIdx);
    setMsg({ type: '', text: '' });

    try {
      const payload = {
        teacher_id: userId,
        report_month: item.report_month,
        report_year: item.report_year,
        standard_group: item.standard_group,
        staff_total: item.staff_total,
        fuel_total: item.fuel_total,
        veg_total: item.veg_total,
        is_applicable: item.is_applicable
      };

      // Check for existing
      const { data: existing } = await api.from('monthly_mandhan')
        .select('id')
        .eq('teacher_id', userId)
        .eq('report_month', item.report_month)
        .eq('report_year', item.report_year)
        .eq('standard_group', item.standard_group)
        .maybeSingle();

      if (existing) {
        await api.from('monthly_mandhan').update(payload).eq('id', (existing as any).id);
      } else {
        await api.from('monthly_mandhan').insert(payload);
      }

      setMsg({ type: 'success', text: `${marathiMonths[monthIdx].name} साठी मानधन यशस्वीरित्या जतन केले!` });
      setSavedMonths(prev => new Set(prev).add(monthIdx));
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      fetchMandhanData(userId, selectedYear, selectedScope);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'त्रुटी: ' + err.message });
    } finally {
      setSaving(null);
    }
  };

  const toggleApplicable = (idx: number) => {
    const newData = [...mandhanData];
    const updatedItem = { ...newData[idx] };
    updatedItem.is_applicable = !updatedItem.is_applicable;
    
    if (!updatedItem.is_applicable) {
      updatedItem.staff_total = 0;
      updatedItem.fuel_total = 0;
      updatedItem.veg_total = 0;
    }
    
    newData[idx] = updatedItem;
    setMandhanData(newData);
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[24px] shadow-2xl shadow-indigo-200">
              <CreditCard className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Mandhan Manager</h1>
              <h2 className="text-lg font-bold text-slate-600 mt-2">मानधन व खर्च व्यवस्थापन</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" />
                Monthly Honorarium & Cost Ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm items-center">
                <Calendar size={16} className="ml-3 text-slate-400" />
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent px-4 py-2 font-black text-slate-700 text-xs outline-none w-44"
                  title="निवडलेले वर्ष (Selected Year)"
                >
                  {years.map(y => (
                    <option key={y} value={Number(y)}>आर्थिक वर्ष {y}-{Number(y)-2000+1}</option>
                  ))}
                </select>
             </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                {(!profile || profile.has_primary) && (
                  <button 
                    onClick={() => setSelectedScope('primary')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedScope === 'primary' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    इ. १ ते ५ वी
                  </button>
                )}
                {profile?.has_upper_primary && (
                  <button 
                    onClick={() => setSelectedScope('upper_primary')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    इ. ६ ते ८ वी
                  </button>
                )}
              </div>
          </div>
        </div>

        {msg.text && (
          <div className={`mb-8 p-5 rounded-3xl border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="text-sm font-black uppercase tracking-tight">{msg.text}</span>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="bg-white rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">महिना (Month)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">स्थिती (Status)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">मानधन (Staff)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">इंधन व भाजीपाला (Fuel & Veg)</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">कृती (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {marathiMonths.map((m, idx) => {
                  const data = mandhanData[idx] || { staff_total: 0, fuel_total: 0, veg_total: 0, is_applicable: true };
                  const isSyncing = syncing === idx;
                  const isSaving = saving === idx;

                  return (
                    <tr key={idx} className={`group hover:bg-slate-50/80 transition-all duration-300 ${!data.is_applicable ? 'opacity-60 bg-slate-50/30' : ''}`}>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${data.is_applicable ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-base tracking-tight">{m.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                              {m.index >= 4 ? selectedYear : selectedYear + 1}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <button 
                          onClick={() => toggleApplicable(idx)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${data.is_applicable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${data.is_applicable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {data.is_applicable ? 'लागू आहे (Active)' : 'सुट्टी/लागू नाही'}
                        </button>
                      </td>
                      <td className="px-8 py-7">
                        <div className="relative group/input">
                          <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover/input:text-indigo-400 transition-colors" />
                          <input 
                            type="number"
                            value={data.staff_total}
                            aria-label={`मानधन खर्च (${m.name})`}
                            disabled={!data.is_applicable}
                            onChange={(e) => {
                              const newData = [...mandhanData];
                              newData[idx].staff_total = Number(e.target.value);
                              setMandhanData(newData);
                            }}
                            className="bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 w-36 font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-50"
                          />
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="relative group/input">
                          <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover/input:text-indigo-400 transition-colors" />
                          <input 
                            type="number"
                            value={(data.fuel_total || 0) + (data.veg_total || 0)}
                            aria-label={`इंधन व भाजीपाला खर्च (${m.name})`}
                            disabled={!data.is_applicable}
                            onChange={(e) => {
                              const newData = [...mandhanData];
                              newData[idx].fuel_total = Number(e.target.value);
                              newData[idx].veg_total = 0; // Merged into fuel_total
                              setMandhanData(newData);
                            }}
                            className="bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 w-44 font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-50"
                          />
                        </div>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleSyncMonth(idx, m.index)}
                            disabled={isSyncing || !data.is_applicable}
                            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90 disabled:opacity-30"
                            title="माहिती सिंक करा (Calculate from Logs)"
                            aria-label={`Sync data for ${m.name}`}
                          >
                            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                          </button>
                          <button 
                            onClick={() => handleSaveMonth(idx)}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-6 py-3 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg ${
                              isSaving 
                                ? 'bg-slate-100 text-slate-400' 
                                : savedMonths.has(idx)
                                  ? 'bg-emerald-500 text-white shadow-emerald-100'
                                  : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-100'
                            }`}
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : savedMonths.has(idx) ? <CheckCircle2 size={14} /> : <Save size={14} />}
                            {isSaving ? 'Saving...' : savedMonths.has(idx) ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Card */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[40px] text-white shadow-2xl shadow-indigo-200">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Total Staff Honorarium</p>
            <h3 className="text-3xl font-black tracking-tighter">₹ {mandhanData.reduce((sum, r) => sum + (r.staff_total || 0), 0).toLocaleString()}</h3>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-white/20 rounded-full" />
              <p className="text-[10px] font-bold uppercase opacity-40">Annual Estimate</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Total Fuel/Veg Cost</p>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">₹ {(mandhanData.reduce((sum, r) => sum + (r.fuel_total || 0), 0) + mandhanData.reduce((sum, r) => sum + (r.veg_total || 0), 0)).toLocaleString()}</h3>
            <div className="mt-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-indigo-100 rounded-full" />
              <p className="text-[10px] font-bold text-slate-300 uppercase">Combined Annual Estimate</p>
            </div>
          </div>
          <div className="bg-emerald-500 p-8 rounded-[40px] text-white shadow-2xl shadow-emerald-100">
             <div className="flex items-center justify-between mb-4">
                <Clock size={24} className="opacity-60" />
                <ChevronRight size={20} className="opacity-40" />
             </div>
             <p className="text-xs font-black uppercase tracking-tight leading-relaxed">
               All entries are archived for audit. Make sure to finalize each month before printing reports.
             </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
