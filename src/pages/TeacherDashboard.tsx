import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
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
      fetchMenuGrams()
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

      const { data, error } = await (supabase as any)
        .from('daily_logs')
        .select('log_date, meals_served_primary, meals_served_upper_primary, is_holiday')
        .eq('teacher_id', userId)
        .gte('log_date', startOfMonth)
        .lte('log_date', endOfMonth);

      if (error) throw error;
      if (data) {
        setDailyLogsData(data);
        
        const total = (data as any[]).reduce((sum: number, log: any) => 
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
      const { data, error } = await (supabase as any)
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId);
      if (error) throw error;
      setInventoryItems(data || []);
    } catch (err: any) {
      console.error('Error fetching inventory:', err.message);
    }
  };

  const fetchEnrollment = async () => {
    try {
      const { data } = await (supabase as any)
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', userId)
        .maybeSingle();
      if (data) {
        setEnrollment({
          primary: (data.std_1 || 0) + (data.std_2 || 0) + (data.std_3 || 0) + (data.std_4 || 0) + (data.std_5 || 0),
          upper: (data.std_6 || 0) + (data.std_7 || 0) + (data.std_8 || 0)
        });
      }
    } catch (err) { console.error(err); }
  };

  const fetchMenuGrams = async () => {
    try {
      const { data } = await (supabase as any)
        .from('menu_master')
        .select('item_name, item_code, grams_primary, grams_upper_primary')
        .eq('teacher_id', userId);
      
      const gramsMap: Record<string, {primary: number, upper: number}> = {};
      if (data) {
        data.forEach((m: any) => {
          gramsMap[m.item_name] = { primary: m.grams_primary, upper: m.grams_upper_primary };
          if (m.item_code) gramsMap[m.item_code] = { primary: m.grams_primary, upper: m.grams_upper_primary };
        });
        setFoodGramsMap(gramsMap);
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
        .eq('teacher_id', userId)
        .eq('week_pattern', scheduleType)
        .eq('day_name', stringDay)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodayMenu(data);
    } catch (err: any) {
      console.error('Error fetching menu:', err.message);
    }
  };



  const criticalItems = useMemo(() => {
    return inventoryItems.filter((item: any) => {
      const grams = foodGramsMap[item.item_name] || { primary: 100, upper: 150 };
      const dailyRequirement = (enrollment.primary * grams.primary + enrollment.upper * grams.upper) / 1000;
      const daysRemaining = dailyRequirement > 0 ? (Number(item.current_balance) / dailyRequirement) : Infinity;
      return daysRemaining <= 10; // Items with < 10 days remaining are "Alert" items
    });
  }, [inventoryItems, enrollment, foodGramsMap]);

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
            <div className="bg-white border shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} className={inventoryItems.some(i => Number(i.current_balance) < 0) ? "text-red-600 animate-pulse" : criticalItems.length > 0 ? "text-[#dd4b39]" : "text-green-600"} /> 
                  Inventory & Debt Health
                </h3>
                {isInventoryOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {isInventoryOpen && (
                <div className="p-4 bg-slate-50/30">
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                    {inventoryItems.map((item: any) => {
                      const balance = Number(item.current_balance);
                      const grams = foodGramsMap[item.item_name] || { primary: 100, upper: 150 };
                      const dailyRequirement = (enrollment.primary * grams.primary + enrollment.upper * grams.upper) / 1000;
                      const daysRemaining = dailyRequirement > 0 ? (balance / dailyRequirement) : Infinity;

                      let colorClasses = "bg-green-50 border-green-200 text-green-800";
                      let statusText = daysRemaining === Infinity ? 'पुरेसा साठा' : `~${Math.floor(daysRemaining)} दिवस पुरेल`;
                      let unitText = "kg";

                      if (balance < 0) {
                        colorClasses = "bg-red-50 border-red-500 text-red-600 ring-1 ring-red-100";
                        statusText = "उसणे धान्य (Debt)";
                        unitText = "kg borrowed";
                      } else if (daysRemaining <= 2) {
                        colorClasses = "bg-red-50 border-red-300 text-red-800";
                      } else if (daysRemaining <= 10) {
                        colorClasses = "bg-yellow-50 border-yellow-300 text-yellow-800";
                      }

                      return (
                        <div key={item.id} className={`p-4 rounded-xl border-2 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.02] ${colorClasses}`}>
                          <h4 className="font-black text-[11px] uppercase mb-2 truncate flex items-center gap-1">
                            {balance < 0 && <AlertCircle size={10} />} {item.item_name}
                          </h4>
                          <div>
                            <div className="text-xl font-black">
                              {balance < 0 ? `-${Math.abs(balance).toFixed(2)}` : balance.toFixed(2)} 
                              <span className="text-[10px] ml-1">{unitText}</span>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-80">
                              {statusText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {inventoryItems.length === 0 && (
                     <div className="text-center py-4 text-slate-400 italic text-xs">No inventory items found.</div>
                  )}
                </div>
              )}

              {!isInventoryOpen && (
                <div className="px-5 py-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    {inventoryItems.some(i => Number(i.current_balance) < 0) && (
                      <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-sm animate-pulse">DEBT ALERT</span>
                    )}
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      {criticalItems.length > 0 ? `⚠️ ${criticalItems.length} items require attention` : "✅ All stock levels nominal"}
                    </p>
                  </div>
                  <button onClick={() => setIsInventoryOpen(true)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">View Health Grid</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calendar & Submission */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Calendar Card */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="text-blue-600" size={18} /> Monthly Submission Registry
                  </h3>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm outline-none focus:border-blue-500 transition-all"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(idx)}
                      className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tighter border transition-all ${
                        selectedMonth === idx 
                          ? 'bg-[#474379] border-[#474379] text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00a65a]"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Logged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#dd4b39]"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">शासकीय सुट्टी (Holiday)</span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {calendarLoading ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter pb-1.5">{day}</div>
                    ))}
                    {(() => {
                      const now = new Date();
                      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
                      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                      const slots = [];

                      for (let i = 0; i < firstDayOfMonth; i++) {
                        slots.push(<div key={`pad-${i}`} className="aspect-square md:aspect-auto md:min-h-[100px] h-full w-full bg-slate-50/50 border border-transparent rounded-md"></div>);
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

                        let style = "bg-white border-slate-200 text-slate-400";
                        let statusText = "-";
                        let labelStyle = "text-slate-400";

                        if (isHoliday) {
                          style = "bg-yellow-400 border-yellow-500 text-red-600 shadow-md shadow-yellow-100 font-bold";
                          statusText = "शासकीय सुट्टी";
                          labelStyle = "text-red-600";
                        } else if (isSubmitted) {
                          style = "bg-[#00a65a] border-[#00a65a] text-white shadow-md shadow-green-200";
                          statusText = "LOGGED";
                          labelStyle = "text-white/80";
                        } else if (isToday) {
                          style = "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-100 ring-offset-1";
                          statusText = "PENDING";
                          labelStyle = "text-white/80";
                        } else if (isPast) {
                          style = "bg-red-50 border-red-100 text-red-500 font-bold";
                          statusText = "MISSING";
                          labelStyle = "text-red-600";
                        }

                        slots.push(
                          <div 
                            key={d} 
                            onClick={() => {
                              if (isFuture) return;
                              if (isSubmitted) {
                                const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                if (!window.confirm(`A log already exists for ${formattedDate}. Do you want to edit it?`)) {
                                  return;
                                }
                              }
                              setSelectedLogDate(dateStr);
                              setIsLogModalOpen(true);
                            }}
                            className={`aspect-square md:aspect-auto md:min-h-[100px] h-full w-full border flex flex-col justify-between items-center p-1 md:p-2 rounded-md transition-all overflow-hidden ${isFuture ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'} ${style}`}
                          >
                            {/* TOP: The Date Badge */}
                            <div className={`w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-sm text-[10px] md:text-xs font-black ${isSubmitted || isToday || (isPast && statusText === 'MISSING') ? 'bg-white/20' : 'bg-slate-100'}`}>
                              {d}
                            </div>

                            {/* MIDDLE: Status Text */}
                            <div className={`text-[7px] md:text-[10px] font-bold uppercase tracking-tighter w-full text-center truncate ${labelStyle}`}>
                              {isHoliday ? (
                                <span className="flex flex-col items-center">
                                  <span className="md:hidden">सुट्टी</span>
                                  <span className="hidden md:inline">शासकीय सुट्टी</span>
                                </span>
                              ) : (
                                statusText
                              )}
                            </div>

                            {/* BOTTOM: Attendance / Count Badge */}
                            <div className="w-full bg-black/10 rounded-sm py-0.5 flex items-center justify-center gap-1 text-[8px] md:text-xs font-black">
                              {isSubmitted && !isHoliday && totalMeals > 0 ? (
                                <>🥘 {totalMeals}</>
                              ) : (
                                <span className="opacity-40">-</span>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return slots;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {isLogModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                 <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200">
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
