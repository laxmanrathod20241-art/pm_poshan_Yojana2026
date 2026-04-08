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
  Loader2
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
      const dayOfWeek = now.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const stringDay = dayNames[dayOfWeek];
      const startDate = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil(days / 7);
      const scheduleType = weekNumber % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';

      // 2. Fetch Menu
      const { data: menu } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .single();

      setTodayMenu(menu);

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

  const calculateRequirement = () => {
    if (!primaryCount && !upperCount) return 0;
    // This is a simplified logic where we assume every ingredient in the menu
    // follows the standard meal distribution. 
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

              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-none">
                <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">Today's Active Menu</h4>
                {todayMenu ? (
                  <div className="flex flex-wrap gap-2">
                    {todayMenu.menu_items?.map((item: string) => (
                      <span key={item} className="bg-white px-2 py-1 border border-blue-200 text-[11px] font-bold text-blue-700 uppercase">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-red-500 italic">No schedule found for today!</p>
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
