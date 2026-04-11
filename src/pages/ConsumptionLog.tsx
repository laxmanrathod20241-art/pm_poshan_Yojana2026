import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  ArrowRight,
  TrendingDown,
  Loader2,
  RefreshCcw,
  X
} from 'lucide-react';

export default function ConsumptionLog() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [primaryCount, setPrimaryCount] = useState<number | ''>('');
  const [upperCount, setUpperCount] = useState<number | ''>('');
  const [todayMenu, setTodayMenu] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [status, setStatus] = useState({ type: '', text: '' });

  // PM-POSHAN Standard Grams per Student (Placeholder values - typically 100g/150g)
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

  const fetchMenuAndStock = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
      
      // 1. Fetch Master Items for Dropdowns and Chip Labels
      const { data: menuData } = await (supabase as any)
        .from('menu_master')
        .select('item_code, item_name, item_category')
        .eq('teacher_id', userId);

      if (menuData) {
        setMasterMainFoods(menuData.filter((i: any) => i.item_category === 'MAIN'));
        setMasterIngredients(menuData.filter((i: any) => i.item_category === 'INGREDIENT'));
      }

      // 2. Fetch Scheduled Menu for Today
      // The prompt specified 'weekly_schedule' and 'day_of_week'
      const { data: schedule } = await (supabase as any)
        .from('weekly_schedule')
        .select('*')
        .eq('teacher_id', userId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (schedule) {
        // Resolve IDs to names for the UI chips
        const scheduledIngredients = (schedule.ingredients || []).map((code: string) => {
          const item = menuData?.find(m => m.item_code === code);
          return item ? item.item_name : code;
        });

        const initialSchedule = {
          mainFood: schedule.main_food || '',
          ingredients: scheduledIngredients
        };

        setScheduledMenu(initialSchedule);
        
        // Clone to Instance (Override Layer)
        setSelectedMainFood(initialSchedule.mainFood);
        setActiveIngredients(initialSchedule.ingredients);
      }

      // 3. Fetch Stock
      const { data: stock } = await (supabase as any)
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId);

      setInventory(stock || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIngredient = (name: string) => {
    setActiveIngredients(prev => prev.filter(i => i !== name));
  };

  const handleReset = () => {
    if (scheduledMenu) {
      setSelectedMainFood(scheduledMenu.mainFood);
      setActiveIngredients(scheduledMenu.ingredients);
    }
  };

  const isOverridden = scheduledMenu && (
    selectedMainFood !== scheduledMenu.mainFood ||
    JSON.stringify([...activeIngredients].sort()) !== JSON.stringify([...scheduledMenu.ingredients].sort())
  );

  const calculateRequirement = () => {
    if (!primaryCount && !upperCount) return 0;
    const totalGrams = (Number(primaryCount || 0) * GRAMS_PRIMARY) + (Number(upperCount || 0) * GRAMS_UPPER);
    return totalGrams / 1000; // KG
  };

  const handleProcessConsumption = async () => {
    if (!todayMenu) {
      setStatus({ type: 'error', text: 'No menu scheduled for today. Please set your Weekly Schedule first.' });
      return;
    }
    if (!primaryCount && !upperCount) {
      setStatus({ type: 'error', text: 'Please enter attendance counts.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', text: '' });

    try {
      // Process each ingredient in the menu
      // todayMenu.menu_items is a JSONB array of item names like ["Rice", "Dal"]
      const itemsToDeduct = todayMenu.menu_items || [];

      for (const itemName of itemsToDeduct) {
        const deductionKg = calculateRequirement();
        const currentStock = inventory.find(i => i.item_name === itemName);

        if (currentStock) {
          const newBalance = Math.max(0, Number(currentStock.current_balance) - deductionKg);

          await (supabase as any)
            .from('inventory_stock')
            .update({ current_balance: newBalance })
            .eq('id', currentStock.id);
        }
      }

      // Record the daily log too
      await (supabase as any).from('daily_logs').insert([{
        teacher_id: userId,
        meals_served_primary: Number(primaryCount || 0),
        meals_served_upper_primary: Number(upperCount || 0),
        log_notes: `Auto-deducted ${itemsToDeduct.length} items based on menu.`
      }]);

      setStatus({ type: 'success', text: 'Consumption processed! Inventory balances have been automatedly updated.' });
      setPrimaryCount('');
      setUpperCount('');
      fetchMenuAndStock();
    } catch (err: any) {
      setStatus({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-1 z-10 relative pb-20">



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left: Input & Menu Status */}
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
                      className="text-[10px] font-black text-blue-700 hover:text-blue-800 flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCcw size={12} /> शेड्यूलनुसार रिसेट करा
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 block">आजचा मुख्य आहार</label>
                    <select 
                      value={selectedMainFood}
                      onChange={(e) => setSelectedMainFood(e.target.value)}
                      className="w-full p-3 text-sm font-black bg-white border-2 border-blue-100 rounded-xl outline-none focus:border-blue-500 shadow-sm text-slate-700 appearance-none cursor-pointer"
                    >
                      <option value="">मुख्य आहार निवडा</option>
                      {masterMainFoods.map(food => (
                        <option key={food.item_code} value={food.item_name}>{food.item_name}</option>
                      ))}
                      {selectedMainFood && !masterMainFoods.find(f => f.item_name === selectedMainFood) && (
                        <option value={selectedMainFood}>{selectedMainFood}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 block">वापरलेले घटक (Ingredients)</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-2 border-dashed border-blue-100 rounded-xl min-h-[60px] items-center">
                      {localIngredients.map((item: string) => (
                        <span key={item} className="bg-white border-2 border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-700 uppercase flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                          {item}
                          <Trash2 
                            size={14} 
                            className="cursor-pointer text-blue-400 hover:text-red-500 transition-all" 
                            onClick={() => handleRemoveIngredient(item)}
                          />
                        </span>
                      ))}
                      {localIngredients.length === 0 && (
                        <span className="text-[10px] text-blue-400 font-bold italic w-full text-center">कोणतेही घटक निवडलेले नाहीत</span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <select 
                      onChange={(e) => {
                        handleAddIngredient(e.target.value);
                        e.target.value = "";
                      }}
                      className="w-full p-2.5 text-[10px] font-black bg-blue-900 text-white rounded-xl outline-none hover:bg-blue-800 transition-colors cursor-pointer appearance-none text-center uppercase tracking-widest shadow-lg shadow-blue-900/10"
                    >
                      <option value="">+ घटक जोडा (Add New Ingredient)</option>
                      {masterIngredients.map(item => (
                        <option key={item.item_code} value={item.item_name} className="bg-white text-slate-800">{item.item_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isOverridden && (
                  <div className="p-3 bg-amber-50 border-l-4 border-amber-400 flex items-center gap-3 rounded-r-lg">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 leading-tight">
                      तुम्ही आजच्या आहारामध्ये बदल केला आहे. हा बदल मास्टर शेड्यूलवर परिणाम करणार नाही.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleProcessConsumption}
                disabled={loading || !todayMenu}
                className="w-full mt-6 bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-3.5 rounded-none shadow-xl shadow-blue-500/20 flex justify-center items-center gap-3 text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Process Consumption & Deduct Stock
              </button>

              {status.text && (
                <div className={`mt-4 p-3 text-[11px] font-black uppercase tracking-widest border-2 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  {status.text}
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Math Preview */}
          <div className="space-y-6">
            <div className="bg-[#474379] p-6 text-white shadow-xl relative overflow-hidden">
              <Utensils className="absolute -right-4 -bottom-4 text-white/5" size={150} />
              <h3 className="text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2">
                <ArrowRight size={18} /> Projected Stock Impact
              </h3>

              <div className="space-y-4 relative z-10">
                {todayMenu?.menu_items?.map((item: string) => {
                  const req = calculateRequirement();
                  const stock = inventory.find(i => i.item_name === item);
                  const balanceAfter = stock ? Math.max(0, stock.current_balance - req) : 0;
                  const isLow = balanceAfter < 5;

                  return (
                    <div key={item} className="bg-white/10 p-4 border border-white/10 group hover:bg-white/20 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] font-black uppercase tracking-tight">{item}</span>
                        <span className="text-[10px] font-bold text-white/60">REQUIREMENT: {req.toFixed(2)} KG</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${isLow ? 'bg-red-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(100, (balanceAfter / (stock?.current_balance || 1)) * 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-black ${isLow ? 'text-red-300' : 'text-white/80'}`}>
                          {balanceAfter.toFixed(2)} KG REMAINING
                        </span>
                      </div>
                      {isLow && (
                        <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-red-300 uppercase">
                          <AlertTriangle size={10} /> Low Stock Warning
                        </div>
                      )}
                    </div>
                  );
                })}
                {!todayMenu && (
                  <div className="p-10 text-center border-2 border-dashed border-white/20 opacity-40">
                    <p className="text-xs font-black uppercase tracking-widest">Waiting for active menu...</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded">
                  <TrendingDown className="text-red-300" size={20} />
                </div>
                <p className="text-[10px] font-bold text-white/60 leading-relaxed uppercase">
                  This engine uses standard government-approved consumption rates: <br />
                  I-V: {GRAMS_PRIMARY}g • VI-VIII: {GRAMS_UPPER}g
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
