import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Utensils, 
  ArrowRight,
  TrendingDown,
  Loader2,
  X,
  Trash2
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
  const [todayMenu, setTodayMenu] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [foodNameMap, setFoodNameMap] = useState<Record<string, string>>({});
  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  const [foodGramsMap, setFoodGramsMap] = useState<Record<string, {primary: number, upper: number}>>({});
  const [enrollment, setEnrollment] = useState({ primary: 0, upper: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: '', text: '' });

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
    setLoading(true);
    try {
      // 1. Fetch Food Names, Enrollment, and Existing Log
      const [globalRes, localRes, masterRes, enrollmentRes, existingLogRes] = await Promise.all([
        (supabase as any).from('global_food_master').select('code, name'),
        (supabase as any).from('local_food_master').select('local_code, name'),
        (supabase as any).from('menu_master').select('item_code, item_name, grams_primary, grams_upper_primary').eq('teacher_id', userId),
        (supabase as any).from('student_enrollment').select('*').eq('teacher_id', userId).maybeSingle(),
        (supabase as any).from('daily_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).maybeSingle()
      ]);

      const mapping: Record<string, string> = {};
      const gramsMap: Record<string, {primary: number, upper: number}> = {};
      globalRes.data?.forEach((f: any) => { mapping[f.code] = f.name; });
      localRes.data?.forEach((f: any) => { mapping[f.local_code] = f.name; });
      masterRes.data?.forEach((f: any) => { 
        mapping[f.item_code] = f.item_name; 
        gramsMap[f.item_code] = { primary: f.grams_primary, upper: f.grams_upper_primary };
        gramsMap[f.item_name] = { primary: f.grams_primary, upper: f.grams_upper_primary };
      });
      setFoodNameMap(mapping);
      setFoodGramsMap(gramsMap);

      if (existingLogRes.data) {
        setPrimaryCount(existingLogRes.data.meals_served_primary != null ? String(existingLogRes.data.meals_served_primary) : '');
        setUpperCount(existingLogRes.data.meals_served_upper_primary != null ? String(existingLogRes.data.meals_served_upper_primary) : '');
        setExistingLogId(existingLogRes.data.id);
        setIsEditing(true);
      } else {
        setPrimaryCount('');
        setUpperCount('');
        setExistingLogId(null);
        setIsEditing(false);
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
      const days = Math.floor((targetDateObj.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil(days / 7);
      const scheduleType = weekNumber % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';
      
      const { data: menu } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .single();
      
      setTodayMenu(menu);

      const { data: stock } = await (supabase as any)
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId);
      
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

  const getRequiredKg = (itemIdentifier: string) => {
    if (!primaryCount && !upperCount) return 0;
    const grams = foodGramsMap[itemIdentifier] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
    const totalGrams = (Number(primaryCount || 0) * grams.primary) + (Number(upperCount || 0) * grams.upper);
    return totalGrams / 1000; 
  };

  const handleProcessConsumption = async () => {
    if (!todayMenu) {
      const msg = 'No menu scheduled for this day.';
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }
    if (!primaryCount && !upperCount) {
      const msg = 'Please enter attendance counts.';
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }

    if (Number(primaryCount) > enrollment.primary || Number(upperCount) > enrollment.upper) {
      const msg = `Submitted count exceeds unified enrollment baseline.\nMax Primary: ${enrollment.primary}\nMax Upper: ${enrollment.upper}\nPlease check counts.`;
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }

    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
      let oldPrimary = 0;
      let oldUpper = 0;

      if (isEditing) {
         const { data: oldLog, error: oldLogError } = await (supabase as any)
           .from('daily_logs')
           .select('meals_served_primary, meals_served_upper_primary')
           .eq('teacher_id', userId)
           .eq('log_date', targetDate)
           .single();
           
         if (oldLogError && oldLogError.code !== 'PGRST116') {
             throw new Error("Failed to fetch existing log for comparison: " + oldLogError.message);
         }
           
         if (oldLog) {
           oldPrimary = Number(oldLog.meals_served_primary) || 0;
           oldUpper = Number(oldLog.meals_served_upper_primary) || 0;
         }
      }

      const mainFoods = todayMenu.main_food_codes || [];
      const ingredients = todayMenu.menu_items || [];
      const itemsToDeduct = [...new Set([...mainFoods, ...ingredients])];
      
      for (const itemName of itemsToDeduct) {
        // Calculate the exact kilo difference between the old cached log and this new save
        const grams = foodGramsMap[itemName] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
        const oldGrams = (oldPrimary * grams.primary) + (oldUpper * grams.upper);
        const newGrams = (Number(primaryCount || 0) * grams.primary) + (Number(upperCount || 0) * grams.upper);
        
        const deltaKg = (newGrams - oldGrams) / 1000;
        
        if (deltaKg !== 0) {
          const mappedName = foodNameMap[itemName];
          const currentStock = inventory.find(i => 
            i.item_name === itemName || 
            i.item_code === itemName || 
            (mappedName && i.item_name === mappedName)
          );

          if (currentStock) {
            // Subtract the delta. If served 5 MORE kids, delta is positive (balance drops). 
            // If served 5 FEWER kids, delta is negative (balance replenishes mathematically).
            const newBalance = Math.max(0, Number(currentStock.current_balance) - deltaKg);
            
            const { error: stockErr } = await (supabase as any)
              .from('inventory_stock')
              .update({ current_balance: newBalance })
              .eq('id', currentStock.id)
              .eq('teacher_id', userId);
              
            if (stockErr) throw new Error("Inventory Update Error: " + stockErr.message);
          }
        }
      }

      const payload = {
        meals_served_primary: Number(primaryCount || 0),
        meals_served_upper_primary: Number(upperCount || 0)
      };

      let dbError;
      if (isEditing && existingLogId) {
        const { error } = await (supabase as any)
          .from('daily_logs')
          .update(payload)
          .eq('id', existingLogId)
          .eq('teacher_id', userId);
        dbError = error;
      } else {
        const { error } = await (supabase as any)
          .from('daily_logs')
          .insert([{ ...payload, teacher_id: userId, log_date: targetDate }]);
        dbError = error;
      }
      
      if (dbError) throw dbError;

      setStatus({ type: 'success', text: isEditing ? 'Log updated successfully!' : 'Log submitted successfully!' });
      setPrimaryCount('');
      setUpperCount('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Daily Log Save Error:", err.message);
      alert("Failed to save log: " + err.message);
      setStatus({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!existingLogId) return;
    if (!window.confirm("Are you sure you want to delete this log?\nAll deducted stock from this day will be fully mathematically restored to your current inventory balances.")) return;

    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
       const { data: oldLog, error: fetchErr } = await (supabase as any)
         .from('daily_logs')
         .select('*')
         .eq('id', existingLogId)
         .single();
         
       if (fetchErr) throw fetchErr;

       const mainFoods = todayMenu?.main_food_codes || [];
       const ingredients = todayMenu?.menu_items || [];
       const itemsToRestore = [...new Set([...mainFoods, ...ingredients])];
       
       const oldPrimary = Number(oldLog?.meals_served_primary || 0);
       const oldUpper = Number(oldLog?.meals_served_upper_primary || 0);

       // Restore stock loop
       for (const itemName of itemsToRestore) {
         const grams = foodGramsMap[itemName] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
         const oldGrams = (oldPrimary * grams.primary) + (oldUpper * grams.upper);
         const kgToRestore = oldGrams / 1000;
         
         if (kgToRestore > 0) {
            const mappedName = foodNameMap[itemName];
            const currentStock = inventory.find(i => 
              i.item_name === itemName || 
              i.item_code === itemName || 
              (mappedName && i.item_name === mappedName)
            );

            if (currentStock) {
              const newBalance = Number(currentStock.current_balance) + kgToRestore;
              const { error: stockErr } = await (supabase as any)
                .from('inventory_stock')
                .update({ current_balance: newBalance })
                .eq('id', currentStock.id)
                .eq('teacher_id', userId);
                
              if (stockErr) throw new Error("Failed to restore stock: " + stockErr.message);
            }
         }
       }

       // Delete the log
       const { data: delData, error: delErr } = await (supabase as any)
         .from('daily_logs')
         .delete()
         .eq('id', existingLogId)
         .eq('teacher_id', userId)
         .select();
         
       if (delErr) throw delErr;
       if (!delData || delData.length === 0) {
           throw new Error("Supabase rejected deletion. It is likely that the Row Level Security (RLS) policy for 'daily_logs' on your database does not permit DELETE actions for this role.");
       }

       alert("Log fully deleted and daily stock deductions have been safely restored to inventory.");
       onSuccess();
       onClose();
    } catch (err: any) {
       console.error("Delete Log Error:", err);
       alert("Error deleting log: " + err.message);
       setStatus({ type: 'error', text: err.message });
    } finally {
       setLoading(false);
    }
  };

  const hasActiveSchedule = todayMenu && ((todayMenu.main_food_codes?.length || 0) > 0 || (todayMenu.menu_items?.length || 0) > 0);

  return (
    <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors z-10 bg-white rounded-full p-1">
        <X size={24} />
      </button>

      <div className="p-8 pb-0 border-b pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Daily Log: <span className="text-[#3c8dbc]">{targetDate}</span></h1>
        <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase mt-1">Automated Stock Deduction Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 border-r border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Calculator size={18} className="text-[#3c8dbc]" /> Attendance Input
          </h3>
          
          <div className="space-y-6">
            <div>
               <div className="flex justify-between items-end mb-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Students (I - V)</label>
                 <span className="text-[9px] font-bold text-blue-600 uppercase italic">Max Enrolled: {enrollment.primary}</span>
               </div>
              <input 
                type="number" value={primaryCount} 
                onChange={e => setPrimaryCount(e.target.value)}
                disabled={!hasActiveSchedule}
                className={`w-full border-2 p-3 bg-slate-50 font-black text-slate-800 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${Number(primaryCount) > enrollment.primary ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
                placeholder="0"
              />
               {Number(primaryCount) > enrollment.primary && <p className="text-[9px] text-red-500 font-bold mt-1.5 uppercase tracking-tighter">⚠️ Exceeds enrollment registry!</p>}
            </div>
            <div>
               <div className="flex justify-between items-end mb-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upper Primary (VI - VIII)</label>
                 <span className="text-[9px] font-bold text-[#474379] uppercase italic">Max Enrolled: {enrollment.upper}</span>
               </div>
              <input 
                type="number" value={upperCount} 
                onChange={e => setUpperCount(e.target.value)}
                disabled={!hasActiveSchedule}
                className={`w-full border-2 p-3 bg-slate-50 font-black text-slate-800 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${Number(upperCount) > enrollment.upper ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500'}`}
                placeholder="0"
              />
               {Number(upperCount) > enrollment.upper && <p className="text-[9px] text-red-500 font-bold mt-1.5 uppercase tracking-tighter">⚠️ Exceeds enrollment registry!</p>}
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100">
            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Target Date's Active Menu</h4>
            {todayMenu ? (
              <div className="space-y-3">
                {todayMenu.main_food_codes?.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Main Dishes</p>
                    <div className="flex flex-wrap gap-2">
                      {todayMenu.main_food_codes.map((code: string) => (
                        <span key={code} className="bg-blue-600 px-2 py-1 text-[11px] font-bold text-white uppercase shadow-sm">
                          {foodNameMap[code] || code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {todayMenu.menu_items?.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                      {todayMenu.menu_items.map((item: string) => (
                        <span key={item} className="bg-white px-2 py-1 border border-blue-200 text-[11px] font-bold text-blue-700 uppercase">
                          {foodNameMap[item] || item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-500 text-xs font-bold leading-relaxed">⚠️ No active menu scheduled for this day (Holiday/Sunday). Consumption cannot be logged.</div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <button 
              onClick={handleProcessConsumption}
              disabled={loading || !hasActiveSchedule}
              className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-4 shadow-xl shadow-blue-500/20 flex justify-center items-center gap-3 text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isEditing ? 'UPDATE ATTENDANCE' : 'SUBMIT LOG'}
            </button>

            {isEditing && (
              <button 
                onClick={handleDeleteLog}
                disabled={loading}
                className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 font-bold py-3 flex justify-center items-center gap-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                Delete Entire Log & Restore Stock
              </button>
            )}
          </div>

          {status.text && (
            <div className={`mt-4 p-3 text-[11px] font-black uppercase tracking-widest border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
               {status.text}
            </div>
          )}
        </div>

        <div className="p-8 bg-[#474379] text-white relative overflow-hidden">
           <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={120} />
           <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
             <ArrowRight size={18} /> Projected Stock Impact
           </h3>

           <div className="space-y-4 relative z-10">
              {(() => {
                const mainFoods = todayMenu?.main_food_codes || [];
                const ingredients = todayMenu?.menu_items || [];
                const allItems = [...new Set([...mainFoods, ...ingredients])];

                return allItems.map((item: string) => {
                  const requiredKg = getRequiredKg(item);
                  const mappedName = foodNameMap[item];
                  const availableKg = liveStockMap[item] || (mappedName ? liveStockMap[mappedName] : 0) || 0;
                  const isLow = availableKg < requiredKg;
                  const pct = availableKg > 0 ? Math.min(100, (requiredKg / availableKg) * 100) : (requiredKg > 0 ? 100 : 0);

                  return (
                    <div key={item} className={`bg-white/10 p-3 border group transition-all ${isLow ? 'border-red-500/50 hover:bg-red-500/10' : 'border-white/10 hover:bg-white/20'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-black uppercase tracking-tight">
                          {foodNameMap[item] || item}
                        </span>
                        <span className="text-[10px] font-bold text-white/60">REQ: {requiredKg.toFixed(2)} KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isLow ? 'bg-red-400' : 'bg-green-400'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-black ${isLow ? 'text-red-300' : 'text-white/80'}`}>
                          {availableKg.toFixed(2)} KG
                        </span>
                      </div>
                      {isLow ? (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-red-300 uppercase">
                          <AlertTriangle size={10} /> {availableKg === 0 ? 'Out of Stock' : 'Low Stock'} (Needs {requiredKg.toFixed(2)}kg)
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-green-400 uppercase">
                          <CheckCircle2 size={10} /> Sufficient Stock
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              {!todayMenu && (
                 <div className="p-10 text-center border-2 border-dashed border-white/20 opacity-40">
                    <p className="text-xs font-black uppercase tracking-widest">Waiting for active menu...</p>
                 </div>
              )}
           </div>

           <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-3">
              <TrendingDown className="text-red-300 shrink-0" size={16} />
              <p className="text-[9px] font-bold text-white/60 leading-relaxed uppercase">
                Uses standard rates: I-V: {GRAMS_PRIMARY}g • VI-VIII: {GRAMS_UPPER}g 
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
