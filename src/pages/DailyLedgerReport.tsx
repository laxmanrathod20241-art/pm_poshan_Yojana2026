import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { Loader2, Save, Printer, RefreshCw, AlertCircle } from 'lucide-react';

interface MenuItem {
  item_code: string;
  item_name: string;
  grams_primary: number;
  grams_upper_primary: number;
  item_category: 'MAIN' | 'INGREDIENT';
}

interface ScheduleRow {
  week_pattern: string;
  day_name: string;
  is_active: boolean;
  main_food_codes: string[];
  menu_items: string[];
}

export default function DailyLedgerReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false);

  const marathiMonths = ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'];
  const years = ['2024', '2025', '2026', '2027'];

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [schoolName, setSchoolName] = useState('');
  
  // Columns
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  // Generated Matrix Data
  const [ledgerData, setLedgerData] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchLedgerData(session.user.id, selectedMonth, selectedYear);
      }
    });
  }, [selectedMonth, selectedYear]);

  const fetchLedgerData = async (id: string, month: number, year: number, forceSync = false) => {
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
      const { data: snapshot } = await (supabase as any)
        .from('monthly_reports')
        .select('*')
        .eq('teacher_id', id)
        .eq('report_month', month)
        .eq('report_year', year)
        .maybeSingle();

      // 2. Fetch Profile Info
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('school_name_mr')
        .eq('id', id)
        .maybeSingle();
        
      if (profile) setSchoolName(profile.school_name_mr || '');

      // 3. Fetch Menu Master strictly for column mapping
      const { data: menuMaster } = await (supabase as any)
        .from('menu_master')
        .select('*')
        .eq('teacher_id', id)
        .order('created_at', { ascending: true });
        
      const items: MenuItem[] = menuMaster || [];
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
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      // B. Opening Balances (From previous month report_data snapshot if exists)
      const { data: prevSnapshot } = await (supabase as any)
        .from('monthly_reports')
        .select('report_data')
        .eq('teacher_id', id)
        .eq('report_month', prevMonth)
        .eq('report_year', prevYear)
        .maybeSingle();

      const openingBalances: Record<string, number> = {};
      if (prevSnapshot && prevSnapshot.report_data) {
         const pData = typeof prevSnapshot.report_data === 'string' 
             ? JSON.parse(prevSnapshot.report_data) 
             : prevSnapshot.report_data;
         pData.forEach((row: any) => { openingBalances[row.item] = Number(row.closingBalance) || 0; });
      } else {
        // FALLBACK: Time-Travel Historical Reconstruction
        console.log("No previous snapshot found. Reconstructing opening balances historically...");
        const [histReceipts, histConsumption] = await Promise.all([
          (supabase as any).from('stock_receipts').select('item_name, quantity_kg').eq('teacher_id', id).lt('receipt_date', currentMonthStart),
          (supabase as any).from('consumption_logs').select('meals_served_primary, meals_served_upper_primary, main_foods_all, ingredients_used').eq('teacher_id', id).lt('log_date', currentMonthStart)
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
              const consumedKg = ((pAtt * Number(itemMaster.grams_primary || 0)) + (uAtt * Number(itemMaster.grams_upper_primary || 0))) / 1000;
              openingBalances[itemName] = (openingBalances[itemName] || 0) - consumedKg;
            }
          });
        });
      }

      // C. Stock Receipts (Received)
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

      // D. Menu Weekly Schedule
      const { data: weeklySchedule } = await (supabase as any)
        .from('menu_weekly_schedule')
        .select('*')
        .eq('teacher_id', id);
        
      const scheduleOptions: ScheduleRow[] = weeklySchedule || [];

      // E. Daily Logs & Consumption Details
      const [logsRes, consumptionRes] = await Promise.all([
        (supabase as any).from('daily_logs').select('*').eq('teacher_id', id).gte('log_date', currentMonthStart).lt('log_date', nextMonthStart),
        (supabase as any).from('consumption_logs').select('*').eq('teacher_id', id).gte('log_date', currentMonthStart).lt('log_date', nextMonthStart)
      ]);

      const logs = logsRes.data || [];
      const consumptionLogs = consumptionRes.data || [];

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
      const totalHonorarium = 0; // Keeping static 0 for now as per math

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
           menuName: '',
           primaryAtt: 0,
           upperAtt: 0,
           honorarium: 0,
           consumptions: {}
        };

        if (log) {
            const consumption = consumptionMap.get(dateStr);
            const pAtt = Number(log.meals_served_primary) || 0;
            const uAtt = Number(log.meals_served_upper_primary) || 0;
            
            rowData.primaryAtt = pAtt;
            rowData.upperAtt = uAtt;
            totalAttP += pAtt;
            totalAttU += uAtt;

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
                    const consumedKg = ((pAtt * gramsP) + (uAtt * gramsU)) / 1000;
                    
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
                    const consumedKg = ((pAtt * gramsP) + (uAtt * gramsU)) / 1000;
                    
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
        
        dailyRows.push(rowData);
      }

      // Format Header Summaries
      const openRow: any = {};
      const receivedRow: any = {};
      const totalRow: any = {};
      
      items.forEach(item => {
        const op = openingBalances[item.item_name] || 0;
        const rec = receivedSums[item.item_name] || 0;
        openRow[item.item_code] = op.toFixed(3);
        receivedRow[item.item_code] = rec.toFixed(3);
        totalRow[item.item_code] = (op + rec).toFixed(3);
      });

      // Format Footer Summaries
      const footerTotalsRow: any = {};
      items.forEach(item => {
         footerTotalsRow[item.item_code] = (itemTotals[item.item_code] || 0).toFixed(3);
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
           honorarium: totalHonorarium,
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
        daily_ledger_data: JSON.stringify(ledgerData) 
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
      <div className="mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-full print:bg-white overflow-hidden w-full max-w-[100vw] lg:max-w-[95vw]">
        
        {/* Top Control Bar */}
        <div className="mb-6 p-5 bg-white rounded-xl shadow-xl border border-slate-200 print:hidden flex flex-col md:flex-row gap-5 justify-between items-center mx-auto">
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))} 
              className="border-2 border-slate-200 rounded-lg px-4 py-2.5 font-bold text-sm bg-slate-50 focus:border-[#474379] outline-none"
            >
              {marathiMonths.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))} 
              className="border-2 border-slate-200 rounded-lg px-4 py-2.5 font-bold text-sm bg-slate-50 focus:border-[#474379] outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => fetchLedgerData(userId!, selectedMonth, selectedYear, true)}
              disabled={loading || isSyncing}
              className="bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition-all text-xs disabled:opacity-50"
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync Live Data
            </button>

            {!isSaved ? (
              <button 
                onClick={handleSave} 
                disabled={loading || !ledgerData} 
                className="bg-[#3c8dbc] text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} खतावणी सेव्ह करा
              </button>
            ) : (
              <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95">
                <Printer size={18} /> Print Ledger
              </button>
            )}
          </div>
        </div>

        {isViewingSnapshot && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center justify-between gap-4">
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

        {/* Printable Area */}
        <div className="bg-white print:p-0 print:m-0 w-full font-['Inter']">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: landscape; margin: 5mm; }
              body { -webkit-print-color-adjust: exact; background: white; }
              ::-webkit-scrollbar { display: none; }
            }
          `}} />

          {loading ? (
             <div className="h-[50vh] flex flex-col justify-center items-center print:hidden space-y-4">
                 <Loader2 size={40} className="animate-spin text-[#474379]" />
                 <p className="font-bold text-slate-400 animate-pulse text-sm">कॅल्क्युलेशन सुरू आहे...</p>
             </div>
          ) : ledgerData && menuItems.length > 0 ? (
            <div className="print:border-none border-2 border-slate-200 shadow-md p-4 print:p-0 overflow-hidden w-full relative">
              
              <div className="text-center mb-6 print:mb-4 border-b-2 border-black pb-4">
                <h1 className="text-xl md:text-2xl font-black mb-1.5 uppercase tracking-wide">प्रतिदिन शिजवलेल्या अन्नधान्याची खतावणी</h1>
                <h2 className="text-sm font-extrabold text-gray-800">
                  शाळेचे नाव: <span className="underline decoration-dotted underline-offset-4 mr-8">{schoolName || '____________________'}</span> 
                  माहे: <span className="underline decoration-dotted underline-offset-4">{marathiMonths[selectedMonth-1]} {selectedYear}</span>
                </h2>
              </div>

              <div className="overflow-x-auto print:overflow-visible pb-10 custom-scrollbar">
                <style dangerouslySetInnerHTML={{__html: `
                  .custom-scrollbar::-webkit-scrollbar { height: 12px; }
                  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f1f5f9; }
                  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}} />
                
                <table className="min-w-max border-collapse border border-black text-[11px] print:text-[10px] whitespace-nowrap !w-full">
                  <thead>
                    <tr className="bg-gray-100 print:bg-transparent">
                      <th className="border border-black print:border-[1px] p-2 text-center w-8" rowSpan={2}>दिनांक</th>
                      <th className="border border-black print:border-[1px] p-2 text-center w-16" rowSpan={2}>वार</th>
                      <th className="border border-black print:border-[1px] p-2 text-center w-40" rowSpan={2}>मेनूचा प्रकार</th>
                      <th className="border border-black print:border-[1px] p-2 text-center" colSpan={2}>उपस्थिती (पट)</th>
                      {menuItems.map(m => (
                         <th key={m.item_code} className="border border-black print:border-[1px] p-2 text-center break-words max-w-[100px] whitespace-normal" rowSpan={2}>
                           {m.item_name}
                         </th>
                      ))}
                      <th className="border border-black print:border-[1px] p-2 text-center w-20" rowSpan={2}>मानधन</th>
                    </tr>
                    <tr className="bg-gray-100 print:bg-transparent">
                      <th className="border border-black print:border-[1px] p-1 text-center bg-gray-50/50 print:bg-transparent text-[9px]">१-५</th>
                      <th className="border border-black print:border-[1px] p-1 text-center bg-gray-50/50 print:bg-transparent text-[9px]">६-८</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    <tr className="bg-yellow-50/30 print:bg-transparent font-bold">
                       <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={5}>१) मागील शिल्लक (Opening)</td>
                       {menuItems.map(m => (
                         <td key={'op_'+m.item_code} className="border border-black print:border-[1px] p-1.5 text-right">{ledgerData.topSummaries.opening[m.item_code]}</td>
                       ))}
                       <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                    </tr>
                    <tr className="bg-blue-50/30 print:bg-transparent font-bold">
                       <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={5}>२) प्राप्त (Received)</td>
                       {menuItems.map(m => (
                         <td key={'rec_'+m.item_code} className="border border-black print:border-[1px] p-1.5 text-right">{ledgerData.topSummaries.received[m.item_code]}</td>
                       ))}
                       <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                    </tr>
                    <tr className="bg-gray-200/50 print:bg-transparent font-black">
                       <td className="border border-black print:border-[1px] p-1.5 text-center" colSpan={5}>३) एकूण (Total = 1+2)</td>
                       {menuItems.map(m => (
                         <td key={'tot_'+m.item_code} className="border border-black print:border-[1px] p-1.5 text-right">{ledgerData.topSummaries.total[m.item_code]}</td>
                       ))}
                       <td className="border border-black print:border-[1px] p-1.5 text-right">-</td>
                    </tr>
                    
                    <tr>
                      <td colSpan={6 + menuItems.length} className="border-x border-black print:border-x-[1px] h-1 bg-black/10 print:bg-transparent"></td>
                    </tr>

                    {ledgerData.dailyRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent transition-colors">
                        <td className="border border-black print:border-[1px] p-1.5 min-w-[50px] font-bold text-center">{String(idx+1).padStart(2, '0')}</td>
                        <td className="border border-black print:border-[1px] p-1.5 text-center tracking-tighter w-16">{row.marathiDayName}</td>
                        <td className="border border-black print:border-[1px] p-1.5 max-w-[150px] truncate md:whitespace-normal md:break-words md:h-auto" title={row.menuName}>{row.menuName || '-'}</td>
                        <td className="border border-black print:border-[1px] p-1.5 text-center font-bold">{row.primaryAtt > 0 ? row.primaryAtt : '-'}</td>
                        <td className="border border-black print:border-[1px] p-1.5 text-center font-bold">{row.upperAtt > 0 ? row.upperAtt : '-'}</td>
                        {menuItems.map(m => (
                          <td key={row.date+'_'+m.item_code} className={`border border-black print:border-[1px] p-1.5 text-right font-mono ${row.consumptions[m.item_code] === '0.000' ? 'text-gray-300 print:text-gray-400' : 'text-slate-800 font-bold'}`}>
                            {row.consumptions[m.item_code] === '0.000' ? '-' : row.consumptions[m.item_code]}
                          </td>
                        ))}
                        <td className="border border-black print:border-[1px] p-1.5 text-right text-gray-400">-</td>
                      </tr>
                    ))}

                    <tr className="bg-[#474379]/10 print:bg-transparent border-t-[3px] border-black">
                       <td className="border border-black print:border-[1px] p-2 text-center font-black uppercase tracking-wider" colSpan={3}>
                          एकूण शिजवले (Total Consumption)
                       </td>
                       <td className="border border-black print:border-[1px] p-2 text-center font-black">{ledgerData.footerTotals.primaryAtt}</td>
                       <td className="border border-black print:border-[1px] p-2 text-center font-black">{ledgerData.footerTotals.upperAtt}</td>
                       {menuItems.map(m => (
                         <td key={'foot_'+m.item_code} className="border border-black print:border-[1px] p-2 text-right font-black shadow-inner">
                            {ledgerData.footerTotals.consumptions[m.item_code] === '0.000' ? '-' : ledgerData.footerTotals.consumptions[m.item_code]}
                         </td>
                       ))}
                       <td className="border border-black print:border-[1px] p-2 text-right font-black">-</td>
                    </tr>
                    
                    <tr className="bg-amber-50/50 print:bg-transparent font-black text-xs print:text-[10px]">
                       <td className="border border-black print:border-[1px] p-2 text-center text-amber-700 print:text-black tracking-widest" colSpan={5}>
                          ४) उसणे घेतलेले धान्य (Borrowed Stock)
                       </td>
                       {menuItems.map(m => {
                          const tot = Number(ledgerData.topSummaries.total[m.item_code]) || 0;
                          const cons = Number(ledgerData.footerTotals.consumptions[m.item_code]) || 0;
                          const borrowed = Math.max(0, cons - tot).toFixed(3);
                          return (
                            <td key={'borrow_'+m.item_code} className="border border-black print:border-[1px] p-2 text-right font-black text-amber-600 print:text-black">
                              {borrowed === '0.000' ? '-' : borrowed}
                            </td>
                          )
                       })}
                       <td className="border border-black print:border-[1px] p-2 text-right font-black">-</td>
                    </tr>
                    
                    <tr className="bg-gray-100 print:bg-transparent font-black text-xs print:text-[10px]">
                       <td className="border border-black print:border-[1px] p-2 text-center text-red-600 print:text-black tracking-widest" colSpan={5}>
                          ५) अखेर शिल्लक (Closing Balance = Total - Consumed)
                       </td>
                       {menuItems.map(m => {
                          const tot = Number(ledgerData.topSummaries.total[m.item_code]) || 0;
                          const cons = Number(ledgerData.footerTotals.consumptions[m.item_code]) || 0;
                          const closing = Math.max(0, tot - cons).toFixed(3);
                          return (
                            <td key={'close_'+m.item_code} className="border border-black print:border-[1px] p-2 text-right font-black">
                              {closing === '0.000' ? '-' : closing}
                            </td>
                          )
                       })}
                       <td className="border border-black print:border-[1px] p-2 text-right font-black">-</td>
                    </tr>

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
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl m-6">
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm text-center">
                 या महिन्यासाठी मेनू मास्टर आणि <br/>उपस्थिती माहिती उपलब्ध नाही.
               </p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
