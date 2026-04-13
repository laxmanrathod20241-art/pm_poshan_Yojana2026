import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database.types';
import Layout from '../components/Layout';

type ScheduleRowDB = Database['public']['Tables']['menu_weekly_schedule']['Row'];
import {
  RefreshCw,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Info,
  Loader2,
  CalendarCheck
} from 'lucide-react';

const DAYS = [
  { id: 'Monday', name: 'Monday' },
  { id: 'Tuesday', name: 'Tuesday' },
  { id: 'Wednesday', name: 'Wednesday' },
  { id: 'Thursday', name: 'Thursday' },
  { id: 'Friday', name: 'Friday' },
  { id: 'Saturday', name: 'Saturday' },
  { id: 'Sunday', name: 'Sunday' }
];

interface FoodItem {
  id: string;
  name: string;
  item_category: 'MAIN' | 'INGREDIENT';
}

interface ScheduleRow {
  teacher_id: string;
  week_pattern: 'WEEK_1_3_5' | 'WEEK_2_4';
  day_name: string;
  is_active: boolean;
  main_food_codes: string[]; // JSONB Array
  menu_items: string[]; // JSONB Array
}

export default function WeeklyMenuSchedule() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Master Data (Segregated)
  const [mainFoods, setMainFoods] = useState<FoodItem[]>([]);
  const [ingredients, setIngredients] = useState<FoodItem[]>([]);

  // Schedule State (14 rows)
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

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
      initData();
    }
  }, [userId]);

  const initData = async () => {
    setFetchLoading(true);
    try {
      // 1. Fetch only the items configured in the teacher's Menu Master
      const { data: menuData } = await (supabase as any)
        .from('menu_master')
        .select('item_code, item_name, item_category')
        .eq('teacher_id', userId!)
        .order('item_name');

      const unified: FoodItem[] = (menuData || []).map((m: any) => ({
        id: m.item_code,
        name: m.item_name,
        item_category: m.item_category || 'MAIN' // Fallback for legacy items
      }));

      setMainFoods(unified.filter(f => f.item_category === 'MAIN'));
      setIngredients(unified.filter(f => f.item_category === 'INGREDIENT'));

      // 2. Fetch Existing Schedule
      const { data: scheduleData } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', userId!);

      // 3. Initialize 14 rows (7 for WEEK_1_3_5, 7 for WEEK_2_4)
      const initialSchedule: ScheduleRow[] = [];
      ['WEEK_1_3_5', 'WEEK_2_4'].forEach((type: any) => {
        DAYS.forEach((day, index) => {
          const existing = (scheduleData as ScheduleRowDB[])?.find(
            (s) => s.week_pattern === type && s.day_name === day.id
          );
          initialSchedule.push({
            teacher_id: userId!,
            week_pattern: type,
            day_name: day.id,
            is_active: existing ? existing.is_active : (index < 5), // Mon-Fri active by default
            main_food_codes: existing ? (existing.main_food_codes || []) : [],
            menu_items: existing ? (existing.menu_items || []) : []
          });
        });
      });
      setSchedule(initialSchedule);

    } catch (err: any) {
      console.error('Data Init Error:', err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleToggleDay = (type: 'WEEK_1_3_5' | 'WEEK_2_4', dayId: string) => {
    setSchedule((prev: ScheduleRow[]) => prev.map((row: ScheduleRow) =>
      (row.week_pattern === type && row.day_name === dayId)
        ? { ...row, is_active: !row.is_active }
        : row
    ));
  };

  const toggleMultiSelect = (type: 'WEEK_1_3_5' | 'WEEK_2_4', dayId: string, field: 'main_food_codes' | 'menu_items', code: string) => {
    setSchedule((prev: ScheduleRow[]) => prev.map((row: ScheduleRow) => {
      if (row.week_pattern === type && row.day_name === dayId) {
        const currentList = row[field] || [];
        const newList = currentList.includes(code)
          ? currentList.filter((c: string) => c !== code)
          : [...currentList, code];
        return { ...row, [field]: newList };
      }
      return row;
    }));
  };

  const saveSchedule = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error: upsertError } = await (supabase as any)
        .from('menu_weekly_schedule')
        .upsert(schedule, { onConflict: 'teacher_id,week_pattern,day_name' });

      if (upsertError) throw upsertError;

      setMessage({ type: 'success', text: 'Meal Combinations deployed successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error saving: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <RefreshCw className="animate-spin text-[#474379]" size={40} />
          <p className="text-slate-500 font-bold animate-pulse text-sm">Synchronizing Master Lists...</p>
        </div>
      </Layout>
    );
  }

  const renderScheduleBlock = (type: 'WEEK_1_3_5' | 'WEEK_2_4') => {
    const blockRows = schedule.filter((s: ScheduleRow) => s.week_pattern === type);

    return (
      <div className="bg-white border-2 border-indigo-900/10 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-900/5 h-full">
        <div className="bg-[#474379] p-5 flex justify-between items-center bg-gradient-to-r from-[#474379] to-[#34305c]">
          <h2 className="text-white font-black uppercase tracking-widest text-[15px] italic font-['Outfit']">
            📅 {type === 'WEEK_1_3_5' ? 'Schedule A (Week 1, 3, 5)' : 'Schedule B (Week 2, 4)'}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {blockRows.map((row: ScheduleRow) => {
            const dayName = DAYS.find((d: { id: string, name: string }) => d.id === row.day_name)?.name;
            return (
              <div
                key={row.day_name}
                className={`p-3 px-2 flex flex-col gap-3 transition-all ${!row.is_active ? 'bg-slate-50/50 grayscale' : 'bg-white hover:bg-slate-50/30'}`}
              >
                {/* 1. Day & Toggle */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <button onClick={() => handleToggleDay(type, row.day_name)} className="focus:outline-none">
                    {row.is_active ? (
                      <ToggleRight size={28} className="text-[#00a65a] transition-all" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-300 transition-all" />
                    )}
                  </button>
                  <span className={`text-[12px] font-black uppercase tracking-wider ${row.is_active ? 'text-slate-800' : 'text-slate-400'}`}>
                    {dayName}
                  </span>
                </div>

                {/* Selection Area */}
                <div className="space-y-4">
                  {/* Main Meals */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">मुख्य अन्न (Main Foods)</label>
                    <div className={`flex flex-wrap gap-1.5 min-h-[40px] ${!row.is_active ? 'opacity-30 pointer-events-none' : ''}`}>
                      {mainFoods.map(food => (
                        <label
                          key={food.id}
                          className={`w-fit inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${row.main_food_codes.includes(food.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                          <input
                            type="checkbox" className="hidden"
                            checked={row.main_food_codes.includes(food.id)}
                            onChange={() => toggleMultiSelect(type, row.day_name, 'main_food_codes', food.id)}
                          />
                          <span className="text-[10px] font-black leading-none uppercase tracking-tighter whitespace-nowrap">
                            {food.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">साहित्य (Ingredients)</label>
                    <div className={`flex flex-wrap gap-1.5 min-h-[40px] ${!row.is_active ? 'opacity-30 pointer-events-none' : ''}`}>
                      {ingredients.map(item => (
                        <label
                          key={item.id}
                          className={`w-fit inline-flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all border ${row.menu_items.includes(item.id) ? 'bg-indigo-900 border-indigo-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'}`}
                        >
                          <input
                            type="checkbox" className="hidden"
                            checked={row.menu_items.includes(item.id)}
                            onChange={() => toggleMultiSelect(type, row.day_name, 'menu_items', item.id)}
                          />
                          <span className="text-[9px] font-bold leading-none uppercase whitespace-nowrap">
                            {item.id.startsWith('L_') ? '📌 ' : ''}{item.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative space-y-6 pb-10 px-4 mt-6">

        {/* Module Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-end border-b-4 pb-6 border-slate-200">
          <button
            disabled={loading}
            onClick={saveSchedule}
            className="bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-8 py-3.5 rounded-none font-black text-xs transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest flex items-center gap-3 h-fit border-b-4 border-[#2b6687] mt-4 lg:mt-0"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <CalendarCheck size={16} />}
            Deploy to Global Calendar
          </button>
        </div>

        {message.text && (
          <div className={`p-5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 animate-in zoom-in-95 duration-500 shadow-xl ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <Info size={24} />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {renderScheduleBlock('WEEK_1_3_5')}
          {renderScheduleBlock('WEEK_2_4')}
        </div>

        <div className="bg-slate-900 text-slate-300 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row gap-6 items-center">
          <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
            <Info size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Automated Logistics System</p>
            <p className="text-sm font-bold text-slate-100 leading-relaxed max-w-3xl font-mono">
              The AI Engine uses these meal plates to calculate stock depletion.
              Adding multiple "Main Foods" (e.g. Rice + Pulao) will count students for both items.
              Please ensure your "Ingredients" list is mapped correctly in the Menu Master.
            </p>
          </div>
        </div>

      </div>
    </Layout>
  );
}
