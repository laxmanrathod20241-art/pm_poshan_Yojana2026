// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { reconstructOpeningBalances } from '../utils/inventoryUtils';
import { Loader2, BarChart2, Printer } from 'lucide-react';

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

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [inventoryBalances, setInventoryBalances] = useState<Record<string, number>>({});

  const [userId, setUserId] = useState<string | null>(null);
  const [customDemands, setCustomDemands] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSessionAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchReportData(session.user.id);
      }
    };
    fetchSessionAndData();
  }, [classGroup, fromMonth, fromYear]); // Refetch/recalc when parameters change

  // Auto-Calculation Engine with Rounding
  useEffect(() => {
    if (menuItems.length > 0) {
      const newDemands: Record<string, string> = {};
      menuItems.forEach(item => {
        const balance = inventoryBalances[item.item_name] || 0;
        const grams = classGroup === 'PRIMARY' ? Number(item.grams_primary) : Number(item.grams_upper_primary);
        const required = (enrollmentCount * workingDays * grams) / 1000;
        const demand = Math.max(0, required - balance);
        newDemands[item.id] = Math.ceil(demand).toString();
      });
      setCustomDemands(newDemands);
      setIsSaved(false);
    }
  }, [menuItems, inventoryBalances, enrollmentCount, workingDays, classGroup]);

  const fetchReportData = async (id: string) => {
    setLoading(true);
    try {
      const fromMonthIndex = marathiMonths.indexOf(fromMonth);
      const cutoffDate = `${fromYear}-${String(fromMonthIndex + 1).padStart(2, '0')}-01`;

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('school_name_mr, center_name_mr, has_primary, has_upper_primary')
        .eq('id', id)
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

      const { data: enrollment } = await (supabase as any)
        .from('student_enrollment')
        .select('*')
        .eq('teacher_id', id)
        .maybeSingle();

      if (enrollment) {
        const sum = classGroup === 'PRIMARY' 
          ? (Number(enrollment.std_1) || 0) + (Number(enrollment.std_2) || 0) + (Number(enrollment.std_3) || 0) + (Number(enrollment.std_4) || 0) + (Number(enrollment.std_5) || 0)
          : (Number(enrollment.std_6) || 0) + (Number(enrollment.std_7) || 0) + (Number(enrollment.std_8) || 0);
        setEnrollmentCount(sum);
      } else {
        setEnrollmentCount(0);
      }

      const { data: menu } = await (supabase as any)
        .from('menu_master')
        .select('*')
        .eq('teacher_id', id);

      const items = menu || [];
      setMenuItems(items);

      // Reconstruct historical balances using centralized utility
      const reconcilation = await reconstructOpeningBalances(id, cutoffDate, items);
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
      const { error } = await (supabase as any)
        .from('demand_reports')
        .insert([{
          teacher_id: userId,
          report_period: reportPeriod,
          class_group: classGroup,
          working_days: workingDays,
          enrollment_count: enrollmentCount,
          report_data: customDemands
        }]);

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
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {hasPrimary && (
                  <button
                    onClick={() => setClassGroup('PRIMARY')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded ${classGroup === 'PRIMARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    १ ते ५ (Primary)
                  </button>
                )}
                {hasUpperPrimary && (
                  <button
                    onClick={() => setClassGroup('UPPER_PRIMARY')}
                    className={`px-4 py-2 text-xs font-black uppercase rounded ${classGroup === 'UPPER_PRIMARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                  >
                    ६ ते ८ (Upper)
                  </button>
                )}
              </div>

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
          </div>

          <div className="flex flex-col gap-3 items-end">
            {!isSaved ? (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <BarChart2 size={20} />}
                Save Demand Report
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="flex-shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-transform hover:scale-105"
                >
                  Edit Report
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                >
                  <Printer size={20} /> Print Report
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
          <div id="printable-report" className="bg-white p-8 md:p-12 border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 font-['Inter'] w-full print:w-full print:max-w-none print:px-0 print:mx-0">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black text-black underline decoration-2 underline-offset-4 mb-2">
                शालेय पोषण आहार मागणी (इयत्ता {classGroup === 'PRIMARY' ? '१ ते ५' : '६ ते ८'} )
              </h1>
              <h2 className="text-lg font-bold text-black">
                माहे : {reportPeriod || '______________________'}
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-black mb-8 w-full print:w-full [&>div]:border-black [&>div]:border-r [&>div]:border-b last:[&>div]:border-r-0 lg:[&>div:nth-child(4n)]:border-r-0 [&>div:nth-last-child(-n+4)]:border-b-0 print:border-[1.5px] print:[&>div]:border-b-[1.5px] print:[&>div]:border-r-[1.5px]">
              <div className="p-3">
                <div className="text-xs font-bold text-gray-600 print:text-black">शाळेचे नाव</div>
                <div className="font-bold text-base">{schoolName || '-'}</div>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-gray-600 print:text-black">केंद्राचे नाव</div>
                <div className="font-bold text-base">{centerName || '-'}</div>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-gray-600 print:text-black">पट</div>
                <div className="font-bold text-base">{enrollmentCount}</div>
              </div>
              <div className="p-3 border-r-0">
                <div className="text-xs font-bold text-gray-600 print:text-black">कामाचे एकूण दिवस</div>
                <div className="font-bold text-base">{workingDays}</div>
              </div>
            </div>

            <table className="w-full print:w-full border-collapse border-2 border-black print:border-black text-base">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent">
                  <th className="border border-black print:border-black print:text-black w-12 p-2 py-3 text-center">अ. क्र.</th>
                  <th className="border border-black print:border-black print:text-black w-[35%] p-2 py-3 text-left">धान्यादी माल</th>
                  <th className="border border-black print:border-black print:text-black w-[18%] p-2 py-3 text-right">मागील माह अखेर शिल्लक</th>
                  <th className="border border-black print:border-black print:text-black w-[18%] p-2 py-3 text-right">पटानुसार आवश्यक माल</th>
                  <th className="border border-black print:border-black print:text-black w-[17%] p-2 py-3 text-right text-lg">निव्वळ मागणी</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item: any, idx: number) => {
                  const balance = inventoryBalances[item.item_name] || 0;
                  const grams = classGroup === 'PRIMARY' ? Number(item.grams_primary) : Number(item.grams_upper_primary);
                  const required = (enrollmentCount * workingDays * grams) / 1000;

                  return (
                    <tr key={item.id}>
                      <td className="border border-black print:border-black print:text-black p-2 text-center font-normal">{idx + 1}</td>
                      <td className="border border-black print:border-black print:text-black p-2 font-medium">{item.item_name}</td>
                      <td className="border border-black print:border-black print:text-black p-2 text-right font-normal">{balance.toFixed(3)}</td>
                      <td className="border border-black print:border-black print:text-black p-2 text-right font-normal">{required.toFixed(3)}</td>
                      <td className="border border-black print:border-black print:text-black p-2 text-right font-bold text-lg bg-gray-50 print:bg-transparent">
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
                    <td colSpan={5} className="border border-black print:border-black print:text-black p-6 text-center text-gray-500 italic">No menu items configured...</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between w-full mt-24 print:mt-32 px-10 print:px-4 text-sm font-bold text-black print:text-black">
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
