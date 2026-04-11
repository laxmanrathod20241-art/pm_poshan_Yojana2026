import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Save, Printer } from 'lucide-react';

export default function MonthlyReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [reportData, setReportData] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [fuelTotal, setFuelTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchReportData(session.user.id, selectedMonth, selectedYear);
      }
    });
  }, [selectedMonth, selectedYear]);

  const fetchReportData = async (id: string, month: number, year: number) => {
    setLoading(true);
    setIsSaved(false);
    
    try {
      // 1. Check if an official snapshot already exists
      const { data: snapshot } = await (supabase as any)
        .from('monthly_reports')
        .select('*')
        .eq('teacher_id', id)
        .eq('report_month', month)
        .eq('report_year', year)
        .maybeSingle();

      // 2. Fetch Profile Info
      const { data: profile } = await (supabase as any).from('profiles').select('school_name_mr').eq('id', id).maybeSingle();
      if (profile) setSchoolName(profile.school_name_mr || '');

      // 3. Fetch Logistics (Fuel & Staff)
      const { data: fuel } = await (supabase as any).from('fuel_tracking').select('monthly_cost').eq('teacher_id', id).eq('record_month', month).eq('record_year', year);
      const { data: staff } = await (supabase as any).from('cooking_staff').select('monthly_cost').eq('teacher_id', id).eq('record_month', month).eq('record_year', year);
      
      setFuelTotal((fuel || []).reduce((acc: number, curr: any) => acc + Number(curr.monthly_cost), 0));
      setStaffTotal((staff || []).reduce((acc: number, curr: any) => acc + Number(curr.monthly_cost), 0));

      if (snapshot && snapshot.report_data) {
        // Load strictly from snapshot to preserve integrity
        setIsSaved(true);
        const parsed = typeof snapshot.report_data === 'string' 
            ? JSON.parse(snapshot.report_data) 
            : snapshot.report_data;
        setReportData(parsed);
        setLoading(false);
        return;
      }

      // If no snapshot, compute engine dynamically:
      // A. Fetch Menu/Items
      const { data: menuMaster } = await (supabase as any).from('menu_master').select('*').eq('teacher_id', id);

      // B. Fetch Previous Month Snapshot (for Opening Balance)
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }
      
      // C. Safe String Date Boundaries
      const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nMonth = month === 12 ? 1 : month + 1;
      const nYear = month === 12 ? year + 1 : year;
      const nextMonthStart = `${nYear}-${String(nMonth).padStart(2, '0')}-01`;

      const { data: prevSnapshot } = await (supabase as any)
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .maybeSingle();

      const prevBalances: Record<string, number> = {};
      
      if (prevSnapshot && prevSnapshot.report_data) {
         const pData = typeof prevSnapshot.report_data === 'string' ? JSON.parse(prevSnapshot.report_data) : prevSnapshot.report_data;
         pData.forEach((row: any) => { prevBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        // FALLBACK: Time-Travel Historical Reconstruction
        console.log("No previous month snapshot found for Monthly Report. Reconstructing opening balances historically...");
        const [histReceipts, histConsumption] = await Promise.all([
          (supabase as any).from('stock_receipts').select('item_name, quantity_kg').eq('teacher_id', id).lt('receipt_date', currentMonthStart),
          (supabase as any).from('consumption_logs').select('meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used').eq('teacher_id', id).lt('log_date', currentMonthStart)
        ]);

        (histReceipts.data || []).forEach((r: any) => {
          prevBalances[r.item_name] = (prevBalances[r.item_name] || 0) + Number(r.quantity_kg);
        });

        (histConsumption.data || []).forEach((c: any) => {
          const pAtt = Number(c.meals_served_primary) || 0;
          const uAtt = Number(c.meals_served_upper_primary) || 0;
          const usedItems = Array.from(new Set([...(c.main_foods_all || []), ...(c.ingredients_used || [])])).filter(Boolean);

          usedItems.forEach((itemName: any) => {
            const itemMaster = menuMaster.find((m: any) => m.item_name === itemName);
            if (itemMaster) {
              const consumedKg = ((pAtt * Number(itemMaster.grams_primary || 0)) + (uAtt * Number(itemMaster.grams_upper_primary || 0))) / 1000;
              prevBalances[itemName] = (prevBalances[itemName] || 0) - consumedKg;
            }
          });
        });
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

      // D. Fetch Daily Logs
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

      // Assemble Data
      if (menuMaster) {
        const computedRows = menuMaster.map((item: any) => {
          const itemName = item.item_name;
          const openBal = prevBalances[itemName] || 0;
          const received = receivedSums[itemName] || 0;
          const total = openBal + received;
          
          const pConsumed = (totalPrimaryMeals * (Number(item.grams_primary) || 0)) / 1000;
          const uConsumed = (totalUpperMeals * (Number(item.grams_upper_primary) || 0)) / 1000;
          const consumed = pConsumed + uConsumed;

          // Borrowed Stock Logic
          const borrowed = Math.max(0, consumed - total);
          const closing = Math.max(0, total - consumed);

          return {
            item: itemName,
            openingBalance: openBal.toFixed(3),
            received: received.toFixed(3),
            total: total.toFixed(3),
            consumed: consumed.toFixed(3),
            borrowed: borrowed.toFixed(3),
            closingBalance: closing.toFixed(3)
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
      };

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
        
        {/* Top Control Bar */}
        <div className="mb-6 p-5 bg-white rounded-xl shadow-xl border border-slate-200 print:hidden flex flex-col md:flex-row gap-5 justify-end items-center">
          <div className="flex items-center gap-4">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))} 
              className="border-2 border-slate-200 rounded-lg px-4 py-2.5 font-bold text-sm bg-slate-50 focus:border-indigo-500 outline-none"
            >
              {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))} 
              className="border-2 border-slate-200 rounded-lg px-4 py-2.5 font-bold text-sm bg-slate-50 focus:border-indigo-500 outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            {!isSaved ? (
              <button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-black uppercase text-sm flex items-center gap-2 transition-all shadow-lg font-[Inter]">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} अहवाल सेव्ह करा
              </button>
            ) : (
              <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-black uppercase text-sm flex items-center gap-2 transition-all shadow-lg font-[Inter]">
                <Printer size={18} /> Print Report
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-2 text-black print:p-0">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; }
            }
          `}} />

          {loading ? (
             <div className="h-64 flex justify-center items-center print:hidden"><Loader2 size={40} className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="border-[2px] border-black p-4 md:p-6 shadow-sm print:border-none print:shadow-none font-['Inter']">
              
              <div className="text-center mb-6 border-b-[2px] border-black pb-4">
                <h1 className="text-xl md:text-2xl font-black mb-1 uppercase">प्रधानमंत्री पोषण शक्ती निर्माण योजना - मासिक अहवाल</h1>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-tighter">शाळेचे नाव: {schoolName || '____________________'} | माहे: {marathiMonths[selectedMonth-1]} {selectedYear}</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs md:text-sm whitespace-nowrap mb-6 print:border-[1.5px]">
                  <thead>
                    <tr className="bg-gray-100 print:bg-transparent">
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 w-12 text-center text-[10px] md:text-xs tracking-wider">अ. क्र.</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-left w-64 text-[10px] md:text-xs">तपशील (Item)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right text-[10px] md:text-xs">मागील शिल्लक<br/>(Opening)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right text-[10px] md:text-xs">प्राप्त<br/>(Received)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right text-[10px] md:text-xs bg-indigo-50/50 print:bg-transparent">एकूण<br/>(Total)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right text-[10px] md:text-xs">शिजवले<br/>(Consumed)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right text-[10px] md:text-xs bg-amber-50 print:bg-transparent text-amber-900 print:text-black">उसणे धान्य<br/>(Borrowed)</th>
                      <th className="border border-black print:border-[1.5px] p-2 md:p-3 text-right font-black text-sm md:text-base border-l-2 bg-gray-50 print:bg-transparent">अखेर शिल्लक<br/>(Closing)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="border border-black print:border-[1.5px] p-2 text-center font-bold">{idx + 1}</td>
                        <td className="border border-black print:border-[1.5px] p-2 font-black text-slate-800">{row.item}</td>
                        <td className="border border-black print:border-[1.5px] p-2 text-right">{row.openingBalance}</td>
                        <td className="border border-black print:border-[1.5px] p-2 text-right">{row.received}</td>
                        <td className="border border-black print:border-[1.5px] p-2 text-right font-bold bg-indigo-50/30 print:bg-transparent">{row.total}</td>
                        <td className="border border-black print:border-[1.5px] p-2 text-right text-red-600 print:text-black">{row.consumed}</td>
                        <td className={`border border-black print:border-[1.5px] p-2 text-right font-bold ${Number(row.borrowed) > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'text-slate-300 opacity-20'} print:bg-transparent print:text-black print:opacity-100`}>
                          {Number(row.borrowed) > 0 ? row.borrowed : '0.000'}
                        </td>
                        <td className="border border-black print:border-[1.5px] p-2 text-right font-black border-l-2 text-[15px]">{row.closingBalance}</td>
                      </tr>
                    ))}
                    {reportData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border border-black p-8 text-center text-sm font-bold text-gray-400">माहिती उपलब्ध नाही (No Data Available)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 md:w-1/2 mb-12">
                 <div className="border border-black print:border-[1.5px] p-3 flex justify-between bg-gray-50 print:bg-transparent">
                    <span className="font-bold text-xs uppercase tracking-wide">मानधन खर्च (CCH Honorarium):</span>
                    <span className="font-black text-sm">₹{staffTotal.toFixed(2)}</span>
                 </div>
                 <div className="border border-black print:border-[1.5px] p-3 flex justify-between bg-gray-50 print:bg-transparent">
                    <span className="font-bold text-xs uppercase tracking-wide">इंधन खर्च (Fuel Cost):</span>
                    <span className="font-black text-sm">₹{fuelTotal.toFixed(2)}</span>
                 </div>
              </div>

              <div className="flex justify-between items-end mt-16 px-4">
                 <div className="text-center font-bold text-xs uppercase">
                    <div className="border-b-[1.5px] border-black w-40 mb-2"></div>
                    शालेय पोषण आहार प्रभारी
                 </div>
                 <div className="text-center font-bold text-xs uppercase">
                    <div className="border-b-[1.5px] border-black w-48 mb-2"></div>
                    मुख्याध्यापक (स्वाक्षरी व शिक्का)
                 </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
