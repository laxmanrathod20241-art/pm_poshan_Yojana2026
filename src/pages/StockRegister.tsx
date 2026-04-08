import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { PackagePlus, RefreshCw, FileText, Printer, Trash2 } from 'lucide-react';

export default function StockRegister() {
  const [userId, setUserId] = useState<string | null>(null);

  // Form State
  const [foodName, setFoodName] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  // Data State
  const [inventory, setInventory] = useState<any[]>([]);
  const [monthlyReceipts, setMonthlyReceipts] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [foodNameMap, setFoodNameMap] = useState<Record<string, string>>({});

  // Dashboard / Report State
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchStockData();
      fetchMenuOptions();
      fetchFoodNames();
    }
  }, [userId, reportMonth]);

  const fetchFoodNames = async () => {
    if (!userId) return;
    try {
      const [globalRes, localRes, masterRes] = await Promise.all([
        (supabase as any).from('global_food_master').select('code, name'),
        (supabase as any).from('local_food_master').select('local_code, name'),
        (supabase as any).from('menu_master').select('item_code, item_name').eq('teacher_id', userId)
      ]);

      const mapping: Record<string, string> = {};
      globalRes.data?.forEach((f: any) => { mapping[f.code] = f.name; });
      localRes.data?.forEach((f: any) => { mapping[f.local_code] = f.name; });
      masterRes.data?.forEach((f: any) => { mapping[f.item_code] = f.item_name; });
      setFoodNameMap(mapping);
    } catch (err: any) {
      console.error('Food Names Fetch Error:', err.message);
    }
  };

  const fetchMenuOptions = async () => {
    if (!userId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('menu_master')
        .select('item_name')
        .eq('teacher_id', userId);

      if (error) throw error;

      // Get unique names just in case
      const uniqueNames = Array.from(new Set((data || []).map((m: any) => m.item_name)));
      setMenuItems(uniqueNames);
    } catch (err: any) {
      console.error('Menu Options Fetch Error:', err.message);
      // CRITICAL: Add this alert so you can see the actual database error!
      alert("Error fetching menu options: " + err.message);
    }
  };

  const fetchStockData = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data: invData, error: invError } = await (supabase as any)
        .from('inventory_stock')
        .select('*')
        .eq('teacher_id', userId)
        .order('item_name', { ascending: true });

      if (invError) throw invError;

      const [yearStr, monthStr] = reportMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const lastDay = new Date(year, month, 0).getDate();

      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = `${yearStr}-${monthStr}-${lastDay}`;

      const { data: recData, error: recError } = await (supabase as any)
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', userId)
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)
        .order('receipt_date', { ascending: false });

      if (recError) throw recError;

      setInventory(invData || []);
      setMonthlyReceipts(recData || []);
    } catch (err: any) {
      console.error('Data Fetch Error:', err.message);
      // CRITICAL: Add this alert so you can see the actual database error!
      alert("Error fetching inventory: " + err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const calculateMonthlyTotal = (itemName: string) => {
    return monthlyReceipts
      .filter((rec) => rec.item_name === itemName)
      .reduce((sum, rec) => sum + Number(rec.quantity_kg), 0);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!foodName || !quantityKg || !receiptDate) {
      setMessage({ type: 'error', text: 'Please fill in all stock receipt details.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. INSERT into stock_receipts (history log)
      const { error: recError } = await (supabase as any)
        .from('stock_receipts')
        .insert({
          teacher_id: userId,
          item_name: foodName,
          quantity_kg: Number(quantityKg),
          receipt_date: receiptDate
        });

      if (recError) throw recError;

      // 2. UPSERT into inventory_stock (live balance)
      const { data: existData } = await (supabase as any)
        .from('inventory_stock')
        .select('id, current_balance')
        .eq('teacher_id', userId)
        .eq('item_name', foodName)
        .maybeSingle();

      if (existData) {
        const { error: updateError } = await (supabase as any)
          .from('inventory_stock')
          .update({ current_balance: Number(existData.current_balance) + Number(quantityKg) })
          .eq('id', existData.id);
        if (updateError) throw updateError;
      } else {
        const { error: invError } = await (supabase as any)
          .from('inventory_stock')
          .insert({
            teacher_id: userId,
            item_name: foodName,
            current_balance: Number(quantityKg)
          });
        if (invError) throw invError;
      }

      setMessage({ type: 'success', text: `Successfully registered ${quantityKg} kg of ${foodName}.` });
      setFoodName('');
      setQuantityKg('');
      fetchStockData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventoryItem = async (stockId: string) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to remove this item from your inventory? This will clear the live balance.')) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await (supabase as any)
        .from('inventory_stock')
        .delete()
        .eq('id', stockId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Item removed from inventory successfully.' });
      fetchStockData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Deletion Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (id: string, itemName: string, qty: number) => {
    if (!userId) return;
    if (!window.confirm(`Are you sure you want to delete this ${qty}kg ${itemName} receipt? Current stock balance will be adjusted automatically.`)) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. Fetch current balance
      const { data: invData } = await (supabase as any)
        .from('inventory_stock')
        .select('id, current_balance')
        .eq('teacher_id', userId)
        .eq('item_name', itemName)
        .maybeSingle();

      if (invData) {
        const newBalance = Math.max(0, Number(invData.current_balance) - Number(qty));

        // 2. Update balance
        const { error: updateError } = await (supabase as any)
          .from('inventory_stock')
          .update({ current_balance: newBalance })
          .eq('id', invData.id);

        if (updateError) throw updateError;
      }

      // 3. Delete receipt
      const { error: delError } = await (supabase as any)
        .from('stock_receipts')
        .delete()
        .eq('id', id);

      if (delError) throw delError;

      setMessage({ type: 'success', text: 'Receipt deleted and stock balance adjusted.' });
      fetchStockData();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Deletion Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (balance: number) => {
    if (balance > 10) {
      return { bg: 'bg-[#00a65a]/15', text: 'text-[#00a65a]', label: 'Available', badge: 'bg-[#00a65a]' };
    }
    if (balance > 0 && balance <= 10) {
      return { bg: 'bg-[#f39c12]/15', text: 'text-[#e67e22]', label: 'Low Stock', badge: 'bg-[#f39c12]' };
    }
    return { bg: 'bg-[#dd4b39]/15', text: 'text-[#dd4b39]', label: 'Out of Stock', badge: 'bg-[#dd4b39]' };
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative space-y-6 mt-6 pb-20">

        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-end border-b pb-4 border-slate-200">
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setShowReport(!showReport)}
              className="bg-[#474379] hover:bg-[#34305c] text-white px-8 py-3 rounded-none font-black shadow-lg transition-all text-[11px] flex items-center gap-2 uppercase tracking-widest active:scale-95"
            >
              <FileText size={16} />
              {showReport ? 'Close Report' : 'Generate Register'}
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-none text-[13px] font-bold border ${message.type === 'success' ? 'bg-[#00a65a]/10 text-[#00a65a] border-[#00a65a]/30' : 'bg-[#dd4b39]/10 text-[#dd4b39] border-[#dd4b39]/30'}`}>
            {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Data Entry Left Column */}
          <div className="xl:col-span-1">
            <div className="bg-white border-t-4 border-[#00a65a] shadow-[0_4px_12px_rgb(0,0,0,0.05)] rounded-none h-full">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <PackagePlus size={18} className="text-[#00a65a]" />
                <h3 className="text-[11px] font-black text-[#474379] uppercase tracking-widest">Register Inward Stock</h3>
              </div>

              <form onSubmit={handleStockSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Food Category / Name</label>
                  <select
                    required
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    className="w-full border border-slate-300 p-2 text-sm font-bold focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-slate-700 bg-white rounded-none shadow-sm"
                  >
                    <option value="">-- Select from My Menu --</option>
                    {menuItems.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {menuItems.length === 0 && !fetchLoading && (
                    <p className="text-[10px] text-red-500 mt-1 font-bold italic">
                      * No items found in Menu Settings. Please configure your menu first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Quantity Received (kg)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={quantityKg}
                    onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-300 p-2 text-sm font-bold focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-slate-700 rounded-none shadow-sm bg-slate-50/30"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Date of Dispatch / Receipt</label>
                  <input
                    type="date"
                    required
                    value={receiptDate}
                    onChange={e => setReceiptDate(e.target.value)}
                    className="w-full border border-slate-300 p-2 text-sm font-bold focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-slate-700 rounded-none shadow-sm bg-slate-50/30"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !userId}
                    className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-4 py-4 font-black shadow-xl shadow-blue-500/20 transition-all text-[11px] disabled:opacity-70 flex justify-center items-center gap-2 uppercase tracking-widest active:scale-95"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <PackagePlus size={16} />}
                    Submit Physical Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Visual Master Right Column */}
          <div className="xl:col-span-2">
            <div className="bg-white border border-slate-300 shadow-[0_4px_12px_rgb(0,0,0,0.05)] rounded-none overflow-hidden h-full">
              <div className="bg-[#474379] p-4 flex justify-between items-center">
                <span className="font-bold text-white uppercase tracking-wider text-[13px]">Inventory Visual Master</span>
                <span className="text-white/60 text-xs font-medium bg-white/10 px-3 py-1 rounded">Live Data</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300">
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest border-r border-slate-200">Food Item Classification</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest border-r border-slate-200">Received (Mo.)</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest border-r border-slate-200">Current Balance</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest border-r border-slate-200">Date of Receipt</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest text-center border-r border-slate-200">Lifecycle Status</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#474379] uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchLoading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">Loading metrics...</td></tr>
                    ) : inventory.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">No inventory balances currently exist for this location.</td></tr>
                    ) : (
                      inventory.map((inv) => {
                        const monthlyTotal = calculateMonthlyTotal(inv.item_name);
                        const balance = Number(inv.current_balance);
                        const status = getStatusColor(balance);

                        const itemReceipts = monthlyReceipts.filter(r => r.item_name === inv.item_name);
                        const latestReceipt = itemReceipts.sort((a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())[0];
                        const displayDate = latestReceipt ? new Date(latestReceipt.receipt_date) : null;

                        return (
                          <tr key={inv.id} className={`border-b border-slate-200 transition-colors ${status.bg}`}>
                            <td className="p-4 text-[14px] font-extrabold text-slate-800 border-r border-slate-200 bg-white/40">{inv.item_name}</td>
                            <td className="p-4 text-[13px] font-semibold text-slate-600 border-r border-slate-200 bg-white/40">{monthlyTotal.toFixed(2)} kg</td>
                            <td className={`p-4 text-[15px] font-black border-r border-slate-200 bg-white/40 ${status.text}`}>
                              {balance.toFixed(2)} kg
                            </td>
                            <td className="p-4 text-[12px] font-bold text-slate-500 border-r border-slate-200 bg-white/40">
                              {displayDate ? displayDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '--'}
                            </td>
                            <td className="p-4 text-center bg-white/40 border-r border-slate-200">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${status.badge} shadow-sm`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="p-4 text-center bg-white/40">
                              <button
                                onClick={() => handleDeleteInventoryItem(inv.id)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors cursor-pointer"
                                title="Remove from inventory"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Monthly Register Section */}
        {showReport && (
          <div className="bg-white border-2 border-[#474379] shadow-lg rounded-none mt-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#474379] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg tracking-tight">Official Monthly Register</h3>
                  <p className="text-[#a5b4fc] text-xs font-medium">Standardized PM-POSHAN Logistics Report</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="px-3 py-2 text-sm font-bold border-0 rounded text-[#474379] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#3c8dbc]"
                />
                <button
                  onClick={() => window.print()}
                  className="bg-white text-[#474379] hover:bg-slate-100 px-4 py-2 rounded font-bold transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  <Printer size={16} /> Print Sheet
                </button>
              </div>
            </div>

            <div className="p-8 print:p-2 bg-white">
              {/* Print Header */}
              <div className="hidden print:block text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-black uppercase">PM-POSHAN Scheme</h1>
                <h2 className="text-xl font-bold mt-1">Monthly Logistics Receipt Register</h2>
                <div className="mt-2 text-sm">Operating Month: {new Date(reportMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
              </div>

              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full text-left border-collapse print:text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 print:bg-white print:border-black">
                      <th className="p-3 text-[12px] font-black text-[#3c8dbc] print:text-black uppercase border-r border-slate-300 w-24 text-center">Record ID</th>
                      <th className="p-3 text-[12px] font-black text-[#3c8dbc] print:text-black uppercase border-r border-slate-300">Date of Receipt</th>
                      <th className="p-3 text-[12px] font-black text-[#3c8dbc] print:text-black uppercase border-r border-slate-300">Item Classification</th>
                      <th className="p-3 text-[12px] font-black text-[#3c8dbc] print:text-black uppercase border-r border-slate-300 text-right">Volume (Kg)</th>
                      <th className="p-3 text-[12px] font-black text-[#3c8dbc] print:text-black uppercase text-center print:hidden">Correction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReceipts.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-500 italic">No inbound logistics registered for this operating period.</td></tr>
                    ) : (
                      monthlyReceipts.map((rec, index) => (
                        <tr key={rec.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-200 print:border-slate-300`}>
                          <td className="p-3 text-xs font-mono text-slate-500 border-r border-slate-200 text-center">#{rec.id?.toString().slice(0, 6) || index + 1}</td>
                          <td className="p-3 text-sm font-bold text-slate-700 border-r border-slate-200">
                            {new Date(rec.receipt_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-sm font-black text-slate-800 border-r border-slate-200 uppercase tracking-tight">
                            {foodNameMap[rec.item_name] || rec.item_name}
                          </td>
                          <td className="p-3 text-sm font-black text-[#00a65a] border-r border-slate-200 text-right">
                            {Number(rec.quantity_kg).toFixed(2)} kg
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => handleDeleteReceipt(rec.id, rec.item_name, rec.quantity_kg)}
                              disabled={loading}
                              className="text-[#dd4b39] hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-50 pointer-events-auto cursor-pointer"
                              title="Delete/Correct this movement"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {monthlyReceipts.length > 0 && (
                      <tr className="bg-slate-100 border-t-2 border-slate-400 print:border-black">
                        <td colSpan={3} className="p-3 text-sm font-black text-right uppercase text-slate-600 print:text-black border-r border-slate-300">Total Operational Volume:</td>
                        <td className="p-3 text-sm font-black text-[#00a65a] print:text-black text-right border-r border-slate-300">
                          {monthlyReceipts.reduce((sum, r) => sum + Number(r.quantity_kg), 0).toFixed(2)} kg
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
