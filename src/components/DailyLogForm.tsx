import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Utensils, 
  ArrowRight,
  Loader2,
  X,
  Trash2,
  RefreshCcw 
} from 'lucide-react';

interface DailyLogFormProps {
  targetDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

export default function DailyLogForm({ targetDate, onClose, onSuccess }: DailyLogFormProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [primaryCount, setPrimaryCount] = useState<string>('');
  const [upperCount, setUpperCount] = useState<string>('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayRemarks, setHolidayRemarks] = useState('');
  const [foodNameMap, setFoodNameMap] = useState<Record<string, string>>({});
  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  const [foodGramsMap, setFoodGramsMap] = useState<Record<string, {primary: number, upper: number}>>({});
  const [enrollment, setEnrollment] = useState({ primary: 0, upper: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  
  // Master Data & Template Logic
  const [masterMainFoods, setMasterMainFoods] = useState<any[]>([]);
  const [masterIngredients, setMasterIngredients] = useState<any[]>([]);
  const [scheduledMenu, setScheduledMenu] = useState<{ mainFoods: string[], ingredients: string[] } | null>(null);
  
  // Form State (The Override Layer)
  const [localMainFoods, setLocalMainFoods] = useState<string[]>([]);
  const [localIngredients, setLocalIngredients] = useState<string[]>([]);

  // Borrowed Stock States
  const [showBorrowedModal, setShowBorrowedModal] = useState(false);
  const [deficitItems, setDeficitItems] = useState<{name: string, deficit: number}[]>([]);

  const GRAMS_PRIMARY = 100; 
  const GRAMS_UPPER = 150;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMenuAndStock();
    }
  }, [userId, targetDate]);

  const fetchMenuAndStock = async () => {
    if (!userId) return;
    setLoading(true);
    setStatus({ type: '', text: '' });
    
    try {
      // 1. Concurrent Fetch
      const [masterRes, enrollmentRes, existingLogRes, consumptionLogRes] = await Promise.all([
        (supabase as any).from('menu_master').select('*').eq('teacher_id', userId),
        (supabase as any).from('student_enrollment').select('*').eq('teacher_id', userId).maybeSingle(),
        (supabase as any).from('daily_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle(),
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle()
      ]);

      // 2. Map Master Data
      const mapping: Record<string, string> = {};
      const gramsMap: Record<string, {primary: number, upper: number}> = {};
      if (masterRes.data) {
        setMasterMainFoods(masterRes.data.filter((i: any) => i.item_category === 'MAIN'));
        setMasterIngredients(masterRes.data.filter((i: any) => i.item_category === 'INGREDIENT'));
        masterRes.data.forEach((m: any) => {
          mapping[m.item_code] = m.item_name;
          gramsMap[m.item_name] = { primary: m.grams_primary, upper: m.grams_upper_primary };
          if (m.item_code) gramsMap[m.item_code] = { primary: m.grams_primary, upper: m.grams_upper_primary };
        });
        setFoodNameMap(mapping);
        setFoodGramsMap(gramsMap);
      }

      if (enrollmentRes.data) {
        const e = enrollmentRes.data;
        setEnrollment({
          primary: (e.std_1 || 0) + (e.std_2 || 0) + (e.std_3 || 0) + (e.std_4 || 0) + (e.std_5 || 0),
          upper: (e.std_6 || 0) + (e.std_7 || 0) + (e.std_8 || 0)
        });
      }

      const targetDateObj = new Date(targetDate);
      const dayOfWeek = targetDateObj.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const stringDay = dayNames[dayOfWeek];
      
      const startDate = new Date(targetDateObj.getFullYear(), 0, 1);
      const daysDiff = Math.floor((targetDateObj.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil(daysDiff / 7);
      const scheduleType = weekNum % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';
      
      const { data: menu } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .maybeSingle();
      
      let templateMF: string[] = [];
      let templateIng: string[] = [];
      if (menu) {
        templateMF = (menu.main_food_codes || []).map((code: string) => mapping[code] || code);
        templateIng = (menu.menu_items || []).map((code: string) => mapping[code] || code);
        setScheduledMenu({ mainFoods: templateMF, ingredients: templateIng });
      }

      if (existingLogRes.data) {
        setIsEditing(true);
        setExistingLogId(existingLogRes.data.id);
        setIsHoliday(existingLogRes.data.is_holiday || false);
        setHolidayRemarks(existingLogRes.data.holiday_remarks || '');
        setPrimaryCount(existingLogRes.data.meals_served_primary != null ? String(existingLogRes.data.meals_served_primary) : '');
        setUpperCount(existingLogRes.data.meals_served_upper_primary != null ? String(existingLogRes.data.meals_served_upper_primary) : '');
        
        if (consumptionLogRes.data) {
          setLocalMainFoods(consumptionLogRes.data.main_foods_all || (consumptionLogRes.data.main_food ? [consumptionLogRes.data.main_food] : []));
          setLocalIngredients(consumptionLogRes.data.ingredients_used || []);
        } else {
          setLocalMainFoods(templateMF);
          setLocalIngredients(templateIng);
        }
      } else {
        setIsEditing(false);
        setLocalMainFoods(templateMF);
        setLocalIngredients(templateIng);
      }

      const { data: stock } = await (supabase as any).from('inventory_stock').select('*').eq('teacher_id', userId);
      setInventory(stock || []);
      const lMap: Record<string, number> = {};
      (stock || []).forEach((s: any) => {
        lMap[s.item_name] = Number(s.current_balance);
        if (s.item_code) lMap[s.item_code] = Number(s.current_balance);
      });
      setLiveStockMap(lMap);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRequirement = (itemIdentifier?: string) => {
    if (!primaryCount && !upperCount) return 0;
    const grams = (itemIdentifier && foodGramsMap[itemIdentifier]) || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
    const totalGrams = (Number(primaryCount || 0) * grams.primary) + (Number(upperCount || 0) * grams.upper);
    return totalGrams / 1000; 
  };

  const handleReset = () => {
    if (scheduledMenu) {
      setLocalMainFoods(scheduledMenu.mainFoods);
      setLocalIngredients(scheduledMenu.ingredients);
    }
  };

  const isOverridden = scheduledMenu && (
    JSON.stringify([...localMainFoods].sort()) !== JSON.stringify([...scheduledMenu.mainFoods].sort()) ||
    JSON.stringify([...localIngredients].sort()) !== JSON.stringify([...scheduledMenu.ingredients].sort())
  );

  const hasActiveSchedule = !!scheduledMenu;

  const handleRemoveMainFood = (name: string) => setLocalMainFoods(prev => prev.filter(i => i !== name));
  const handleAddMainFood = (name: string) => name && !localMainFoods.includes(name) && setLocalMainFoods(prev => [...prev, name]);
  const handleRemoveIngredient = (name: string) => setLocalIngredients(prev => prev.filter(i => i !== name));
  const handleAddIngredient = (name: string) => name && !localIngredients.includes(name) && setLocalIngredients(prev => [...prev, name]);

  const handleProcessConsumption = async () => {
    if (!isHoliday) {
      if (localMainFoods.length === 0) {
        alert('कृपया मुख्य आहार निवडा.');
        return;
      }
      if (!primaryCount && !upperCount) {
        alert('कृपया विद्यार्थ्यांची उपस्थिती प्रविष्ट करा.');
        return;
      }
      if (Number(primaryCount) > enrollment.primary || Number(upperCount) > enrollment.upper) {
        alert('उपस्थिती पटसंख्येपेक्षा जास्त असू शकत नाही.');
        return;
      }

      // BORROWED STOCK CHECK
      const newItems = Array.from(new Set([...localMainFoods, ...localIngredients])).filter(Boolean);
      const foundDeficits: {name: string, deficit: number}[] = [];
      
      newItems.forEach(item => {
        const deductKg = calculateRequirement(item);
        const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
        if (currentStock) {
          const balance = Number(currentStock.current_balance);
          if (balance < deductKg) {
            foundDeficits.push({ name: item, deficit: Number((deductKg - balance).toFixed(3)) });
          }
        }
      });

      if (foundDeficits.length > 0) {
        setDeficitItems(foundDeficits);
        setShowBorrowedModal(true);
        return;
      }
    }
    performSave();
  };

  const performSave = async () => {
    setLoading(true);
    setStatus({ type: '', text: '' });
    setShowBorrowedModal(false);

    try {
      const [oldConsumptionRes, existingDailyRes] = await Promise.all([
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle(),
        (supabase as any).from('daily_logs').select('id').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle()
      ]);

      const oldConsumption = oldConsumptionRes.data;
      const verifiedDailyId = existingDailyRes.data?.id;

      // Restore old stock
      if (oldConsumption) {
        const oldItems = Array.from(new Set([...(oldConsumption.main_foods_all || [oldConsumption.main_food]), ...(oldConsumption.ingredients_used || [])])).filter(Boolean);
        for (const item of oldItems as string[]) {
          const grams = foodGramsMap[item] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
          const restoreKg = ((Number(oldConsumption.meals_served_primary || 0) * grams.primary) + (Number(oldConsumption.meals_served_upper_primary || 0) * grams.upper)) / 1000;
          if (restoreKg > 0) {
            const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
            if (currentStock) {
              const restoredBalance = Number(currentStock.current_balance) + restoreKg;
              await (supabase as any).from('inventory_stock').update({ current_balance: restoredBalance }).eq('id', currentStock.id);
              currentStock.current_balance = restoredBalance;
            }
          }
        }
      }

      // Deduct new stock (Allowing Negative/Borrowed)
      if (!isHoliday) {
        const newItems = Array.from(new Set([...localMainFoods, ...localIngredients])).filter(Boolean);
        for (const item of newItems) {
          const deductKg = calculateRequirement(item);
          if (deductKg > 0) {
            const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
            if (currentStock) {
              const newBalance = Number(currentStock.current_balance) - deductKg;
              await (supabase as any).from('inventory_stock').update({ current_balance: newBalance }).eq('id', currentStock.id);
              currentStock.current_balance = newBalance;
            }
          }
        }
      }

      const dailyPayload = {
        teacher_id: userId, log_date: targetDate, is_holiday: isHoliday, holiday_remarks: holidayRemarks,
        meals_served_primary: Number(primaryCount || 0), meals_served_upper_primary: Number(upperCount || 0)
      };

      if (verifiedDailyId) {
        await (supabase as any).from('daily_logs').update(dailyPayload).eq('id', verifiedDailyId);
      } else {
        await (supabase as any).from('daily_logs').insert([dailyPayload]);
      }

      const auditPayload = {
        teacher_id: userId, log_date: targetDate, is_holiday: isHoliday, holiday_remarks: holidayRemarks,
        meals_served_primary: Number(primaryCount || 0), meals_served_upper_primary: Number(upperCount || 0),
        main_food: localMainFoods[0] || '', main_foods_all: localMainFoods, ingredients_used: localIngredients,
        is_overridden: isOverridden, original_template: scheduledMenu ? JSON.stringify(scheduledMenu) : null
      };

      if (oldConsumption) {
        await (supabase as any).from('consumption_logs').update(auditPayload).eq('id', oldConsumption.id);
      } else {
        await (supabase as any).from('consumption_logs').insert([auditPayload]);
      }

      setStatus({ type: 'success', text: isEditing ? 'नोंद अपडेट केली (Log updated)!' : 'नोंद यशस्वीरित्या जतन केली (Log submitted)!' });
      setTimeout(() => { onSuccess(); onClose(); }, 1000);
    } catch (err: any) {
      alert("⚠️ ERROR: " + err.message);
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!existingLogId || !window.confirm("Are you sure? Stock will be restored.")) return;
    setLoading(true);
    try {
      const { data: oldConsumption } = await (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle();
      if (oldConsumption) {
        const itemsToRestore = Array.from(new Set([...(oldConsumption.main_foods_all || [oldConsumption.main_food]), ...(oldConsumption.ingredients_used || [])])).filter(Boolean);
        for (const item of itemsToRestore as string[]) {
          const grams = foodGramsMap[item] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
          const kgToRestore = ((Number(oldConsumption.meals_served_primary || 0) * grams.primary) + (Number(oldConsumption.meals_served_upper_primary || 0) * grams.upper)) / 1000;
          if (kgToRestore > 0) {
            const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
            if (currentStock) {
              const newBalance = Number(currentStock.current_balance) + kgToRestore;
              await (supabase as any).from('inventory_stock').update({ current_balance: newBalance }).eq('id', currentStock.id);
            }
          }
        }
        await (supabase as any).from('consumption_logs').delete().eq('id', oldConsumption.id);
      }
      await (supabase as any).from('daily_logs').delete().eq('id', existingLogId);
      alert("Log deleted & stock restored.");
      onSuccess(); onClose();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors z-10 bg-white rounded-full p-1">
        <X size={24} />
      </button>

      <div className="p-8 pb-0 border-b pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Daily Log: <span className="text-[#3c8dbc]">{targetDate}</span></h1>
        <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase mt-1">Automated Stock Deduction Engine</p>
      </div>

      <div className="mx-8 mt-4 p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={isHoliday} onChange={e => { setIsHoliday(e.target.checked); if (e.target.checked) { setPrimaryCount('0'); setUpperCount('0'); setLocalMainFoods([]); setLocalIngredients([]); } }} />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </div>
          <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">
            {isHoliday ? 'शाळा सुट्टी आहे (Holiday Active)' : 'शाळा सुरू आहे (School Open)'}
          </span>
        </label>
        {isHoliday && <input type="text" value={holidayRemarks} onChange={e => setHolidayRemarks(e.target.value)} placeholder="कारण (Name of Holiday)" className="flex-1 p-2.5 text-[11px] font-bold border-2 border-indigo-200 bg-white rounded-xl outline-none" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 border-r border-slate-100">
          {!isHoliday && (
            <>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calculator size={18} className="text-[#3c8dbc]" /> Attendance Input
              </h3>
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Primary Students (I - V) [Max: {enrollment.primary}]</label>
                  <input type="number" value={primaryCount} onChange={e => setPrimaryCount(e.target.value)} disabled={!hasActiveSchedule} className={`w-full border-2 p-3 bg-slate-50 font-black ${Number(primaryCount) > enrollment.primary ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} placeholder="0" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Upper Primary (VI - VIII) [Max: {enrollment.upper}]</label>
                  <input type="number" value={upperCount} onChange={e => setUpperCount(e.target.value)} disabled={!hasActiveSchedule} className={`w-full border-2 p-3 bg-slate-50 font-black ${Number(upperCount) > enrollment.upper ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`} placeholder="0" />
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50/50 border-2 border-blue-200/50 rounded-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-blue-100 pb-3">
                  <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} className="text-blue-600" /> आजचा आहार (Smart Override)</h4>
                  {isOverridden && (
                    <button onClick={handleReset} className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm border border-amber-500/50 flex items-center gap-1.5 transition-all">
                      <RefreshCcw size={14} className="animate-none group-hover:animate-spin-slow" /> शेड्यूलनुसार रिसेट करा
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase mb-2 block">मुख्य आहार (Main Dishes)</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[60px] items-center mb-3">
                      {localMainFoods.map(item => (
                        <span key={item} className="bg-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase flex items-center gap-2 shadow-md">
                          {item} <Trash2 size={14} className="cursor-pointer" onClick={() => handleRemoveMainFood(item)} />
                        </span>
                      ))}
                    </div>
                    <select onChange={e => { handleAddMainFood(e.target.value); e.target.value = ""; }} className="w-full p-2.5 text-[10px] font-black bg-white border-2 border-blue-100 rounded-xl outline-none">
                      <option value="">+ मुख्य आहार जोडा</option>
                      {masterMainFoods.map(f => <option key={f.item_code} value={f.item_name}>{f.item_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase mb-2 block">घटक (Ingredients)</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[60px] items-center">
                      {localIngredients.map(item => (
                        <span key={item} className="bg-white border-2 border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-700 uppercase flex items-center gap-2">
                          {item} <Trash2 size={14} className="cursor-pointer text-blue-400" onClick={() => handleRemoveIngredient(item)} />
                        </span>
                      ))}
                    </div>
                    <select onChange={e => { handleAddIngredient(e.target.value); e.target.value = ""; }} className="w-full mt-3 p-2.5 text-[10px] font-black bg-blue-900 text-white rounded-xl outline-none">
                      <option value="">+ घटक जोडा</option>
                      {masterIngredients.map(i => <option key={i.item_code} value={i.item_name}>{i.item_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 mt-6">
            <button onClick={handleProcessConsumption} disabled={loading || (!isHoliday && localMainFoods.length === 0)} className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-4 flex justify-center items-center gap-3 text-xs uppercase tracking-widest transition-all shadow-xl disabled:bg-slate-400">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isHoliday ? 'Holiday Submit' : (isEditing ? 'Attendance Update' : 'Log Submit')}
            </button>
            {isEditing && (
              <button onClick={handleDeleteLog} className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 font-bold py-3 text-[10px] uppercase transition-all flex justify-center items-center gap-2">
                <Trash2 size={14} /> Delete & Restore Stock
              </button>
            )}
          </div>
          {status.text && <div className={`mt-4 p-3 text-[11px] font-black border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{status.text}</div>}
        </div>

        {!isHoliday && (
          <div className="p-8 bg-[#474379] text-white overflow-hidden relative">
             <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={120} />
             <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2"><ArrowRight size={18} /> Projected Stock Impact</h3>
             <div className="space-y-4 relative z-10">
                {[...localMainFoods, ...localIngredients].filter(Boolean).map(item => {
                  const req = calculateRequirement(item);
                  const avl = liveStockMap[item] || (foodNameMap[item] ? liveStockMap[foodNameMap[item]] : 0) || 0;
                  const balanceAfter = avl - req;
                  const isBorrowed = balanceAfter < 0;
                  const pct = avl > 0 ? Math.max(0, Math.min(100, (balanceAfter / avl) * 100)) : 0;

                  return (
                    <div key={item} className={`p-4 border group transition-all ${isBorrowed ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/10'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-black uppercase">{item}</span>
                        <span className="text-[10px] font-bold text-white/60">REQ: {req.toFixed(2)} KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
                           <div className={`h-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : 'bg-green-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-black ${isBorrowed ? 'text-red-400' : 'text-white/80'}`}>
                          {isBorrowed ? `⚠️ ${Math.abs(balanceAfter).toFixed(2)} KG उसने` : `${balanceAfter.toFixed(2)} KG REM`}
                        </span>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* BORROWED STOCK MODAL */}
      {showBorrowedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-amber-200">
            <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-full text-amber-600"><AlertTriangle size={32} /></div>
              <div><h3 className="text-xl font-black text-amber-900">अपुरा साठा (Insufficient Stock)</h3><p className="text-amber-700/80 text-sm font-bold mt-1">स्टॉक शिल्लक नसल्यामुळे धान्य उसने घ्यावे लागेल.</p></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-slate-600 text-sm font-medium mb-3">पुरेसा साठा उपलब्ध नाही. खालील धान्य उसणे वापरावे लागेल:</p>
                <div className="space-y-2">{deficitItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"><span className="font-black text-slate-800 text-[13px]">{item.name}</span><span className="text-red-600 font-black text-sm">{item.deficit} KG उसने</span></div>
                ))}</div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setShowBorrowedModal(false)} className="flex-1 bg-white border-2 py-3 rounded-xl font-black text-xs uppercase">रद्द करा</button>
              <button onClick={performSave} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><Utensils size={16} /> उसणे धान्य वापरा</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
