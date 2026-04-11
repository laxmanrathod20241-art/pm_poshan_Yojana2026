import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { PackagePlus, RefreshCw, FileText, Printer, Trash2, AlertTriangle, Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

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
      const uniqueNames = Array.from(new Set((data || []).map((m: any) => m.item_name)));
      setMenuItems(uniqueNames);
    } catch (err: any) {
      console.error('Menu Options Fetch Error:', err.message);
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
      setMessage({ type: 'error', text: 'Please fill in all details.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error: recError } = await (supabase as any)
        .from('stock_receipts')
        .insert({
          teacher_id: userId,
          item_name: foodName,
          quantity_kg: Number(quantityKg),
          receipt_date: receiptDate
        });

      if (recError) throw recError;

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

      setMessage({ type: 'success', text: `Registered ${quantityKg} kg of ${foodName}.` });
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
    if (!window.confirm('Are you sure you want to remove this item?')) return;
    setLoading(true);
    try {
      await (supabase as any).from('inventory_stock').delete().eq('id', stockId);
      fetchStockData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (id: string, itemName: string, qty: number) => {
    if (!userId) return;
    if (!window.confirm(`Delete this ${qty}kg ${itemName} receipt? Balance will be adjusted.`)) return;
    setLoading(true);
    try {
      const { data: invData } = await (supabase as any).from('inventory_stock').select('id, current_balance').eq('teacher_id', userId).eq('item_name', itemName).maybeSingle();
      if (invData) {
        const newBalance = Number(invData.current_balance) - Number(qty);
        await (supabase as any).from('inventory_stock').update({ current_balance: newBalance }).eq('id', invData.id);
      }
      await (supabase as any).from('stock_receipts').delete().eq('id', id);
      fetchStockData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (balance: number) => {
    if (balance < 0) return { bg: 'bg-red-50', text: 'text-red-600', label: 'Borrowed', badge: 'bg-red-600' };
    if (balance > 10) return { bg: 'bg-[#00a65a]/15', text: 'text-[#00a65a]', label: 'Available', badge: 'bg-[#00a65a]' };
    if (balance > 0 && balance <= 10) return { bg: 'bg-[#f39c12]/15', text: 'text-[#e67e22]', label: 'Low Stock', badge: 'bg-[#f39c12]' };
    return { bg: 'bg-[#dd4b39]/15', text: 'text-[#dd4b39]', label: 'Out of Stock', badge: 'bg-[#dd4b39]' };
  };

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative space-y-6 mt-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-end border-b pb-4 border-slate-200">
          <button onClick={() => setShowReport(!showReport)} className="bg-[#474379] hover:bg-[#34305c] text-white px-8 py-3 font-black shadow-lg text-[11px] flex items-center gap-2 uppercase tracking-widest">
            <FileText size={16} /> {showReport ? 'Close Report' : 'Generate Register'}
          </button>
        </div>

        {message.text && (
          <div className={`p-4 font-bold border ${message.type === 'success' ? 'bg-[#00a65a]/10 text-[#00a65a] border-[#00a65a]/30' : 'bg-[#dd4b39]/10 text-[#dd4b39] border-[#dd4b39]/30'}`}>
            {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-1">
            <div className="bg-white border-t-4 border-[#00a65a] shadow-lg rounded-none">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <PackagePlus size={18} className="text-[#00a65a]" />
                <h3 className="text-[11px] font-black text-[#474379] uppercase tracking-widest">Register Inward Stock</h3>
              </div>
              <form onSubmit={handleStockSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Food Item</label>
                  <select required value={foodName} onChange={e => setFoodName(e.target.value)} className="w-full border border-slate-300 p-2 text-sm font-bold bg-white outline-none">
                    <option value="">-- Select Item --</option>
                    {menuItems.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Quantity (kg)</label>
                  <input type="number" required min="0" step="0.1" value={quantityKg} onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-slate-300 p-2 text-sm font-bold bg-slate-50/30 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Date of Receipt</label>
                  <input type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="w-full border border-slate-300 p-2 text-sm font-bold bg-slate-50/30 outline-none" />
                </div>

                {foodName && inventory.find(i => i.item_name === foodName)?.current_balance < 0 && (
                  <div className="bg-amber-50 p-3 border border-amber-200 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-tight">
                      नवीन साठ्यातून प्रथम उसणे धान्य वजा केले जाईल. <br/>(Borrowing will be repaid first)
                    </p>
                  </div>
                )}

                <button type="submit" disabled={loading || !userId} className="w-full bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-4 py-4 font-black shadow-xl transition-all text-[11px] flex justify-center items-center gap-2 uppercase tracking-widest">
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <PackagePlus size={16} />} Submit Physical Receipt
                </button>
              </form>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white border border-slate-300 shadow-lg rounded-none overflow-hidden h-full">
              <div className="bg-[#474379] p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <span className="font-bold uppercase tracking-wider text-[13px]">Inventory Visual Master</span>
                  <span className="text-white/60 text-xs font-medium bg-white/10 px-3 py-1 rounded">Live Data</span>
                </div>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Filter by name or date..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-1.5 text-xs font-bold focus:bg-white/20 focus:border-white/40 outline-none placeholder:text-white/30 transition-all w-48 md:w-64"
                  />
                </div>
              </div>

              {/* Advanced Responsive View: Table for Desktop, Cards for Mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest">
                      <th className="p-4 border-r border-slate-200 w-32">Date</th>
                      <th className="p-4 border-r border-slate-200">Item Name</th>
                      <th className="p-4 border-r border-slate-200">Received (Mo.)</th>
                      <th className="p-4 border-r border-slate-200">Current Balance</th>
                      <th className="p-4 border-r border-slate-200 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchLoading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">Loading metrics...</td></tr>
                    ) : inventory.filter(inv => {
                        const search = searchTerm.toLowerCase();
                        if (!search) return true;
                        const itemReceipts = monthlyReceipts.filter(r => r.item_name === inv.item_name);
                        const lastReceipt = itemReceipts.length > 0 ? itemReceipts[0].receipt_date : null;
                        const displayDate = lastReceipt 
                          ? new Date(lastReceipt).toLocaleDateString('en-GB')
                          : (inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '-');

                        return inv.item_name.toLowerCase().includes(search) || displayDate.includes(search);
                      }).length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-400">
                        {searchTerm ? `No results for "${searchTerm}"` : 'No inventory data.'}
                      </td></tr>
                    ) : (
                      inventory
                        .filter(inv => {
                          const search = searchTerm.toLowerCase();
                          if (!search) return true;
                          
                          const itemReceipts = monthlyReceipts.filter(r => r.item_name === inv.item_name);
                          const lastReceipt = itemReceipts.length > 0 ? itemReceipts[0].receipt_date : null;
                          const displayDate = lastReceipt 
                            ? new Date(lastReceipt).toLocaleDateString('en-GB')
                            : (inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '-');

                          return inv.item_name.toLowerCase().includes(search) || displayDate.includes(search);
                        })
                        .map((inv) => {
                          const monthlyTotal = calculateMonthlyTotal(inv.item_name);
                          const balance = Number(inv.current_balance);
                          const status = getStatusColor(balance);
                          const itemReceipts = monthlyReceipts.filter(r => r.item_name === inv.item_name);
                          const lastReceipt = itemReceipts.length > 0 ? itemReceipts[0].receipt_date : null;
                          const displayDate = lastReceipt ? new Date(lastReceipt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : (inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-');
                          return (
                            <tr key={inv.id} className={`border-b border-slate-200 transition-colors ${status.bg}`}>
                              <td className="p-4 text-[12px] font-bold text-slate-500 border-r border-slate-200">{displayDate}</td>
                              <td className="p-4 text-[14px] font-extrabold text-slate-800 border-r border-slate-200">{inv.item_name}</td>
                              <td className="p-4 text-[13px] font-semibold text-slate-600 border-r border-slate-200">{monthlyTotal.toFixed(2)} kg</td>
                              <td className={`p-4 text-[15px] font-black border-r border-slate-200 ${status.text}`}>
                                {balance < 0 ? (
                                  <div className="flex flex-col">
                                    <span className="text-red-600 line-through opacity-40 text-xs">0.00 kg</span>
                                    <span className="text-[16px] animate-pulse">-{Math.abs(balance).toFixed(2)} kg</span>
                                  </div>
                                ) : (
                                  `${balance.toFixed(2)} kg`
                                )}
                              </td>
                              <td className="p-4 text-center border-r border-slate-200">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${status.badge} shadow-sm`}>
                                  {balance < 0 ? '⚠️ उसणे बाकी' : status.label}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button onClick={() => handleDeleteInventoryItem(inv.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {fetchLoading ? (
                   <div className="p-10 text-center text-xs font-black text-slate-400">LOADING INVENTORY...</div>
                ) : inventory.filter(inv => {
                    const search = searchTerm.toLowerCase();
                    return inv.item_name.toLowerCase().includes(search);
                  }).length === 0 ? (
                  <div className="p-10 text-center text-xs font-black text-slate-400 uppercase tracking-widest">No matching stock found.</div>
                ) : (
                  inventory
                    .filter(inv => inv.item_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((inv) => {
                      const monthlyTotal = calculateMonthlyTotal(inv.item_name);
                      const balance = Number(inv.current_balance);
                      const status = getStatusColor(balance);
                      return (
                        <div key={inv.id} className={`p-5 flex justify-between items-center transition-all ${status.bg}`}>
                          <div className="space-y-1">
                            <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">{inv.item_name}</h4>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${status.badge}`}>
                                {balance < 0 ? 'उसणे (Debt)' : status.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">Total: {monthlyTotal.toFixed(1)}kg</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <span className={`text-lg font-black tracking-tighter ${status.text}`}>
                               {balance < 0 ? `-${Math.abs(balance).toFixed(2)}` : balance.toFixed(2)} <span className="text-[10px] uppercase opacity-40">kg</span>
                            </span>
                            <button onClick={() => handleDeleteInventoryItem(inv.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>

        {showReport && (
          <div className="bg-white border-2 border-[#474379] shadow-lg rounded-none mt-10 p-8">
            <div className="bg-[#474379] -m-8 p-5 flex items-center justify-between text-white mb-8">
               <div className="flex items-center gap-3"><FileText size={24} /><h3 className="font-extrabold text-lg uppercase">Monthly Logistics Register</h3></div>
               <div className="flex items-center gap-3">
                 <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="px-3 py-2 text-sm font-bold rounded text-[#474379] outline-none" />
                 <button onClick={() => window.print()} className="bg-white text-[#474379] hover:bg-slate-100 px-4 py-2 rounded font-bold transition-colors flex items-center gap-2 text-sm shadow-sm"><Printer size={16} /> Print</button>
               </div>
            </div>
            <div className="overflow-x-auto border border-slate-300 mt-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 uppercase text-[11px] font-black text-[#3c8dbc]">
                    <th className="p-3 border-r border-slate-300">Date</th>
                    <th className="p-3 border-r border-slate-300">Item Name</th>
                    <th className="p-3 text-right">Qty (Kg)</th>
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReceipts.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-200 text-sm font-bold text-slate-700">
                      <td className="p-3 border-r border-slate-200">{new Date(rec.receipt_date).toLocaleDateString()}</td>
                      <td className="p-3 border-r border-slate-200 uppercase">{foodNameMap[rec.item_name] || rec.item_name}</td>
                      <td className="p-3 text-right text-[#00a65a]">{Number(rec.quantity_kg).toFixed(2)} kg</td>
                      <td className="p-3 text-center print:hidden"><button onClick={() => handleDeleteReceipt(rec.id, rec.item_name, rec.quantity_kg)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
