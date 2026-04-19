import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import { reconstructOpeningBalances } from '../utils/inventoryUtils';
import { Loader2, BarChart2, Printer, AlertCircle } from 'lucide-react';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type MenuItem = Database['public']['Tables']['menu_master']['Row'];
type Enrollment = Database['public']['Tables']['student_enrollment']['Row'];
type ScheduleRow = Database['public']['Tables']['menu_weekly_schedule']['Row'];

// Helper to count weekday occurrences in a date range
const getWeekdayCounts = (start: Date, end: Date) => {
  const counts: Record<string, number> = {
    'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0
  };
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    counts[dayName]++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return counts;
};

export default function StockDemandReport() {

  const [loading, setLoading] = useState(true);

  const [workingDays, setWorkingDays] = useState<number>(20);
  const [classGroup, setClassGroup] = useState<'PRIMARY' | 'UPPER_PRIMARY'>('PRIMARY');
  const [schoolName, setSchoolName] = useState<string>("");
  const [centerName, setCenterName] = useState<string>("");

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [fromMonth, setFromMonth] = useState<string>(marathiMonths[new Date().getMonth()]);
  const [fromYear, setFromYear] = useState<string>(new Date().getFullYear().toString());
  const [tillMonth, setTillMonth] = useState<string>(marathiMonths[(new Date().getMonth() + 2) % 12]);
  const [tillYear, setTillYear] = useState<string>(new Date().getFullYear().toString());

  const reportPeriod = `${fromMonth} ${fromYear} ते ${tillMonth} ${tillYear}`;

  const [enrollmentCount, setEnrollmentCount] = useState<number>(0);
  
  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryBalances, setInventoryBalances] = useState<Record<string, number>>({});

  const { user } = useAuth();
  const userId = user?.id || null;
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [weekdayCounts, setWeekdayCounts] = useState<Record<string, number>>({});
  const [itemFrequencies, setItemFrequencies] = useState<Record<string, number>>({});
  
  const [customDemands, setCustomDemands] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchReportData(userId);
    }
  }, [userId, classGroup, fromMonth, fromYear, tillMonth, tillYear]);

  // Auto-Calculation Engine with Rounding & Frequency Logic
  useEffect(() => {
    if (menuItems.length > 0) {
      const newDemands: Record<string, string> = {};
      const newFrequencies: Record<string, number> = {};

      menuItems.forEach(item => {
        // 1. Calculate Frequency for this item
        let frequency = 0;
        const lowerName = item.item_name.toLowerCase();
        const isStaple = lowerName.includes('तांदूळ') || lowerName.includes('rice') || 
                         lowerName.includes('तेल') || lowerName.includes('oil') || 
                         lowerName.includes('मीठ') || lowerName.includes('salt');

        if (isStaple) {
          frequency = workingDays;
        } else {
          // Check schedule for this item code or name
          schedule.filter(s => s.is_active).forEach(s => {
            const hasItem = (s.menu_items || []).includes(item.item_code) || 
                            (s.menu_items || []).includes(item.item_name) ||
                            (s.main_food_codes || []).includes(item.item_name) ||
                            (s.main_food_codes || []).includes(item.item_code);
            
            if (hasItem) {
              frequency += (weekdayCounts[s.day_name] || 0);
            }
          });
        }

        newFrequencies[item.id] = frequency;

        // 2. Calculate Demand
        const balance = inventoryBalances[item.item_name] || 0;
        const grams = classGroup === 'PRIMARY' ? Number(item.grams_primary) : Number(item.grams_upper_primary);
        const required = (enrollmentCount * frequency * grams) / 1000;
        const demand = Math.max(0, required - balance);
        newDemands[item.id] = demand.toFixed(3);
      });

      setItemFrequencies(newFrequencies);
      setCustomDemands(newDemands);
      setIsSaved(false);
    }
  }, [menuItems, inventoryBalances, enrollmentCount, workingDays, classGroup, schedule, weekdayCounts]);

  const fetchReportData = async (id: string) => {
    setLoading(true);
    try {
      // 0. Calculate Weekday Occurrences for the period
      const fromMonthIndex = marathiMonths.indexOf(fromMonth);
      const tillMonthIndex = marathiMonths.indexOf(tillMonth);
      
      const startDate = new Date(Number(fromYear), fromMonthIndex, 1);
      const endDate = new Date(Number(tillYear), tillMonthIndex + 1, 0); // Last day of tillMonth
      
      const counts = getWeekdayCounts(startDate, endDate);
      setWeekdayCounts(counts);

      const cutoffDate = `${fromYear}-${String(fromMonthIndex + 1).padStart(2, '0')}-01`;

      const { data: profile } = await api
        .from('profiles')
        .select('school_name_mr, center_name_mr, has_primary, has_upper_primary')
        .eq('id', id)
        .returns<Profile[]>()
        .single();

      if (profile) {
        setSchoolName(profile.school_name_mr || "जिल्हा परिषद प्राथमिक शाळा");
        setCenterName(profile.center_name_mr || "-");
        
        const hp = profile.has_primary ?? true;
        const hup = profile.has_upper_primary ?? true;
        setHasPrimary(hp);
        setHasUpperPrimary(hup);

        // Auto-select active section if one is disabled
        if (!hp && hup) setClassGroup('UPPER_PRIMARY');
        if (hp && !hup) setClassGroup('PRIMARY');
      }

      const { data: enrollment } = await api
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', id)
        .returns<Enrollment[]>()
        .maybeSingle();

      if (enrollment) {
        const sum = classGroup === 'PRIMARY' 
          ? (Number(enrollment.std_1) || 0) + (Number(enrollment.std_2) || 0) + (Number(enrollment.std_3) || 0) + (Number(enrollment.std_4) || 0) + (Number(enrollment.std_5) || 0)
          : (Number(enrollment.std_6) || 0) + (Number(enrollment.std_7) || 0) + (Number(enrollment.std_8) || 0);
        setEnrollmentCount(sum);
      } else {
        setEnrollmentCount(0);
      }

      const { data: menuRaw } = await api
        .from('menu_master')
        .select('*')
        .eq('teacher_id', id);

      const { data: scheduleData } = await (api as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', id);

      const items = ((menuRaw || []) as any[]).sort((a, b) => {
        // Priority 1: Category (MAIN before INGREDIENT)
        if (a.item_category === 'MAIN' && b.item_category !== 'MAIN') return -1;
        if (a.item_category !== 'MAIN' && b.item_category === 'MAIN') return 1;
        
        // Priority 2: Sort Rank (Ascending)
        const rankA = a.sort_rank ?? 999;
        const rankB = b.sort_rank ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        
        // Fallback: Name
        return (a.item_name || '').localeCompare(b.item_name || '');
      });
      setMenuItems(items);
      setSchedule(scheduleData || []);

      // Reconstruct historical balances using centralized utility with SCOPE
      const reconcilation = await reconstructOpeningBalances(id, cutoffDate, items, classGroup.toLowerCase() as any);
      setInventoryBalances(reconcilation);

    } catch (error) {
      console.error('Error fetching demand report data', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { error } = await (api as any)
        .from('demand_reports')
        .insert([{
          teacher_id: userId,
          report_period: reportPeriod,
          class_group: classGroup,
          working_days: workingDays,
          enrollment_count: enrollmentCount,
          standard_group: classGroup.toLowerCase(),
          report_data: customDemands
        }] as any);

      if (error) throw error;
      setIsSaved(true);
    } catch (err: any) {
      alert('Error saving report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsSaved(false);
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20 print:p-0 print:m-0 w-full print:w-full print:max-w-none print:min-w-full">

        <style type="text/css">
          {`
            @media print {
              /* 1. CRITICAL: Hides the browser URL, Date, and Page Numbers */
              @page { size: A4 portrait; margin: 0 !important; }

              html, body { 
                background: white !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important; /* Allows multi-page scrolling */
              }

              /* 2. Hide everything else on the screen */
              body * {
                visibility: hidden;
              }

              /* 3. Show ONLY the report */
              #printable-report, #printable-report * {
                visibility: visible;
              }

              /* 4. FIX PAGINATION: Do not use position: absolute here. 
                 Use relative to allow natural height flow so signatures don't get cut off. */
              #printable-report {
                position: relative !important;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                /* Top: 5mm, Right: 15mm, Bottom: 15mm, Left: 15mm */
                padding: 5mm 15mm 15mm 15mm !important;
              }

              /* 5. Collapse parent layouts so the report aligns to the top-left */
              #root, main, [class*="layout"] {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}
        </style>

        {/* Controls Panel - Hidden on Print */}
        <div className="mb-6 p-5 bg-white rounded-xl shadow-xl border border-slate-200 print:hidden flex flex-col md:flex-row gap-5 justify-between items-start md:items-center">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-4">
              {hasPrimary && hasUpperPrimary && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setClassGroup('PRIMARY')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded ${classGroup === 'PRIMARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    १ ते ५ (Primary)
                  </button>
                  <button
                    onClick={() => setClassGroup('UPPER_PRIMARY')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded ${classGroup === 'UPPER_PRIMARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    ६ ते ८ (Upper)
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-500 uppercase">Working Days:</label>
                <input
                  type="number"
                  value={workingDays}
                  onChange={e => setWorkingDays(Number(e.target.value))}
                  className="w-20 border-2 border-slate-200 rounded p-1.5 text-center font-bold text-sm"
                  title="कामाचे दिवस (Working Days)"
                  placeholder="20"
                />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[350px]">
                <label className="text-xs font-black text-slate-500 uppercase whitespace-nowrap">From:</label>
                <select value={fromMonth} onChange={e => setFromMonth(e.target.value)} className="border-2 border-slate-200 rounded p-1.5 font-bold text-xs bg-white" title="महिन्याची निवड करा (Select From Month)">
                  {marathiMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={fromYear} onChange={e => setFromYear(e.target.value)} className="border-2 border-slate-200 rounded p-1.5 font-bold text-xs bg-white" title="वर्षाची निवड करा (Select From Year)">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                <label className="text-xs font-black text-slate-500 uppercase whitespace-nowrap ml-2">Till:</label>
                <select value={tillMonth} onChange={e => setTillMonth(e.target.value)} className="border-2 border-slate-200 rounded p-1.5 font-bold text-xs bg-white" title="अखेर महिन्याची निवड करा (Select Till Month)">
                  {marathiMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={tillYear} onChange={e => setTillYear(e.target.value)} className="border-2 border-slate-200 rounded p-1.5 font-bold text-xs bg-white" title="अखेर वर्षाची निवड करा (Select Till Year)">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Enrollment Alert for empty groups */}
            {enrollmentCount === 0 && !loading && (
              <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 animate-pulse">
                <AlertCircle className="flex-shrink-0" size={24} />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Enrollment Missing!</p>
                  <p className="text-[11px] font-bold">Please enter student counts for {classGroup === 'PRIMARY' ? 'Standard 1-5' : 'Standard 6-8'} in the Enrollment Registry to generate this report.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 items-end">
            {!isSaved ? (
              <button
                onClick={handleSave}
                disabled={loading}
                className={`flex-shrink-0 text-white px-6 py-2.5 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${isSaved ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <BarChart2 size={16} />}
                {isSaved ? '✔ SAVED' : 'SAVE DEMAND REPORT'}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="flex-shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all active:scale-95"
                >
                  Edit Report
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <Printer size={16} /> Print Report
                </button>
              </div>
            )}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isSaved ? "✅ Report Locked & Archived" : "🛡️ Draft Mode: Save to Enable Printing"}
            </p>
          </div>
        </div>

        {/* Printable Document Area */}
        {loading ? (
          <div className="h-64 flex items-center justify-center print:hidden">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : (
          <div id="printable-report" className="bg-white p-6 md:p-8 print:p-2 font-['Inter'] w-full print:w-full print:max-w-none print:px-0 print:mx-0">
            <div className="text-center mb-6 print:mb-2">
              <h1 className="text-2xl font-black text-black underline decoration-2 underline-offset-4 mb-2">
                शालेय पोषण आहार मागणी पत्रक {classGroup === 'PRIMARY' ? '(इ. १ ते ५ वी)' : '(इ. ६ ते ८ वी)'}
              </h1>
              <h2 className="text-lg font-bold text-black">
                माहे : {reportPeriod || '______________________'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-0 border-2 border-black mb-4 print:mb-2 w-full print:w-full divide-y md:divide-y-0 md:divide-x print:divide-y-0 print:divide-x border-black">
              <div className="p-3 md:col-span-6 print:col-span-6">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest print:text-black font-['Inter']">शाळेचे नाव</div>
                <div className="font-bold text-sm uppercase">{schoolName || '-'}</div>
              </div>
              <div className="p-3 md:col-span-2 print:col-span-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest print:text-black font-['Inter']">केंद्राचे नाव</div>
                <div className="font-bold text-sm uppercase">{centerName || '-'}</div>
              </div>
              <div className="p-3 md:col-span-2 print:col-span-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest print:text-black font-['Inter']">पट</div>
                <div className="font-bold text-sm">{enrollmentCount}</div>
              </div>
              <div className="p-3 md:col-span-2 print:col-span-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest print:text-black font-['Inter']">कामाचे एकूण दिवस</div>
                <div className="font-bold text-sm">{workingDays}</div>
              </div>
            </div>

            <table className="w-full print:w-full border-collapse border-2 border-black print:border-black text-base">
              <thead>
                <tr className="bg-slate-50 print:bg-gray-100">
                  <th className="border border-black print:border-black print:text-black w-12 p-2 py-3 print:py-1 text-center">अ. क्र.</th>
                  <th className="border border-black print:border-black print:text-black w-[30%] p-2 py-3 print:py-1 text-left">धान्यादी माल</th>
                  <th className="border border-black print:border-black print:text-black w-[15%] p-2 py-3 print:py-1 text-center">वापराचे एकूण दिवस</th>
                  <th className="border border-black print:border-black print:text-black w-[15%] p-2 py-3 print:py-1 text-right">मागील माह अखेर शिल्लक</th>
                  <th className="border border-black print:border-black print:text-black w-[15%] p-2 py-3 print:py-1 text-right">पटानुसार आवश्यक माल</th>
                  <th className="border border-black print:border-black print:text-black w-[15%] p-2 py-3 print:py-1 text-right text-lg print:text-base">निव्वळ मागणी</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item: any, idx: number) => {
                  const balance = inventoryBalances[item.item_name] || 0;
                  const frequency = itemFrequencies[item.id] || 0;
                  const grams = classGroup === 'PRIMARY' ? Number(item.grams_primary) : Number(item.grams_upper_primary);
                  const required = (enrollmentCount * frequency * grams) / 1000;

                  return (
                    <tr key={item.id}>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 text-center font-normal">{idx + 1}</td>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 font-medium">{item.item_name}</td>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 text-center font-bold text-slate-600 bg-slate-50/50">{frequency}</td>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 text-right font-normal">{balance.toFixed(3)}</td>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 text-right font-normal">{required.toFixed(3)}</td>
                      <td className="border border-black print:border-black print:text-black p-2 print:py-1 text-right font-bold text-lg print:text-base bg-gray-50 print:bg-transparent">
                        {!isSaved ? (
                          <input
                            type="number"
                            step="0.001"
                            value={customDemands[item.id] || ''}
                            onChange={(e) => setCustomDemands((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-24 bg-blue-50 border-2 border-blue-200 rounded p-1 text-right font-bold text-blue-900 outline-none focus:border-blue-500 transition-all"
                            title={`${item.item_name} साठि मागणी (Demand for ${item.item_name})`}
                            placeholder="0.000"
                          />
                        ) : (
                          <span>{Number(customDemands[item.id] || 0).toFixed(3)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {menuItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-black print:border-black print:text-black p-6 text-center text-gray-500 italic">No menu items configured...</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between w-full mt-10 print:mt-14 px-10 print:px-4 text-sm font-bold text-black print:text-black">
              <div className="text-center">
                <div className="border-t-2 border-black w-48 mx-auto mb-2"></div>
                <p>शालेय पोषण आहार प्रभारी</p>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-black w-64 mx-auto mb-2"></div>
                <p>मुख्याध्यापक (स्वाक्षरी व शिक्का)</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}
