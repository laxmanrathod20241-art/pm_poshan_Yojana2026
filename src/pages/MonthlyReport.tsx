import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { calculateConsumedKg, reconstructOpeningBalances, formatQuantity } from '../utils/inventoryUtils';
import { Loader2, Save, Printer, RefreshCcw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type FuelTracking = Database['public']['Tables']['fuel_tracking']['Row'];
type CookingStaff = Database['public']['Tables']['cooking_staff']['Row'];
type MonthlyReportSnapshot = Database['public']['Tables']['monthly_reports']['Row'];

interface ReportRow {
  item: string;
  openingBalance: string;
  received: string;
  total: string;
  consumed: string;
  borrowed: string;
  closingBalance: string;
  [key: string]: string; // Allow dynamic access by metric key
}

interface StaffPayout {
  id: string;
  name: string;
  post: string;
  amount: number;
}

export default function MonthlyReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Monthly_ZP_Report_${selectedMonth}_${selectedYear}`,
  });

  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [fuelTotal, setFuelTotal] = useState(0);
  const [vegTotal, setVegTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffPayouts, setStaffPayouts] = useState<StaffPayout[]>([]);
  
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
        .select('has_primary, has_upper_primary, school_name_mr')
        .eq('id', uid)
        .returns<Profile[]>()
        .single();
      
      if (error) throw error;
      if (data) {
        setHasPrimary(data.has_primary ?? true);
        setHasUpperPrimary(data.has_upper_primary ?? true);
        setSchoolName(data.school_name_mr || '');
        
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
      fetchReportData(userId, selectedMonth, selectedYear, false, selectedScope);
    }
  }, [selectedMonth, selectedYear, selectedScope, userId]);
  
  const handleRefresh = () => {
    if (userId) {
      fetchReportData(userId, selectedMonth, selectedYear, true, selectedScope);
    }
  };

  const fetchReportData = async (id: string, month: number, year: number, forceRefresh: boolean = false, scope = selectedScope) => {
    setLoading(!forceRefresh);
    setIsSyncing(forceRefresh);
    setIsSaved(false);
    
    try {
      // 1. Check if an official snapshot already exists
      let snapshot = null;
      if (!forceRefresh) {
        const { data } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('teacher_id', id)
          .eq('report_month', month)
          .eq('report_year', year)
          .eq('standard_group', scope)
          .returns<MonthlyReportSnapshot[]>()
          .maybeSingle();
        snapshot = data;
      }

      // 2. Fetch Profile Info
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_name_mr, has_primary, has_upper_primary')
        .eq('id', id)
        .returns<Profile[]>()
        .maybeSingle();
      if (profile) {
        setSchoolName(profile.school_name_mr || '');
        setHasPrimary(profile.has_primary ?? true);
        setHasUpperPrimary(profile.has_upper_primary ?? true);
      }

      // 3. Fetch Logistics (Fuel & Staff) - Global Configuration
      const { data: fuel } = await supabase.from('fuel_tracking').select('*').eq('teacher_id', id).eq('standard_group', scope);
      const { data: staff } = await supabase.from('cooking_staff').select('*').eq('teacher_id', id).eq('standard_group', scope);
      
      // NOTE: totals will be set AFTER computing logs and attendance below

      if (snapshot && snapshot.report_data) {
        setIsSaved(true);
        const parsed = typeof snapshot.report_data === 'string' 
            ? JSON.parse(snapshot.report_data) 
            : snapshot.report_data;
        setReportData(parsed);

        // Even with a snapshot, we need to compute the financial summary 
        // because legacy snapshots might not have these totals saved.
        // We'll proceed to the calculation logic below instead of returning early.
      }

      // If no snapshot, compute engine dynamically:
      const { data: menuMaster } = await supabase.from('menu_master').select('*').eq('teacher_id', id);

      const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nMonth = month === 12 ? 1 : month + 1;
      const nYear = month === 12 ? year + 1 : year;
      const nextMonthStart = `${nYear}-${String(nMonth).padStart(2, '0')}-01`;

      // B. Fetch Previous Month Snapshot or Reconstruct
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

      const { data: prevSnapshot } = await supabase
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .eq('standard_group', scope)
        .returns<MonthlyReportSnapshot[]>()
        .maybeSingle();

      let prevBalances: Record<string, number> = {};
      
      if (prevSnapshot && prevSnapshot.report_data) {
         const pData = typeof prevSnapshot.report_data === 'string' ? JSON.parse(prevSnapshot.report_data) : prevSnapshot.report_data;
         pData.forEach((row: any) => { prevBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        prevBalances = await reconstructOpeningBalances(id, currentMonthStart, menuMaster || [], scope);
      }

      const { data: receipts } = await supabase
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', id)
        .eq('standard_group', scope)
        .gte('receipt_date', currentMonthStart)
        .lt('receipt_date', nextMonthStart);

      const receivedSums: Record<string, number> = {};
      (receipts || []).forEach((r: any) => {
         receivedSums[r.item_name] = (receivedSums[r.item_name] || 0) + (Number(r.quantity_kg) || 0);
      });

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('teacher_id', id)
        .gte('log_date', currentMonthStart)
        .lt('log_date', nextMonthStart);

      let totalPrimaryMeals = 0;
      let totalUpperMeals = 0;
      let workingDaysCount = 0;
      (logs || []).forEach((l: any) => {
         const p = Number(l.meals_served_primary) || 0;
         const u = Number(l.meals_served_upper_primary) || 0;
         if (p > 0 || u > 0) workingDaysCount++;
         totalPrimaryMeals += p;
         totalUpperMeals += u;
      });

      // Compute Dynamic Staff Honorarium Totals
      let dynamicStaffTotal = 0;
      const staffResults: StaffPayout[] = [];
      (staff as CookingStaff[] || []).forEach((s) => {
        let individualTotal = 0;
        const rate = scope === 'primary' ? Number(s.rate_primary || 0) : Number(s.rate_upper || 0);
        
        if (s.payment_type === 'per_student') {
          individualTotal = rate * (scope === 'primary' ? totalPrimaryMeals : totalUpperMeals);
        } else if (s.payment_type === 'per_day') {
          individualTotal = rate * workingDaysCount;
        } else {
          // Fallback to monthly cost if rates are 0
          if (rate === 0) individualTotal = Number(s.monthly_cost || 0);
          else individualTotal = rate; 
        }

        if (individualTotal > 0) {
          dynamicStaffTotal += individualTotal;
          staffResults.push({
            id: s.id,
            name: s.staff_name,
            post: s.post_name,
            amount: individualTotal
          });
        }
      });
      setStaffTotal(dynamicStaffTotal);
      setStaffPayouts(staffResults);

      // Compute Dynamic Fuel & Veg Totals
      let dFuelTotal = 0;
      let dVegTotal = 0;
      const meals = scope === 'primary' ? totalPrimaryMeals : totalUpperMeals;
      (fuel as FuelTracking[] || []).forEach((f) => {
        const fr = scope === 'primary' ? Number(f.fuel_rate_primary || 0) : Number(f.fuel_rate_upper || 0);
        const vr = scope === 'primary' ? Number(f.veg_rate_primary || 0) : Number(f.veg_rate_upper || 0);
        if (fr > 0 || vr > 0) {
          dFuelTotal += (fr * meals);
          dVegTotal += (vr * meals);
        } else {
          dFuelTotal += Number(f.monthly_cost || 0);
        }
      });
      setFuelTotal(dFuelTotal);
      setVegTotal(dVegTotal);

      if (menuMaster) {
        const computedRows = menuMaster.map((item: any) => {
          const itemName = item.item_name;
          const openBal = prevBalances[itemName] || 0;
          const received = receivedSums[itemName] || 0;
          const total = openBal + received;
          
          const consumed = calculateConsumedKg(
            totalPrimaryMeals, 
            totalUpperMeals, 
            Number(item.grams_primary || 0), 
            Number(item.grams_upper_primary || 0),
            scope
          );

          const borrowed = Math.max(0, consumed - total);
          const closing = Math.max(0, total - consumed);

          return {
            item: itemName,
            openingBalance: (Number(openBal) || 0).toString(),
            received: (Number(received) || 0).toString(),
            total: (Number(total) || 0).toString(),
            consumed: (Number(consumed) || 0).toString(),
            borrowed: (Number(borrowed) || 0).toString(),
            closingBalance: (Number(closing) || 0).toString()
          } as ReportRow;
        });
        // Custom Reordering: Move Soybean after Matki for reporting compliance
        const finalRows = [...computedRows];
        const matkiIdx = finalRows.findIndex(r => r.item === 'मटकी');
        const soyIdx = finalRows.findIndex(r => r.item === 'सोयाबीन');
        
        if (matkiIdx !== -1 && soyIdx !== -1) {
          const [soyItem] = finalRows.splice(soyIdx, 1);
          const currentMatkiIdx = finalRows.findIndex(r => r.item === 'मटकी');
          finalRows.splice(currentMatkiIdx + 1, 0, soyItem);
        }

        setReportData(finalRows);
      }
    } catch (e) {
      console.error("Aggregation engine error:", e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!userId || reportData.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        teacher_id: userId,
        report_month: selectedMonth,
        report_year: selectedYear,
        standard_group: selectedScope,
        report_data: JSON.stringify(reportData)
      } as any;

      const { data: existing } = await supabase
        .from('monthly_reports')
        .select('id')
        .eq('teacher_id', userId)
        .eq('report_month', selectedMonth)
        .eq('report_year', selectedYear)
        .eq('standard_group', selectedScope)
        .maybeSingle();

      let err;
      if (existing) {
        const res = await (supabase
          .from('monthly_reports') as any)
          .update(payload)
          .eq('id', (existing as any).id)
          .eq('teacher_id', userId);
        err = res.error;
      } else {
        const res = await (supabase.from('monthly_reports') as any).insert([payload]);
        err = res.error;
      }

      if (err) throw err;
      setIsSaved(true);
      alert("अहवाल यशस्वीरित्या जतन केला!");
    } catch (e: any) {
      alert("Error saving report: " + e.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-full print:bg-white text-slate-800">
        
        {/* High-Tech Mobile Filter Bar */}
        <div className="mb-6 mx-auto w-full lg:max-w-6xl print:hidden">
          <div className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-3xl md:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white space-y-5">
            
            {/* Consolidated Header: Branding & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                  <RefreshCcw size={20} className={isSyncing ? 'animate-spin' : ''} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">Monthly Report</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unified Data Aggregation</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
                {/* Month/Year Selectors */}
                <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 items-center">
                  <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(Number(e.target.value))} 
                    className="bg-transparent px-3 py-1.5 font-bold text-xs text-slate-700 outline-none w-32"
                    title="महिना निवडा (Select Month)"
                  >
                    {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
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
                    onClick={handleRefresh} 
                    disabled={loading || isSyncing}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
                    title="Sync Live Data"
                  >
                    <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Sync</span>
                  </button>

                  {!isSaved ? (
                    <button 
                      onClick={handleSave} 
                      disabled={loading || reportData.length === 0}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Record
                    </button>
                  ) : (
                    <button 
                      onClick={handlePrint}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      <Printer size={14} /> Print Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-2 text-black print:p-0">
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
              table { page-break-inside: auto; border-collapse: collapse !important; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            `}
          </style>

          {loading ? (
             <div className="h-64 flex justify-center items-center print:hidden"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="w-full overflow-x-auto print:overflow-visible pb-10 custom-scrollbar print:h-auto print:overflow-y-visible">
              <div ref={printRef} className="print-content w-full min-w-[900px] print:min-w-0 mx-auto print:h-auto print:overflow-visible print:w-full print:max-w-none">
                <div className="bg-white print:border-none border-2 border-slate-200 shadow-md p-8 pb-20 print:p-0 w-full relative h-auto min-h-screen print:min-h-0 print:shadow-none print:bg-transparent print:w-full print:max-w-none print:px-2">
              
              <div className="text-center mb-4 print:mb-3 border-b-2 border-black pb-3">
                <h1 className="text-xl md:text-2xl font-black mb-1.5 uppercase tracking-wide">
                   प्रधानमंत्री पोषण शक्ती निर्माण योजना {selectedScope === 'primary' ? '(इ.१ ते ५ वी)' : '(इ.६ ते ८ वी)'} — मासिक अहवाल
                </h1>
                <h2 className="text-sm font-extrabold text-gray-800 leading-relaxed">
                  शाळेचे नाव: <span className="underline decoration-dotted underline-offset-4">{schoolName || '____________________'}</span>
                  <span className="mx-3">|</span>
                  माहे: <span className="underline decoration-dotted underline-offset-4">{marathiMonths[selectedMonth-1]} {selectedYear}</span>
                </h2>
              </div>

                {(() => {
                  const metrics = [
                    { label: 'मागील शिल्लक', key: 'openingBalance', color: 'bg-slate-50/80' },
                    { label: 'प्राप्त', key: 'received', color: 'bg-slate-50/80' },
                    { label: 'एकूण', key: 'total', color: 'bg-indigo-50/50' },
                    { label: 'शिजवलेले', key: 'consumed', color: 'text-red-700 font-bold' },
                    { label: 'उसणे धान्य', key: 'borrowed', color: 'bg-amber-50 text-amber-900 font-bold' },
                    { label: 'अखेर शिल्लक', key: 'closingBalance', color: 'bg-slate-100 font-black' },
                  ];

                  return (
                    <div className="w-full pb-6 print:pb-2">
                      <table className="w-full border-collapse border border-slate-950 text-[10px] print:text-[10px]">
                        <thead>
                          <tr className="bg-white text-slate-950">
                            <th className="border border-slate-950 p-2 text-left w-32 font-black uppercase tracking-widest align-middle text-sm print:text-sm bg-slate-50/50">
                              तपशील
                            </th>
                             {reportData.map((row, idx) => {
                               const isSpice = ['जिरे', 'हळद', 'मोहरी'].includes(row.item);
                               return (
                                 <th 
                                   key={idx} 
                                   className={`border border-slate-950 p-0.5 text-center font-black text-[12px] leading-tight whitespace-normal break-words tracking-tighter text-slate-950 align-middle bg-slate-50/50 ${isSpice ? 'min-w-[38px] w-[38px]' : 'min-w-[45px]'}`}
                                 >
                                   {row.item}
                                 </th>
                               );
                             })}
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((metric, midx) => (
                            <tr key={midx} className={`hover:bg-slate-50 transition-colors ${metric.color} print:bg-transparent`}>
                              <td className={`border border-slate-950 px-2 py-2 font-black text-left pl-2 uppercase tracking-tighter align-middle text-sm print:text-sm ${metric.key === 'closingBalance' ? 'bg-slate-200/50' : ''}`}>
                                {metric.label}
                              </td>
                              {reportData.map((row, ridx) => {
                                const val = row[metric.key];
                                const numVal = Number(val || 0);

                                return (
                                  <td key={ridx} className={`border border-slate-950 px-0.5 py-2 text-right font-mono font-medium text-slate-900 text-[14px] align-middle ${metric.key === 'closingBalance' ? 'font-black bg-slate-50/50' : ''} ${['जिरे', 'हळद', 'मोहरी'].includes(row.item) ? 'min-w-[38px] w-[38px] text-[11px]' : ''}`}>
                                    {formatQuantity(numVal)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {reportData.length === 0 && (
                            <tr>
                              <td colSpan={10} className="border border-black p-8 text-center text-sm font-bold text-gray-400">
                                माहिती उपलब्ध नाही
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                <div className="mt-6 mb-8 print:mt-2 print:mb-0 border-2 border-slate-950 p-6 print:p-3 bg-white max-w-[900px] mx-auto">
                  <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.2em] border-b-2 border-slate-950 pb-2 mb-4 text-center">
                    मासिक खर्च गोषवारा
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Staff Payouts Table */}
                    <div>
                      <table className="w-full border-collapse border border-slate-400 text-[11px]">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-400 p-2 print:py-1 text-left uppercase tracking-wider">स्वयंपाकी नाव</th>
                            <th className="border border-slate-400 p-2 print:py-1 text-left uppercase tracking-wider">पद</th>
                            <th className="border border-slate-400 p-2 print:py-1 text-right uppercase tracking-wider">एकूण मानधन</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffPayouts.map((staff) => (
                            <tr key={staff.id}>
                              <td className="border border-slate-400 p-2 print:py-1 font-bold">{staff.name}</td>
                              <td className="border border-slate-400 p-2 print:py-1 font-bold uppercase">{staff.post}</td>
                              <td className="border border-slate-400 p-2 print:py-1 text-right font-black text-slate-950">₹ {Number(staff.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {staffPayouts.length === 0 && (
                            <tr>
                              <td colSpan={3} className="border border-slate-400 p-4 text-center text-slate-400 italic font-bold">
                                कोणतेही कर्मचारी माहिती उपलब्ध नाही
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-black">
                            <td colSpan={2} className="border border-slate-400 p-2 print:py-1 text-right uppercase tracking-wider font-bold">एकूण मानधन खर्च:</td>
                            <td className="border border-slate-400 p-2 print:py-1 text-right text-[14px] font-black">₹ {Number(staffTotal || 0).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Logistics Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-400 p-3 flex justify-between items-center bg-slate-50/30">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">इंधन खर्च:</span>
                        <span className="text-sm font-black text-slate-950">₹ {Number(fuelTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="border border-slate-400 p-3 flex justify-between items-center bg-slate-50/30">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">भाजीपाला/मसाले:</span>
                        <span className="text-sm font-black text-slate-950">₹ {Number(vegTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="flex justify-between items-end mt-12 print:mt-10 px-8">
                 <div className="text-center">
                    <div className="border-b-2 border-slate-950 w-48 mb-3"></div>
                    <p className="text-[11px] font-black uppercase tracking-widest">शालेय पोषण आहार प्रभारी</p>
                 </div>
                 <div className="text-center">
                    <div className="border-b-2 border-slate-950 w-56 mb-3"></div>
                    <p className="text-[11px] font-black uppercase tracking-widest">मुख्याध्यापक (स्वाक्षरी व शिक्का)</p>
                 </div>
              </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
