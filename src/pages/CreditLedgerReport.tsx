import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { reconstructOpeningBalances, formatQuantity } from '../utils/inventoryUtils';
import Layout from '../components/Layout';
import { Loader2, Printer, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
type ConsumptionLog = Database['public']['Tables']['consumption_logs']['Row'];
type MonthlyReportSnapshot = Database['public']['Tables']['monthly_reports']['Row'];

interface MenuItem {
  item_code: string;
  item_name: string;
  grams_primary: number;
  grams_upper_primary: number;
  item_category: 'MAIN' | 'INGREDIENT';
}

export default function CreditLedgerReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);
  const [loading, setLoading] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [creditData, setCreditData] = useState<any>(null);
  const [inventoryBalances, setInventoryBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchProfile(session.user.id);
      }
    });
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('school_name_mr, has_primary, has_upper_primary')
        .eq('id', uid)
        .returns<Profile[]>()
        .single();

      if (error) throw error;
      if (data) {
        setSchoolName(data.school_name_mr || '');
        setHasPrimary(data.has_primary ?? true);
        setHasUpperPrimary(data.has_upper_primary ?? true);

        // Auto-snap selectedScope based on section availability
        if (data.has_primary === false && data.has_upper_primary === true) {
          setSelectedScope('upper_primary');
        } else {
          setSelectedScope('primary');
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchCreditData(userId, selectedMonth, selectedYear, false, selectedScope);
    }
  }, [selectedMonth, selectedYear, selectedScope, userId]);

  const fetchCreditData = async (id: string, month: number, year: number, forceSync = false, scope = selectedScope) => {
    setLoading(!forceSync);
    setIsSyncing(forceSync);

    try {
      // 2. Fetch Menu Master for columns
      const { data: menuMaster } = await supabase.from('menu_master').select('*').eq('teacher_id', id).order('created_at', { ascending: true });
      const items: MenuItem[] = (menuMaster as MenuItem[]) || [];
      setMenuItems(items);

      // 3. Fetch Live Inventory (for repayment status) - Filtered by scope
      const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('item_name, current_balance')
        .eq('teacher_id', id)
        .eq('standard_group', scope);
      const stockMap: Record<string, number> = {};
      (currentStock || []).forEach((s: any) => { stockMap[s.item_name] = Number(s.current_balance); });
      setInventoryBalances(stockMap);

      // 4. Compute Data Engine (Day-by-Day Reconstruction)
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

      const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      // A. Opening Balances (From previous month report snapshot)
      const { data: prevSnapshot } = await supabase
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .eq('standard_group', scope)
        .returns<MonthlyReportSnapshot[]>()
        .maybeSingle();

      const runningBalances: Record<string, number> = {};
      if (prevSnapshot && prevSnapshot.report_data) {
        const pData = typeof prevSnapshot.report_data === 'string' ? JSON.parse(prevSnapshot.report_data) : prevSnapshot.report_data;
        pData.forEach((row: any) => { runningBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        const histBalances = await reconstructOpeningBalances(id, currentMonthStart, items, scope);
        Object.keys(histBalances).forEach(k => { runningBalances[k] = histBalances[k]; });
      }

      // C. Daily Logs & Consumption
      const [logsRes, consumptionRes] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('teacher_id', id).gte('log_date', currentMonthStart).lt('log_date', nextMonthStart),
        supabase.from('consumption_logs').select('*').eq('teacher_id', id).eq('standard_group', scope).gte('log_date', currentMonthStart).lt('log_date', nextMonthStart)
      ]);

      const logs = (logsRes.data as DailyLog[]) || [];
      const consumptionLogs = (consumptionRes.data as ConsumptionLog[]) || [];

      const matrixRows = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthlyBorrowedTotals: Record<string, number> = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const marathiDayNames: Record<string, string> = {
          'Sunday': 'रविवार', 'Monday': 'सोमवार', 'Tuesday': 'मंगळवार', 'Wednesday': 'बुधवार', 'Thursday': 'गुरुवार', 'Friday': 'शुक्रवार', 'Saturday': 'शनिवार'
        };

        const log = logs.find((l: any) => l.log_date === dateStr);
        const consumedLog = consumptionLogs.find((c: any) => c.log_date === dateStr);

        if (log && !log.is_holiday) {
          const pAtt = Number(log.meals_served_primary) || 0;
          const uAtt = Number(log.meals_served_upper_primary) || 0;

          const borrowedDay: Record<string, number> = {};
          let anyBorrowed = false;

          const savedBorrowed = consumedLog?.borrowed_items || {};
          const activeMain = consumedLog?.main_foods_all || [consumedLog?.main_food].filter(Boolean);

          items.forEach(item => {
            const borrowedAmt = Number(savedBorrowed[item.item_name] || savedBorrowed[item.item_code] || 0);
            if (borrowedAmt > 0) {
              borrowedDay[item.item_code] = borrowedAmt;
              monthlyBorrowedTotals[item.item_code] = (monthlyBorrowedTotals[item.item_code] || 0) + borrowedAmt;
              anyBorrowed = true;
            }
          });

          if (anyBorrowed) {
            matrixRows.push({
              date: day,
              dayName: marathiDayNames[dayName],
              menu: activeMain.join(' + '),
              attendance: scope === 'primary' ? pAtt : uAtt,
              borrowed: borrowedDay
            });
          }
        }
      }

      setCreditData({
        rows: matrixRows,
        totals: monthlyBorrowedTotals
      });

    } catch (e) {
      console.error("Credit report error:", e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-[1400px] mx-auto mt-4 pb-20 print:p-0 print:m-4">

        {/* Top Control Bar */}
        <div className="mb-6 p-5 bg-white rounded-xl shadow-xl border border-slate-200 print:hidden flex flex-col md:flex-row gap-5 justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} /> उसणे धान्य अहवाल (Credit Stock Ledger)
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Borrowed Stock Tracking System</p>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border-2 border-slate-200 rounded-lg px-4 py-2 font-bold text-sm outline-none focus:border-amber-500"
              title="महिन्याची निवड करा (Select Month)"
            >
              {marathiMonths.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="border-2 border-slate-200 rounded-lg px-4 py-2 font-bold text-sm outline-none focus:border-amber-500"
              title="वर्षाची निवड करा (Select Year)"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {hasPrimary && hasUpperPrimary && (
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shadow-inner">
                <button
                  onClick={() => setSelectedScope('primary')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedScope === 'primary' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  I-V (Primary)
                </button>
                <button
                  onClick={() => setSelectedScope('upper_primary')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  VI-VIII (Upper)
                </button>
              </div>
            )}

            <button
              onClick={() => fetchCreditData(userId!, selectedMonth, selectedYear, true, selectedScope)}
              className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-200"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Sync Live
            </button>
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-black text-xs uppercase flex items-center gap-2 shadow-lg">
              <Printer size={16} /> Print Register
            </button>
          </div>
        </div>

        {/* Nondvahi Report Container */}
        <div className="bg-white p-2 min-h-screen">
          <style type="text/css" media="print">
            {`
              @page { size: landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; background: white !important; }
              .print\\:hidden { display: none !important; }
            `}
          </style>

          {loading ? (
            <div className="h-64 flex flex-col justify-center items-center gap-4">
              <Loader2 size={40} className="animate-spin text-amber-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Reconstructing Ledger Path...</p>
            </div>
          ) : (
            <div className="border border-slate-800 p-4 md:p-8 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none">

              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-slate-800 mb-2">प्रतिदिन उसणे वापरलेल्या अन्नधान्याची खतावणी</h1>
                <p className="text-sm font-bold text-slate-600 uppercase">
                  Daily Borrowed Food Grain Ledger | {schoolName || 'शाला नाव उपलब्ध नाही'}
                </p>
                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">
                  Period: {marathiMonths[selectedMonth - 1]} {selectedYear} | {selectedScope === 'primary' ? 'इ. १ ते ५ वी (Primary)' : 'इ. ६ ते ८ वी (Upper)'}
                </p>
              </div>

              <div className="overflow-x-auto print:overflow-visible print:w-full print:block">
                <table className="w-full border-collapse border border-slate-800 text-[10px] sm:text-xs text-center print:text-[9px] print:w-full">
                  <thead>
                    <tr className="bg-slate-100 font-black">
                      <th className="border border-slate-800 p-2 w-10">दिनांक</th>
                      <th className="border border-slate-800 p-2 w-16">वार</th>
                      <th className="border border-slate-800 p-2 w-20">मेनूचा प्रकार</th>
                      <th className="border border-slate-800 p-2 w-24">
                        उपस्थिती ({selectedScope === 'primary' ? '१-५' : '६-८'})
                      </th>
                      {menuItems.map(item => (
                        <th key={item.item_code} className="border border-slate-800 p-2 vertical-text min-w-[40px]">
                          {item.item_name}
                        </th>
                      ))}
                    </tr>

                    {/* Summary Row 1: Total Credit Used */}
                    <tr className="bg-amber-50/50">
                      <td colSpan={4} className="border border-slate-800 p-2 font-black text-right uppercase tracking-wider text-amber-900 bg-amber-50">
                        एकूण उसणे वापरलेले (Monthly Credit Total):
                      </td>
                      {menuItems.map(item => (
                        <td key={item.item_code} className="border border-slate-800 p-2 font-black text-amber-700 bg-amber-50">
                          {formatQuantity(creditData?.totals[item.item_code])}
                        </td>
                      ))}
                    </tr>

                    {/* Summary Row 2: Repaid Status */}
                    <tr>
                      <td colSpan={4} className="border border-slate-800 p-2 font-black text-right uppercase tracking-wider text-slate-500">
                        भरपाई स्थिती (Current Repayment Status):
                      </td>
                      {menuItems.map(item => {
                        const balance = inventoryBalances[item.item_name] || 0;
                        const borrowedQty = creditData?.totals[item.item_code] || 0;
                        const isRepaid = borrowedQty > 0 && balance >= borrowedQty;

                        return (
                          <td key={item.item_code} className="border border-slate-800 p-2">
                            {borrowedQty > 0 ? (
                              isRepaid ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <CheckCircle2 size={12} className="text-green-600" />
                                  <span className="text-[8px] font-black text-green-600">Repaid</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <RefreshCw size={12} className="text-amber-500 animate-pulse" />
                                  <span className="text-[8px] font-black text-amber-600">Pending</span>
                                </div>
                              )
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Visual Separator */}
                    <tr className="bg-slate-800 h-1">
                      <td colSpan={4 + menuItems.length}></td>
                    </tr>
                  </thead>
                  <tbody>
                    {creditData?.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4 + menuItems.length} className="p-10 text-slate-400 font-bold italic tracking-widest text-sm uppercase">
                          या महिन्यात कोणतेही धान्य उसणे वापरलेले नाही.<br />(No borrowed stock utilization found for this period)
                        </td>
                      </tr>
                    ) : (
                      creditData?.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-800 p-2 font-black">{row.date}</td>
                          <td className="border border-slate-800 p-2 font-bold">{row.dayName}</td>
                          <td className="border border-slate-800 p-2 font-black text-slate-700 uppercase tracking-tighter text-[9px]">{row.menu}</td>
                          <td className="border border-slate-800 p-2 font-black">{row.attendance}</td>
                          {menuItems.map(item => (
                            <td key={item.item_code} className={`border border-slate-800 p-2 ${row.borrowed[item.item_code] ? 'bg-amber-50 font-black text-amber-700' : 'text-slate-300 opacity-30'}`}>
                              {formatQuantity(row.borrowed[item.item_code])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legal Footer for Nondvahi */}
              <div className="mt-12 grid grid-cols-2 gap-20 px-10">
                <div className="text-center">
                  <div className="border-b border-slate-800 w-full mb-2 h-10"></div>
                  <p className="text-[10px] font-black uppercase">शालेय पोषण आहार प्रभारी</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-800 w-full mb-2 h-10"></div>
                  <p className="text-[10px] font-black uppercase">मुख्याध्यापक (स्वाक्षरी व शिक्का)</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
