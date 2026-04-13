import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database.types';
import Layout from '../components/Layout';

type EnrollmentRow = Database['public']['Tables']['student_enrollment']['Row'];
type DailyLogRow = Database['public']['Tables']['daily_logs']['Row'];
type StockRow = Database['public']['Tables']['inventory_stock']['Row'];
type MenuRow = Database['public']['Tables']['menu_master']['Row'];
type ScheduleRowDB = Database['public']['Tables']['menu_weekly_schedule']['Row'];
import { 
  Calendar,
  AlertCircle,
  Loader2,
  TrendingUp,
  Utensils,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import DailyLogForm from '../components/DailyLogForm';

export default function TeacherDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>('');

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [dailyLogsData, setDailyLogsData] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [todayMenu, setTodayMenu] = useState<any>(null);
  const [totalMealsMonth, setTotalMealsMonth] = useState(0);
  
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [enrollment, setEnrollment] = useState({ primary: 0, upper: 0 });
  const [foodGramsMap, setFoodGramsMap] = useState<Record<string, {primary: number, upper: number}>>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  
  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId, selectedYear, selectedMonth]);

  const fetchAllData = async () => {
    setCalendarLoading(true);
    await Promise.all([
      fetchMonthlyLogs(),
      fetchInventory(),
      fetchTodayMenu(),
      fetchEnrollment(),
      fetchMenuGrams(),
      fetchConfiguration()
    ]);
    setCalendarLoading(false);
  };

  const fetchMonthlyLogs = async () => {
    try {
      // Create local YYYY-MM-DD strings for strict date column matching
      const startLocal = new Date(selectedYear, selectedMonth, 1);
      const startOfMonth = `${startLocal.getFullYear()}-${String(startLocal.getMonth() + 1).padStart(2, '0')}-01`;
      
      const endLocal = new Date(selectedYear, selectedMonth + 1, 0);
      const endOfMonth = `${endLocal.getFullYear()}-${String(endLocal.getMonth() + 1).padStart(2, '0')}-${String(endLocal.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_logs')
        .select('log_date, meals_served_primary, meals_served_upper_primary, is_holiday')
        .eq('teacher_id', userId!)
        .gte('log_date', startOfMonth)
        .lte('log_date', endOfMonth);

      if (error) throw error;
      if (data) {
        const rows = data as DailyLogRow[];
        setDailyLogsData(rows);
        
        const total = rows.reduce((sum: number, log: DailyLogRow) => 
          sum + (log.meals_served_primary || 0) + (log.meals_served_upper_primary || 0), 0
        );
        setTotalMealsMonth(total);
      }
    } catch (err: any) {
      console.error('Error fetching logs:', err.message);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId!);
      if (error) throw error;
      setInventoryItems(data as StockRow[] || []);
    } catch (err: any) {
      console.error('Error fetching inventory:', err.message);
    }
  };

  const fetchEnrollment = async () => {
    try {
      const { data } = await supabase
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', userId!)
        .maybeSingle();
      if (data) {
        const row = data as EnrollmentRow;
        setEnrollment({
          primary: (row.std_1 || 0) + (row.std_2 || 0) + (row.std_3 || 0) + (row.std_4 || 0) + (row.std_5 || 0),
          upper: (row.std_6 || 0) + (row.std_7 || 0) + (row.std_8 || 0)
        });
      }
    } catch (err) { console.error(err); }
  };

  const fetchMenuGrams = async () => {
    try {
      const { data } = await supabase
        .from('menu_master')
        .select('item_name, item_code, grams_primary, grams_upper_primary')
        .eq('teacher_id', userId!);
      
      const gramsMap: Record<string, {primary: number, upper: number}> = {};
      if (data) {
        (data as MenuRow[]).forEach((m: MenuRow) => {
          gramsMap[m.item_name] = { primary: m.grams_primary, upper: m.grams_upper_primary || 0 };
          if (m.item_code) gramsMap[m.item_code] = { primary: m.grams_primary, upper: m.grams_upper_primary || 0 };
        });
        setFoodGramsMap(gramsMap);
      }
    } catch (err) { console.error(err); }
  };

  const fetchConfiguration = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('has_primary, has_upper_primary')
        .eq('id', userId!)
        .single();
      
      const config = data as any;
      if (config) {
        setHasPrimary(config.has_primary ?? true);
        setHasUpperPrimary(config.has_upper_primary ?? true);
      }
    } catch (err) { console.error(err); }
  };

  const fetchTodayMenu = async () => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const stringDay = dayNames[dayOfWeek];
      
      const startDate = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil(days / 7);
      const scheduleType = weekNumber % 2 === 0 ? 'WEEK_2_4' : 'WEEK_1_3_5';

      const { data, error } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId!)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayMenu(data as unknown as ScheduleRowDB);
    } catch (err: any) {
      console.error('Error fetching menu:', err.message);
    }
  };



  const criticalItems = useMemo(() => {
    return inventoryItems.filter((item: any) => {
      const grams = foodGramsMap[item.item_name] || { primary: 100, upper: 150 };
      const dailyRequirement = (
        (hasPrimary ? enrollment.primary : 0) * grams.primary + 
        (hasUpperPrimary ? enrollment.upper : 0) * grams.upper
      ) / 1000;
      const daysRemaining = dailyRequirement > 0 ? (Number(item.current_balance) / dailyRequirement) : Infinity;
      return daysRemaining <= 10; // Items with < 10 days remaining are "Alert" items
    });
  }, [inventoryItems, enrollment, foodGramsMap, hasPrimary, hasUpperPrimary]);

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-6 z-10 relative pb-10">
        
        {/* Superior Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-end mb-6 gap-4">
          <div className="flex gap-4">
            <div className="bg-white p-3.5 border border-slate-200 shadow-sm flex items-center gap-3 min-w-[180px]">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Meals This Month</p>
                <p className="text-xl font-black text-slate-800">{totalMealsMonth}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Left Column: Alerts & Menu */}
          <div className="lg:col-span-1 space-y-5">
            
            {/* Today's Menu Preview */}
            <div className="bg-gradient-to-br from-[#474379] to-[#2d2a4d] rounded-none p-5 text-white shadow-xl relative overflow-hidden group">
              <Utensils className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
              <h3 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Utensils size={16} /> Today's Menu
              </h3>
              {todayMenu ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase">Main Dish</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {todayMenu.main_food_codes?.map((code: string) => (
                        <span key={code} className="bg-white/20 px-2 py-1 rounded text-[11px] font-bold">
                          {code.replace('F_', '').replace('L_', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase">Ingredients List</p>
                    <p className="text-xs font-medium mt-1 leading-relaxed opacity-90">
                      {todayMenu.menu_items?.length || 0} essential items identified for deduction.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-bold text-white/50 italic">No menu scheduled for today.</p>
              )}
            </div>

            {/* Advanced Inventory Longevity Alerts & Debt Warning */}
            <div className="bg-white border-2 border-slate-100 shadow-xl overflow-hidden rounded-3xl">
              <button 
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <h3 className="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} className={inventoryItems.some(i => Number(i.current_balance) < 0) ? "text-red-600 animate-pulse" : criticalItems.length > 0 ? "text-[#dd4b39]" : "text-green-600"} /> 
                  Inventory & Debt Health
                </h3>
                {isInventoryOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {isInventoryOpen && (
                <div className="p-4 bg-slate-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inventoryItems.map((item: any) => {
                      const balance = Number(item.current_balance);
                      const grams = foodGramsMap[item.item_name] || { primary: 100, upper: 150 };
                      const dailyRequirement = (
                        (hasPrimary ? enrollment.primary : 0) * grams.primary + 
                        (hasUpperPrimary ? enrollment.upper : 0) * grams.upper
                      ) / 1000;
                      const daysRemaining = dailyRequirement > 0 ? (balance / dailyRequirement) : Infinity;

                      let colorClasses = "bg-white border-slate-200 text-slate-800";
                      let statusText = daysRemaining === Infinity ? 'पुरेसा साठा' : `~${Math.floor(daysRemaining)} दिवस पुरेल`;
                      let unitText = "kg";

                      if (balance < 0) {
                        colorClasses = "bg-red-50 border-red-200 text-red-600";
                        statusText = "उसणे धान्य (Debt)";
                        unitText = "kg borrowed";
                      } else if (daysRemaining <= 2) {
                        colorClasses = "bg-orange-50 border-orange-200 text-orange-800";
                      } else if (daysRemaining <= 10) {
                        colorClasses = "bg-blue-50 border-blue-200 text-blue-800";
                      }

                      return (
                        <div key={item.id} className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.02] ${colorClasses}`}>
                          <h4 className="font-black text-[10px] uppercase mb-2 truncate flex items-center gap-1 opacity-60">
                            {balance < 0 && <AlertCircle size={10} />} {item.item_name}
                          </h4>
                          <div>
                            <div className="text-2xl font-black tracking-tight">
                              {balance < 0 ? `-${Math.abs(balance).toFixed(2)}` : balance.toFixed(2)} 
                              <span className="text-[10px] ml-1 uppercase opacity-40 font-bold">{unitText}</span>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">
                              {statusText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {inventoryItems.length === 0 && (
                     <div className="text-center py-6 text-slate-400 italic text-xs font-bold">No inventory items found.</div>
                  )}
                </div>
              )}

              {!isInventoryOpen && (
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {inventoryItems.some(i => Number(i.current_balance) < 0) && (
                      <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-sm animate-pulse">DEBT ALERT</span>
                    )}
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      {criticalItems.length > 0 ? `⚠️ ${criticalItems.length} items require attention` : "✅ All stock levels nominal"}
                    </p>
                  </div>
                  <button onClick={() => setIsInventoryOpen(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">View Health</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calendar & Submission */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Calendar Card */}
            <div className="bg-white border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <h3 className="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="text-blue-600" size={18} /> Monthly Submission Registry
                  </h3>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white border-2 border-slate-200 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-sm outline-none w-full sm:w-auto"
                    title="वर्ष निवडा (Select Year)"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex overflow-x-auto pb-2 gap-1.5 no-scrollbar touch-pan-x">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(idx)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${
                        selectedMonth === idx 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00a65a]"></div>
                    <span>Logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#dd4b39]"></div>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <span>Holiday</span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 overflow-x-auto">
                {calendarLoading ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                  </div>
                ) : (
                  <div className="min-w-[600px] md:min-w-0">
                    <div className="grid grid-cols-7 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3">{day}</div>
                      ))}
                      {(() => {
                        const now = new Date();
                        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
                        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                        const slots = [];

                        for (let i = 0; i < firstDayOfMonth; i++) {
                          slots.push(<div key={`pad-${i}`} className="aspect-square bg-slate-50/50 rounded-2xl border border-transparent"></div>);
                        }

                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const matchedLog = dailyLogsData.find((log: any) => log.log_date === dateStr);
                          const isSubmitted = !!matchedLog;
                          const isHoliday = matchedLog?.is_holiday || false;
                          const totalMeals = matchedLog ? (Number(matchedLog.meals_served_primary) || 0) + (Number(matchedLog.meals_served_upper_primary) || 0) : 0;
                          const isToday = dateStr === today;
                          const isPast = dateStr < today;
                          const isFuture = dateStr > today;

                          let style = "bg-white border-slate-100 text-slate-400";
                          let statusText = "-";
                          let labelStyle = "text-slate-400";

                          if (isHoliday) {
                            style = "bg-amber-400 border-amber-500 text-amber-950 shadow-lg shadow-amber-100 ring-2 ring-white";
                            statusText = "सुट्टी";
                            labelStyle = "text-amber-950/60";
                          } else if (isSubmitted) {
                            style = "bg-[#00a65a] border-green-600 text-white shadow-lg shadow-green-100 ring-2 ring-white";
                            statusText = "DONE";
                            labelStyle = "text-white/70";
                          } else if (isToday) {
                            style = "bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-100 ring-2 ring-white scale-105 z-10 animate-pulse";
                            statusText = "TODAY";
                            labelStyle = "text-white/70";
                          } else if (isPast) {
                            style = "bg-red-50 border-red-100 text-red-600 ring-2 ring-white";
                            statusText = "MISSING";
                            labelStyle = "text-red-400";
                          }

                          slots.push(
                            <div 
                              key={d} 
                              onClick={() => {
                                if (isFuture) return;
                                setSelectedLogDate(dateStr);
                                setIsLogModalOpen(true);
                              }}
                              className={`aspect-square border flex flex-col justify-between items-center p-2 rounded-2xl transition-all ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'} ${style}`}
                            >
                              <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${isSubmitted || isToday || isHoliday ? 'bg-white/20' : 'bg-slate-50'}`}>
                                {d}
                              </div>
                              <div className={`text-[8px] font-black uppercase tracking-tighter text-center truncate w-full ${labelStyle}`}>
                                {statusText}
                              </div>
                              <div className="w-full bg-black/10 rounded-lg py-0.5 flex items-center justify-center text-[9px] font-black pointer-events-none">
                                {isSubmitted && !isHoliday && totalMeals > 0 ? (
                                  <>🥘 {totalMeals}</>
                                ) : (
                                  <span className="opacity-20">-</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return slots;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isLogModalOpen && (
              <div className="fixed inset-0 z-[100] flex justify-center items-start bg-slate-950/70 backdrop-blur-xl overflow-y-auto pt-24 pb-12 px-2 sm:px-4 no-scrollbar">
                 <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200 rounded-3xl">
                    <DailyLogForm 
                      targetDate={selectedLogDate} 
                      onClose={() => setIsLogModalOpen(false)} 
                      onSuccess={fetchAllData} 
                    />
                 </div>
              </div>
            )}

          </div>

        </div>
        
      </div>

    </Layout>
  );
}
