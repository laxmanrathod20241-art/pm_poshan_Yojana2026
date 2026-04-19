import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Users, Flame, Edit2, Trash2 } from 'lucide-react';

interface StaffFormProps {
  userId: string;
  onSuccess?: () => void;
}

export default function StaffForm({ userId, onSuccess }: StaffFormProps) {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffPost, setStaffPost] = useState('');
  const [paymentType, setPaymentType] = useState<'per_student' | 'per_day' | 'monthly'>('per_day');
  const [ratePrimary, setRatePrimary] = useState('');
  const [rateUpper, setRateUpper] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [fuelList, setFuelList] = useState<any[]>([]);
  const [fuelType, setFuelType] = useState('');
  const [fuelRatePrimary, setFuelRatePrimary] = useState('');
  const [fuelRateUpper, setFuelRateUpper] = useState('');
  const [fuelLoading, setFuelLoading] = useState(false);
  const [editingFuelId, setEditingFuelId] = useState<string | null>(null);

  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchData();
    }
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await (api.from('profiles') as any).select('has_primary, has_upper_primary').eq('id', userId).single();
    if (data) {
      setHasPrimary(data.has_primary ?? true);
      setHasUpperPrimary(data.has_upper_primary ?? true);
      if (!data.has_primary && data.has_upper_primary) setSelectedScope('upper_primary');
    }
  };

  const fetchData = async () => {
    const { data: sData } = await (api.from('cooking_staff') as any).select('*').eq('teacher_id', userId).order('created_at', { ascending: false });
    if (sData) setStaffList(sData);
    const { data: fData } = await (api.from('fuel_tracking') as any).select('*').eq('teacher_id', userId).order('created_at', { ascending: false });
    if (fData) setFuelList(fData);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('तुम्हाला खात्री आहे की तुम्ही ही नोंद हटवू इच्छिता?')) return;
    const { error } = await (api.from('cooking_staff') as any).delete().eq('id', id);
    if (!error) {
      fetchData();
      if (onSuccess) onSuccess();
    }
  };

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm('तुम्हाला खात्री आहे की तुम्ही ही नोंद हटवू इच्छिता?')) return;
    const { error } = await (api.from('fuel_tracking') as any).delete().eq('id', id);
    if (!error) {
      fetchData();
      if (onSuccess) onSuccess();
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    const currentRate = selectedScope === 'primary' ? Number(ratePrimary || 0) : Number(rateUpper || 0);
    const payload = {
      teacher_id: userId,
      staff_name: staffName,
      post_name: staffPost,
      payment_type: paymentType,
      rate_primary: selectedScope === 'primary' ? currentRate : 0,
      rate_upper: selectedScope === 'upper_primary' ? currentRate : 0,
      monthly_cost: paymentType === 'monthly' ? currentRate : 0,
      standard_group: selectedScope,
      record_month: new Date().getMonth() + 1,
      record_year: new Date().getFullYear()
    };

    const { error } = editingStaffId 
      ? await (api.from('cooking_staff') as any).update(payload).eq('id', editingStaffId)
      : await (api.from('cooking_staff') as any).insert([payload]);

    if (!error) {
      setStaffName(''); setStaffPost(''); setRatePrimary(''); setRateUpper(''); setEditingStaffId(null);
      fetchData();
      if (onSuccess) onSuccess();
    }
    setStaffLoading(false);
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelLoading(true);
    const logisticsRate = selectedScope === 'primary' ? Number(fuelRatePrimary || 0) : Number(fuelRateUpper || 0);
    const payload = {
      teacher_id: userId,
      fuel_type: fuelType,
      fuel_rate_primary: selectedScope === 'primary' ? logisticsRate : 0,
      fuel_rate_upper: selectedScope === 'upper_primary' ? logisticsRate : 0,
      veg_rate_primary: 0,
      veg_rate_upper: 0,
      monthly_cost: 0,
      standard_group: selectedScope,
      record_month: new Date().getMonth() + 1,
      record_year: new Date().getFullYear()
    };

    const { error } = editingFuelId
      ? await (api.from('fuel_tracking') as any).update(payload).eq('id', editingFuelId)
      : await (api.from('fuel_tracking') as any).insert([payload]);

    if (!error) {
      setFuelType(''); setFuelRatePrimary(''); setFuelRateUpper(''); setEditingFuelId(null);
      fetchData();
      if (onSuccess) onSuccess();
    }
    setFuelLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center p-2 bg-slate-50 border rounded-lg">
        {hasPrimary && (
          <button onClick={() => setSelectedScope('primary')} className={`px-6 py-2 text-[11px] font-black uppercase rounded-md transition-all ${selectedScope === 'primary' ? 'bg-white text-blue-600 shadow-sm border' : 'text-slate-400'}`}>Primary (१-५)</button>
        )}
        {hasUpperPrimary && (
          <button onClick={() => setSelectedScope('upper_primary')} className={`px-6 py-2 text-[11px] font-black uppercase rounded-md transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-sm border' : 'text-slate-400'}`}>Upper (६-८)</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#3c8dbc] text-white font-black text-xs uppercase flex items-center gap-2"><Users size={16}/> स्वयंपाकी आणि मदतनीस</div>
          <div className="p-5 space-y-4">
            <form onSubmit={handleSaveStaff} className="space-y-3">
              <input placeholder="नाव" title="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border p-2 text-sm font-bold" required />
              <input placeholder="पद (उदा: मुख्य स्वयंपाकी)" title="Staff Post" value={staffPost} onChange={e => setStaffPost(e.target.value)} className="w-full border p-2 text-sm font-bold" required />
              <div className="grid grid-cols-2 gap-2">
                <select title="Payment Type" aria-label="Payment Type" value={paymentType} onChange={e => setPaymentType(e.target.value as any)} className="border p-2 text-sm font-bold">
                  <option value="per_day">Per Day (प्रति दिवस)</option>
                  <option value="per_student">Per Student (प्रति विद्यार्थी)</option>
                  <option value="monthly">मासिक (Monthly)</option>
                </select>
                <input type="number" step="0.01" placeholder="दर (Rate) ₹" title="Rate" value={selectedScope === 'primary' ? ratePrimary : rateUpper} onChange={e => selectedScope === 'primary' ? setRatePrimary(e.target.value) : setRateUpper(e.target.value)} className="border p-2 text-sm font-bold" required />
              </div>
              <button disabled={staffLoading} className="w-full bg-[#3c8dbc] text-white p-2 font-black text-xs uppercase tracking-widest">{staffLoading ? 'Saving...' : 'जतन करा'}</button>
            </form>
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">नोंदणी केलेली यादी (Entries: {staffList.length})</span>
              </div>
              {staffList.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border border-dashed rounded">No entries found</div>
              ) : staffList.map(item => (
                <div key={item.id} className="group flex justify-between items-center p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-all shadow-sm">
                  <div className="flex flex-col">
                    <div className="text-[13px] font-black text-[#474379]">{item.staff_name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.post_name} • {item.standard_group === 'primary' ? 'Primary' : 'Upper'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[14px] font-black text-blue-600">₹{item.standard_group === 'primary' ? item.rate_primary : item.rate_upper}</div>
                      <div className="text-[8px] font-black text-slate-400 uppercase">
                        {item.payment_type === 'per_day' ? 'प्रति दिवस' : item.payment_type === 'per_student' ? 'प्रति विद्यार्थी' : 'मासिक'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-l pl-3">
                      <button title="Edit Staff" onClick={() => { 
                        setStaffName(item.staff_name); 
                        setStaffPost(item.post_name); 
                        setPaymentType(item.payment_type); 
                        setSelectedScope(item.standard_group);
                        if (item.standard_group === 'primary') {
                          setRatePrimary(String(item.rate_primary));
                        } else {
                          setRateUpper(String(item.rate_upper));
                        }
                        setEditingStaffId(item.id); 
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={14}/></button>
                      <button title="Delete Staff" onClick={() => handleDeleteStaff(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm h-fit">
          <div className="p-4 bg-[#474379] text-white font-black text-xs uppercase flex items-center justify-between">
            <div className="flex items-center gap-2"><Flame size={16}/> इंधन आणि भाजीपाला</div>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[9px]">{fuelList.length} Entries</span>
          </div>
          <div className="p-5 space-y-4">
            <form onSubmit={handleSaveFuel} className="space-y-3">
              <input placeholder="इंधन प्रकार / भाजीपाला खर्च (उदा: गॅस, भाजीपाला)" title="Fuel Type" value={fuelType} onChange={e => setFuelType(e.target.value)} className="w-full border p-2 text-sm font-bold bg-slate-50/30 rounded focus:border-[#474379] outline-none transition-all" required />
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate (दर) ₹</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input type="number" step="0.01" title="Fuel & Veg Rate" placeholder="0.00" value={selectedScope === 'primary' ? fuelRatePrimary : fuelRateUpper} onChange={e => selectedScope === 'primary' ? setFuelRatePrimary(e.target.value) : setFuelRateUpper(e.target.value)} className="w-full border p-2 pl-7 text-sm font-black bg-slate-50/30 rounded focus:border-[#474379] outline-none transition-all" required />
                </div>
              </div>
              <button disabled={fuelLoading} className="w-full bg-[#474379] hover:bg-[#34305c] text-white p-3 font-black text-[10px] uppercase tracking-widest shadow-md transition-all active:scale-95">
                {fuelLoading ? 'Saving...' : editingFuelId ? 'Update Record' : 'जतन करा (Save Entry)'}
              </button>
            </form>
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">खर्च यादी (Logistics Log: {fuelList.length})</span>
              </div>
              {fuelList.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border border-dashed rounded">No logistics logs</div>
              ) : fuelList.map(item => (
                <div key={item.id} className="group flex justify-between items-center p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg transition-all shadow-sm">
                  <div className="flex flex-col">
                    <div className="text-[13px] font-black text-[#474379]">{item.fuel_type}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.standard_group === 'primary' ? 'Primary' : 'Upper'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[14px] font-black text-purple-600">₹{(Number(item.fuel_rate_primary) + Number(item.veg_rate_primary) + Number(item.fuel_rate_upper) + Number(item.veg_rate_upper)).toFixed(2)}</div>
                    <div className="flex items-center gap-2 border-l pl-3">
                      <button title="Edit Fuel Cost" onClick={() => { 
                        setFuelType(item.fuel_type); 
                        setSelectedScope(item.standard_group);
                        if (item.standard_group === 'primary') {
                          setFuelRatePrimary(String(item.fuel_rate_primary));
                        } else {
                          setFuelRateUpper(String(item.fuel_rate_upper));
                        }
                        setEditingFuelId(item.id); 
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={14}/></button>
                      <button title="Delete Fuel Cost" onClick={() => handleDeleteFuel(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
