import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { Loader2, Save, Printer, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { getFinancialYearStart } from '../utils/inventoryUtils';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
type ConsumptionLog = Database['public']['Tables']['consumption_logs']['Row'];
type FuelTracking = Database['public']['Tables']['fuel_tracking']['Row'];
type CookingStaff = Database['public']['Tables']['cooking_staff']['Row'];
type MonthlyReportSnapshot = Database['public']['Tables']['monthly_reports']['Row'];

interface MenuItem {
  item_code: string;
  item_name: string;
  grams_primary: number;
  grams_upper_primary: number;
  item_category: 'MAIN' | 'INGREDIENT';
  sort_rank?: number;
}

interface ScheduleRow {
  week_pattern: string;
  day_name: string;
  is_active: boolean;
  main_food_codes: string[];
  menu_items: string[];
}

interface DailyRow {
  date: string;
  formattedDate: string;
  dayName: string;
  marathiDayName: string;
  menuName: string;
  primaryAtt: number;
  upperAtt: number;
  honorarium: number;
  fuelCost: number;
  vegCost: number;
  consumptions: Record<string, string>;
}

interface TopSummaries {
  opening: Record<string, string>;
  received: Record<string, string>;
  total: Record<string, string>;
}

interface FooterTotals {
  primaryAtt: number;
  upperAtt: number;
  totalHonorarium: number;
  totalFuel: number;
  totalVeg: number;
  consumptions: Record<string, string>;
}

interface LedgerData {
  topSummaries: TopSummaries;
  dailyRows: DailyRow[];
  footerTotals: FooterTotals;
}



export default function DailyLedgerReport() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false);
  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Daily_Ledger_Report_${selectedMonth}_${selectedYear}`,
  });

  const [schoolName, setSchoolName] = useState('');
  const [centerName, setCenterName] = useState('');
  const [totalEnrollment, setTotalEnrollment] = useState(0);

  // Columns
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  // Generated Matrix Data
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await api
        .from('profiles')
        .select('school_name_mr, center_name_mr, has_primary, has_upper_primary')
        .eq('id', uid)
        .returns<Profile[]>()
        .single();
      
      if (error) throw error;
      if (data) {
        setSchoolName(data.school_name_mr || '');
        setCenterName(data.center_name_mr || '');
        setHasPrimary(data.has_primary ?? true);
        setHasUpperPrimary(data.has_upper_primary ?? true);
        
        // Safety check: If currently selected scope is not supported by the profile, switch it
        if (selectedScope === 'primary' && data.has_primary === false && data.has_upper_primary === true) {
          setSelectedScope('upper_primary');
        } else if (selectedScope === 'upper_primary' && data.has_upper_primary === false && data.has_primary === true) {
          setSelectedScope('primary');
        }
      }
    } catch (error: any) {
      console.error('Profile fetch error:', error.message);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
      fetchLedgerData(userId, selectedMonth, selectedYear, false, selectedScope);
    }
  }, [userId, selectedMonth, selectedYear, selectedScope]);

  const fetchLedgerData = async (id: string, month: number, year: number, forceSync = false, scope = selectedScope) => {
    setLoading(!forceSync);
    setIsSyncing(forceSync);
    setIsSaved(false);
    setIsViewingSnapshot(false);
    if (!forceSync) {
      setLedgerData(null);
      setMenuItems([]);
    }

    try {
      // 1. Check if an official snapshot already exists for Daily Ledger
      const { data: snapshot } = await api
        .from('monthly_reports')
        .select('*')
        .eq('teacher_id', id)
        .eq('report_month', month)
        .eq('report_year', year)
        .eq('standard_group', scope)
        .returns<MonthlyReportSnapshot[]>()
        .maybeSingle();

      // 2. Fetch Profile Info (Already handled by fetchProfile(id) on mount/refresh)

      // 2b. Fetch Enrollment
      const { data: enrollment } = await api
        .from('student_enrollment')
        .select('std_1,std_2,std_3,std_4,std_5,std_6,std_7,std_8')
        .eq('teacher_id', id)
        .maybeSingle();
      if (enrollment) {
        const primaryKeys = ['std_1', 'std_2', 'std_3', 'std_4', 'std_5'];
        const upperKeys = ['std_6', 'std_7', 'std_8'];
        const relevantKeys = scope === 'primary' ? primaryKeys : upperKeys;
        
        const scopedTotal = relevantKeys.reduce((sum, key) => sum + (Number(enrollment[key]) || 0), 0);
        setTotalEnrollment(scopedTotal);
      }

      // 3. Fetch Menu Master strictly for column mapping
      const { data: menuMaster } = await api
        .from('menu_master')
        .select('*')
        .eq('teacher_id', id);

      const items: MenuItem[] = (menuMaster || []).sort((a, b) => {
        // Priority 1: Category (MAIN before INGREDIENT)
        if (a.item_category === 'MAIN' && b.item_category !== 'MAIN') return -1;
        if (a.item_category !== 'MAIN' && b.item_category === 'MAIN') return 1;
        
        // Priority 2: Sort Rank (Ascending)
        const rankA = a.sort_rank ?? 999;
        const rankB = b.sort_rank ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        
        // Fallback: Name
        return a.item_name.localeCompare(b.item_name);
      });

      setMenuItems(items);

      if (!forceSync && snapshot && snapshot.daily_ledger_data) {
        setIsSaved(true);
        setIsViewingSnapshot(true);
        const parsed = typeof snapshot.daily_ledger_data === 'string'
          ? JSON.parse(snapshot.daily_ledger_data)
          : snapshot.daily_ledger_data;
        setLedgerData(parsed);
        setLoading(false);
        setIsSyncing(false);
        return;
      }

      // If no snapshot, compute engine dynamically:

      // A. Next/Current/Prev month date boundaries
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

      const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const currentMonthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // B. Opening Balances (From previous month report_data snapshot if exists)
      const { data: prevSnapshot } = await api
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .eq('standard_group', scope)
        .returns<MonthlyReportSnapshot[]>()
        .maybeSingle();

      const isApril = month === 4;
      const openingBalances: Record<string, number> = {};
      if (prevSnapshot && prevSnapshot.report_data && !isApril) {
        const pData = typeof prevSnapshot.report_data === 'string'
          ? JSON.parse(prevSnapshot.report_data)
          : prevSnapshot.report_data;
        pData.forEach((row: any) => { openingBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        // FALLBACK: Time-Travel Historical Reconstruction (Limited to Financial Year)
        console.log("No previous snapshot found or it's April. Reconstructing opening balances historically...");
        const fyStart = getFinancialYearStart(currentMonthStart);
        const [histReceipts, histConsumption] = await Promise.all([
          api.from('stock_receipts').select('item_name, quantity_kg').eq('teacher_id', id).eq('standard_group', scope).gte('receipt_date', fyStart).lt('receipt_date', currentMonthStart),
          api.from('consumption_logs').select('meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used').eq('teacher_id', id).eq('standard_group', scope).gte('log_date', fyStart).lt('log_date', currentMonthStart)
        ]);

        (histReceipts.data || []).forEach((r: any) => {
          openingBalances[r.item_name] = (openingBalances[r.item_name] || 0) + Number(r.quantity_kg);
        });

        (histConsumption.data || []).forEach((c: any) => {
          const pAtt = Number(c.meals_served_primary) || 0;
          const uAtt = Number(c.meals_served_upper_primary) || 0;
          const usedItems = Array.from(new Set([...(c.main_foods_all || []), ...(c.ingredients_used || [])])).filter(Boolean);

          usedItems.forEach((itemName: any) => {
            const itemMaster = items.find((m: any) => m.item_name === itemName);
            if (itemMaster) {
              const grams = scope === 'primary' ? Number(itemMaster.grams_primary || 0) : Number(itemMaster.grams_upper_primary || 0);
              const att = scope === 'primary' ? pAtt : uAtt;
              const consumedKg = (att * grams) / 1000;
              openingBalances[itemName] = (openingBalances[itemName] || 0) - consumedKg;
            }
          });
        });
      }

      // C. Stock Receipts (Received)
      const { data: receipts } = await api
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', id)
        .eq('standard_group', scope)
        .gte('receipt_date', currentMonthStart)
        .lte('receipt_date', currentMonthEnd);

      const receivedSums: Record<string, number> = {};
      (receipts || []).forEach((r: any) => {
        receivedSums[r.item_name] = (receivedSums[r.item_name] || 0) + (Number(r.quantity_kg) || 0);
      });

      // D. Menu Weekly Schedule
      const { data: weeklySchedule } = await api
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', id);

      const scheduleOptions: ScheduleRow[] = weeklySchedule || [];

      // E. Daily Logs & Consumption Details
      const [logsRes, consumptionRes, staffRes, fuelRes] = await Promise.all([
        api.from('daily_logs').select('*').eq('teacher_id', id).gte('log_date', currentMonthStart).lte('log_date', currentMonthEnd),
        api.from('consumption_logs').select('*').eq('teacher_id', id).eq('standard_group', scope).gte('log_date', currentMonthStart).lte('log_date', currentMonthEnd),
        api.from('cooking_staff').select('*').eq('teacher_id', id).eq('standard_group', scope),
        api.from('fuel_tracking').select('*').eq('teacher_id', id).eq('standard_group', scope)
      ]);

      const logs = (logsRes.data as DailyLog[]) || [];
      const consumptionLogs = (consumptionRes.data as ConsumptionLog[]) || [];
      const activeStaff = (staffRes.data as CookingStaff[]) || [];
      const activeFuel = (fuelRes.data as FuelTracking[]) || [];

      // Calculate days served for legacy pro-rating
      const daysServed = logs.filter((l: any) => (Number(l.meals_served_primary) || 0) > 0 || (Number(l.meals_served_upper_primary) || 0) > 0).length;

      const logsMap = new Map();
      logs.forEach((l: any) => logsMap.set(l.log_date, l));

      const consumptionMap = new Map();
      consumptionLogs.forEach((c: any) => consumptionMap.set(c.log_date, c));

      // BUILD MATRIX
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyRows = [];
      const itemTotals: Record<string, number> = {};

      let totalAttP = 0;
      let totalAttU = 0;
      let totalHonorarium = 0;
      let totalFuel = 0;
      let totalVeg = 0;

      // Calculate Monthly Fixed Honorarium
      const monthlyStaffTotal = activeStaff.reduce((sum, staff) => {
        if (staff.payment_type === 'monthly') {
          return sum + (scope === 'primary' ? Number(staff.rate_primary || 0) : Number(staff.rate_upper || 0));
        }
        return sum;
      }, 0);

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, d);
        const engDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = engDayNames[dateObj.getDay()];

        // Logic: Week 1, 3, 5 = WEEK_1_3_5
        const weekNum = Math.ceil(d / 7);
        const weekPattern = (weekNum % 2 === 1) ? 'WEEK_1_3_5' : 'WEEK_2_4';

        const daySchedule = scheduleOptions.find(s => s.week_pattern === weekPattern && s.day_name === dayName);
        const log = logsMap.get(dateStr);

        const marathiDayNames: Record<string, string> = {
          'Sunday': 'रविवार', 'Monday': 'सोमवार', 'Tuesday': 'मंगळवार',
          'Wednesday': 'बुधवार', 'Thursday': 'गुरुवार', 'Friday': 'शुक्रवार', 'Saturday': 'शनिवार'
        };
        const rowData: any = {
          date: dateStr,
          formattedDate: `${d} ${marathiMonths[month - 1]}`,
          dayName: dayName,
          marathiDayName: marathiDayNames[dayName],
          menuName: dayName === 'Sunday' ? 'रविवार सुट्टी' : '',
          primaryAtt: 0,
          upperAtt: 0,
          honorarium: 0,
          consumptions: {}
        };

        if (log) {
          const consumption = consumptionMap.get(dateStr);
          const pAtt = Number(log.meals_served_primary) || 0;
          const uAtt = Number(log.meals_served_upper_primary) || 0;

          rowData.primaryAtt = scope === 'primary' ? pAtt : 0;
          rowData.upperAtt = scope === 'upper_primary' ? uAtt : 0;
          if (scope === 'primary') totalAttP += pAtt;
          else totalAttU += uAtt;

          if (log.is_holiday) {
            rowData.menuName = `सुट्टी: ${log.holiday_remarks || 'National Holiday'}`;
            // Consumptions stay 0
          } else {
            // Priority: Use actual consumption log override, fallback to schedule
            const actualMainFoods = consumption?.main_foods_all || [consumption?.main_food].filter(Boolean);
            const actualIngredients = consumption?.ingredients_used || [];

            const isUsingOverride = actualMainFoods.length > 0 || actualIngredients.length > 0;

            if (isUsingOverride) {
              rowData.menuName = actualMainFoods.join(' + ') || 'Menu';
              // Compute based on consumption log items
              items.forEach(item => {
                const isIncluded = actualMainFoods.includes(item.item_name) || actualIngredients.includes(item.item_name);
                if (isIncluded && (pAtt > 0 || uAtt > 0)) {
                  const gramsP = Number(item.grams_primary) || 0;
                  const gramsU = Number(item.grams_upper_primary) || 0;
                  const consumedKg = (scope === 'primary' ? pAtt * gramsP : uAtt * gramsU) / 1000;

                  rowData.consumptions[item.item_code] = consumedKg.toFixed(3);
                  itemTotals[item.item_code] = (itemTotals[item.item_code] || 0) + consumedKg;
                } else {
                  rowData.consumptions[item.item_code] = '0.000';
                }
              });
            } else if (daySchedule && daySchedule.is_active) {
              // Fallback to Schedule
              const mainNames = items
                .filter(i => daySchedule.main_food_codes.includes(i.item_code))
                .map(i => i.item_name)
                .join(' + ');
              rowData.menuName = mainNames || 'Menu';

              items.forEach(item => {
                const isIncluded = daySchedule.main_food_codes.includes(item.item_code) || daySchedule.menu_items.includes(item.item_code);
                if (isIncluded && (pAtt > 0 || uAtt > 0)) {
                  const gramsP = Number(item.grams_primary) || 0;
                  const gramsU = Number(item.grams_upper_primary) || 0;
                  const consumedKg = (scope === 'primary' ? pAtt * gramsP : uAtt * gramsU) / 1000;

                  rowData.consumptions[item.item_code] = consumedKg.toFixed(3);
                  itemTotals[item.item_code] = (itemTotals[item.item_code] || 0) + consumedKg;
                } else {
                  rowData.consumptions[item.item_code] = '0.000';
                }
              });
            }
          }
        } else {
          // No meal served today
          items.forEach(item => {
            rowData.consumptions[item.item_code] = '0.000';
          });
        }

        // F. Calculate Dynamic Expenditures for this day
        let dailyHonorarium = 0;
        let dailyFuel = 0;
        let dailyVeg = 0;

        const totalDayAtt = rowData.primaryAtt + rowData.upperAtt;
        if (totalDayAtt > 0) {
          // 1. Staff Honorarium
          activeStaff.forEach((staff: any) => {
            const rate = scope === 'primary' ? Number(staff.rate_primary || 0) : Number(staff.rate_upper || 0);
            if (staff.payment_type === 'per_student') {
              dailyHonorarium += rate * totalDayAtt;
            } else if (staff.payment_type === 'per_day') {
              dailyHonorarium += rate;
            }
          });

          // 2. Fuel & Vegetables
          activeFuel.forEach((fuel: any) => {
            const fRate = scope === 'primary' ? Number(fuel.fuel_rate_primary || 0) : Number(fuel.fuel_rate_upper || 0);
            const vRate = scope === 'primary' ? Number(fuel.veg_rate_primary || 0) : Number(fuel.veg_rate_upper || 0);
            
            if (fRate > 0 || vRate > 0) {
              dailyFuel += (fRate * totalDayAtt);
              dailyVeg += (vRate * totalDayAtt);
            } else {
              // Legacy support (Pro-rated daily)
              dailyFuel += Number(fuel.monthly_cost || 0) / (daysServed || 20);
            }
          });
        }
        
        rowData.honorarium = Number(dailyHonorarium.toFixed(2));
        rowData.fuelCost = Number(dailyFuel.toFixed(2));
        rowData.vegCost = Number(dailyVeg.toFixed(2));

        totalHonorarium += dailyHonorarium;
        totalFuel += dailyFuel;
        totalVeg += dailyVeg;

        dailyRows.push(rowData as DailyRow);
      }
      
      // Add monthly fixed amount to grand total
      totalHonorarium += monthlyStaffTotal;

      // Format Header Summaries
      const openRow: any = {};
      const receivedRow: any = {};
      const totalRow: any = {};

      items.forEach(item => {
        const op = openingBalances[item.item_name] || 0;
        const rec = receivedSums[item.item_name] || 0;
        openRow[item.item_code] = Number(op.toFixed(2)).toString();
        receivedRow[item.item_code] = Number(rec.toFixed(2)).toString();
        totalRow[item.item_code] = Number((op + rec).toFixed(2)).toString();
      });

      // Format Footer Summaries
      const footerTotalsRow: any = {};
      items.forEach(item => {
        footerTotalsRow[item.item_code] = Number((itemTotals[item.item_code] || 0).toFixed(2)).toString();
      });

      setLedgerData({
        topSummaries: {
          opening: openRow,
          received: receivedRow,
          total: totalRow
        },
        dailyRows: dailyRows,
        footerTotals: {
          primaryAtt: totalAttP,
          upperAtt: totalAttU,
          totalHonorarium: totalHonorarium,
          totalFuel: totalFuel,
          totalVeg: totalVeg,
          consumptions: footerTotalsRow
        }
      });
      setLoading(false);
      setIsSyncing(false);
    } catch (e) {
      console.error("Ledger aggregation error:", e);
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !ledgerData) return;
    setLoading(true);

    try {
      const payload = {
        teacher_id: userId,
        report_month: selectedMonth,
        report_year: selectedYear,
        standard_group: selectedScope,
        daily_ledger_data: JSON.stringify(ledgerData)
      };

      const { data: existing } = await api
        .from('monthly_reports')
        .select('id')
        .eq('teacher_id', userId)
        .eq('report_month', selectedMonth)
        .eq('report_year', selectedYear)
        .eq('standard_group', selectedScope)
        .returns<MonthlyReportSnapshot[]>()
        .maybeSingle();

      let err;
      if (existing) {
        const res = await (api
          .from('monthly_reports') as any)
          .update(payload)
          .eq('id', (existing as any).id)
          .eq('teacher_id', userId);
        err = res.error;
      } else {
        const res = await (api.from('monthly_reports') as any).insert([payload]);
        err = res.error;
      }

      if (err) throw err;

      setIsSaved(true);
      setIsViewingSnapshot(true);
      alert("दैनंदिन खतावणी सेव्ह झाली! (Daily Ledger Saved)");
    } catch (error: any) {
      alert("Error saving ledger: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Layout>
      <div className="mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-full print:bg-white w-full lg:max-w-[95vw] print:h-auto print:overflow-visible print:block">
        {/* Optimized Control Bar */}
        <div className="mb-6 mx-auto w-full lg:max-w-6xl print:hidden">
          <div className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-3xl md:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">Daily Ledger</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory Management System</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
                {/* Month/Year Selectors */}
                <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 items-center">
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent px-3 py-1.5 font-bold text-xs text-slate-700 outline-none w-32"
                    title="महिना निवडा (Select Month)"
                  >
                    {marathiMonths.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <div className="w-[1px] h-4 bg-slate-300 mx-0.5" />
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent px-3 py-1.5 font-bold text-xs text-slate-700 outline-none w-20"
                    title="वर्ष निवडा (Select Year)"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {/* Scope Toggle */}
                {hasPrimary && hasUpperPrimary && (
                  <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-inner">
                    <button 
                      onClick={() => setSelectedScope('primary')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'primary' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      I-V
                    </button>
                    <button 
                      onClick={() => setSelectedScope('upper_primary')}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      VI-VIII
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLedgerData(userId!, selectedMonth, selectedYear, true)}
                    disabled={loading || isSyncing}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                    title="Sync Live Data"
                  >
                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-wider">Sync</span>
                  </button>

                  {!isSaved ? (
                    <button
                      onClick={handleSave}
                      disabled={loading || !ledgerData}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Record
                    </button>
                  ) : (
                    <button
                      onClick={handlePrint}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      <Printer size={14} /> Print Register
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isViewingSnapshot && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500" size={20} />
              <div>
                <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest leading-none">Viewing Saved Snapshot</p>
                <p className="text-[10px] font-bold text-amber-700/80 mt-1">Updates to daily logs aren't shown in snapshots. Click "Sync Live Data" to refresh.</p>
              </div>
            </div>
            <button
              onClick={() => fetchLedgerData(userId!, selectedMonth, selectedYear, true)}
              className="text-[10px] font-black text-amber-800 underline uppercase hover:text-amber-950 px-3 py-1.5"
            >
              Update Now
            </button>
          </div>
        )}


        <div className="bg-white print:p-0 print:m-0 w-full font-['Inter']">
          <style type="text/css" media="print">
            {`
              @page { size: landscape; margin: 5mm; }
              body, html { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                height: auto !important; 
                overflow: visible !important; 
              }
              .print-content { overflow: visible !important; height: auto !important; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            `}
          </style>

          {loading ? (
            <div className="h-[50vh] flex flex-col justify-center items-center print:hidden space-y-4">
              <Loader2 size={40} className="animate-spin text-[#474379]" />
              <p className="font-bold text-slate-400 animate-pulse text-sm">कॅल्क्युलेशन सुरू आहे...</p>
            </div>
          ) : ledgerData && menuItems.length > 0 ? (
            <div className="w-full overflow-x-auto print:overflow-x-visible pb-10 custom-scrollbar print:h-auto print:overflow-visible print:block">
              <div ref={printRef} className="print-content w-full min-w-[1200px] print:min-w-0 mx-auto print:block print:h-auto print:overflow-visible">
                <div className="bg-white print:border-none border-2 border-slate-200 shadow-md p-8 print:p-0 w-full relative">
                  <div className="text-center mb-4 print:mb-3 border-b-2 border-black pb-3">
                    <div className="mb-2">
                      <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide leading-tight">
                        प्रधानमंत्री पोषणशक्ति निर्माण योजना {selectedScope === 'primary' ? '(इ. १ ते ५ वी)' : '(इ. ६ ते ८ वी)'}
                      </h1>
                      <h2 className="text-lg md:text-xl font-black uppercase tracking-wide mt-1">
                        दैनंदिन खर्च नोंदवही (भाग - २)
                      </h2>
                    </div>
                    <h2 className="text-sm font-extrabold text-gray-800 leading-relaxed">
                      शाळेचे नाव: <span className="underline decoration-dotted underline-offset-4">{schoolName || '____________________'}</span>
                      <span className="mx-3">|</span>
                      केंद्र: <span className="underline decoration-dotted underline-offset-4">{centerName || '____________________'}</span>
                      <span className="mx-3">|</span>
                      महिना: <span className="underline decoration-dotted underline-offset-4">{marathiMonths[selectedMonth - 1]} - {selectedYear}</span>
                    </h2>

                    {(() => {
                      const daysServed = (ledgerData.dailyRows || []).filter((row: any) => row.primaryAtt > 0 || row.upperAtt > 0).length;
                      return (
                        <div className="flex justify-center gap-6 mt-3 mb-2">
                          <div className="border border-slate-800 px-4 py-1.5 flex items-center justify-center gap-3 bg-slate-50/50">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">एकूण पट (Enrollment):</span>
                            <span className="text-lg font-black text-slate-900 leading-none">{totalEnrollment || 0}</span>
                          </div>

                          <div className="border border-slate-800 px-4 py-1.5 flex items-center justify-center gap-3 bg-slate-50/50">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">आहार शिजवलेले दिवस:</span>
                            <span className="text-lg font-black text-slate-900 leading-none">{daysServed || 0}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="w-full pb-10">
                    <table className="w-full border-collapse border border-slate-800 text-[11px] print:text-[9px]">
                      <thead>
                        <tr className="bg-gray-100 print:bg-transparent">
                          <th className="border border-black print:border-[1px] p-2 text-center whitespace-nowrap min-w-[45px]">दिनांक</th>
                          <th className="border border-black print:border-[1px] p-2 text-center whitespace-nowrap min-w-[60px]">वार</th>
                          <th className="border border-black print:border-[1px] p-2 text-center text-[10px] leading-tight min-w-[100px]">मेनूचा प्रकार</th>
                          <th className="border border-black print:border-[1px] p-1 text-center text-[9px] leading-tight w-[45px] min-w-[45px]">उपस्थिती<br/>({selectedScope === 'primary' ? '१-५' : '६-८'})</th>
                          {menuItems.map(m => (
                            <th
                              key={m.item_code}
                              className="border border-slate-800 p-0.5 text-center font-bold text-[9px] leading-tight whitespace-normal break-words align-middle min-w-[35px]"
                              title={m.item_name}
                            >
                              {m.item_name}
                            </th>
                          ))}
                          <th className="border border-black print:border-[1px] p-1 text-center text-[9px] leading-tight min-w-[55px] w-[55px]">इंधन आणि<br/>भाजीपाला</th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* Opening States */}
                        <>
                          <tr className="bg-yellow-50/30 print:bg-transparent font-bold">
                            <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={4}>१) मागील शिल्लक (Opening)</td>
                            {menuItems.map(m => (
                              <td key={'op_' + m.item_code} className="border border-black print:border-[1px] p-1.5 text-right font-mono">
                                {Number(ledgerData.topSummaries.opening[m.item_code]) === 0 ? '-' : ledgerData.topSummaries.opening[m.item_code]}
                              </td>
                            ))}
                            <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                          </tr>
                          <tr className="bg-blue-50/30 print:bg-transparent font-bold">
                            <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={4}>२) प्राप्त (Received)</td>
                            {menuItems.map(m => (
                              <td key={'rec_' + m.item_code} className="border border-black print:border-[1px] p-1.5 text-right font-mono">
                                {Number(ledgerData.topSummaries.received[m.item_code]) === 0 ? '-' : ledgerData.topSummaries.received[m.item_code]}
                              </td>
                            ))}
                            <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                          </tr>
                          <tr className="bg-gray-200/50 print:bg-transparent font-black">
                            <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={4}>३) एकूण (Total = 1+2)</td>
                            {menuItems.map(m => (
                              <td key={'tot_' + m.item_code} className="border border-black print:border-[1px] p-1.5 text-right font-mono">
                                {Number(ledgerData.topSummaries.total[m.item_code]) === 0 ? '-' : ledgerData.topSummaries.total[m.item_code]}
                              </td>
                            ))}
                            <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                          </tr>
                          <tr>
                            <td colSpan={4 + menuItems.length} className="border-x border-black print:border-x-[1px] h-1 bg-black/10 print:bg-transparent"></td>
                          </tr>
                        </>

                        {ledgerData.dailyRows.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent transition-colors print:break-inside-avoid">
                            <td className="border border-black print:border-[1px] p-1.5 whitespace-nowrap min-w-[45px] font-bold text-center">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="border border-black print:border-[1px] p-1.5 text-center whitespace-nowrap min-w-[60px] tracking-tighter">{row.marathiDayName}</td>
                            <td className="border border-black print:border-[1px] p-1.5 text-[10px] leading-tight min-w-[100px] break-words" title={row.menuName}>{row.menuName || '-'}</td>
                            <td className="border border-black print:border-[1px] p-1 text-center font-bold text-[10px]">
                              {selectedScope === 'primary' ? (row.primaryAtt > 0 ? row.primaryAtt : '-') : (row.upperAtt > 0 ? row.upperAtt : '-')}
                            </td>
                            {menuItems.map(m => (
                              <td key={row.date + '_' + m.item_code} className={`border border-black print:border-[1px] p-1.5 text-right font-mono ${Number(row.consumptions[m.item_code]) === 0 ? 'text-gray-300 print:text-gray-400' : 'text-slate-800 font-bold'}`}>
                                {Number(row.consumptions[m.item_code]) === 0 ? '-' : row.consumptions[m.item_code]}
                              </td>
                            ))}
                            <td className="border border-black print:border-[1px] p-1 text-right font-bold text-[9px]">
                              {Number((row.fuelCost || 0) + (row.vegCost || 0)) === 0 ? '-' : (Number(row.fuelCost || 0) + Number(row.vegCost || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}

                        {/* Totals */}
                        <>
                          {/* Unified Grand Total Row */}
                          <tr className="bg-[#474379]/10 print:bg-transparent border-t-[3px] border-black">
                            <td className="border border-black print:border-[1px] p-2 text-center font-black uppercase tracking-wider" colSpan={3}>
                              एकूण (GRAND TOTAL)
                            </td>
                            <td className="border border-black print:border-[1px] p-1 text-center font-black bg-blue-50/50 print:bg-transparent text-[10px]">
                              {selectedScope === 'primary' ? ledgerData.footerTotals.primaryAtt : ledgerData.footerTotals.upperAtt}
                            </td>
                            {menuItems.map(m => (
                              <td key={'footer_' + m.item_code} className="border border-black print:border-[1px] p-2 text-right font-black text-[10px]">
                                {Number(ledgerData.footerTotals.consumptions[m.item_code]) === 0 ? '-' : ledgerData.footerTotals.consumptions[m.item_code]}
                              </td>
                            ))}
                            <td className="border border-black print:border-[1px] p-1 text-right font-black text-[9px]">{(Number(ledgerData.footerTotals.totalFuel || 0) + Number(ledgerData.footerTotals.totalVeg || 0)).toFixed(2)}</td>
                          </tr>

                          <tr className="bg-amber-50/50 print:bg-transparent font-black text-xs print:text-[10px]">
                            <td className="border border-black print:border-[1px] p-2 text-center text-amber-700 print:text-black tracking-widest" colSpan={4}>
                              ४) उसणे घेतलेले धान्य (Borrowed Stock)
                            </td>
                            {menuItems.map(m => {
                              const op = Number(ledgerData.topSummaries.opening[m.item_code]) || 0;
                              const rec = Number(ledgerData.topSummaries.received[m.item_code]) || 0;
                              const available = Math.max(0, op) + rec;
                              const cons = Number(ledgerData.footerTotals.consumptions[m.item_code]) || 0;
                              const borrowed = Number(Math.max(0, cons - available).toFixed(2));
                              return (
                                <td key={'borrow_' + m.item_code} className="border border-black print:border-[1px] p-2 text-right font-black text-amber-600 print:text-black text-[10px]">
                                  {borrowed === 0 ? '-' : borrowed}
                                </td>
                              )
                            })}
                            <td className="border border-black print:border-[1px] p-2 text-right font-black">-</td>
                          </tr>

                          <tr className="bg-gray-100 print:bg-transparent font-black text-xs print:text-[10px]">
                            <td className="border border-black print:border-[1px] p-2 text-center text-red-600 print:text-black tracking-widest" colSpan={4}>
                              ५) अखेर शिल्लक (Closing Balance)
                            </td>
                            {menuItems.map(m => {
                              const tot = Number(ledgerData.topSummaries.total[m.item_code]) || 0;
                              const cons = Number(ledgerData.footerTotals.consumptions[m.item_code]) || 0;
                              const closing = Number((tot - cons).toFixed(2));
                              return (
                                <td key={'close_' + m.item_code} className={`border border-black print:border-[1px] p-2 text-right font-black text-[10px] ${closing < 0 ? 'text-red-600' : ''}`}>
                                  {closing === 0 ? '-' : closing}
                                </td>
                              )
                            })}
                            <td className="border border-black print:border-[1px] p-2 text-right font-black">-</td>
                          </tr>
                        </>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-12 mb-4 flex justify-between px-10 print:px-4 items-end">
                    <div className="text-center font-bold text-xs uppercase">
                      <div className="border-b-[1.5px] border-black w-40 mb-2"></div>
                      शालेय पोषण आहार प्रभारी
                    </div>
                    {isSaved && (
                      <div className="text-center font-black text-[#474379]/10 text-4xl transform -rotate-12 select-none print:text-black/10 origin-center absolute left-1/2 -translate-x-1/2">
                        OFFICIAL RECORD
                      </div>
                    )}
                    <div className="text-center font-bold text-xs uppercase">
                      <div className="border-b-[1.5px] border-black w-48 mb-2"></div>
                      मुख्याध्यापक (स्वाक्षरी व शिक्का)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl m-6">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm text-center">
                या महिन्यासाठी मेनू मास्टर आणि <br />उपस्थिती माहिती उपलब्ध नाही.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
