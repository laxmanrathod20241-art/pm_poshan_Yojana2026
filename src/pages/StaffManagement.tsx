import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { Users, Flame, Trash2, PlusCircle, Loader2, Edit2 } from 'lucide-react';

export default function StaffManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffPost, setStaffPost] = useState('');
  const [staffCost, setStaffCost] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [fuelList, setFuelList] = useState<any[]>([]);
  const [fuelType, setFuelType] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelLoading, setFuelLoading] = useState(false);
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchStaff = async (id: string, m: number = selectedMonth, y: number = selectedYear) => {
    const { data } = await (supabase as any).from('cooking_staff')
      .select('*')
      .eq('teacher_id', id)
      .eq('record_month', m)
      .eq('record_year', y)
      .order('created_at', { ascending: false });
    if (data) setStaffList(data);
  };

  const fetchFuel = async (id: string, m: number = selectedMonth, y: number = selectedYear) => {
    const { data } = await (supabase as any).from('fuel_tracking')
      .select('*')
      .eq('teacher_id', id)
      .eq('record_month', m)
      .eq('record_year', y)
      .order('created_at', { ascending: false });
    if (data) setFuelList(data);
  };

  const fetchData = async (id: string, m: number, y: number) => {
    fetchStaff(id, m, y);
    fetchFuel(id, m, y);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchData(session.user.id, selectedMonth, selectedYear);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchData(session.user.id, selectedMonth, selectedYear);
      }
    });

    return () => subscription.unsubscribe();
  }, [selectedMonth, selectedYear]);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert("User ID not found"); return; }
    if (!staffName || !staffPost) return;
    
    setStaffLoading(true);
    const payload = {
      teacher_id: userId,
      staff_name: staffName,
      post_name: staffPost,
      monthly_cost: Number(staffCost || 0),
      record_month: selectedMonth,
      record_year: selectedYear
    };

    let error;
    if (editingStaffId) {
      const res = await (supabase as any).from('cooking_staff').update(payload).eq('id', editingStaffId);
      error = res.error;
    } else {
      const res = await (supabase as any).from('cooking_staff').insert([payload]);
      error = res.error;
    }
    
    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setStaffName('');
      setStaffPost('');
      setStaffCost('');
      setEditingStaffId(null);
      await fetchStaff(userId);
    }
    setStaffLoading(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!userId || !window.confirm('Delete this staff record?')) return;
    await (supabase as any).from('cooking_staff').delete().eq('id', id);
    await fetchStaff(userId);
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert("User ID not found"); return; }
    if (!fuelType) return;
    
    setFuelLoading(true);
    const payload = {
      teacher_id: userId,
      fuel_type: fuelType,
      monthly_cost: Number(fuelCost || 0),
      record_month: selectedMonth,
      record_year: selectedYear
    };

    let error;
    if (editingFuelId) {
      const res = await (supabase as any).from('fuel_tracking').update(payload).eq('id', editingFuelId);
      error = res.error;
    } else {
      const res = await (supabase as any).from('fuel_tracking').insert([payload]);
      error = res.error;
    }
    
    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      setFuelType('');
      setFuelCost('');
      setEditingFuelId(null);
      await fetchFuel(userId);
    }
    setFuelLoading(false);
  };

  const handleDeleteFuel = async (id: string) => {
    if (!userId || !window.confirm('Delete this fuel record?')) return;
    await (supabase as any).from('fuel_tracking').delete().eq('id', id);
    await fetchFuel(userId);
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20">


        <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Select Control Month</h3>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 text-xs font-black uppercase px-3 py-2 rounded shadow-sm outline-none focus:border-blue-500 transition-all"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(idx + 1)}
                className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter border transition-all ${
                  selectedMonth === (idx + 1) 
                    ? 'bg-[#474379] border-[#474379] text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Panel 1: Cooking Staff */}
          <div className="bg-white rounded-xl shadow-xl border-t-4 border-[#3c8dbc] overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
              <Users className="text-[#3c8dbc]" size={20} />
              <h2 className="text-[14px] font-black text-[#3c8dbc] uppercase tracking-widest">
                स्वयंपाकी आणि मदतनीस व्यवस्थापन
              </h2>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <form onSubmit={handleSaveStaff} className="space-y-3 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Name</label>
                    <input 
                      type="text" required value={staffName} onChange={e => setStaffName(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none" placeholder="Staff Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Post / Designation</label>
                    <input 
                      type="text" required value={staffPost} onChange={e => setStaffPost(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none" placeholder="e.g. Chief Cook"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monthly Cost (₹)</label>
                    <input 
                      type="number" value={staffCost} onChange={e => setStaffCost(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none" placeholder="0.00"
                    />
                  </div>
                </div>
                <button type="submit" disabled={staffLoading} className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white p-2.5 font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-3 rounded-sm">
                  {staffLoading ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16} />} {editingStaffId ? 'UPDATE STAFF' : 'SAVE STAFF'}
                </button>
                {editingStaffId && (
                  <button type="button" onClick={() => { setEditingStaffId(null); setStaffName(''); setStaffPost(''); setStaffCost(''); }} className="w-full text-[#3c8dbc] hover:text-[#2e7da6] text-xs font-bold mt-2 uppercase tracking-widest">
                    Cancel Edit
                  </button>
                )}
              </form>

              <div className="flex-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">Registered Staff ({staffList.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {staffList.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-[#3c8dbc]/30 transition-all">
                      <div>
                        <div className="text-[12px] font-black text-slate-700">{item.staff_name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{item.post_name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-[12px] font-black text-[#3c8dbc]">₹{Number(item.monthly_cost).toFixed(2)}</div>
                        <button onClick={() => { setStaffName(item.staff_name); setStaffPost(item.post_name); setStaffCost(item.monthly_cost.toString()); setEditingStaffId(item.id); }} className="text-slate-300 hover:text-blue-500 transition-colors p-1" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteStaff(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {staffList.length === 0 && <div className="text-center text-xs text-slate-400 font-bold italic py-4">No staff members registered.</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Fuel Logistics */}
          <div className="bg-white rounded-xl shadow-xl border-t-4 border-[#474379] overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
              <Flame className="text-[#474379]" size={20} />
              <h2 className="text-[14px] font-black text-[#474379] uppercase tracking-widest">
                इंधन आणि लॉजिस्टिक खर्च
              </h2>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <form onSubmit={handleSaveFuel} className="space-y-3 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fuel Type</label>
                    <input 
                      type="text" required value={fuelType} onChange={e => setFuelType(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#474379] outline-none" placeholder="e.g. LPG, Firewood"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monthly Cost (₹)</label>
                    <input 
                      type="number" value={fuelCost} onChange={e => setFuelCost(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#474379] outline-none" placeholder="0.00"
                    />
                  </div>
                </div>
                <button type="submit" disabled={fuelLoading} className="w-full bg-[#474379] hover:bg-[#343063] text-white p-2.5 font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-3 rounded-sm">
                  {fuelLoading ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16} />} {editingFuelId ? 'UPDATE FUEL DATA' : 'SAVE FUEL DATA'}
                </button>
                {editingFuelId && (
                  <button type="button" onClick={() => { setEditingFuelId(null); setFuelType(''); setFuelCost(''); }} className="w-full text-[#474379] hover:text-[#343063] text-xs font-bold mt-2 uppercase tracking-widest">
                    Cancel Edit
                  </button>
                )}
              </form>

              <div className="flex-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">Registered Fuel Sources ({fuelList.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {fuelList.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-[#474379]/30 transition-all">
                      <div className="text-[12px] font-black text-slate-700 uppercase">{item.fuel_type}</div>
                      <div className="flex items-center gap-4">
                        <div className="text-[12px] font-black text-[#474379]">₹{Number(item.monthly_cost).toFixed(2)}</div>
                        <button onClick={() => { setFuelType(item.fuel_type); setFuelCost(item.monthly_cost.toString()); setEditingFuelId(item.id); }} className="text-slate-300 hover:text-blue-500 transition-colors p-1" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteFuel(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {fuelList.length === 0 && <div className="text-center text-xs text-slate-400 font-bold italic py-4">No fuel entries registered.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
