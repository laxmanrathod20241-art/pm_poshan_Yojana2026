import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthProvider';
import {
  Printer,
  Loader2,
  FileText,
  Filter,
  AlertCircle,
  RefreshCw,
  Save,
  CheckCircle,
  Lock,
  Users
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import type { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type FuelTracking = Database['public']['Tables']['fuel_tracking']['Row'];
type CookingStaff = Database['public']['Tables']['cooking_staff']['Row'];

interface MonthlyLedgerRow {
  monthName: string;
  monthIndex: number; // 0-11
  year: number;
  totalStudents: number;
  expectedAmount: number;
  receivedAmount: number;
  entriesCount: number;
  pendingAmount: number;
  isFuture?: boolean;
}

export default function PaymentLedgerReport() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workflowState, setWorkflowState] = useState<'initial' | 'synced' | 'saved'>('initial');
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSection, setSelectedSection] = useState<'primary' | 'upper_primary' | ''>('');
  const [ledgerData, setLedgerData] = useState<MonthlyLedgerRow[]>([]);

  const marathiMonths = [
    'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर',
    'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर', 'जानेवारी', 'फेब्रुवारी', 'मार्च'
  ];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payment_Ledger_${selectedYear}_${selectedSection}`,
  });

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId]);

  const fetchProfile = async (uid: string) => {
    const { data } = await api.from('profiles').select('*').eq('id', uid).single();
    const profileData = data as any;
    if (profileData) {
      setProfile(profileData);
      // Auto-select first available section if not set
      if (!selectedSection) {
        if (profileData.has_primary) setSelectedSection('primary');
        else if (profileData.has_upper_primary) setSelectedSection('upper_primary');
      }
    }
  };

  const checkExistingSnapshot = async (uid: string, year: number) => {
    setLoading(true);
    try {
      const { data } = await (api.from('financial_ledger_snapshots' as any) as any)
        .select('*')
        .eq('teacher_id', uid)
        .eq('fiscal_year', year)
        .eq('section_type', selectedSection)
        .maybeSingle();

      const snapshotData = data as any;
      if (snapshotData) {
        setLedgerData(snapshotData.ledger_data as MonthlyLedgerRow[]);
        setWorkflowState('saved');
      } else {
        setWorkflowState('initial');
        setLedgerData([]);
      }
    } catch (err) {
      console.error("Snapshot check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && selectedSection) {
      checkExistingSnapshot(userId, selectedYear);
    }
  }, [userId, selectedYear, selectedSection]);

  const fetchLedgerData = async (uid: string, year: number) => {
    setLoading(true);
    try {
      // Academic year runs from April (year) to March (year + 1)
      const startDate = `${year}-04-01`;
      const endDate = `${year + 1}-03-31`;

      // 1. Fetch all raw data for the entire year to avoid N+1 queries
      const [
        { data: logs },
        { data: payments },
        { data: fuelConfigs },
        { data: staffConfigs }
      ] = await Promise.all([
        api.from('daily_logs').select('log_date, meals_served_primary, meals_served_upper_primary').eq('teacher_id', uid).gte('log_date', startDate).lte('log_date', endDate),
        (api.from('payment_receipts' as any) as any).select('receipt_date, amount').eq('teacher_id', uid).gte('receipt_date', startDate).lte('receipt_date', endDate),
        api.from('fuel_tracking').select('*').eq('teacher_id', uid),
        api.from('cooking_staff').select('*').eq('teacher_id', uid)
      ]);

      const rows: MonthlyLedgerRow[] = [];

      // 2. Aggregate by month
      const isPrimary = selectedSection === 'primary';

      for (let i = 0; i < 12; i++) {
        // Correct month and year for loop
        const mIdx = (i + 3) % 12; // 0=Jan, 3=April
        const currentYear = i < 9 ? year : year + 1;
        const currentMonth = mIdx + 1; // 1-12

        // Filter logs for this month
        const monthLogs = (logs || []).filter(l => {
          const log = l as any;
          const d = new Date(log.log_date);
          return d.getMonth() === mIdx && d.getFullYear() === currentYear;
        });

        // SECTION AWARE: Specific enrollment and logs
        const sectionStudents = monthLogs.reduce((sum, l) => {
          const log = l as any;
          return sum + (isPrimary ? (Number(log.meals_served_primary) || 0) : (Number(log.meals_served_upper_primary) || 0));
        }, 0);

        // Filter payments for this month AND THIS SECTION
        const monthPayments = (payments || []).filter(p => {
          const pay = p as any;
          const d = new Date(pay.receipt_date);
          const sameMonth = d.getMonth() === mIdx && d.getFullYear() === currentYear;
          return sameMonth && pay.section_type === selectedSection;
        });

        const receivedAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const entriesCount = monthPayments.length;

        // Fetch rates for this specific month/year or fallback to last available
        const fuel = (fuelConfigs as FuelTracking[] || []).find(f => f.record_month === currentMonth && f.record_year === currentYear)
          || (fuelConfigs as FuelTracking[] || [])[0]; // Fallback to first if mismatch

        const staff = (staffConfigs as CookingStaff[] || []).filter(s => s.record_month === currentMonth && s.record_year === currentYear)
          || (staffConfigs as CookingStaff[] || []).filter(s => s.record_month === (currentMonth - 1 || 12));

        // Calculate Expected
        let expected = 0;

        // A. Food/Fuel Component (Section Specific)
        if (fuel) {
          const fuelRate = isPrimary ? (Number(fuel.fuel_rate_primary || 0) + Number(fuel.veg_rate_primary || 0)) : (Number(fuel.fuel_rate_upper || 0) + Number(fuel.veg_rate_upper || 0));
          expected += (Number(sectionStudents) * fuelRate);
        }

        // B. Staff Mandhan Component (Monthly filtered & Section Specific)
        const currentStaff = staff.length > 0 ? staff : (staffConfigs as CookingStaff[] || []);
        currentStaff.forEach(s => {
          const rate = isPrimary ? Number(s.rate_primary || 0) : Number(s.rate_upper || 0);

          if (s.payment_type === 'per_student') {
            expected += (rate * sectionStudents);
          } else if (s.payment_type === 'per_day') {
            const workingDays = monthLogs.filter(l => {
              const log = l as any;
              return (isPrimary ? (Number(log.meals_served_primary) || 0) : (Number(log.meals_served_upper_primary) || 0)) > 0;
            }).length;
            expected += (rate * workingDays);
          } else if (s.payment_type === 'monthly') {
            expected += (rate || Number(s.monthly_cost || 0));
          } else {
            // Fallback for any other type
            expected += Number(s.monthly_cost || 0);
          }
        });

        const now = new Date();
        const isFutureMonth = currentYear > now.getFullYear() || (currentYear === now.getFullYear() && mIdx > now.getMonth());

        rows.push({
          monthName: marathiMonths[i],
          monthIndex: mIdx,
          year: currentYear,
          totalStudents: sectionStudents,
          expectedAmount: Math.round(expected),
          receivedAmount: Math.round(receivedAmount),
          entriesCount: entriesCount,
          pendingAmount: Math.round(receivedAmount - expected),
          isFuture: isFutureMonth
        });
      }

      setLedgerData(rows);
      setWorkflowState('synced');

    } catch (err) {
      console.error("Ledger calculation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!userId || workflowState !== 'synced') return;
    if (!selectedSection) {
      alert("कृपया वर्ग गट (Section) निवडा.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await (api.from('financial_ledger_snapshots' as any) as any)
        .upsert(
          {
            teacher_id: userId,
            fiscal_year: selectedYear,
            section_type: selectedSection,
            ledger_data: ledgerData
          },
          { onConflict: 'teacher_id,fiscal_year,section_type' }
        );

      if (error) throw error;
      setWorkflowState('saved');
      alert("अहवाल यशस्वीरित्या जतन केला!");
    } catch (err: any) {
      console.error("Save error:", err);
      alert("अहवाल जतन करताना त्रुटी आली: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-5xl mx-auto mt-4 pb-20 print:p-0 print:m-0 print:max-w-none print:bg-white transition-all duration-500">

        {/* Force Portrait Mode on Print */}
        <style type="text/css" media="print">
          {`@page { size: portrait; margin: 15mm; }`}
        </style>

        {/* Controls */}
        <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 print:hidden">
          <div className="flex items-center gap-4 min-w-max">
            <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-100 flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="whitespace-nowrap">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">मानधन आणि खर्च नोंदवही</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Payment Receipt Ledger</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 w-full lg:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
              <Filter size={14} className="ml-3 text-slate-400" />
              <select
                title="Select Academic Year"
                aria-label="Select Academic Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent px-3 py-2 text-xs font-black text-slate-700 outline-none w-32"
              >
                <option value={2024}>2024-25</option>
                <option value={2025}>2025-26</option>
                <option value={2026}>2026-27</option>
              </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl items-center border border-slate-200">
              <Users size={14} className="ml-3 text-slate-400" />
              <select
                title="Select Section"
                aria-label="Select Section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value as any)}
                className="bg-transparent px-3 py-2 text-xs font-black text-slate-700 outline-none w-40"
              >
                {profile?.has_primary && <option value="primary">इ. १ ते ५ वी (Primary)</option>}
                {profile?.has_upper_primary && <option value="upper_primary">इ. ६ ते ८ वी (Upper)</option>}
              </select>
            </div>

            {/* Workflow Buttons */}
            <div className="flex items-center gap-2">
              {/* 1. SYNC */}
              <button
                onClick={() => userId && fetchLedgerData(userId, selectedYear)}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-md disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                माहिती सिंक करा
              </button>

              {/* 2. SAVE */}
              <button
                onClick={handleSaveSnapshot}
                disabled={workflowState !== 'synced' || isSaving}
                className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${workflowState === 'saved'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : workflowState === 'saved' ? <CheckCircle size={14} /> : <Save size={14} />}
                {workflowState === 'saved' ? 'माहिती जतन केली' : 'माहिती जतन करा'}
              </button>

              {/* 3. PRINT */}
              {workflowState === 'saved' && (
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500 whitespace-nowrap"
                >
                  <Printer size={14} /> प्रिंट करा
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Refined Print Layout with Table-Auto for tight spacing */}
        <div ref={printRef} className="bg-white print:p-0 p-8 shadow-xl border border-slate-100 rounded-[32px] print:shadow-none print:border-none print:m-0 overflow-x-auto">

          {/* Print Header */}
          <div className="text-center mb-8 border-b-2 border-slate-950 pb-6 print:mb-4 min-w-[800px] print:min-w-0">
            <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">प्रधानमंत्री पोषण शक्ती निर्माण योजना</h1>
            <h2 className="text-lg font-extrabold text-slate-800 mb-1 tracking-wide uppercase">
              मानधन आणि खर्च नोंदवही {selectedSection === 'upper_primary' ? '— इ. ६ ते ८ वी' : '— इ. १ ते ५ वी'}
              <br />
              (आर्थिक वर्ष {selectedYear}-{String(selectedYear + 1).slice(2)})
            </h2>
            <div className="flex justify-center gap-8 text-sm font-bold mt-4">
              <p>शाळेचे नाव: <span className="underline decoration-dotted">{profile?.school_name_mr || '____________________'}</span></p>
              <p>केंद्र: <span className="underline decoration-dotted">{profile?.center_name_mr || '__________'}</span></p>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">गणना सुरू आहे...</p>
            </div>
          ) : (
            <div className="w-full">
              <table className="table-auto w-full border-collapse border-2 border-slate-950 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-950">
                    <th className="border-2 border-slate-950 p-3 font-black text-left uppercase text-[10px] w-1 whitespace-nowrap">महिना</th>
                    <th className="border-2 border-slate-950 p-3 font-black text-center uppercase text-[10px] whitespace-nowrap">एकूण लाभार्थी</th>
                    <th className="border-2 border-slate-950 p-3 font-black text-right uppercase text-[10px] whitespace-nowrap">शासनाकडून देय रक्कम</th>
                    <th className="border-2 border-slate-950 p-3 font-black text-right uppercase text-[10px] whitespace-nowrap">प्रत्यक्ष प्राप्त रक्कम</th>
                    <th className="border-2 border-slate-950 p-3 font-black text-center uppercase text-[10px] w-1 whitespace-nowrap">जमा नोंदी</th>
                    <th className="border-2 border-slate-950 p-3 font-black text-right uppercase text-[10px] whitespace-nowrap bg-slate-100/50">शिल्लक/बाकी</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.map((row, idx) => {
                    const isFuture = row.isFuture;
                    return (
                      <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isFuture ? 'bg-slate-50/30' : ''}`}>
                        <td className="border-2 border-slate-950 p-3 font-black text-slate-800">{row.monthName}</td>
                        <td className="border-2 border-slate-950 p-3 text-center font-bold text-slate-600 font-mono italic">
                          {isFuture ? '-' : row.totalStudents}
                        </td>
                        <td className="border-2 border-slate-950 p-3 text-right font-black text-slate-800">
                          {isFuture ? '-' : `₹ ${row.expectedAmount.toLocaleString()}`}
                        </td>
                        <td className="border-2 border-slate-950 p-3 text-right font-black text-indigo-700">
                          {isFuture ? '-' : `₹ ${row.receivedAmount.toLocaleString()}`}
                        </td>
                        <td className="border-2 border-slate-950 p-3 text-center font-bold text-slate-500 text-xs">
                          {isFuture ? '-' : row.entriesCount}
                        </td>
                        <td className={`border-2 border-slate-950 p-3 text-right font-black transition-colors ${!isFuture && row.pendingAmount > 0 ? 'text-green-600 bg-green-50/30' :
                            !isFuture && row.pendingAmount < 0 ? 'text-red-600 bg-red-50/30' :
                              'text-slate-800'
                          }`}>
                          {isFuture ? '-' : (row.pendingAmount > 0 ? '+' : '') + ` ₹ ${row.pendingAmount.toLocaleString()}`}
                        </td>
                      </tr>
                    );
                  })}
                  {ledgerData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="border-2 border-slate-950 p-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <Lock size={48} />
                          <p className="text-xl font-black uppercase tracking-widest">प्रथम माहिती सिंक करा</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-950 text-white">
                  <tr>
                    <th className="border-2 border-slate-950 p-3 text-left font-black uppercase text-xs">एकूण:</th>
                    <th className="border-2 border-slate-950 p-3 text-center font-bold font-mono text-xs">
                      {ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.totalStudents, 0)}
                    </th>
                    <th className="border-2 border-slate-950 p-3 text-right font-black text-sm">
                      ₹ {ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.expectedAmount, 0).toLocaleString()}
                    </th>
                    <th className="border-2 border-slate-950 p-3 text-right font-black text-sm">
                      ₹ {ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.receivedAmount, 0).toLocaleString()}
                    </th>
                    <th></th>
                    <th className={`border-2 border-slate-950 p-3 text-right font-black text-sm ${
                        (ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.receivedAmount, 0) - ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.expectedAmount, 0)) > 0 ? 'text-emerald-400' :
                        (ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.receivedAmount, 0) - ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.expectedAmount, 0)) < 0 ? 'text-rose-400' :
                          'text-white'
                      }`}>
                      {(ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.receivedAmount, 0) - ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.expectedAmount, 0)) > 0 ? '+' : ''} ₹ {(ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.receivedAmount, 0) - ledgerData.filter(r => !r.isFuture).reduce((sum, r) => sum + r.expectedAmount, 0)).toLocaleString()}
                    </th>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-12 print:mt-16 flex justify-between items-end px-4">
                <div className="text-center">
                  <div className="w-48 border-b-2 border-slate-950 mb-3"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">शालेय पोषण आहार प्रभारी</p>
                </div>
                <div className="text-center">
                  <div className="w-64 border-b-2 border-slate-950 mb-3"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">मुख्यध्यापक (स्वाक्षरी व शिक्का)</p>
                </div>
              </div>

              <div className="mt-16 text-center text-[8px] font-bold text-slate-300 uppercase tracking-widest hidden print:block">
                System Generated Report | PM-POSHAN Tracker
              </div>
            </div>
          )}
        </div>

        {/* Warning Toast if info missing */}
        {ledgerData.some(r => r.expectedAmount === 0 && r.totalStudents > 0) && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 mx-auto max-w-2xl print:hidden">
            <AlertCircle size={18} />
            <p className="text-[10px] font-bold uppercase tracking-tight">टीप: काही महिन्यांचे दर (Rates) उपलब्ध नसल्यामुळे 'देय रक्कम' पूर्ण माहिती दाखवू शकत नाही. कृपया इंधन आणि कर्मचारी दर तपासा.</p>
          </div>
        )}

      </div>
    </Layout>
  );
}
