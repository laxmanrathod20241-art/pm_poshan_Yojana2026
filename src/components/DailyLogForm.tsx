import { useState, useEffect } from 'react';
import { calculateConsumedKg } from '../utils/inventoryUtils';
import { api } from '../lib/apiClient';
import type { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthProvider';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Utensils, 
  ArrowRight,
  Loader2,
  X,
  Trash2,
  RefreshCcw,
  Lock
} from 'lucide-react';

type InventoryStock = Database['public']['Tables']['inventory_stock']['Row'];
type MenuItemMaster = Database['public']['Tables']['menu_master']['Row'];
type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
type ConsumptionLogEntry = Database['public']['Tables']['consumption_logs']['Row'];
type MenuSchedule = Database['public']['Tables']['menu_weekly_schedule']['Row'];
type EnrollmentEntity = Database['public']['Tables']['student_enrollment']['Row'];

interface MenuTemplate {
  mainFoods: string[];
  ingredients: string[];
}

interface DailyLogFormProps {
  targetDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

export default function DailyLogForm({ targetDate, onClose, onSuccess }: DailyLogFormProps) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [primaryCount, setPrimaryCount] = useState<string>('');
  const [upperCount, setUpperCount] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayRemarks, setHolidayRemarks] = useState('');
  const [foodNameMap, setFoodNameMap] = useState<Record<string, string>>({});
  const [foodGramsMap, setFoodGramsMap] = useState<Record<string, {primary: number, upper: number}>>({});
  const [enrollment, setEnrollment] = useState({ primary: 0, upper: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  
  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);
  
  // Master Data & Template Logic
  const [masterMainFoods, setMasterMainFoods] = useState<MenuItemMaster[]>([]);
  const [masterIngredients, setMasterIngredients] = useState<MenuItemMaster[]>([]);
  const [scheduledMenu, setScheduledMenu] = useState<MenuTemplate | null>(null);
  
  // Form State (The Override Layer)
  const [localMainFoods, setLocalMainFoods] = useState<string[]>([]);
  const [localIngredients, setLocalIngredients] = useState<string[]>([]);

  // Borrowed Stock States
  const [showBorrowedModal, setShowBorrowedModal] = useState(false);
  const [deficitItems, setDeficitItems] = useState<{name: string, deficit: number}[]>([]);
  const [isOrphan, setIsOrphan] = useState(false);

  const GRAMS_PRIMARY = 100; 
  const GRAMS_UPPER = 150;

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
      const [masterRes, enrollmentRes, existingLogRes, consumptionLogRes, profileRes] = await Promise.all([
        api.from('menu_master').select('*').eq('teacher_id', userId).returns<MenuItemMaster[]>(),
        api.from('student_enrollment').select('*').eq('teacher_id', userId).returns<EnrollmentEntity>().maybeSingle(),
        api.from('daily_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).returns<DailyLog>().maybeSingle(),
        api.from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', targetDate).returns<ConsumptionLogEntry>().maybeSingle(),
        api.from('profiles').select('has_primary, has_upper_primary').eq('id', userId).returns<any>().maybeSingle()
      ]);

      console.log("DailyLogForm Diagnostic:", {
        targetDate,
        enrollmentData: enrollmentRes.data,
        profileData: profileRes.data,
        masterCount: masterRes.data?.length || 0
      });

      const mapping: Record<string, string> = {};
      const gramsMap: Record<string, {primary: number, upper: number}> = {};
      
      if (masterRes.data) {
        setMasterMainFoods(masterRes.data.filter((i: any) => String(i.item_category).toUpperCase() === 'MAIN'));
        setMasterIngredients(masterRes.data.filter((i: any) => String(i.item_category).toUpperCase() === 'INGREDIENT'));
        masterRes.data.forEach((m: any) => {
          mapping[m.item_code] = m.item_name;
          gramsMap[m.item_name] = { primary: m.grams_primary, upper: m.grams_upper_primary };
          if (m.item_code) gramsMap[m.item_code] = { primary: m.grams_primary, upper: m.grams_upper_primary };
        });
        setFoodNameMap(mapping);
        setFoodGramsMap(gramsMap);
      }

      // Calculate enrollment totals once
      let ePrimary = 0;
      let eUpper = 0;
      if (enrollmentRes.data) {
        const e = enrollmentRes.data;
        ePrimary = (Number(e.std_1) || 0) + (Number(e.std_2) || 0) + (Number(e.std_3) || 0) + (Number(e.std_4) || 0) + (Number(e.std_5) || 0);
        eUpper = (Number(e.std_6) || 0) + (Number(e.std_7) || 0) + (Number(e.std_8) || 0);
        setEnrollment({ primary: ePrimary, upper: eUpper });
        console.log("Registry Counts Loaded:", { ePrimary, eUpper });
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
      
      const dateOfMonth = targetDateObj.getDate();
      const weekNum = Math.ceil(dateOfMonth / 7);
      const scheduleType = weekNum % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';
      
      const { data: menu } = await api
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .returns<MenuSchedule>().maybeSingle();
      
      let templateMF: string[] = [];
      let templateIng: string[] = [];
      if (menu) {
        templateMF = (menu.main_food_codes || []).map((code: string) => mapping[code]).filter(Boolean) as string[];
        templateIng = (menu.menu_items || []).map((code: string) => mapping[code]).filter(Boolean) as string[];
        setScheduledMenu({ mainFoods: templateMF, ingredients: templateIng });
      }

      if (existingLogRes.data) {
        console.log("Existing Log Data:", existingLogRes.data);
        setIsEditing(true);
        setExistingLogId(existingLogRes.data.id);
        setIsHoliday(existingLogRes.data.is_holiday || false);
        setHolidayRemarks(existingLogRes.data.holiday_remarks || '');
        
        // Populate counts - if they were zero but registry has data, and user wants auto-fill
        const savedP = existingLogRes.data.meals_served_primary;
        const savedU = existingLogRes.data.meals_served_upper_primary;
        
        setPrimaryCount(savedP != null ? String(savedP) : '');
        setUpperCount(savedU != null ? String(savedU) : '');
        
        if (consumptionLogRes.data) {
          const validMF = (consumptionLogRes.data.main_foods_all || (consumptionLogRes.data.main_food ? [consumptionLogRes.data.main_food] : [])).filter(name => !!gramsMap[name]);
          const validIng = (consumptionLogRes.data.ingredients_used || []).filter(name => !!gramsMap[name]);
          setLocalMainFoods(validMF);
          setLocalIngredients(validIng);
        } else {
          setLocalMainFoods(templateMF);
          setLocalIngredients(templateIng);
        }
      } else {
        // Check for Orphans (Consumption data exists without a Daily Log record)
        if (consumptionLogRes.data) {
          setIsOrphan(true);
          const validMF = (consumptionLogRes.data.main_foods_all || (consumptionLogRes.data.main_food ? [consumptionLogRes.data.main_food] : [])).filter(name => !!gramsMap[name]);
          const validIng = (consumptionLogRes.data.ingredients_used || []).filter(name => !!gramsMap[name]);
          setLocalMainFoods(validMF);
          setLocalIngredients(validIng);
          setPrimaryCount(String(consumptionLogRes.data.meals_served_primary || 0));
          setUpperCount(String(consumptionLogRes.data.meals_served_upper_primary || 0));
        } else {
          setIsOrphan(false);
          console.log("New Log Entry. Filling with Registry:", { ePrimary, eUpper });
          setIsEditing(false);
          if (profileRes.data?.has_primary !== false) {
            setPrimaryCount(String(ePrimary));
          }
          if (profileRes.data?.has_upper_primary !== false) {
            setUpperCount(String(eUpper));
          }
          setLocalMainFoods(templateMF);
          setLocalIngredients(templateIng);
        }
      }

      const { data: stock } = await api.from('inventory_stock').select('*').eq('teacher_id', userId).returns<InventoryStock[]>();
      setInventory(stock || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRequirement = (itemIdentifier?: string, scope?: 'primary' | 'upper_primary') => {
    if (!primaryCount && !upperCount) return 0;
    const grams = (itemIdentifier && foodGramsMap[itemIdentifier]);
    if (!grams) return 0; // Prevent calculation for ghost/unassigned items
    
    if (scope === 'primary') {
      return (Number(primaryCount || 0) * grams.primary) / 1000;
    }
    if (scope === 'upper_primary') {
      return (Number(upperCount || 0) * (grams.upper || 0)) / 1000;
    }

    // Fallback/Legacy: combined calculation
    return calculateConsumedKg(
      Number(primaryCount || 0),
      Number(upperCount || 0),
      grams.primary,
      grams.upper || 0
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
        setStatus({ type: 'error', text: 'उपस्थिती एकूण पटसंख्येपेक्षा जास्त असू शकत नाही' });
        return;
      }
      if (hasUpperPrimary && enrollment.upper > 0 && Number(upperCount) > enrollment.upper) {
        setStatus({ type: 'error', text: 'उपस्थिती एकूण पटसंख्येपेक्षा जास्त असू शकत नाही' });
        return;
      }

      const newItems = Array.from(new Set([...localMainFoods, ...localIngredients])).filter(Boolean);
      const foundDeficits: {name: string, deficit: number}[] = [];
      
      newItems.forEach(item => {
        // Check Primary Deficit
        if (Number(primaryCount) > 0) {
          const reqP = calculateRequirement(item, 'primary');
          const stockP = inventory.find(i => (i.item_name === item || i.item_code === item) && i.standard_group === 'primary');
          if (stockP && Number(stockP.current_balance) < reqP) {
            foundDeficits.push({ name: `${item} (Primary)`, deficit: Number((reqP - Number(stockP.current_balance)).toFixed(3)) });
          }
        }

        // Check Upper Primary Deficit
        if (Number(upperCount) > 0) {
          const reqU = calculateRequirement(item, 'upper_primary');
          const stockU = inventory.find(i => (i.item_name === item || i.item_code === item) && i.standard_group === 'upper_primary');
          if (stockU && Number(stockU.current_balance) < reqU) {
            foundDeficits.push({ name: `${item} (Upper Primary)`, deficit: Number((reqU - Number(stockU.current_balance)).toFixed(3)) });
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
      // Transform grams map for RPC
      const gramsPrimaryMap: Record<string, number> = {};
      const gramsUpperMap: Record<string, number> = {};
      Object.entries(foodGramsMap).forEach(([name, g]) => {
        gramsPrimaryMap[name] = g.primary;
        gramsUpperMap[name] = g.upper || 0;
      });

      const { error } = await (api.rpc as any)('process_daily_consumption', {
        p_teacher_id: userId,
        p_log_date: targetDate,
        p_is_holiday: isHoliday,
        p_holiday_remarks: holidayRemarks,
        p_meals_primary: Number(primaryCount || 0),
        p_meals_upper: Number(upperCount || 0),
        p_main_foods: localMainFoods,
        p_ingredients: localIngredients,
        p_is_overridden: isOverridden,
        p_original_template: scheduledMenu,
        p_grams_primary: gramsPrimaryMap,
        p_grams_upper: gramsUpperMap
      });

      if (error) throw error;

      setStatus({ type: 'success', text: isEditing ? 'नोंद अपडेट केली (Log updated)!' : 'नोंद यशस्वीरित्या जतन केली (Log submitted)!' });
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      console.error("Save Error:", err);
      setStatus({ type: 'error', text: "⚠️ जतन करण्यात त्रुटी (Save Error): " + (err.message || "Unknown error") });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!existingLogId || !window.confirm("Are you sure? Stock will be restored and this entry will be removed from all reports.")) return;
    setLoading(true);
    try {
      // 1. Fetch the consumption log to know what to restore
      const { data: oldConsumption } = await api.from('consumption_logs')
        .select('*')
        .eq('teacher_id', userId)
        .eq('log_date', targetDate)
        .returns<ConsumptionLogEntry>().maybeSingle();
      
      if (oldConsumption) {
        // 2. Attempt Stock Restoration (Non-blocking for the whole process)
        const itemsToRestore = Array.from(new Set([
          ...(oldConsumption.main_foods_all || (oldConsumption.main_food ? [oldConsumption.main_food] : [])), 
          ...(oldConsumption.ingredients_used || [])
        ])).filter(Boolean);

        for (const item of itemsToRestore as string[]) {
          try {
            const grams = foodGramsMap[item] || { primary: GRAMS_PRIMARY, upper: GRAMS_UPPER };
            const kgToRestore = ((Number(oldConsumption.meals_served_primary || 0) * grams.primary) + (Number(oldConsumption.meals_served_upper_primary || 0) * grams.upper)) / 1000;
            
            if (kgToRestore > 0) {
              const currentStock = inventory.find(i => i.item_name === item || i.item_code === item || (foodNameMap[item] && i.item_name === foodNameMap[item]));
              if (currentStock) {
                const newBalance = Number(currentStock.current_balance) + kgToRestore;
                await (api.from('inventory_stock') as any).update({ current_balance: newBalance }).eq('id', currentStock.id);
              }
            }
          } catch (restoreErr) {
            console.error(`Failed to restore stock for ${item}:`, restoreErr);
          }
        }
      }
      
      // 3. Delete ALL Consumption Logs for this date (ALWAYS run to clear orphans)
      await (api.from('consumption_logs') as any)
        .delete()
        .eq('teacher_id', userId)
        .eq('log_date', targetDate);
      
      // 4. Delete ALL Daily Logs for this date (Main Record)
      await (api.from('daily_logs') as any)
        .delete()
        .eq('teacher_id', userId)
        .eq('log_date', targetDate);

      // 5. Clear all relevant report snapshots to force recalculation
      const dateParts = targetDate.split('-');
      const month = parseInt(dateParts[1]);
      const year = parseInt(dateParts[0]);
      
      // Clear Monthly Reports & Daily Ledger Snapshots
      await (api.from('monthly_reports') as any)
        .delete()
        .eq('teacher_id', userId)
        .eq('report_month', month)
        .eq('report_year', year);

      // Clear Mandhan Snapshots (fuel/veg totals depend on meals served)
      await (api.from('monthly_mandhan') as any)
        .delete()
        .eq('teacher_id', userId)
        .eq('report_month', month)
        .eq('report_year', year);

      // Clear Item Ledger Snapshots (These often cover a range, so we clear the teacher's cache to be safe)
      await (api.from('item_ledger_reports') as any)
        .delete()
        .eq('teacher_id', userId);

      setStatus({ type: 'success', text: "नोंद डिलीट केली आणि रिपोर्ट रिसेट केले!" });
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err: any) {
      console.error("Delete Error:", err);
      setStatus({ type: 'error', text: "Error deleting log: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white max-w-4xl w-full rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 flex flex-col relative mx-auto overflow-hidden">
      {/* High-Tech Header */}
      <div className="bg-[#474379] py-2.5 px-6 md:px-8 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <ArrowRight className="absolute -right-4 -bottom-4 text-white/10" size={120} />
        <div className="relative z-10">
          <h1 className="text-lg md:text-xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
             <Utensils className="text-blue-400" size={20} /> Daily Log Entry
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-white/20 px-3 py-0.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">{targetDate}</span>
            <p className="text-white/40 font-bold tracking-widest text-[9px] uppercase">Consumption Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
            {/* Holiday Toggle in Header */}
            <label className="flex items-center gap-3 cursor-pointer group">
               <div className="relative">
                 <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={isHoliday} 
                   onChange={e => { 
                     setIsHoliday(e.target.checked); 
                     if (e.target.checked) { 
                       setPrimaryCount('0'); 
                       setUpperCount('0'); 
                       setLocalMainFoods([]); 
                       setLocalIngredients([]); 
                     } 
                   }} 
                 />
                 <div className="w-10 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-400"></div>
               </div>
               <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:text-blue-300 transition-colors">
                 {isHoliday ? 'शाळा सुट्टी आहे (Holiday)' : 'शाळेला सुट्टी असेल तर येथे क्लिक करा'}
               </span>
            </label>

            <button 
                  onClick={onClose} 
                  aria-label="Close form" 
                  title="Close"
                  className="bg-white/10 hover:bg-white/20 p-2 md:p-3 rounded-xl transition-all active:scale-90 relative z-10"
                >
                  <X size={24} />
            </button>
        </div>
      </div>

      {isOrphan && (
        <div className="mx-4 sm:mx-8 mt-4 mb-2 bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600 flex-shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-amber-900 text-[10px] font-black uppercase tracking-tight">⚠️ "ऑर्फन" डेटा सापडला (Orphan Data Found)</p>
              <p className="text-amber-700 text-[9px] font-bold leading-tight mt-0.5">या दिवसाची नोंद रजिस्टरमध्ये नाही, पण साठा वापरला गेला आहे. यामुळे रिपोर्टमध्ये फरक येतोय.</p>
            </div>
          </div>
          <button 
            onClick={handleDeleteLog} 
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            दुरुस्त करा (Clear)
          </button>
        </div>
      )}

      <div className="flex-1 no-scrollbar">
        {/* Holiday Remarks Section (Only visible when it is a holiday) */}
        {isHoliday && (
          <div className="px-4 sm:px-8 py-3 bg-indigo-50/50 border-b border-indigo-100 flex flex-col md:flex-row gap-3 items-center">
             <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                    <AlertTriangle size={20} />
                </div>
                <div className="text-[11px] font-black text-indigo-900 uppercase">सुट्टीचे कारण लिहा:</div>
              </div>
            <input type="text" value={holidayRemarks} onChange={e => setHolidayRemarks(e.target.value)} placeholder="कारण (Name of Holiday)" className="w-full md:flex-1 p-4 text-sm font-black border-2 border-indigo-200 bg-white rounded-2xl outline-none shadow-inner" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Form Side */}
           <div className="p-4 sm:p-6 lg:border-r border-slate-100 space-y-4 sm:space-y-6">
            {!isHoliday && (
              <>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Calculator size={18} className="text-[#3c8dbc]" /> Attendance Input
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   {hasPrimary ? (
                    <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-100 shadow-sm focus-within:border-blue-500 transition-all animate-in zoom-in-95 duration-300 relative group/input">
                        <div className="flex justify-between items-center mb-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary (I-V)</label>
                           {enrollment.primary > 0 && (
                             <button 
                               type="button"
                               onClick={() => setPrimaryCount(String(enrollment.primary))}
                               className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1 hover:text-blue-700 transition-colors"
                               title="Sync with Registry"
                             >
                               Reg: {enrollment.primary} <RefreshCcw size={8} />
                             </button>
                           )}
                        </div>
                        <input type="number" value={primaryCount} onChange={e => setPrimaryCount(e.target.value)} max={enrollment.primary} disabled={!hasActiveSchedule} className={`w-full text-xl font-black bg-white border-none outline-none ${(enrollment.primary > 0 && Number(primaryCount) > enrollment.primary) ? 'text-red-600' : 'text-slate-800'}`} placeholder="0" />
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col justify-between opacity-80">
                       <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-widest flex items-center gap-1.5">Primary <Lock size={10} /></label>
                       <a href="/enrollment" className="text-[9px] font-black text-blue-600 uppercase hover:underline">Activate</a>
                    </div>
                  )}
                   {hasUpperPrimary ? (
                    <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-100 shadow-sm focus-within:border-blue-500 transition-all animate-in zoom-in-95 duration-300 relative group/input">
                        <div className="flex justify-between items-center mb-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upper (VI-VIII)</label>
                           {enrollment.upper > 0 && (
                             <button 
                               type="button"
                               onClick={() => setUpperCount(String(enrollment.upper))}
                               className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1 hover:text-amber-700 transition-colors"
                               title="Sync with Registry"
                             >
                               Reg: {enrollment.upper} <RefreshCcw size={8} />
                             </button>
                           )}
                        </div>
                        <input type="number" value={upperCount} onChange={e => setUpperCount(e.target.value)} max={enrollment.upper} disabled={!hasActiveSchedule} className={`w-full text-xl font-black bg-white border-none outline-none ${(enrollment.upper > 0 && Number(upperCount) > enrollment.upper) ? 'text-red-600' : 'text-slate-800'}`} placeholder="0" />
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col justify-between opacity-80">
                       <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 tracking-widest flex items-center gap-1.5">Upper <Lock size={10} /></label>
                       <a href="/enrollment" className="text-[9px] font-black text-blue-600 uppercase hover:underline">Activate</a>
                    </div>
                  )}
                </div>

                 <div className="p-4 bg-blue-50/50 border-2 border-blue-200/50 rounded-2xl space-y-3">
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
                       <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[40px] items-center mb-2">
                        {localMainFoods.length === 0 && <span className="text-[10px] font-bold text-slate-400 italic px-2">No main dishes selected or available.</span>}
                        {localMainFoods.map(item => (
                           <span key={item} className="bg-blue-600 px-2 py-0.5 rounded-lg text-[9px] font-black text-white uppercase flex items-center gap-1.5 shadow-md">
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
                       <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[40px] items-center">
                        {localIngredients.length === 0 && <span className="text-[10px] font-bold text-slate-400 italic px-2">No ingredients selected or available.</span>}
                        {localIngredients.map(item => (
                           <span key={item} className="bg-white border-2 border-blue-100 px-2 py-0.5 rounded-lg text-[9px] font-black text-blue-700 uppercase flex items-center gap-1.5">
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

             <div className="sticky lg:relative bottom-0 bg-white/95 backdrop-blur-xl border-t lg:border-none p-3 lg:p-0 flex flex-col gap-2 z-30">
              {!isEditing && (
                <button 
                  onClick={handleProcessConsumption} 
                  disabled={loading || (!isHoliday && localMainFoods.length === 0)} 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-3.5 rounded-2xl flex justify-center items-center gap-4 text-xs md:text-sm uppercase tracking-[0.2em] transition-all shadow-xl disabled:bg-slate-300"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                  {isHoliday ? 'Submit Holiday' : 'Post Consumption'}
                </button>
              )}
              {isEditing && (
                 <button onClick={handleDeleteLog} className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-100 font-extrabold py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all flex justify-center items-center gap-2 active:scale-95">
                  <Trash2 size={16} /> Delete & Reset Stock
                </button>
              )}
              {status.text && <div className={`p-4 rounded-2xl text-[10px] md:text-xs font-black border-2 text-center animate-in slide-in-from-bottom-5 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>{status.text}</div>}
            </div>
          </div>

          {/* Impact/Visual Side */}
          {!isHoliday && (
            <div className="p-4 sm:p-6 bg-[#474379] text-white overflow-hidden relative">
               <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={120} />
                <h3 className="text-[11px] md:text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3"><ArrowRight size={20} className="text-blue-400" /> Projected Inventory Impact</h3>
                <div className="space-y-4 relative z-10 no-scrollbar overflow-y-auto max-h-[500px] pr-2">
                  {/* Primary Section */}
                  {hasPrimary && (
                    <div className="space-y-3">
                       <h4 className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Impact (Primary I-V)</h4>
                      {Number(primaryCount) > 0 ? [...localMainFoods, ...localIngredients].filter(Boolean).map(item => {
                        const req = calculateRequirement(item, 'primary');
                        if (req === 0) return null;
                        const stockP = inventory.find(i => (i.item_name === item || i.item_code === item) && i.standard_group === 'primary');
                        const avl = stockP ? Number(stockP.current_balance) : 0;
                        const balanceAfter = avl - req;
                        const isBorrowed = balanceAfter < 0;

                        const getWidthClass = (ratioVal: number) => {
                          if (ratioVal <= 0) return 'w-0';
                          if (ratioVal <= 0.1) return 'w-[10%]';
                          if (ratioVal <= 0.2) return 'w-[20%]';
                          if (ratioVal <= 0.3) return 'w-[30%]';
                          if (ratioVal <= 0.4) return 'w-[40%]';
                          if (ratioVal <= 0.5) return 'w-1/2';
                          if (ratioVal <= 0.6) return 'w-[60%]';
                          if (ratioVal <= 0.7) return 'w-[70%]';
                          if (ratioVal <= 0.8) return 'w-[80%]';
                          if (ratioVal <= 0.9) return 'w-[90%]';
                          return 'w-full';
                        };
                        const ratio = avl > 0 ? (balanceAfter / avl) : 0;

                        return (
                           <div key={`${item}-p`} className={`p-2 border transition-all rounded-lg ${isBorrowed ? 'bg-red-500/20 border-red-500/40' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black uppercase text-white truncate max-w-[120px]">{item}</span>
                              <span className="text-[8px] font-bold text-white/50">REQ: {req.toFixed(3)} KG</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-white/10 overflow-hidden rounded-full">
                                 <div className={`h-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : 'bg-blue-400'} ${getWidthClass(ratio)}`} />
                              </div>
                              <span className={`text-[8px] font-black ${isBorrowed ? 'text-red-400' : 'text-white/70'}`}>
                                {isBorrowed ? `⚠️ ${Math.abs(balanceAfter).toFixed(3)}` : `${balanceAfter.toFixed(3)} KG`}
                              </span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="py-8 text-center border border-dashed border-white/5 rounded-xl opacity-30">
                           <p className="text-[8px] font-black uppercase tracking-widest italic">Attendance Missing</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upper Primary Section */}
                  {hasUpperPrimary && (
                    <div className="space-y-3">
                       <h4 className="text-[9px] font-black text-amber-300 uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Impact (Upper VI-VIII)</h4>
                      {Number(upperCount) > 0 ? [...localMainFoods, ...localIngredients].filter(Boolean).map(item => {
                        const req = calculateRequirement(item, 'upper_primary');
                        if (req === 0) return null;
                        const stockU = inventory.find(i => (i.item_name === item || i.item_code === item) && i.standard_group === 'upper_primary');
                        const avl = stockU ? Number(stockU.current_balance) : 0;
                        const balanceAfter = avl - req;
                        const isBorrowed = balanceAfter < 0;
                        
                        const getWidthClass = (ratioVal: number) => {
                          if (ratioVal <= 0) return 'w-0';
                          if (ratioVal <= 0.1) return 'w-[10%]';
                          if (ratioVal <= 0.2) return 'w-[20%]';
                          if (ratioVal <= 0.3) return 'w-[30%]';
                          if (ratioVal <= 0.4) return 'w-[40%]';
                          if (ratioVal <= 0.5) return 'w-1/2';
                          if (ratioVal <= 0.6) return 'w-[60%]';
                          if (ratioVal <= 0.7) return 'w-[70%]';
                          if (ratioVal <= 0.8) return 'w-[80%]';
                          if (ratioVal <= 0.9) return 'w-[90%]';
                          return 'w-full';
                        };
                        const ratio = avl > 0 ? (balanceAfter / avl) : 0;

                        return (
                           <div key={`${item}-u`} className={`p-2 border transition-all rounded-lg ${isBorrowed ? 'bg-red-500/20 border-red-500/40' : 'bg-white/5 border-white/5'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black uppercase text-white truncate max-w-[120px]">{item}</span>
                              <span className="text-[8px] font-bold text-white/50">REQ: {req.toFixed(3)} KG</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-white/10 overflow-hidden rounded-full">
                                 <div className={`h-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : 'bg-amber-400'} ${getWidthClass(ratio)}`} />
                              </div>
                              <span className={`text-[8px] font-black ${isBorrowed ? 'text-red-400' : 'text-white/70'}`}>
                                {isBorrowed ? `⚠️ ${Math.abs(balanceAfter).toFixed(3)}` : `${balanceAfter.toFixed(3)} KG`}
                              </span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="py-8 text-center border border-dashed border-white/5 rounded-xl opacity-30">
                           <p className="text-[8px] font-black uppercase tracking-widest italic">Attendance Missing</p>
                        </div>
                      )}
                    </div>
                  )}

                  {(!primaryCount && !upperCount) && (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20">
                      <Calculator size={48} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Enter Attendance</p>
                    </div>
                  )}
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
