import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Trash2
} from 'lucide-react';

export default function ConsumptionLog() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [primaryCount, setPrimaryCount] = useState<number | ''>('');
  const [upperCount, setUpperCount] = useState<number | ''>('');
  
  // Master Data & Template Logic
  const [masterMainFoods, setMasterMainFoods] = useState<any[]>([]);
  const [masterIngredients, setMasterIngredients] = useState<any[]>([]);
  const [scheduledMenu, setScheduledMenu] = useState<{ mainFoods: string[], ingredients: string[] } | null>(null);
  
  // Form State (The Override Layer)
  const [localMainFoods, setLocalMainFoods] = useState<string[]>([]);
  const [localIngredients, setLocalIngredients] = useState<string[]>([]);
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [status, setStatus] = useState({ type: '', text: '' });
  
  // Borrowed Stock States
  const [showBorrowedModal, setShowBorrowedModal] = useState(false);
  const [deficitItems, setDeficitItems] = useState<{name: string, deficit: number}[]>([]);

  // PM-POSHAN Standard Grams per Student
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
  }, [userId]);

  const [isEditing, setIsEditing] = useState(false);
  const [enrollment, setEnrollment] = useState({ primary: 0, upper: 0 });

  const fetchMenuAndStock = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date().getDay(); 
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const stringDay = dayNames[dayOfWeek];
      
      const startDate = new Date(new Date().getFullYear(), 0, 1);
      const days = Math.floor((new Date().getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil(days / 7);
      const scheduleType = weekNumber % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';

      const [menuRes, masterRes, enrollmentRes, existingRes] = await Promise.all([
        (supabase as any).from('menu_weekly_schedule').select('*').eq('teacher_id', userId).eq('day_name', stringDay).eq('week_pattern', scheduleType).eq('is_active', true).maybeSingle(),
        (supabase as any).from('menu_master').select('item_code, item_name, item_category').eq('teacher_id', userId),
        (supabase as any).from('student_enrollment').select('*').eq('teacher_id', userId).maybeSingle(),
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', todayStr).maybeSingle()
      ]);

      if (masterRes.data) {
        setMasterMainFoods(masterRes.data.filter((i: any) => i.item_category === 'MAIN'));
        setMasterIngredients(masterRes.data.filter((i: any) => i.item_category === 'INGREDIENT'));
      }

      if (enrollmentRes.data) {
        const e = enrollmentRes.data;
        setEnrollment({
          primary: (e.std_1 || 0) + (e.std_2 || 0) + (e.std_3 || 0) + (e.std_4 || 0) + (e.std_5 || 0),
          upper: (e.std_6 || 0) + (e.std_7 || 0) + (e.std_8 || 0)
        });
      }

      let template: any = null;
      if (menuRes.data) {
        const scheduledMainFoods = (menuRes.data.main_food_codes || []).map((code: string) => {
          const item = masterRes.data?.find((m: any) => m.item_code === code);
          return item ? item.item_name : code;
        });
        const scheduledIngredients = (menuRes.data.menu_items || []).map((code: string) => {
          const item = masterRes.data?.find((m: any) => m.item_code === code);
          return item ? item.item_name : code;
        });
        template = { mainFoods: scheduledMainFoods, ingredients: scheduledIngredients };
        setScheduledMenu(template);
      }

      if (existingRes.data) {
        setIsEditing(true);
        setPrimaryCount(existingRes.data.meals_served_primary || '');
        setUpperCount(existingRes.data.meals_served_upper_primary || '');
        setLocalMainFoods(existingRes.data.main_foods_all || (existingRes.data.main_food ? [existingRes.data.main_food] : []));
        setLocalIngredients(existingRes.data.ingredients_used || []);
      } else if (template) {
        setIsEditing(false);
        setLocalMainFoods(template.mainFoods);
        setLocalIngredients(template.ingredients);
      }

      const { data: stock } = await (supabase as any).from('inventory_stock').select('*').eq('teacher_id', userId);
      setInventory(stock || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMainFood = (name: string) => {
    setLocalMainFoods(prev => prev.filter(i => i !== name));
  };

  const handleAddMainFood = (name: string) => {
    if (name && !localMainFoods.includes(name)) {
      setLocalMainFoods(prev => [...prev, name]);
    }
  };

  const handleRemoveIngredient = (name: string) => {
    setLocalIngredients(prev => prev.filter(i => i !== name));
  };

  const handleAddIngredient = (name: string) => {
    if (name && !localIngredients.includes(name)) {
      setLocalIngredients(prev => [...prev, name]);
    }
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

  const calculateRequirement = () => {
    if (!primaryCount && !upperCount) return 0;
    const totalGrams = (Number(primaryCount || 0) * GRAMS_PRIMARY) + (Number(upperCount || 0) * GRAMS_UPPER);
    return totalGrams / 1000; 
  };

  const handleProcessConsumption = async () => {
    if (localMainFoods.length === 0) {
      const msg = 'कृपया मुख्य आहार निवडा.';
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }
    if (!primaryCount && !upperCount) {
      const msg = 'कृपया विद्यार्थ्यांची उपस्थिती प्रविष्ट करा.';
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }
    if (Number(primaryCount) > enrollment.primary || Number(upperCount) > enrollment.upper) {
      const msg = 'उपस्थिती पटसंख्येपेक्षा जास्त असू शकत नाही.';
      alert(msg);
      setStatus({ type: 'error', text: msg });
      return;
    }

    // BORROWED STOCK CHECK
    const newItems = Array.from(new Set([...localMainFoods, ...localIngredients])).filter(Boolean);
    const foundDeficits: {name: string, deficit: number}[] = [];
    const deductKg = calculateRequirement();

    newItems.forEach(item => {
      const currentStock = inventory.find(i => i.item_name === item || i.item_code === item);
      if (currentStock) {
        const balance = Number(currentStock.current_balance);
        if (balance < deductKg) {
          foundDeficits.push({
            name: item,
            deficit: Number((deductKg - balance).toFixed(3))
          });
        }
      }
    });

    if (foundDeficits.length > 0) {
      setDeficitItems(foundDeficits);
      setShowBorrowedModal(true);
      return;
    }

    performSave();
  };

  const performSave = async () => {
    setLoading(true);
    setStatus({ type: '', text: '' });
    setShowBorrowedModal(false);

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [oldConsumptionRes, existingDailyRes] = await Promise.all([
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', userId).eq('log_date', todayStr).maybeSingle(),
        (supabase as any).from('daily_logs').select('id, is_holiday').eq('teacher_id', userId).eq('log_date', todayStr).maybeSingle()
      ]);

      const oldConsumption = oldConsumptionRes.data;
      const verifiedDailyId = existingDailyRes.data?.id;

      if (oldConsumption) {
        const oldItems = Array.from(new Set([
          ...(oldConsumption.main_foods_all || [oldConsumption.main_food]), 
          ...(oldConsumption.ingredients_used || [])
        ])).filter(Boolean);

        for (const item of oldItems as string[]) {
          const oldPrimary = Number(oldConsumption.meals_served_primary || 0);
          const oldUpper = Number(oldConsumption.meals_served_upper_primary || 0);
          const restoreKg = ((oldPrimary * GRAMS_PRIMARY) + (oldUpper * GRAMS_UPPER)) / 1000;
          
          if (restoreKg > 0) {
            const currentStock = inventory.find(i => i.item_name === item || i.item_code === item);
            if (currentStock) {
              const restoredBalance = Number(currentStock.current_balance) + restoreKg;
              const { error: rErr } = await (supabase as any).from('inventory_stock').update({ current_balance: restoredBalance }).eq('id', currentStock.id);
              if (rErr) throw new Error("Stock Restoration Failed: " + rErr.message);
              currentStock.current_balance = restoredBalance;
            }
          }
        }
      }

      const newItems = Array.from(new Set([...localMainFoods, ...localIngredients])).filter(Boolean);
      for (const item of newItems) {
        const deductKg = calculateRequirement();
        if (deductKg > 0) {
          const currentStock = inventory.find(i => i.item_name === item || i.item_code === item);
          if (currentStock) {
            const newBalance = Number(currentStock.current_balance) - deductKg;
            const { error: dErr } = await (supabase as any).from('inventory_stock').update({ current_balance: newBalance }).eq('id', currentStock.id);
            if (dErr) throw new Error("Stock Deduction Failed: " + dErr.message);
            currentStock.current_balance = newBalance;
          }
        }
      }

      const dailyPayload = {
        teacher_id: userId,
        meals_served_primary: Number(primaryCount || 0),
        meals_served_upper_primary: Number(upperCount || 0),
        log_date: todayStr,
        is_holiday: false 
      };

      if (verifiedDailyId) {
        const { error: uErr } = await (supabase as any).from('daily_logs').update(dailyPayload).eq('id', verifiedDailyId);
        if (uErr) throw new Error("Attendance Update Failed: " + uErr.message);
      } else {
        const { error: iErr } = await (supabase as any).from('daily_logs').insert([dailyPayload]);
        if (iErr) throw new Error("Attendance Submission Failed: " + iErr.message);
      }

      const consumptionPayload = {
        teacher_id: userId,
        meals_served_primary: Number(primaryCount || 0),
        meals_served_upper_primary: Number(upperCount || 0),
        main_food: localMainFoods[0] || '',
        main_foods_all: localMainFoods,
        ingredients_used: localIngredients,
        log_date: todayStr,
        is_overridden: isOverridden,
        original_template: scheduledMenu ? JSON.stringify(scheduledMenu) : null
      };

      if (oldConsumption) {
        const { error: cErr } = await (supabase as any).from('consumption_logs').update(consumptionPayload).eq('id', oldConsumption.id);
        if (cErr) throw new Error("Menu Update Failed: " + cErr.message);
      } else {
        const { error: cErr } = await (supabase as any).from('consumption_logs').insert([consumptionPayload]);
        if (cErr) throw new Error("Menu Submission Failed: " + cErr.message);
      }

      setStatus({ type: 'success', text: isEditing ? 'नोंद अपडेट केली (Log updated)!' : 'नोंद यशस्वीरित्या जतन केली (Log submitted)!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-1 z-10 relative pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-white p-5 border-t-4 border-[#3c8dbc] shadow-lg">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calculator size={18} className="text-[#3c8dbc]" /> Attendance Input
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Primary Students (I - V)</label>
                  <input
                    type="number" value={primaryCount}
                    onChange={e => setPrimaryCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-black text-slate-800 text-xl focus:border-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Upper Primary (VI - VIII)</label>
                  <input
                    type="number" value={upperCount}
                    onChange={e => setUpperCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-black text-slate-800 text-xl focus:border-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50/50 border-2 border-blue-200/50 rounded-2xl backdrop-blur-md shadow-inner space-y-6">
                <div className="flex justify-between items-center border-b border-blue-100 pb-3">
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                      <Utensils size={14} className="text-blue-600" /> आजचा आहार (Smart Override)
                    </h4>
                    <p className="text-[9px] font-bold text-blue-600/70 mt-0.5 italic">नोंद: हा बदल फक्त आजच्या नोंदीसाठी आहे.</p>
                  </div>
                  {isOverridden && (
                    <button 
                      onClick={handleReset}
                      className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-[10px] px-3 py-1.5 rounded-lg shadow-sm border border-amber-500/50 flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                      <RefreshCcw size={14} className="animate-none group-hover:animate-spin-slow" /> 
                      शेड्यूलनुसार रिसेट करा
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 block">आजचे मुख्य आहार</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[60px] items-center mb-3">
                      {localMainFoods.map((item: string) => (
                        <span key={item} className="bg-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase flex items-center gap-2 shadow-md">
                          {item}
                          <Trash2 
                            size={14} 
                            className="cursor-pointer text-blue-200 hover:text-white" 
                            onClick={() => handleRemoveMainFood(item)}
                          />
                        </span>
                      ))}
                    </div>
                    <select 
                      onChange={(e) => {handleAddMainFood(e.target.value); e.target.value = "";}}
                      className="w-full p-2.5 text-[10px] font-black bg-white border-2 border-blue-100 text-blue-900 rounded-xl outline-none"
                    >
                      <option value="">+ मुख्य आहार जोडा</option>
                      {masterMainFoods.map(food => (
                        <option key={food.item_code} value={food.item_name}>{food.item_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 block">वापरलेले घटक</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[60px] items-center">
                      {localIngredients.map((item: string) => (
                        <span key={item} className="bg-white border-2 border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-700 uppercase flex items-center gap-2">
                          {item}
                          <Trash2 
                            size={14} 
                            className="cursor-pointer text-blue-400 hover:text-red-500" 
                            onClick={() => handleRemoveIngredient(item)}
                          />
                        </span>
                      ))}
                    </div>
                    <select 
                      onChange={(e) => {handleAddIngredient(e.target.value); e.target.value = "";}}
                      className="w-full mt-3 p-2.5 text-[10px] font-black bg-blue-900 text-white rounded-xl outline-none"
                    >
                      <option value="">+ घटक जोडा</option>
                      {masterIngredients.map(item => (
                        <option key={item.item_code} value={item.item_name}>{item.item_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProcessConsumption}
                disabled={loading || localMainFoods.length === 0}
                className="w-full mt-6 bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-3.5 flex justify-center items-center gap-3 text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (isEditing ? <RefreshCcw size={18} /> : <CheckCircle2 size={18} />)}
                {isEditing ? 'नोंद अपडेट करा (Update Log)' : 'दैनिक नोंद जतन करा (Save Daily Log)'}
              </button>

              {status.text && (
                <div className={`mt-4 p-3 text-[11px] font-black border-2 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  {status.text}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-[#474379] p-6 text-white shadow-xl relative overflow-hidden">
              <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={150} />
              <h3 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2">
                <ArrowRight size={18} /> Projected Stock Impact
              </h3>

              <div className="space-y-4 relative z-10">
                {[...localMainFoods, ...localIngredients].filter(Boolean).map((item: string) => {
                  const req = calculateRequirement();
                  const stock = inventory.find(i => i.item_name === item);
                  const balanceAfter = stock ? stock.current_balance - req : 0;
                  const isLow = balanceAfter < 5 && balanceAfter >= 0;
                  const isBorrowed = balanceAfter < 0;

                  return (
                    <div key={item} className={`p-4 border group transition-all ${isBorrowed ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/10'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-black uppercase">{item}</span>
                        <span className="text-[10px] font-bold text-white/60">REQ: {req.toFixed(2)} KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
                          {/* eslint-disable-next-line */}
                          <div
                            className={`h-full transition-all duration-500 ${isBorrowed ? 'bg-red-500' : (isLow ? 'bg-amber-400' : 'bg-green-400')}`}
                            style={{ width: `${Math.max(0, Math.min(100, (balanceAfter / (stock?.current_balance || 1)) * 100))}%` }}
                          >
                            
                          </div>
                        </div>
                        <span className={`text-[10px] font-black ${isBorrowed ? 'text-red-400' : (isLow ? 'text-amber-300' : 'text-white/80')}`}>
                          {isBorrowed ? `⚠️ ${Math.abs(balanceAfter).toFixed(2)} KG BORROWED` : `${balanceAfter.toFixed(2)} KG REMAINING`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BORROWED STOCK MODAL */}
        {showBorrowedModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-amber-200">
              <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600"><AlertTriangle size={32} /></div>
                <div>
                  <h3 className="text-xl font-black text-amber-900">अपुरा साठा (Insufficient Stock)</h3>
                  <p className="text-amber-700/80 text-sm font-bold mt-1">स्टॉक शिल्लक नसल्यामुळे धान्य उसने घ्यावे लागेल.</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-slate-600 text-sm font-medium mb-3">पुरेसा साठा उपलब्ध नाही. खालील धान्य उसणे वापरावे लागेल:</p>
                  <div className="space-y-2">
                    {deficitItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                        <span className="font-black text-slate-800 text-[13px]">{item.name}</span>
                        <span className="text-red-600 font-black text-sm">{item.deficit} KG उसने</span>
                      </div>
                    ))}
                  </div>
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
    </Layout>
  );
}