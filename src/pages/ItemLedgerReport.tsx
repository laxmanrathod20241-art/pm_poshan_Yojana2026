import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { FileStack, Loader2, Save, Printer } from 'lucide-react';

interface MenuItem {
  item_code: string;
  item_name: string;
}

export default function ItemLedgerReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2023', '2024', '2025', '2026', '2027'];

  // Current Academic Year generally starts from April/June
  const currMonth = new Date().getMonth();
  const currYear = new Date().getFullYear();
  
  const [startMonth, setStartMonth] = useState<number>(4); // April default
  const [startYear, setStartYear] = useState<number>(currMonth < 3 ? currYear - 1 : currYear);
  const [endMonth, setEndMonth] = useState<number>(3); // March default
  const [endYear, setEndYear] = useState<number>(currMonth < 3 ? currYear : currYear + 1);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItemName, setSelectedItemName] = useState<string>('');

  const [schoolName, setSchoolName] = useState('');
  const [centerName, setCenterName] = useState('');
  
  const [reportMatrix, setReportMatrix] = useState<any[]>([]);
  const [reportMonths, setReportMonths] = useState<{month: number, year: number, label: string}[]>([]);
  const [totals, setTotals] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchBaseData(session.user.id);
      }
    });
  }, []);

  const fetchBaseData = async (id: string) => {
    const { data: profile } = await (supabase as any).from('profiles').select('school_name_mr, center_name_mr').eq('id', id).maybeSingle();
    if (profile) {
      setSchoolName(profile.school_name_mr || '');
      setCenterName(profile.center_name_mr || '');
    }

    const { data: menuMaster } = await (supabase as any).from('menu_master').select('item_code, item_name').eq('teacher_id', id).order('created_at');
    if (menuMaster) {
       setMenuItems(menuMaster);
       if (menuMaster.length > 0) setSelectedItemName(menuMaster[0].item_name);
    }
  };

  const handleGenerate = async () => {
    if (!userId || !selectedItemName) return;
    setLoading(true);
    setIsSaved(false);
    
    try {
      // 1. Check if snapshot exists for this item and range
      // Range signature: YYYY-MM_to_YYYY-MM
      const dateRangeId = `${startYear}-${String(startMonth).padStart(2, '0')}_to_${endYear}-${String(endMonth).padStart(2, '0')}`;
      
      const { data: snapshot } = await (supabase as any)
        .from('item_ledger_reports')
        .select('*')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('date_range', dateRangeId)
        .maybeSingle();

      if (snapshot && snapshot.report_data) {
         setIsSaved(true);
         const parsed = typeof snapshot.report_data === 'string' ? JSON.parse(snapshot.report_data) : snapshot.report_data;
         setReportMatrix(parsed.matrix || []);
         setReportMonths(parsed.months || []);
         setTotals(parsed.totals || null);
         setLoading(false);
         return;
      }

      // 2. Generate date sequences
      const seq = [];
      const cDate = new Date(startYear, startMonth - 1, 1);
      const eDate = new Date(endYear, endMonth - 1, 1);
      
      let safeLoop = 0;
      while (cDate <= eDate && safeLoop < 36) { // limit 3 years max
         seq.push({ month: cDate.getMonth() + 1, year: cDate.getFullYear() });
         cDate.setMonth(cDate.getMonth() + 1);
         safeLoop++;
      }
      
      const generatedMonths = seq.map(m => ({
         month: m.month,
         year: m.year,
         label: `${marathiMonths[m.month - 1]} ${m.year}`
      }));
      setReportMonths(generatedMonths);

      // 3. Fetch monthly_reports in one go
      const { data: reports } = await (supabase as any)
        .from('monthly_reports')
        .select('report_month, report_year, report_data')
        .eq('teacher_id', userId);

      const reportsMap = new Map();
      (reports || []).forEach((r: any) => {
         reportsMap.set(`${r.report_year}-${r.report_month}`, r);
      });
      
      // Determine initial opening balance mathematically
      // Calculate Chained Matrix
      const matrix: any[] = [];
      let currentOpening = 0;
      
      let grandReceived = 0;
      let grandBorrowed = 0;
      let grandConsumed = 0;
      
      for (let i = 0; i < generatedMonths.length; i++) {
         const dm = generatedMonths[i];
         const key = `${dm.year}-${dm.month}`;
         let mFoundOpening = 0;
         let mReceived = 0;
         let mConsumed = 0;
         let mBorrowed = 0;

         if (reportsMap.has(key)) {
            const rawData = reportsMap.get(key).report_data;
            const repData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            
            const itemMatch = repData?.find((x: any) => x.item === selectedItemName);
            if (itemMatch) {
               mFoundOpening = Number(itemMatch.openingBalance) || 0;
               mReceived = Number(itemMatch.received) || 0;
               mConsumed = Number(itemMatch.consumed) || 0;
               mBorrowed = Number(itemMatch.borrowed) || 0;
            }
         }

         if (i === 0) {
            currentOpening = mFoundOpening;
         }

         const received = mReceived;
         const borrowed = mBorrowed;
         const total = currentOpening + received + borrowed;
         
         const consumed = mConsumed;
         const returned = 0; // Return/Repayment is currently implicit in balance
         const totalExpense = consumed + returned;
         
         const closing = total - totalExpense;

         matrix.push({
            monthId: key,
            opening: currentOpening.toFixed(3),
            received: received.toFixed(3),
            borrowed: borrowed.toFixed(3),
            total: total.toFixed(3),
            consumed: consumed.toFixed(3),
            returned: returned.toFixed(3),
            totalExpense: totalExpense.toFixed(3),
            closing: closing.toFixed(3)
         });

         grandReceived += received;
         grandBorrowed += borrowed;
         grandConsumed += consumed;

         currentOpening = closing;
      }
      
      const gtOpening = matrix.length > 0 ? Number(matrix[0].opening) : 0;
      const gtTotal = gtOpening + grandReceived + grandBorrowed;
      const gtExpense = grandConsumed; 
      const gtClosing = gtTotal - gtExpense;

      const finalTotals = {
         opening: gtOpening.toFixed(3),
         received: grandReceived.toFixed(3),
         borrowed: grandBorrowed.toFixed(3),
         total: gtTotal.toFixed(3),
         consumed: grandConsumed.toFixed(3),
         returned: '0.000',
         totalExpense: gtExpense.toFixed(3),
         closing: gtClosing.toFixed(3)
      };

      setReportMatrix(matrix);
      setTotals(finalTotals);

    } catch (err: any) {
      console.error("Generator Error", err);
      alert("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || reportMatrix.length === 0) return;
    setLoading(true);
    
    try {
      const dateRangeId = `${startYear}-${String(startMonth).padStart(2, '0')}_to_${endYear}-${String(endMonth).padStart(2, '0')}`;
      
      const payload = {
        teacher_id: userId,
        item_name: selectedItemName,
        date_range: dateRangeId,
        report_data: JSON.stringify({
           months: reportMonths,
           matrix: reportMatrix,
           totals: totals
        })
      };

      const { data: existing } = await (supabase as any)
        .from('item_ledger_reports')
        .select('id')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('date_range', dateRangeId)
        .maybeSingle();
        
      let err;
      if (existing) {
         const res = await (supabase as any).from('item_ledger_reports').update(payload).eq('id', existing.id);
         err = res.error;
      } else {
         const res = await (supabase as any).from('item_ledger_reports').insert([payload]);
         err = res.error;
      }

      if (err) throw err;
      
      setIsSaved(true);
      alert("वस्तुनिहाय साठा रजिस्टर सेव्ह झाले! (Report Saved)");
    } catch (error: any) {
      alert("Error saving: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricRow = (label: string, rowKey: string, highlight?: boolean) => {
     return (
        <tr className={`border-b border-black print:border-[1px] hover:bg-slate-50 print:hover:bg-transparent ${highlight ? 'font-black bg-gray-100/50 print:bg-transparent' : 'font-bold'}`}>
           <td className="border-r border-black print:border-[1px] p-2 text-left w-48 sticky left-0 bg-white print:static uppercase tracking-tighter shadow-[1px_0_0_black] print:shadow-none">{label}</td>
           {reportMatrix.map(col => (
             <td key={col.monthId + rowKey} className={`border-r border-black print:border-[1px] p-2 text-right ${col[rowKey] === '0.000' ? 'text-gray-400 print:text-black' : 'text-slate-800'}`}>
                {col[rowKey] === '0.000' ? '-' : col[rowKey]}
             </td>
           ))}
           <td className="p-2 text-right font-black bg-gray-50/50 print:bg-transparent text-[#474379] print:text-black shadow-inner border-l-2 border-black">
              {totals && totals[rowKey] === '0.000' ? '-' : totals?.[rowKey]}
           </td>
        </tr>
     )
  };

  return (
    <Layout>
      <div className="mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-full print:bg-white overflow-hidden w-full max-w-[100vw] lg:max-w-[95vw]">
        
        {/* Control Bar */}
        <div className="mb-6 p-5 bg-white rounded-xl shadow-xl border border-slate-200 print:hidden flex flex-col md:flex-row gap-4 justify-end items-start md:items-center">

          <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center w-full md:w-auto bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 w-12">Item</label>
              <select 
                value={selectedItemName} 
                onChange={e => setSelectedItemName(e.target.value)} 
                className="border-2 border-slate-200 rounded px-2 py-1.5 font-bold text-sm bg-white focus:border-indigo-500 outline-none w-32"
              >
                {menuItems.map((m, i) => <option key={i} value={m.item_name}>{m.item_name}</option>)}
              </select>
            </div>
            
            <div className="h-8 w-px bg-slate-300 hidden xl:block"></div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[10px] font-black uppercase text-slate-500 w-12 xl:w-auto">From</label>
              <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="border-2 border-slate-200 rounded px-2 py-1.5 font-bold text-xs bg-white w-24">
                {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="border-2 border-slate-200 rounded px-2 py-1.5 font-bold text-xs bg-white w-20">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              
              <label className="text-[10px] font-black uppercase text-slate-500 w-12 xl:w-auto xl:ml-3">To</label>
              <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="border-2 border-slate-200 rounded px-2 py-1.5 font-bold text-xs bg-white w-24">
                {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="border-2 border-slate-200 rounded px-2 py-1.5 font-bold text-xs bg-white w-20">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-black text-xs uppercase ml-2 shadow-md">
                Generate
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto justify-end">
            {!isSaved ? (
              <button 
                onClick={handleSave} 
                disabled={loading || reportMatrix.length === 0} 
                className="bg-[#00a65a] hover:bg-[#008d4c] text-white px-5 py-2.5 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
              </button>
            ) : (
              <button 
                onClick={() => window.print()} 
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <Printer size={16} /> Print
              </button>
            )}
          </div>
        </div>

        {/* Printable Area - Inverted Matrix */}
        <div className="bg-white print:p-0 print:m-0 w-full font-['Inter'] relative pt-2">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; background: white; }
              ::-webkit-scrollbar { display: none; }
            }
          `}} />

          {reportMatrix.length > 0 ? (
            <div className="print:border-none border-2 border-black/20 shadow-md p-4 md:p-8 print:p-0 overflow-hidden w-full relative group">
              
              <div className="text-center mb-8 border-b-2 border-slate-300 print:border-black pb-6 space-y-3">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#474379] print:text-black">
                   शिल्लक साठा रजिस्टर (वस्तुनिहाय)
                </h1>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-black justify-items-center bg-slate-50 print:bg-transparent p-4 rounded-xl print:p-0 border border-slate-200 print:border-none">
                   <div className="col-span-2 lg:col-span-2 flex flex-col md:flex-row gap-2">
                      <span className="text-slate-500 print:text-gray-700 uppercase text-[10px] tracking-widest">शाळेचे नाव / केंद्र:</span>
                      <span className="underline decoration-slate-300 underline-offset-4">{schoolName} {centerName ? `(${centerName})` : ''}</span>
                   </div>
                   <div className="flex gap-2">
                      <span className="text-slate-500 print:text-gray-700 uppercase text-[10px] tracking-widest">मालाचा प्रकार:</span>
                      <span className="underline decoration-slate-300 underline-offset-4 tracking-wider">{selectedItemName}</span>
                   </div>
                   <div className="flex gap-2">
                      <span className="text-slate-500 print:text-gray-700 uppercase text-[10px] tracking-widest">कालावधी:</span>
                      <span className="underline decoration-slate-300 underline-offset-4 tracking-wider">{marathiMonths[startMonth-1]} {startYear} ते {marathiMonths[endMonth-1]} {endYear}</span>
                   </div>
                </div>
              </div>

              {/* Inverted Matrix Table Wrapper */}
              <div className="overflow-x-auto print:overflow-visible pb-4 custom-scrollbar">
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-scrollbar::-webkit-scrollbar { height: 12px; }
                  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f1f5f9; }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}} />
                
                {/* The Inverted Table Context */}
                <table className="min-w-max border-collapse border-2 border-black text-xs print:text-[11px] whitespace-nowrap !w-full">
                  <thead>
                    <tr className="bg-gray-100 print:bg-transparent border-b-2 border-black">
                      <th className="border-r-2 border-black p-3 text-left w-48 font-black uppercase tracking-tighter sticky left-0 z-10 bg-gray-100 print:static print:bg-transparent shadow-[1px_0_0_black] print:shadow-none">तपशील \ महिने</th>
                      {reportMonths.map((m, idx) => (
                        <th key={idx} className="border-r border-black print:border-[1px] p-3 text-center min-w-[80px] font-black">{m.label}</th>
                      ))}
                      <th className="p-3 text-center w-24 font-black uppercase tracking-widest bg-gray-50 print:bg-transparent border-l-2 border-black">एकूण (Total)</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {renderMetricRow('१) मागील शिल्लक (Opening)', 'opening')}
                    {renderMetricRow('२) प्राप्त (Received)', 'received')}
                    {renderMetricRow('३) उसने घेतले (Borrowed)', 'borrowed')}
                    
                    {renderMetricRow('४) एकूण (Total 1+2+3)', 'total', true)}
                    
                    {/* Visual gap spacer row for grouping (CSS only approach or thin row) */}
                    <tr><td colSpan={reportMonths.length + 2} className="h-[2px] bg-black print:bg-black p-0 border-y-0"></td></tr>

                    {renderMetricRow('५) एकूण शिजवले (Consumed)', 'consumed')}
                    {renderMetricRow('६) उसनवार परत (Returned)', 'returned')}
                    
                    {renderMetricRow('७) एकूण खर्च (Total Expense 5+6)', 'totalExpense', true)}

                    {/* Visual spacer */}
                    <tr><td colSpan={reportMonths.length + 2} className="h-[3px] bg-black border-y-0 p-0"></td></tr>

                    {/* Closing Balance Hero Row */}
                    <tr className="border-b border-black font-black text-sm print:text-xs">
                       <td className="border-r border-black p-3 text-left sticky left-0 bg-yellow-50 print:static print:bg-transparent uppercase shadow-[1px_0_0_black] print:shadow-none">८) अखेर शिल्लक (Closing 4-7)</td>
                       {reportMatrix.map(col => (
                         <td key={'closing_'+col.monthId} className="border-r border-black print:border-[1px] p-3 text-right bg-yellow-50/30 print:bg-transparent text-black">
                            {col.closing === '0.000' ? '-' : col.closing}
                         </td>
                       ))}
                       <td className="p-3 text-right font-black bg-yellow-100 print:bg-transparent border-l-2 border-black tracking-widest decoration-dotted underline underline-offset-4">
                          {totals?.closing === '0.000' ? '-' : totals?.closing}
                       </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-20 mb-4 flex justify-between px-10 print:px-4 items-end">
                <div className="text-center font-bold text-[11px] uppercase tracking-wider">
                  <div className="border-b-[1.5px] border-black w-48 mb-2"></div>
                  शालेय पोषण आहार प्रभारी
                </div>
                {isSaved && (
                  <div className="text-center font-black text-[#474379]/10 text-5xl transform -rotate-12 select-none print:text-black/10 origin-center absolute left-1/2 -translate-x-1/2 bottom-12">
                    LEDGER ARCHIVE
                  </div>
                )}
                <div className="text-center font-bold text-[11px] uppercase tracking-wider">
                  <div className="border-b-[1.5px] border-black w-56 mb-2"></div>
                  मुख्याध्यापक (स्वाक्षरी व शिक्का)
                </div>
              </div>

            </div>
          ) : (
             !loading && (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl m-6 bg-slate-50/50">
                  <FileStack size={40} className="text-slate-300 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] text-center max-w-sm">
                    Generate the report to calculate the chained monthly ledger sequence.
                  </p>
                </div>
             )
          )}
        </div>

      </div>
    </Layout>
  );
}
