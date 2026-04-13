import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { FileStack, Loader2, Save, Printer, RefreshCw } from 'lucide-react';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ItemLedgerSnapshot = Database['public']['Tables']['item_ledger_reports']['Row'];

interface MenuItem {
  item_code: string;
  item_name: string;
}

interface MatrixRow {
  monthId: string;
  opening: string;
  received: string;
  borrowed: string;
  total: string;
  consumed: string;
  returned: string;
  totalExpense: string;
  closing: string;
  [key: string]: string;
}

interface ItemLedgerTotals {
  opening: string;
  received: string;
  borrowed: string;
  total: string;
  consumed: string;
  returned: string;
  totalExpense: string;
  closing: string;
  [key: string]: string;
}

export default function ItemLedgerReport() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
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
  const [selectedScope, setSelectedScope] = useState<'primary' | 'upper_primary'>('primary');

  const [schoolName, setSchoolName] = useState('');
  const [centerName, setCenterName] = useState('');
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);

  const [reportMatrix, setReportMatrix] = useState<MatrixRow[]>([]);
  const [reportMonths, setReportMonths] = useState<{ month: number, year: number, label: string }[]>([]);
  const [totals, setTotals] = useState<ItemLedgerTotals | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchBaseData(session.user.id);
      }
    });
  }, []);

  const fetchBaseData = async (id: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_name_mr, center_name_mr, has_primary, has_upper_primary')
      .eq('id', id)
      .returns<Profile[]>()
      .maybeSingle();

    if (profile) {
      setSchoolName(profile.school_name_mr || '');
      setCenterName(profile.center_name_mr || '');
      setHasPrimary(profile.has_primary ?? true);
      setHasUpperPrimary(profile.has_upper_primary ?? true);

      // Auto-snap selectedScope based on section availability
      if (profile.has_primary === false && profile.has_upper_primary === true) {
        setSelectedScope('upper_primary');
      } else {
        setSelectedScope('primary');
      }
    }

    const { data: menuMaster } = await supabase.from('menu_master').select('item_code, item_name').eq('teacher_id', id).order('created_at').returns<MenuItem[]>();
    if (menuMaster) {
      setMenuItems(menuMaster as MenuItem[]);
      if (menuMaster.length > 0 && !selectedItemName) setSelectedItemName(menuMaster[0].item_name);
    }
  };

  const handleGenerate = async (force = false) => {
    if (!userId || !selectedItemName) return;
    setLoading(true);
    
    // Immediate state sanitation to prevent ghost data flicker
    setReportMatrix([]);
    setTotals(null);
    setIsGenerated(false);
    setIsSaved(false);

    try {
      // Range signature: YYYY-MM_to_YYYY-MM
      const dateRangeId = `${startYear}-${String(startMonth).padStart(2, '0')}_to_${endYear}-${String(endMonth).padStart(2, '0')}`;

      const { data: snapshot } = await supabase
        .from('item_ledger_reports')
        .select('*')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('date_range', dateRangeId)
        .eq('date_range', dateRangeId)
        .eq('standard_group', selectedScope)
        .returns<ItemLedgerSnapshot[]>()
        .maybeSingle();

      if (snapshot && snapshot.report_data && !force) {
        setIsGenerated(true);
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
      const { data: reports } = await supabase
        .from('monthly_reports')
        .select('report_month, report_year, report_data')
        .eq('teacher_id', userId)
        .eq('standard_group', selectedScope);

      const reportsMap = new Map();
      (reports || []).forEach((r: any) => {
        reportsMap.set(`${r.report_year}-${r.report_month}`, r);
      });

      // 4. Fetch Raw Receipts for the entire range (to ensure live deletion sync)
      const { data: rawReceipts } = await supabase
        .from('stock_receipts')
        .select('receipt_date, quantity')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('standard_group', selectedScope)
        .gte('receipt_date', `${startYear}-${String(startMonth).padStart(2, '0')}-01`)
        .lt('receipt_date', `${endYear}-${String(endMonth === 12 ? 1 : endMonth + 1).padStart(2, '0')}-01`);

      const receiptsByMonth = new Map();
      (rawReceipts || []).forEach((r: any) => {
          const d = new Date(r.receipt_date);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          receiptsByMonth.set(key, (receiptsByMonth.get(key) || 0) + Number(r.quantity));
      });

      // Determine initial opening balance mathematically
      let currentOpening = 0;

      // FALLBACK: Fetch from inventory_stock as a starting baseline if no reports exist
      const { data: stockEntry } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('standard_group', selectedScope)
        .returns<Database['public']['Tables']['inventory_stock']['Row'][]>()
        .maybeSingle();
      
      const baselineBalance = stockEntry ? Number(stockEntry.current_balance) : 0;

      // Calculate Chained Matrix
      const matrix: any[] = [];
      let grandReceived = 0;
      let grandBorrowed = 0;
      let grandConsumed = 0;

      for (let i = 0; i < generatedMonths.length; i++) {
        const dm = generatedMonths[i];
        const key = `${dm.year}-${dm.month}`;
        let mFoundOpening = 0;
        let mConsumed = 0;
        let mBorrowed = 0;

        if (reportsMap.has(key)) {
          const rawData = reportsMap.get(key).report_data;
          const repData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          const itemMatch = repData?.find((x: any) => x.item === selectedItemName);
          if (itemMatch) {
            mFoundOpening = Number(itemMatch.openingBalance) || 0;
            mConsumed = Number(itemMatch.consumed) || 0;
            mBorrowed = Number(itemMatch.borrowed) || 0;
          }
        }

        if (i === 0) {
          // Priority: 1. Official Report Opening Balance, 2. Current Inventory Baseline
          currentOpening = mFoundOpening || baselineBalance;
        }

        const liveReceived = receiptsByMonth.get(key) || 0;
        const received = liveReceived;
        const borrowed = mBorrowed;
        const total = currentOpening + received + borrowed;

        const consumed = mConsumed;
        const returned = 0; // Return/Repayment is currently implicit in balance
        const totalExpense = consumed + returned;

        const closing = total - totalExpense;

        matrix.push({
          monthId: key,
          opening: currentOpening.toFixed(2),
          received: received.toFixed(2),
          borrowed: borrowed.toFixed(2),
          total: total.toFixed(2),
          consumed: consumed.toFixed(2),
          returned: returned.toFixed(2),
          totalExpense: totalExpense.toFixed(2),
          closing: closing.toFixed(2)
        } as MatrixRow);

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
        opening: gtOpening.toFixed(2),
        received: grandReceived.toFixed(2),
        borrowed: grandBorrowed.toFixed(2),
        total: gtTotal.toFixed(2),
        consumed: grandConsumed.toFixed(2),
        returned: '0.00',
        totalExpense: gtExpense.toFixed(2),
        closing: gtClosing.toFixed(2)
      };

      setReportMatrix(matrix);
      setTotals(finalTotals);
      setIsGenerated(true);

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

      const payload: Database['public']['Tables']['item_ledger_reports']['Insert'] = {
        teacher_id: userId,
        item_name: selectedItemName,
        date_range: dateRangeId,
        standard_group: selectedScope,
        report_data: {
          months: reportMonths,
          matrix: reportMatrix,
          totals: totals
        }
      };

      const { data: existing } = await supabase
        .from('item_ledger_reports')
        .select('id')
        .eq('teacher_id', userId)
        .eq('item_name', selectedItemName)
        .eq('date_range', dateRangeId)
        .eq('standard_group', selectedScope)
        .returns<ItemLedgerSnapshot[]>()
        .maybeSingle();

      let err;
      if (existing) {
        const res = await (supabase
          .from('item_ledger_reports') as any)
          .update(payload)
          .eq('id', existing.id)
          .eq('teacher_id', userId);
        err = res.error;
      } else {
        const res = await (supabase.from('item_ledger_reports') as any).insert([payload]);
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

  const renderMetricRow = (label: string, rowKey: keyof MatrixRow, highlight?: boolean) => {
    return (
      <tr className={`border-b border-black print:border-[1px] hover:bg-slate-50 print:hover:bg-transparent ${highlight ? 'font-black bg-gray-100/50 print:bg-transparent' : 'font-bold'}`}>
        <td className="border-r border-black print:border-[1px] px-2 py-2.5 text-left w-48 sticky left-0 bg-white print:static uppercase tracking-tighter shadow-[1px_0_0_black] print:shadow-none whitespace-nowrap">{label}</td>
        {reportMatrix.map(col => (
          <td key={col.monthId + rowKey} className={`border-r border-black print:border-[1px] px-1.5 py-2.5 text-center w-px whitespace-nowrap ${col[rowKey] === '0.00' ? 'text-gray-400 print:text-black' : 'text-slate-800'}`}>
            {col[rowKey] === '0.00' ? '-' : col[rowKey]}
          </td>
        ))}
        <td className="px-1.5 py-2.5 text-center w-px whitespace-nowrap font-black bg-gray-50/50 print:bg-transparent text-[#474379] print:text-black shadow-inner border-l-2 border-black">
          {totals && totals[rowKey as keyof ItemLedgerTotals] === '0.00' ? '-' : totals ? totals[rowKey as keyof ItemLedgerTotals] : '-'}
        </td>
      </tr>
    )
  };

  const resetFlow = () => {
    setIsGenerated(false);
    setIsSaved(false);
    setReportMatrix([]);
    setTotals(null);
  };

  return (
    <Layout>
      <div className="mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-full print:bg-white w-full lg:max-w-[95vw]">

        {/* Optimized Inline Control Bar */}
        <div className="mb-6 mx-auto w-full lg:max-w-[1400px] print:hidden">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-end gap-4">
            
            {/* Item Selection */}
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Inventory Item</label>
              <div className="bg-slate-50 p-1 rounded-xl border border-slate-100 flex items-center gap-2">
                <FileStack size={14} className="ml-2 text-blue-500" />
                <select 
                  value={selectedItemName} 
                  onChange={e => { setSelectedItemName(e.target.value); resetFlow(); }}
                  className="bg-transparent flex-1 py-1.5 font-bold text-xs text-slate-700 outline-none"
                  title="वस्तू निवडा (Select inventory item)"
                >
                  {menuItems.map(item => <option key={item.item_code} value={item.item_name}>{item.item_name}</option>)}
                </select>
              </div>
            </div>

            {/* Standard Toggle */}
            {hasPrimary && hasUpperPrimary && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Standard</label>
                <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex items-center h-10 shadow-inner w-44">
                  <button 
                    onClick={() => { setSelectedScope('primary'); resetFlow(); }}
                    className={`flex-1 h-full text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'primary' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    I-V
                  </button>
                  <button 
                    onClick={() => { setSelectedScope('upper_primary'); resetFlow(); }}
                    className={`flex-1 h-full text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedScope === 'upper_primary' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    VI-VIII
                  </button>
                </div>
              </div>
            )}

            {/* From Period */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">From Period</label>
              <div className="bg-slate-50 p-1 rounded-xl border border-slate-100 flex items-center gap-1">
                <select 
                  value={startMonth} 
                  onChange={e => { setStartMonth(Number(e.target.value)); resetFlow(); }} 
                  className="bg-transparent px-2 py-1.5 font-bold text-xs text-slate-700 outline-none"
                  title="सुरूवातीचा महिना (Start month)"
                >
                  {marathiMonths.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200" />
                <select 
                  value={startYear} 
                  onChange={e => { setStartYear(Number(e.target.value)); resetFlow(); }} 
                  className="bg-transparent px-2 py-1.5 font-bold text-xs text-slate-700 outline-none"
                  title="सुरूवातीचे वर्ष (Start year)"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* To Period */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">To Period</label>
              <div className="bg-slate-50 p-1 rounded-xl border border-slate-100 flex items-center gap-1">
                <select 
                  value={endMonth} 
                  onChange={e => { setEndMonth(Number(e.target.value)); resetFlow(); }} 
                  className="bg-transparent px-2 py-1.5 font-bold text-xs text-slate-700 outline-none"
                  title="अखेरचा महिना (End month)"
                >
                  {marathiMonths.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200" />
                <select 
                  value={endYear} 
                  onChange={e => { setEndYear(Number(e.target.value)); resetFlow(); }} 
                  className="bg-transparent px-2 py-1.5 font-bold text-xs text-slate-700 outline-none"
                  title="अखेरचे वर्ष (End year)"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto lg:ml-0">
              <button
                onClick={() => handleGenerate(isGenerated)}
                disabled={loading}
                className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-sm border ${isGenerated ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-900 text-white'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} 
                {isGenerated ? 'RE-GENERATE (RE-SYNC LIVE)' : 'GENERATE DATA'}
              </button>

              {isGenerated && !isSaved && (
                <button
                  onClick={handleSave}
                  disabled={loading || reportMatrix.length === 0}
                  className="h-10 px-6 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Save size={14} /> SAVE RECORD
                </button>
              )}

              {isSaved && (
                <button
                  onClick={() => window.print()}
                  className="h-10 px-6 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Printer size={14} /> PRINT REGISTER
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print:bg-white print:p-0 print:m-0 w-full font-['Inter'] relative pt-2">
          
          {/* Forcing A4 Landscape and 10mm Margins */}
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; background: white; }
              ::-webkit-scrollbar { display: none; }
            }
          `}} />

          {reportMatrix.length > 0 ? (
            <div className="w-full overflow-x-auto print:overflow-visible pb-10 custom-scrollbar">
              
              {/* Report Card - Stripping all digital styling for Print */}
              <div className="print:shadow-none print:bg-transparent print:p-0 print:m-0 print:border-none print:rounded-none print:max-w-none print:w-full print:min-w-0 md:border-2 border-slate-200 md:shadow-2xl md:rounded-[40px] p-4 md:p-12 w-full min-w-[1000px] relative bg-white transition-all mx-auto">

                <div className="w-full mb-6 print:mb-4 text-slate-900 border-b-2 border-slate-900 pb-4">
                  {/* Top Titles - Centered */}
                  <div className="text-center">
                    <h1 className="text-lg md:text-xl font-bold">
                      प्रधान मंत्री पोषण शक्ती निर्माण योजना {selectedScope === 'primary' ? '(इ.१ ते ५ वी)' : '(इ.६ ते ८ वी)'}
                    </h1>
                    <h2 className="text-md md:text-lg font-bold mt-1">धान्यादी मालाचा साठा रजिस्टर</h2>
                  </div>

                  {/* Subtitles - Flex Split */}
                  <div className="flex flex-col md:flex-row justify-between items-center md:items-end mt-4 px-2 text-sm md:text-base font-bold gap-2">
                    <div>शाळेचे नाव : {schoolName || "____________________"}</div>
                    <div>सन : {startYear} - {endYear}</div>
                  </div>

                  {/* Main Item Name - Centered & Large */}
                  <div className="text-center mt-4">
                    <h3 className="text-2xl md:text-4xl font-black text-black uppercase tracking-tight">{selectedItemName || "साहित्य"}</h3>
                  </div>

                  {/* Kendra Name - Right Aligned */}
                  <div className="text-right px-2 mt-2 text-sm md:text-base font-bold">
                    केंद्र : {centerName || "____________________"}
                  </div>
                </div>

                {/* Table Context */}
                <div className="w-full pb-4">
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar { height: 12px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; border: 2px solid #f1f5f9; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                  `}} />

                  <table className="min-w-max border-collapse border-2 border-black text-xs print:text-[11px] whitespace-nowrap !w-full">
                    <thead>
                      <tr className="bg-gray-100 print:bg-transparent border-b-2 border-black">
                        <th className="border-r-2 border-black px-2 py-2.5 text-left w-48 font-black uppercase tracking-tighter sticky left-0 z-10 bg-gray-100 print:static print:bg-transparent shadow-[1px_0_0_black] print:shadow-none whitespace-nowrap">तपशील \ महिने</th>
                        {reportMonths.map((m, idx) => (
                          <th key={idx} className="border-r border-black print:border-[1px] px-1.5 py-2.5 text-center font-black w-px whitespace-nowrap">{m.label}</th>
                        ))}
                        <th className="px-1.5 py-2.5 text-center font-black uppercase tracking-widest bg-gray-50 print:bg-transparent border-l-2 border-black w-px whitespace-nowrap">एकूण (Total)</th>
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
                        <td className="border-r border-black px-2 py-2.5 text-left sticky left-0 bg-yellow-50 print:static print:bg-transparent uppercase shadow-[1px_0_0_black] print:shadow-none whitespace-nowrap">८) अखेर शिल्लक (Closing 4-7)</td>
                        {reportMatrix.map(col => (
                          <td key={'closing_' + col.monthId} className="border-r border-black print:border-[1px] px-1.5 py-2.5 text-center bg-yellow-50/30 print:bg-transparent text-black w-px whitespace-nowrap">
                            {col.closing === '0.00' ? '-' : col.closing}
                          </td>
                        ))}
                        <td className="px-1.5 py-2.5 text-center font-black bg-yellow-100 print:bg-transparent border-l-2 border-black tracking-widest decoration-dotted underline underline-offset-4 w-px whitespace-nowrap">
                          {totals?.closing === '0.00' ? '-' : totals?.closing}
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
                  <div className="text-center font-bold text-[11px] uppercase tracking-wider">
                    <div className="border-b-[1.5px] border-black w-56 mb-2"></div>
                    मुख्याध्यापक (स्वाक्षरी व शिक्का)
                  </div>
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