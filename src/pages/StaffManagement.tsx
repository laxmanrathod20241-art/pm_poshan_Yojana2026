// @ts-nocheck
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { Users, Flame, Utensils, Trash2, PlusCircle, Loader2, Edit2 } from 'lucide-react';

export default function StaffManagement() {
  const [userId, setUserId] = useState<string | null>(null);
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffPost, setStaffPost] = useState('');
  const [staffCost, setStaffCost] = useState('');
  const [paymentType, setPaymentType] = useState<'per_student' | 'per_day'>('per_day');
  const [ratePrimary, setRatePrimary] = useState('');
  const [rateUpper, setRateUpper] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [fuelList, setFuelList] = useState<any[]>([]);
  const [fuelType, setFuelType] = useState('');
  const [fuelRatePrimary, setFuelRatePrimary] = useState('');
  const [fuelRateUpper, setFuelRateUpper] = useState('');
  const [vegRatePrimary, setVegRatePrimary] = useState('');
  const [vegRateUpper, setVegRateUpper] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelLoading, setFuelLoading] = useState(false);
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);

  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);

  const fetchStaff = async (id: string) => {
    const { data } = await (supabase as any).from('cooking_staff')
      .select('*')
      .eq('teacher_id', id)
      .order('created_at', { ascending: false });
    if (data) setStaffList(data);
  };

  const fetchFuel = async (id: string) => {
    const { data } = await (supabase as any).from('fuel_tracking')
      .select('*')
      .eq('teacher_id', id)
      .order('created_at', { ascending: false });
    if (data) setFuelList(data);
  };

  const fetchData = async (id: string) => {
    fetchStaff(id);
    fetchFuel(id);
  };

  const fetchProfile = async (uid: string) => {
    const { data } = await (supabase as any).from('profiles').select('has_primary, has_upper_primary').eq('id', uid).single();
    if (data) {
      setHasPrimary(data.has_primary ?? true);
      setHasUpperPrimary(data.has_upper_primary ?? true);
      if (!data.has_primary && data.has_upper_primary) setSelectedScope('upper_primary');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
        fetchData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { alert("User ID not found"); return; }
    if (!staffName || !staffPost) return;
    
    setStaffLoading(true);
    const payload = {
      teacher_id: userId,
      staff_name: staffName,
      post_name: staffPost,
      payment_type: paymentType,
      rate_primary: selectedScope === 'primary' ? Number(ratePrimary || 0) : Number(ratePrimary || 0),
      rate_upper: selectedScope === 'upper_primary' ? Number(rateUpper || 0) : Number(rateUpper || 0),
      monthly_cost: Number(staffCost || 0),
      standard_group: selectedScope
    };

    // Instruction logic: When saving, if the scope is 'primary', set the rate_upper payload to 0
    if (selectedScope === 'primary') payload.rate_upper = 0;
    else payload.rate_upper = Number(rateUpper || 0);
    
    if (selectedScope === 'upper_primary') payload.rate_primary = 0;
    else payload.rate_primary = Number(ratePrimary || 0);

    let error;
    if (editingStaffId) {
      const res = await (supabase as any)
        .from('cooking_staff')
        .update(payload)
        .eq('id', editingStaffId)
        .eq('teacher_id', userId);
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
      setRatePrimary('');
      setRateUpper('');
      setPaymentType('per_day');
      setEditingStaffId(null);
      await fetchStaff(userId);
    }
    setStaffLoading(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!userId || !window.confirm('Delete this staff record?')) return;
    await (supabase as any).from('cooking_staff').delete().eq('id', id).eq('teacher_id', userId);
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
      fuel_rate_primary: selectedScope === 'primary' ? Number(fuelRatePrimary || 0) : 0,
      fuel_rate_upper: selectedScope === 'upper_primary' ? Number(fuelRateUpper || 0) : 0,
      veg_rate_primary: selectedScope === 'primary' ? Number(vegRatePrimary || 0) : 0,
      veg_rate_upper: selectedScope === 'upper_primary' ? Number(vegRateUpper || 0) : 0,
      monthly_cost: Number(fuelCost || 0),
      standard_group: selectedScope
    };

    let error;
    if (editingFuelId) {
      const res = await (supabase as any)
        .from('fuel_tracking')
        .update(payload)
        .eq('id', editingFuelId)
        .eq('teacher_id', userId);
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
      setFuelRatePrimary('');
      setFuelRateUpper('');
      setVegRatePrimary('');
      setVegRateUpper('');
      setFuelCost('');
      setEditingFuelId(null);
      await fetchFuel(userId);
    }
    setFuelLoading(false);
  };

  const handleDeleteFuel = async (id: string) => {
    if (!userId || !window.confirm('Delete this fuel record?')) return;
    await (supabase as any).from('fuel_tracking').delete().eq('id', id).eq('teacher_id', userId);
    await fetchFuel(userId);
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20">


        <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Select Scope (स्तर निवडा)</h3>
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200 shadow-inner">
              {hasPrimary && (
                <button 
                  onClick={() => setSelectedScope('primary')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'primary' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Primary (१-५)
                </button>
              )}
              {hasUpperPrimary && (
                <button 
                  onClick={() => setSelectedScope('upper_primary')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Upper (६-८)
                </button>
              )}
            </div>
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Type</label>
                    <select 
                      value={paymentType} onChange={e => setPaymentType(e.target.value as any)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none rounded-sm"
                      title="पगार निवडा (Select payment type)"
                    >
                      <option value="per_day">Per Day (प्रति दिवस)</option>
                      <option value="per_student">Per Student (प्रति विद्यार्थी)</option>
                    </select>
                  </div>
                  {selectedScope === 'primary' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rate (Std 1-5) ₹</label>
                      <input 
                        type="number" step="0.01" value={ratePrimary} onChange={e => setRatePrimary(e.target.value)}
                        className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none" placeholder="0.00"
                      />
                    </div>
                  )}
                  {selectedScope === 'upper_primary' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rate (Std 6-8) ₹</label>
                      <input 
                        type="number" step="0.01" value={rateUpper} onChange={e => setRateUpper(e.target.value)}
                        className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#3c8dbc] outline-none" placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
                <button type="submit" disabled={staffLoading} className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white p-2.5 font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-3 rounded-sm">
                  {staffLoading ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16} />} {editingStaffId ? 'UPDATE STAFF' : 'SAVE STAFF'}
                </button>
                {editingStaffId && (
                  <button type="button" onClick={() => { setEditingStaffId(null); setStaffName(''); setStaffPost(''); setStaffCost(''); setRatePrimary(''); setRateUpper(''); setPaymentType('per_day'); }} className="w-full text-[#3c8dbc] hover:text-[#2e7da6] text-xs font-bold mt-2 uppercase tracking-widest">
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
                        <div className="flex items-center gap-2">
                          <div className="text-[12px] font-black text-slate-700">{item.staff_name}</div>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.standard_group === 'primary' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {item.standard_group === 'primary' ? 'I-V' : 'VI-VIII'}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{item.post_name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-[12px] font-black text-[#3c8dbc]">
                          ₹{selectedScope === 'primary' ? Number(item.rate_primary || 0).toFixed(2) : Number(item.rate_upper || 0).toFixed(2)} 
                          {item.payment_type === 'per_student' ? ' / Stud.' : ' / Day'}
                        </div>
                        <button onClick={() => { 
                          setStaffName(item.staff_name); 
                          setStaffPost(item.post_name); 
                          setStaffCost(item.monthly_cost?.toString() || ''); 
                          setRatePrimary(item.rate_primary?.toString() || '');
                          setRateUpper(item.rate_upper?.toString() || '');
                          setPaymentType(item.payment_type || 'per_day');
                          setEditingStaffId(item.id); 
                        }} className="text-slate-300 hover:text-blue-500 transition-colors p-1" title="Edit">
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Source Name / Fuel Type</label>
                    <input 
                      type="text" required value={fuelType} onChange={e => setFuelType(e.target.value)}
                      className="w-full border p-2 bg-slate-50 font-bold text-sm focus:border-[#474379] outline-none" placeholder="e.g. LPG / Veg Allowance"
                    />
                  </div>
                  
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3 md:col-span-2">
                    <div className="text-[10px] font-black text-[#474379] uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                      <Flame size={12} /> Fuel Rates (प्रति विद्यार्थी इंधन दर)
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedScope === 'primary' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Std 1-5 (₹)</label>
                          <input 
                            type="number" step="0.01" value={fuelRatePrimary} onChange={e => setFuelRatePrimary(e.target.value)}
                            className="w-full border p-1.5 bg-white font-bold text-xs focus:border-[#474379] outline-none" placeholder="0.00"
                          />
                        </div>
                      )}
                      {selectedScope === 'upper_primary' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Std 6-8 (₹)</label>
                          <input 
                            type="number" step="0.01" value={fuelRateUpper} onChange={e => setFuelRateUpper(e.target.value)}
                            className="w-full border p-1.5 bg-white font-bold text-xs focus:border-[#474379] outline-none" placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3 md:col-span-2">
                    <div className="text-[10px] font-black text-green-700 uppercase tracking-widest border-b pb-1 flex items-center gap-2">
                      <Utensils size={12} /> Veg Rates (प्रति विद्यार्थी भाजीपाला दर)
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedScope === 'primary' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Std 1-5 (₹)</label>
                          <input 
                            type="number" step="0.01" value={vegRatePrimary} onChange={e => setVegRatePrimary(e.target.value)}
                            className="w-full border p-1.5 bg-white font-bold text-xs focus:border-[#474379] outline-none" placeholder="0.00"
                          />
                        </div>
                      )}
                      {selectedScope === 'upper_primary' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Std 6-8 (₹)</label>
                          <input 
                            type="number" step="0.01" value={vegRateUpper} onChange={e => setVegRateUpper(e.target.value)}
                            className="w-full border p-1.5 bg-white font-bold text-xs focus:border-[#474379] outline-none" placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={fuelLoading} className="w-full bg-[#474379] hover:bg-[#343063] text-white p-2.5 font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-3 rounded-sm">
                  {fuelLoading ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16} />} {editingFuelId ? 'UPDATE LOGISTICS' : 'SAVE LOGISTICS'}
                </button>
                {editingFuelId && (
                  <button type="button" onClick={() => { 
                    setEditingFuelId(null); 
                    setFuelType(''); 
                    setFuelRatePrimary('');
                    setFuelRateUpper('');
                    setVegRatePrimary('');
                    setVegRateUpper('');
                    setFuelCost(''); 
                  }} className="w-full text-[#474379] hover:text-[#343063] text-xs font-bold mt-2 uppercase tracking-widest">
                    Cancel Edit
                  </button>
                )}
              </form>

              <div className="flex-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b pb-2">Registered Fuel Sources ({fuelList.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {fuelList.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg group hover:border-[#474379]/30 transition-all">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="text-[12px] font-black text-slate-700 uppercase">{item.fuel_type}</div>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.standard_group === 'primary' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {item.standard_group === 'primary' ? 'I-V' : 'VI-VIII'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            Rate: ₹{selectedScope === 'primary' ? item.fuel_rate_primary : item.fuel_rate_upper} (Fuel) | ₹{selectedScope === 'primary' ? item.veg_rate_primary : item.veg_rate_upper} (Veg)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => { 
                          setFuelType(item.fuel_type); 
                          setFuelRatePrimary(item.fuel_rate_primary?.toString() || '');
                          setFuelRateUpper(item.fuel_rate_upper?.toString() || '');
                          setVegRatePrimary(item.veg_rate_primary?.toString() || '');
                          setVegRateUpper(item.veg_rate_upper?.toString() || '');
                          setFuelCost(item.monthly_cost?.toString() || ''); 
                          setEditingFuelId(item.id); 
                        }} className="text-slate-300 hover:text-blue-500 transition-colors p-1" title="Edit">
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


