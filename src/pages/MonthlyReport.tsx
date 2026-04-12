// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { calculateConsumedKg, reconstructOpeningBalances } from '../utils/inventoryUtils';
import { Loader2, Save, Printer, RefreshCcw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function MonthlyReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Monthly_ZP_Report_${selectedMonth}_${selectedYear}`,
  });

  const [reportData, setReportData] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [fuelTotal, setFuelTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  
  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchReportData(session.user.id, selectedMonth, selectedYear);
      }
    });
  }, [selectedMonth, selectedYear]);
  
  const handleRefresh = () => {
    if (userId) {
      fetchReportData(userId, selectedMonth, selectedYear, true);
    }
  };

  const fetchReportData = async (id: string, month: number, year: number, forceRefresh: boolean = false) => {
    setLoading(!forceRefresh);
    setIsSyncing(forceRefresh);
    setIsSaved(false);
    
    try {
      // 1. Check if an official snapshot already exists
      let snapshot = null;
      if (!forceRefresh) {
        const { data } = await (supabase as any)
          .from('monthly_reports')
          .select('*')
          .eq('teacher_id', id)
          .eq('report_month', month)
          .eq('report_year', year)
          .maybeSingle();
        snapshot = data;
      }

      // 2. Fetch Profile Info
      const { data: profile } = await (supabase as any).from('profiles').select('school_name_mr, has_primary, has_upper_primary').eq('id', id).maybeSingle();
      if (profile) {
        setSchoolName(profile.school_name_mr || '');
        setHasPrimary(profile.has_primary ?? true);
        setHasUpperPrimary(profile.has_upper_primary ?? true);
      }

      // 3. Fetch Logistics (Fuel & Staff)
      const { data: fuel } = await (supabase as any).from('fuel_tracking').select('monthly_cost').eq('teacher_id', id).eq('record_month', month).eq('record_year', year);
      const { data: staff } = await (supabase as any).from('cooking_staff').select('monthly_cost').eq('teacher_id', id).eq('record_month', month).eq('record_year', year);
      
      setFuelTotal((fuel || []).reduce((acc: number, curr: any) => acc + Number(curr.monthly_cost), 0));
      setStaffTotal((staff || []).reduce((acc: number, curr: any) => acc + Number(curr.monthly_cost), 0));

      if (snapshot && snapshot.report_data) {
        setIsSaved(true);
        const parsed = typeof snapshot.report_data === 'string' 
            ? JSON.parse(snapshot.report_data) 
            : snapshot.report_data;
        setReportData(parsed);
        setLoading(false);
        return;
      }

      // If no snapshot, compute engine dynamically:
      const { data: menuMaster } = await (supabase as any).from('menu_master').select('*').eq('teacher_id', id);

      const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nMonth = month === 12 ? 1 : month + 1;
      const nYear = month === 12 ? year + 1 : year;
      const nextMonthStart = `${nYear}-${String(nMonth).padStart(2, '0')}-01`;

      // B. Fetch Previous Month Snapshot or Reconstruct
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

      const { data: prevSnapshot } = await (supabase as any)
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .maybeSingle();

      let prevBalances: Record<string, number> = {};
      
      if (prevSnapshot && prevSnapshot.report_data) {
         const pData = typeof prevSnapshot.report_data === 'string' ? JSON.parse(prevSnapshot.report_data) : prevSnapshot.report_data;
         pData.forEach((row: any) => { prevBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        prevBalances = await reconstructOpeningBalances(id, currentMonthStart, menuMaster || []);
      }

      const { data: receipts } = await (supabase as any)
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', id)
        .gte('receipt_date', currentMonthStart)
        .lt('receipt_date', nextMonthStart);

      const receivedSums: Record<string, number> = {};
      (receipts || []).forEach((r: any) => {
         receivedSums[r.item_name] = (receivedSums[r.item_name] || 0) + (Number(r.quantity_kg) || 0);
      });

      const { data: logs } = await (supabase as any)
        .from('daily_logs')
        .select('*')
        .eq('teacher_id', id)
        .gte('log_date', currentMonthStart)
        .lt('log_date', nextMonthStart);

      let totalPrimaryMeals = 0;
      let totalUpperMeals = 0;
      (logs || []).forEach((l: any) => {
         totalPrimaryMeals += (Number(l.meals_served_primary) || 0);
         totalUpperMeals += (Number(l.meals_served_upper_primary) || 0);
      });

      if (menuMaster) {
        const computedRows = menuMaster.map((item: any) => {
          const itemName = item.item_name;
          const openBal = prevBalances[itemName] || 0;
          const received = receivedSums[itemName] || 0;
          const total = openBal + received;
          
          const consumed = calculateConsumedKg(
            (hasPrimary ? totalPrimaryMeals : 0), 
            (hasUpperPrimary ? totalUpperMeals : 0), 
            Number(item.grams_primary || 0), 
            Number(item.grams_upper_primary || 0)
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
          };
        });
        setReportData(computedRows);
      }
    } catch (e) {
      console.error("Aggregation engine error:", e);
    } finally {
      setLoading(false);
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
        report_data: JSON.stringify(reportData)
      } as any;

      const { data: existing } = await (supabase as any)
        .from('monthly_reports')
        .select('id')
        .eq('teacher_id', userId)
        .eq('report_month', selectedMonth)
        .eq('report_year', selectedYear)
        .maybeSingle();

      let err;
      if (existing) {
        const res = await (supabase as any).from('monthly_reports').update(payload).eq('id', existing.id);
        err = res.error;
      } else {
        const res = await (supabase as any).from('monthly_reports').insert([payload]);
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
        <div className="mb-6 mx-auto w-full lg:max-w-4xl print:hidden">
          <div className="bg-white/80 backdrop-blur-xl p-5 md:p-8 rounded-3xl md:rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <RefreshCcw size={24} className={isSyncing ? 'animate-spin' : ''} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none italic">Monthly Report</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official ZP Aggregator</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center">
              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 w-full min-[400px]:w-auto">
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))} 
                  className="bg-transparent px-4 py-2 font-black text-xs md:text-sm text-slate-700 outline-none min-w-[100px]"
                  title="महिना निवडा (Select Month)"
                >
                  {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <div className="w-[1.5px] h-6 bg-slate-200 my-auto" />
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(Number(e.target.value))} 
                  className="bg-transparent px-4 py-2 font-black text-xs md:text-sm text-slate-700 outline-none min-w-[80px]"
                  title="वर्ष निवडा (Select Year)"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="flex gap-2 w-full min-[400px]:w-auto">
                <button 
                  onClick={handleRefresh} 
                  disabled={loading || isSyncing}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  title="Sync Live Data"
                >
                  <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
                  <span className="md:hidden lg:inline text-[10px] font-black uppercase">Sync</span>
                </button>

                {!isSaved ? (
                  <button 
                    onClick={handleSave} 
                    disabled={loading || isSyncing} 
                    className="flex-[2] bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} अहवाल सेव्ह करा
                  </button>
                ) : (
                  <button 
                    onClick={() => handlePrint()} 
                    className="flex-[2] bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 hover:bg-slate-800"
                  >
                    <Printer size={18} /> Print Report (PDF)
                  </button>
                )}
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
            <div className="w-full overflow-x-auto print:overflow-visible pb-10 custom-scrollbar">
              <div ref={printRef} className="print-content w-full min-w-[900px] print:min-w-0 mx-auto">
                <div className="bg-white print:border-none border-2 border-slate-200 shadow-md p-8 print:p-0 w-full relative">
              
              <div className="text-center mb-4 print:mb-3 border-b-2 border-black pb-3">
                <h1 className="text-xl md:text-2xl font-black mb-1.5 uppercase tracking-wide">प्रधानमंत्री पोषण शक्ती निर्माण योजना — मासिक अहवाल</h1>
                <h2 className="text-sm font-extrabold text-gray-800 leading-relaxed">
                  शाळेचे नाव: <span className="underline decoration-dotted underline-offset-4">{schoolName || '____________________'}</span>
                  <span className="mx-3">|</span>
                  माहे: <span className="underline decoration-dotted underline-offset-4">{marathiMonths[selectedMonth-1]} {selectedYear}</span>
                </h2>
              </div>

                {(() => {
                  const metrics = [
                    { label: 'मागील शिल्लक (Opening)', key: 'openingBalance', color: 'bg-slate-50/80' },
                    { label: 'प्राप्त (Received)', key: 'received', color: 'bg-slate-50/80' },
                    { label: 'एकूण (Total)', key: 'total', color: 'bg-indigo-50/50' },
                    { label: 'शिजवले (Consumed)', key: 'consumed', color: 'text-red-700 font-bold' },
                    { label: 'उसणे धान्य (Borrowed)', key: 'borrowed', color: 'bg-amber-50 text-amber-900 font-bold' },
                    { label: 'अखेर शिल्लक (Closing)', key: 'closingBalance', color: 'bg-slate-100 font-black' },
                  ];

                  return (
                    <div className="w-full pb-10">
                      <table className="w-full border-collapse border border-slate-950 text-[10px] print:text-[10px]">
                        <thead>
                          <tr className="bg-white text-slate-950">
                            <th className="border border-slate-950 p-2 text-left w-32 font-black uppercase tracking-widest align-middle">
                              तपशील
                            </th>
                            {reportData.map((row, idx) => (
                              <th 
                                key={idx} 
                                className="border border-slate-950 p-0.5 text-center font-black text-[10px] leading-tight whitespace-normal break-words tracking-tighter text-slate-950 align-middle min-w-[45px]"
                              >
                                {row.item}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.map((metric, midx) => (
                            <tr key={midx} className={`hover:bg-slate-50 transition-colors ${metric.color} print:bg-transparent`}>
                              <td className={`border border-slate-950 px-2 py-2 font-black text-left pl-2 uppercase tracking-tighter align-middle ${metric.key === 'closingBalance' ? 'font-black' : ''}`}>
                                {metric.label}
                              </td>
                              {reportData.map((row, ridx) => {
                                const val = row[metric.key];
                                const numVal = Number(val || 0);
                                const isZero = numVal === 0;
                                return (
                                  <td key={ridx} className={`border border-slate-950 px-1 py-2 text-right font-mono font-black text-slate-950 text-[14px] align-middle ${metric.key === 'closingBalance' ? 'font-black' : ''}`}>
                                    {isZero ? '-' : Number(numVal.toFixed(2))}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {reportData.length === 0 && (
                            <tr>
                              <td colSpan={10} className="border border-black p-8 text-center text-sm font-bold text-gray-400">
                                माहिती उपलब्ध नाही (No Data Available)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

              <div className="flex justify-center gap-8 mt-6 mb-12">
                 <div className="border border-slate-950 px-5 py-2 flex items-center gap-3 bg-white">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">मानधन खर्च (Honorarium):</span>
                    <span className="text-lg font-bold text-slate-950">₹ {parseFloat(staffTotal).toFixed(2)}</span>
                 </div>
                 <div className="border border-slate-950 px-5 py-2 flex items-center gap-3 bg-white">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">इंधन खर्च (Fuel Cost):</span>
                    <span className="text-lg font-bold text-slate-950">₹ {parseFloat(fuelTotal).toFixed(2)}</span>
                 </div>
              </div>

              <div className="flex justify-between items-end mt-24 px-8">
                 <div className="text-center">
                    <div className="border-b-2 border-slate-950 w-48 mb-3"></div>
                    <p className="text-[11px] font-black uppercase tracking-widest">शालेय पोषण आहार प्रभारी</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">(In-Charge Signature)</p>
                 </div>
                 <div className="text-center">
                    <div className="border-b-2 border-slate-950 w-56 mb-3"></div>
                    <p className="text-[11px] font-black uppercase tracking-widest">मुख्याध्यापक (स्वाक्षरी व शिक्का)</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">(H.M. Signature & Stamp)</p>
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
