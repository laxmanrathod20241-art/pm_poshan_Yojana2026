// @ts-nocheck
import { useState, useEffect } from 'react';
import { calculateConsumedKg } from '../utils/inventoryUtils';
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
  
  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);
  
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
    
    try 
    {
      const [masterRes, enrollmentRes, existingLogRes, consumptionLogRes] = await Promise.all([
        (supabase as any).from('menu_master').select('*').eq('teacher_id', userId),
        (supabase as any).from('student_enrollment').select('*').eq('teacher_id', userId).maybeSingle(),
        (supabase as any).from('daily_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle(),
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle(),
        (supabase as any).from('profiles').select('has_primary, has_upper_primary').eq('id', userId).single()
      ]);


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

      if (profileRes.data) {
        setHasPrimary(profileRes.data.has_primary ?? true);
        setHasUpperPrimary(profileRes.data.has_upper_primary ?? true);
      }

      // FIX 1: Timezone Safe Date Parsing & Week of the Month Logic
      const [year, month, day] = targetDate.split('-');
      const targetDateObj = new Date(Number(year), Number(month) - 1, Number(day));
      
      const dayOfWeek = targetDateObj.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const stringDay = dayNames[dayOfWeek];
      
      // Calculate Week 1, 2, 3, 4 of the CURRENT MONTH, not the year.
      const dateOfMonth = targetDateObj.getDate();
      const weekNum = Math.ceil(dateOfMonth / 7);
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
    return calculateConsumedKg(
      Number(primaryCount || 0),
      Number(upperCount || 0),
      grams.primary,
      grams.upper
    );
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
        setStatus({ type: 'error', text: 'कृपया मुख्य आहार निवडा.' });
        return;
      }
      if (!primaryCount && !upperCount) {
        setStatus({ type: 'error', text: 'कृपया विद्यार्थ्यांची उपस्थिती प्रविष्ट करा.' });
        return;
      }
      if (hasPrimary && enrollment.primary > 0 && Number(primaryCount) > enrollment.primary) {
        setStatus({ type: 'error', text: 'प्राथमिक उपस्थिती पटसंख्येपेक्षा जास्त असू शकत नाही.' });
        return;
      }
      if (hasUpperPrimary && enrollment.upper > 0 && Number(upperCount) > enrollment.upper) {
        setStatus({ type: 'error', text: 'उच्च प्राथमिक उपस्थिती पटसंख्येपेक्षा जास्त असू शकत नाही.' });
        return;
      }

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

      // Safe Audit Payload without holiday flags to avoid Postgres schema mismatch errors
      const auditPayload = {
        teacher_id: userId, log_date: targetDate,
        meals_served_primary: Number(primaryCount || 0), meals_served_upper_primary: Number(upperCount || 0),
        main_food: localMainFoods[0] || '', main_foods_all: localMainFoods, ingredients_used: localIngredients,
        is_overridden: isOverridden, original_template: scheduledMenu ? JSON.stringify(scheduledMenu) : null
      };

      const supabaseAny: any = supabase;
      if (oldConsumption) {
        await supabaseAny.from('consumption_logs').update(auditPayload).eq('id', (oldConsumption as any).id);
      } else {
        await supabaseAny.from('consumption_logs').insert([auditPayload]);
      }

      setStatus({ type: 'success', text: isEditing ? 'नोंद अपडेट केली (Log updated)!' : 'नोंद यशस्वीरित्या जतन केली (Log submitted)!' });
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', text: "⚠️ जतन करण्यात त्रुटी (Save Error): " + err.message });
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
      setStatus({ type: 'success', text: "Log deleted & stock restored." });
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', text: "Error deleting log: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white max-w-4xl w-full h-[95vh] md:h-auto md:max-h-[90vh] overflow-hidden rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 flex flex-col relative mt-16 md:mt-24 mx-auto">
      {/* High-Tech Header */}
      <div className="bg-[#474379] py-4 px-6 md:px-10 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <ArrowRight className="absolute -right-4 -bottom-4 text-white/10" size={120} />
        <div className="relative z-10">
          <h1 className="text-lg md:text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <Utensils className="text-blue-400" size={24} /> Daily Log Entry
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-white/20 px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">{targetDate}</span>
            <p className="text-white/40 font-bold tracking-widest text-[9px] uppercase">Consumption Engine</p>
          </div>
        </div>
            <button 
                  onClick={onClose} 
                  aria-label="Close form" 
                  title="Close"
                  className="bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-xl transition-all active:scale-90 relative z-10"
                >
                  <X size={24} />
            </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Toggle Section */}
        <div className="px-5 md:px-10 py-6 bg-indigo-50/50 border-b border-indigo-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                <AlertTriangle size={20} />
             </div>
             <label className="flex items-center gap-4 cursor-pointer group flex-1">
               <div className="relative">
                 <input type="checkbox" className="sr-only peer" checked={isHoliday} onChange={e => { setIsHoliday(e.target.checked); if (e.target.checked) { setPrimaryCount('0'); setUpperCount('0'); setLocalMainFoods([]); setLocalIngredients([]); } }} />
                 <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
               </div>
               <span className="text-[11px] md:text-sm font-black text-indigo-900 uppercase tracking-widest italic group-hover:text-blue-600 transition-colors">
                 {isHoliday ? 'शाळा सुट्टी आहे (Holiday Active)' : 'शाळा सुरू आहे (School Open)'}
               </span>
             </label>
          </div>
          {isHoliday && <input type="text" value={holidayRemarks} onChange={e => setHolidayRemarks(e.target.value)} placeholder="कारण (Name of Holiday)" className="w-full md:flex-1 p-4 text-sm font-black border-2 border-indigo-200 bg-white rounded-2xl outline-none shadow-inner" />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Form Side */}
          <div className="p-5 md:p-10 lg:border-r border-slate-100 space-y-8">
            {!isHoliday && (
              <>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Calculator size={18} className="text-[#3c8dbc]" /> Attendance Input
                </h3>
                <div className={`grid ${hasPrimary && hasUpperPrimary ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {hasPrimary && (
                    <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm focus-within:border-blue-500 transition-all animate-in zoom-in-95 duration-300">
                       <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Primary (I-V)</label>
                      <input type="number" value={primaryCount} onChange={e => setPrimaryCount(e.target.value)} disabled={!hasActiveSchedule} className={`w-full text-2xl font-black bg-white border-none outline-none ${(enrollment.primary > 0 && Number(primaryCount) > enrollment.primary) ? 'text-red-600' : 'text-slate-800'}`} placeholder="0" />
                    </div>
                  )}
                  {hasUpperPrimary && (
                    <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm focus-within:border-blue-500 transition-all animate-in zoom-in-95 duration-300">
                       <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Upper (VI-VIII)</label>
                      <input type="number" value={upperCount} onChange={e => setUpperCount(e.target.value)} disabled={!hasActiveSchedule} className={`w-full text-2xl font-black bg-white border-none outline-none ${(enrollment.upper > 0 && Number(upperCount) > enrollment.upper) ? 'text-red-600' : 'text-slate-800'}`} placeholder="0" />
                    </div>
                  )}
                </div>

                <div className="p-6 bg-blue-50/50 border-2 border-blue-200/50 rounded-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100 pb-3 gap-2">
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} className="text-blue-600" /> आजचा आहार (Smart Override)</h4>
                    {isOverridden && (
                      <button onClick={handleReset} className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm border border-amber-500/50 flex items-center gap-1.5 transition-all">
                        <RefreshCcw size={14} /> रिसेट करा
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
                      {/* FIX 3: Force controlled component value to reset to default properly */}
                      <select 
                        aria-label="मुख्य आहार जोडा (Add Main Dish)" 
                        title="Add Main Dish"
                        value={""} 
                        onChange={e => { handleAddMainFood(e.target.value); (e.target as any).value = ""; }} 
                        className="w-full mt-2 p-3 text-[11px] font-black border-2 border-dashed border-blue-200 bg-white/80 rounded-xl text-blue-600 outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                      >
                        <option value="" disabled>+ मुख्य आहार जोडा</option>
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
                      {/* FIX 3: Force controlled component value to reset to default properly */}
                      <select 
                        aria-label="घटक जोडा (Add Ingredient)" 
                        title="Add Ingredient"
                        value={""} 
                        onChange={e => { handleAddIngredient(e.target.value); (e.target as any).value = ""; }} 
                        className="w-full mt-2 p-3 text-[11px] font-black border-2 border-dashed border-blue-200 bg-white/80 rounded-xl text-blue-600 outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                      >
                        <option value="" disabled>+ घटक जोडा</option>
                        {masterIngredients.map(i => <option key={i.item_code} value={i.item_name}>{i.item_name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="sticky lg:relative bottom-0 bg-white/95 backdrop-blur-xl border-t lg:border-none p-5 lg:p-0 flex flex-col gap-3 z-30">
              <button 
                onClick={handleProcessConsumption} 
                disabled={loading || (!isHoliday && localMainFoods.length === 0)} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-5 rounded-3xl flex justify-center items-center gap-4 text-xs md:text-sm uppercase tracking-[0.2em] transition-all shadow-xl disabled:bg-slate-300"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                {isHoliday ? 'Submit Holiday' : (isEditing ? 'Update Entry' : 'Post Consumption')}
              </button>
              {isEditing && (
                <button onClick={handleDeleteLog} className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-100 font-extrabold py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex justify-center items-center gap-2 active:scale-95">
                  <Trash2 size={16} /> Delete & Reset Stock
                </button>
              )}
              {status.text && <div className={`p-4 rounded-2xl text-[10px] md:text-xs font-black border-2 text-center animate-in slide-in-from-bottom-5 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{status.text}</div>}
            </div>
          </div>

          {/* Impact/Visual Side */}
          {!isHoliday && (
            <div className="p-5 md:p-10 bg-[#474379] text-white overflow-hidden relative">
               <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={120} />
               <h3 className="text-[11px] md:text-sm font-black uppercase tracking-widest mb-10 flex items-center gap-3"><ArrowRight size={24} className="text-blue-400" /> Projected Inventory Impact</h3>
               <div className="space-y-4 relative z-10 no-scrollbar overflow-y-auto max-h-[500px]">
                  {[...localMainFoods, ...localIngredients].filter(Boolean).map(item => {
                    const req = calculateRequirement(item);
                    const avl = liveStockMap[item] || (foodNameMap[item] ? liveStockMap[foodNameMap[item]] : 0) || 0;
                    const balanceAfter = avl - req;
                    const isBorrowed = balanceAfter < 0;
                    const pct = avl > 0 ? Math.max(0, Math.min(100, (balanceAfter / avl) * 100)) : 0;

                    return (
                      <div key={item} className={`p-4 border group transition-all rounded-2xl ${isBorrowed ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/10'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[12px] font-black uppercase">{item}</span>
                          <span className="text-[10px] font-bold text-white/60">REQ: {req.toFixed(2)} KG</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 overflow-hidden rounded-full">
                             {/* eslint-disable-next-line */}
                             {/* webhint-disable no-inline-styles */}
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
      </div>

      {/* BORROWED STOCK MODAL */}
      {showBorrowedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border border-amber-200 animate-in fade-in zoom-in-95 duration-200">
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
              <button onClick={() => setShowBorrowedModal(false)} className="flex-1 bg-white border-2 py-3 rounded-xl font-black text-xs uppercase shadow-sm">रद्द करा</button>
              <button 
                onClick={performSave} 
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all active:scale-95"
              >
                <Utensils size={16} /> उसणे धान्य वापरा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
