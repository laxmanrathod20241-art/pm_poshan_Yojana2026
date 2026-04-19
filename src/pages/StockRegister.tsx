import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/apiClient';
import Layout from '../components/Layout';
import { PackagePlus, RefreshCw, FileText, Printer, Trash2, AlertTriangle, Search, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { getCurrentStock, getFinancialYearStart } from '../utils/inventoryUtils';

export default function StockRegister() {
  const { user } = useAuth();
  const userId = user?.id || null;

  // Form State
  const [foodName, setFoodName] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetGroup, setTargetGroup] = useState<'primary' | 'upper_primary'>('primary');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // List & Filter State
  const [inventory, setInventory] = useState<any[]>([]);
  const [monthlyReceipts, setMonthlyReceipts] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'primary' | 'upper_primary'>('all');
  
  // Configuration State
  const [hasPrimary, setHasPrimary] = useState(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState(true);
  
  // Master Data
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [nameToCodeMap, setNameToCodeMap] = useState<Record<string, string>>({});
  const [foodNameMap, setFoodNameMap] = useState<Record<string, string>>({});
  
  // Report State
  const [showReport, setShowReport] = useState(false);
  const [reportMonth, setReportMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  // Opening Balance Modal State
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingBalances, setOpeningBalances] = useState<Record<string, string>>({});
  const [openingDate, setOpeningDate] = useState(`${new Date().getFullYear()}-04-01`);
  const [hasOpeningStock, setHasOpeningStock] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchStockData();
      fetchMenuOptions();
      fetchFoodNames();
      fetchProfile(userId);
    }
  }, [userId, reportMonth]);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await (api as any)
        .from('profiles')
        .select('has_primary, has_upper_primary')
        .eq('id', uid)
        .single();
      
      if (error) throw error;
      if (data) {
        setHasPrimary(data.has_primary ?? true);
        setHasUpperPrimary(data.has_upper_primary ?? true);
        
        // Auto-snap targetGroup if only one section exists
        if (data.has_primary === false && data.has_upper_primary === true) {
          setTargetGroup('upper_primary');
        } else {
          setTargetGroup('primary');
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  };

  const fetchFoodNames = async () => {
    if (!userId) return;
    try {
      const [globalRes, localRes, masterRes] = await Promise.all([
        (api as any).from('global_food_master').select('code, name'),
        (api as any).from('local_food_master').select('local_code, name'),
        (api as any).from('menu_master').select('item_code, item_name').eq('teacher_id', userId)
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
      const { data, error } = await (api as any)
        .from('menu_master')
        .select('item_name, item_code')
        .eq('teacher_id', userId);

      if (error) throw error;
      const uniqueItems = (data || []).reduce((acc: any[], current: any) => {
        if (!acc.find(item => item.item_name === current.item_name)) {
          acc.push(current);
        }
        return acc;
      }, []);

      const sortedNames = uniqueItems.map((m: any) => String(m.item_name))
        .sort((a, b) => a.localeCompare(b, 'mr'));
      
      const mapping: Record<string, string> = {};
      uniqueItems.forEach((m: any) => {
        mapping[m.item_name] = m.item_code;
      });

      setMenuItems(sortedNames);
      setNameToCodeMap(mapping);
    } catch (err: any) {
      console.error('Menu Options Fetch Error:', err.message);
    }
  };

  const fetchStockData = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data: menuData } = await (api as any).from('menu_master').select('item_name, item_code, grams_primary, grams_upper_primary').eq('teacher_id', userId);
      const liveStock = await getCurrentStock(userId, menuData || [], filterGroup === 'all' ? undefined : filterGroup);
      
      const invData = (menuData || []).map((m: any) => ({
        id: m.item_code || m.item_name,
        item_name: m.item_name,
        item_code: m.item_code,
        current_balance: liveStock[m.item_name] || 0,
        standard_group: filterGroup === 'all' ? 'primary' : filterGroup // Approximation for display
      })).filter((item: any) => item.current_balance !== 0);

      const [yearStr, monthStr] = reportMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const lastDay = new Date(year, month, 0).getDate();

      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = `${yearStr}-${monthStr}-${lastDay}`;

      const { data: recData, error: recError } = await (api as any)
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', userId)
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)
        .order('receipt_date', { ascending: false });

      if (recError) throw recError;
      
      // Check if opening stock was already declared for THIS financial year
      const fyStart = getFinancialYearStart(new Date().toISOString().split('T')[0]);
      const openingRecs = await (api as any)
        .from('stock_receipts')
        .select('*')
        .eq('teacher_id', userId)
        .eq('bill_no', 'OPENING_BALANCE')
        .gte('receipt_date', fyStart);

      if (openingRecs.data && openingRecs.data.length > 0) {
        setHasOpeningStock(true);
        const balances: Record<string, string> = {};
        openingRecs.data.forEach((r: any) => {
          balances[r.item_name] = String(r.quantity_kg);
        });
        setOpeningBalances(balances);
        setOpeningDate(openingRecs.data[0].receipt_date);
      } else {
        setHasOpeningStock(false);
      }

      setInventory(invData);
      setMonthlyReceipts(recData || []);
    } catch (err: any) {
      console.error('Data Fetch Error:', err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const filteredInventory = inventory.filter(inv => {
    const matchesSearch = inv.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || inv.standard_group === filterGroup;
    return matchesSearch && matchesGroup;
  }).sort((a, b) => a.item_name.localeCompare(b.item_name, 'mr'));

  const calculateMonthlyTotal = (itemName: string, group: string, itemCode?: string) => {
    return monthlyReceipts
      .filter((rec) => (
        (itemCode && rec.item_code === itemCode) || 
        (rec.item_name === itemName)
      ) && rec.standard_group === group)
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
      const { error: recError } = await (api as any)
        .from('stock_receipts')
        .insert({
          teacher_id: userId,
          item_name: foodName,
          item_code: nameToCodeMap[foodName] || null,
          quantity_kg: Number(quantityKg),
          receipt_date: receiptDate,
          standard_group: targetGroup
        });

      if (recError) throw recError;

      const { data: existData } = await (api as any)
        .from('inventory_stock')
        .select('id, current_balance')
        .eq('teacher_id', userId)
        .or(`item_code.eq."${nameToCodeMap[foodName]}",and(item_name.eq."${foodName}",item_code.is.null)`)
        .eq('standard_group', targetGroup)
        .maybeSingle();

      if (existData) {
        const { error: updateError } = await (api as any)
          .from('inventory_stock')
          .update({ 
            current_balance: Number((existData as any).current_balance) + Number(quantityKg),
            item_code: nameToCodeMap[foodName] || null // Update code if it was missing
          })
          .eq('id', (existData as any).id);
        if (updateError) throw updateError;
      } else {
        const { error: invError } = await (api as any)
          .from('inventory_stock')
          .insert({
            teacher_id: userId,
            item_name: foodName,
            item_code: nameToCodeMap[foodName] || null,
            current_balance: Number(quantityKg),
            standard_group: targetGroup
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

  const handleDeleteReceipt = async (id: string, itemName: string, qty: number) => {
    if (!userId) return;
    if (!window.confirm(`Delete this ${qty}kg ${itemName} receipt? Balance will be adjusted.`)) return;
    setLoading(true);
    try {
      const code = nameToCodeMap[itemName] || null;
      const { data: invData } = await (api as any)
        .from('inventory_stock')
        .select('id, current_balance')
        .eq('teacher_id', userId)
        .or(`item_code.eq."${code}",and(item_name.eq."${itemName}",item_code.is.null)`)
        .maybeSingle();
        
      if (invData) {
        const newBalance = Number((invData as any).current_balance) - Number(qty);
        await (api as any)
          .from('inventory_stock')
          .update({ current_balance: newBalance })
          .eq('id', (invData as any).id);
      }
      await (api as any)
        .from('stock_receipts')
        .delete()
        .eq('id', id)
        .eq('teacher_id', userId);
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
        <div className="flex flex-col md:flex-row md:items-end justify-end border-b pb-4 border-slate-200 gap-4">
          <button 
            onClick={() => setShowOpeningModal(true)} 
            className={`${hasOpeningStock ? 'bg-[#474379] hover:bg-[#34305c]' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-8 py-3 font-black shadow-lg text-[11px] flex items-center gap-2 uppercase tracking-widest transition-all hover:scale-105 active:scale-95`}
          >
            {hasOpeningStock ? <FileText size={16} /> : <RefreshCw size={16} />} 
            {hasOpeningStock ? 'सुरुवातीची शिल्लक पहा/सुधारा (View/Edit Opening Stock)' : 'सुरुवातीची शिल्लक नोंदवा (Declare Opening Balance)'}
          </button>
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
                  <label htmlFor="food-item-select" className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Food Item</label>
                  <select id="food-item-select" required value={foodName} onChange={e => setFoodName(e.target.value)} className="w-full border border-slate-300 p-2 text-sm font-bold bg-white outline-none" title="अन्नधान्य निवडा (Select Food Item)">
                    <option value="">-- Select Item --</option>
                    {menuItems.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="quantity-kg-input" className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Quantity (kg)</label>
                  <input id="quantity-kg-input" type="number" required min="0" step="0.1" value={quantityKg} onChange={e => setQuantityKg(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-slate-300 p-2 text-sm font-bold bg-slate-50/30 outline-none" placeholder="0.00" title="प्रमाण किलोमध्ये (Quantity in kg)" />
                </div>
                <div>
                  <label htmlFor="receipt-date-input" className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Date of Receipt</label>
                  <input id="receipt-date-input" type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="w-full border border-slate-300 p-2 text-sm font-bold bg-slate-50/30 outline-none" title="पावतिची तारीख (Date of Receipt)" placeholder="DD/MM/YYYY" />
                </div>

                {hasPrimary && hasUpperPrimary && (
                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Target Standard Group</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        type="button" 
                        onClick={() => setTargetGroup('primary')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${targetGroup === 'primary' ? 'bg-[#3c8dbc] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Primary (I-V)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTargetGroup('upper_primary')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${targetGroup === 'upper_primary' ? 'bg-[#474379] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Upper (VI-VIII)
                      </button>
                    </div>
                  </div>
                )}

                {foodName && inventory.find(i => i.item_name === foodName && i.standard_group === targetGroup)?.current_balance < 0 && (
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
                <div className="flex items-center gap-3">
                  {hasPrimary && hasUpperPrimary && (
                    <select 
                      value={filterGroup} 
                      onChange={e => setFilterGroup(e.target.value as any)}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[10px] md:text-xs font-bold text-white outline-none cursor-pointer hover:bg-white/20 transition-all"
                      title="साठा फिल्टर करा (Filter stock items)"
                    >
                      <option value="all" className="bg-[#474379] text-white">All Groups</option>
                      <option value="primary" className="bg-[#474379] text-white text-blue-400">Primary (I-V)</option>
                      <option value="upper_primary" className="bg-[#474379] text-white text-amber-400">Upper (VI-VIII)</option>
                    </select>
                  )}
                  <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-1.5 text-[10px] md:text-xs font-bold focus:bg-white/20 focus:border-white/40 outline-none placeholder:text-white/30 transition-all w-24 md:w-48"
                    />
                  </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {fetchLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">Loading metrics...</td></tr>
                    ) : filteredInventory.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">No matching inventory.</td></tr>
                    ) : (
                      filteredInventory.map((inv) => {
                        const monthlyTotal = calculateMonthlyTotal(inv.item_name, inv.standard_group, inv.item_code);
                        const balance = Number(inv.current_balance);
                        const status = getStatusColor(balance);
                        const itemReceipts = monthlyReceipts.filter(r => r.item_name === inv.item_name);
                        const lastReceipt = itemReceipts.length > 0 ? itemReceipts[0].receipt_date : null;
                        const displayDate = lastReceipt ? new Date(lastReceipt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : (inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-');
                        
                        return (
                          <tr key={inv.id} className={`border-b border-slate-200 transition-colors ${status.bg}`}>
                            <td className="p-4 text-[12px] font-bold text-slate-500 border-r border-slate-200">{displayDate}</td>
                            <td className="p-4 border-r border-slate-200">
                              <div className="flex flex-col">
                                <span className="text-[14px] font-extrabold text-slate-800">{inv.item_name}</span>
                                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${inv.standard_group === 'upper_primary' ? 'text-[#474379]' : 'text-[#3c8dbc]'}`}>
                                  {inv.standard_group === 'upper_primary' ? 'Upper (VI-VIII)' : 'Primary (I-V)'}
                                </span>
                              </div>
                            </td>
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
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${status.badge} shadow-sm`}>
                                {balance < 0 ? '⚠️ उसणे बाकी' : status.label}
                              </span>
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
                ) : filteredInventory.length === 0 ? (
                  <div className="p-10 text-center text-xs font-black text-slate-400 uppercase tracking-widest">No matching stock found.</div>
                ) : (
                  filteredInventory
                    .map((inv) => {
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
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${inv.standard_group === 'upper_primary' ? 'bg-[#474379]' : 'bg-[#3c8dbc]'}`}>
                                {inv.standard_group === 'upper_primary' ? 'I-VIII' : 'I-V'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <span className={`text-lg font-black tracking-tighter ${status.text}`}>
                               {balance < 0 ? `-${Math.abs(balance).toFixed(2)}` : balance.toFixed(2)} <span className="text-[10px] uppercase opacity-40">kg</span>
                            </span>
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
                 <select
                   title="अहवालाचा महिना निवडा (Select Report Month)"
                   value={Number(reportMonth.split('-')[1])}
                   onChange={(e) => setReportMonth(`${reportMonth.split('-')[0]}-${String(e.target.value).padStart(2, '0')}`)}
                   className="px-2 py-2 text-sm font-bold rounded text-[#474379] outline-none bg-white"
                 >
                   {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                     <option key={i+1} value={i+1}>{m}</option>
                   ))}
                 </select>
                 <select
                   title="अहवालाचे वर्ष निवडा (Select Report Year)"
                   value={Number(reportMonth.split('-')[0])}
                   onChange={(e) => setReportMonth(`${e.target.value}-${reportMonth.split('-')[1]}`)}
                   className="px-2 py-2 text-sm font-bold rounded text-[#474379] outline-none bg-white"
                 >
                   {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
                 <button onClick={() => window.print()} className="bg-white text-[#474379] hover:bg-slate-100 px-4 py-2 rounded font-bold transition-colors flex items-center gap-2 text-sm shadow-sm"><Printer size={16} /> Print</button>
               </div>
            </div>
            <div className="overflow-x-auto border border-slate-300 mt-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 uppercase text-[11px] font-black text-[#3c8dbc]">
                    <th className="p-3 border-r border-slate-300">Date</th>
                    <th className="p-3 border-r border-slate-300">Item Name</th>
                    <th className="p-3 border-r border-slate-300 text-center">Section</th>
                    <th className="p-3 text-right">Qty (Kg)</th>
                    <th className="p-3 text-center print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReceipts.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-200 text-sm font-bold text-slate-700">
                      <td className="p-3 border-r border-slate-200">{new Date(rec.receipt_date).toLocaleDateString()}</td>
                      <td className="p-3 border-r border-slate-200 uppercase">{foodNameMap[rec.item_name] || rec.item_name}</td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${rec.standard_group === 'upper_primary' ? 'bg-[#474379]' : 'bg-[#3c8dbc]'}`}>
                          {rec.standard_group === 'upper_primary' ? '6-8' : '1-5'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-[#00a65a]">{Number(rec.quantity_kg).toFixed(2)} kg</td>
                      <td className="p-3 text-center print:hidden"><button title="नोंद हटवा (Delete Receipt)" onClick={() => handleDeleteReceipt(rec.id, rec.item_name, rec.quantity_kg)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Opening Balance Modal */}
      {showOpeningModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#474379] uppercase tracking-widest">सुरुवातीची शिल्लक नोंदणी</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Declare Current Opening Balance</p>
              </div>
              <button 
                aria-label="Close modal"
                onClick={() => setShowOpeningModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Month & Year Selection for Opening Balance */}
              <div className="mb-6 p-5 bg-indigo-50/50 border-2 border-indigo-100 rounded-[24px]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 ml-1">महिना (Month)</label>
                    <div className="w-full p-4 text-sm font-black rounded-2xl border-2 border-indigo-200 bg-indigo-100/50 text-indigo-700 flex items-center justify-between">
                      <span>April (एप्रिल)</span>
                      <PackagePlus size={16} className="opacity-40" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="opening-year-select" className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 ml-1">वर्ष (Year)</label>
                    <select 
                      id="opening-year-select"
                      title="वर्ष निवडा (Select Year)"
                      value={openingDate.split('-')[0]}
                      onChange={(e) => setOpeningDate(`${e.target.value}-04-01`)}
                      className="w-full p-4 text-sm font-black rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 transition-all outline-none bg-white text-slate-800"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[9px] font-extrabold text-indigo-400 mt-4 uppercase tracking-wider italic text-center">
                  * हा १ एप्रिल {openingDate.split('-')[0]} चा सुरुवातीचा साठा मानला जाईल. (Opening balance as of April 1st, {openingDate.split('-')[0]})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map(itemName => {
                  const valStr = openingBalances[itemName] || '0';
                  const val = parseFloat(valStr);
                  const isNegative = val < 0;
                  const isPositive = val > 0;
                  
                  return (
                    <div key={itemName} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor={`opening-balance-${itemName}`} className="text-xs font-black text-slate-700 uppercase">{itemName}</label>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                          isPositive ? 'text-green-600 bg-green-50 border-green-100' : 
                          isNegative ? 'text-red-600 bg-red-50 border-red-100' : 
                          'text-slate-400 bg-slate-50 border-slate-100'
                        }`}>
                          {isPositive ? 'In Stock (शिल्लक)' : isNegative ? 'Borrowed (उसणे)' : 'Zero (शून्य)'}
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          id={`opening-balance-${itemName}`}
                          type="number" 
                          step="any"
                          placeholder="0.00"
                          title={`${itemName} ची सुरुवातीची शिल्लक (Opening balance of ${itemName})`}
                          value={openingBalances[itemName] ?? ''}
                          onChange={(e) => setOpeningBalances(prev => ({ ...prev, [itemName]: e.target.value }))}
                          className={`w-full p-2.5 text-sm font-black rounded-lg border transition-all outline-none ${
                            isNegative ? 'border-red-300 bg-red-50 text-red-700' : 
                            isPositive ? 'border-green-300 bg-green-50 text-green-700' : 
                            'border-slate-200 focus:border-[#3c8dbc]'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">KG</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex flex-col gap-6">
                <p className="text-[10px] font-bold text-slate-500 italic text-center md:text-left bg-white/50 p-2 rounded-lg border border-slate-100">
                  टीप: उसणे घेतलेले धान्य दर्शवण्यासाठी वजा (-) चिन्ह वापरा. (उदा. -५)
                </p>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Left Side: Danger Zone */}
                  <button 
                    onClick={async () => {
                      if (!window.confirm("Are you sure? This will delete all your current Opening Balance entries and subtract them from your stock. This cannot be undone.")) return;
                      setLoading(true);
                      try {
                        const { data: openings } = await (api as any)
                          .from('stock_receipts')
                          .select('*')
                          .eq('teacher_id', userId)
                          .eq('bill_no', 'OPENING_BALANCE');
                        
                        if (openings && openings.length > 0) {
                          for (const rec of openings) {
                            const { data: inv } = await (api as any)
                              .from('inventory_stock')
                              .select('id, current_balance')
                              .eq('teacher_id', userId)
                              .or(`item_code.eq."${rec.item_code}",and(item_name.eq."${rec.item_name}",item_code.is.null)`)
                              .maybeSingle();
                            
                            if (inv) {
                              await (api as any)
                                .from('inventory_stock')
                                .update({ current_balance: Number(inv.current_balance) - Number(rec.quantity_kg) })
                                .eq('id', inv.id);
                            }
                            await (api as any).from('stock_receipts').delete().eq('id', rec.id);
                          }
                        }
                        
                        setOpeningBalances({});
                        setMessage({ type: 'success', text: 'Opening balances reset successfully!' });
                        fetchStockData();
                        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                      } catch (err: any) {
                        setMessage({ type: 'error', text: 'Reset Error: ' + err.message });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full md:w-auto px-6 py-3 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 transition-all border-2 border-red-100 rounded-xl flex items-center justify-center gap-2 group"
                  >
                    <Trash2 size={14} className="group-hover:animate-bounce" /> सर्व पुसा (RESET ALL)
                  </button>

                  {/* Right Side: Primary Actions */}
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setShowOpeningModal(false)}
                      className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                      रद्द करा (CANCEL)
                    </button>
                    <button 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const entries = Object.entries(openingBalances).filter(([_, valStr]) => valStr !== '' && valStr !== '0');
                          for (const [name, valStr] of entries) {
                            const val = parseFloat(valStr);
                            if (isNaN(val)) continue;

                            const code = nameToCodeMap[name] || null;
                            const { data: exist } = await (api as any)
                              .from('inventory_stock')
                              .select('id, current_balance')
                              .eq('teacher_id', userId)
                              .or(`item_code.eq."${code}",and(item_name.eq."${name}",item_code.is.null)`)
                              .maybeSingle();
                            
                            const { data: oldReceipt } = await (api as any)
                              .from('stock_receipts')
                              .select('id, quantity_kg')
                              .eq('teacher_id', userId)
                              .or(`item_code.eq."${code}",and(item_name.eq."${name}",item_code.is.null)`)
                              .eq('bill_no', 'OPENING_BALANCE')
                              .maybeSingle();
                            
                            if (oldReceipt) {
                              const balanceAdjustment = val - Number(oldReceipt.quantity_kg);
                              if (exist) {
                                await (api as any).from('inventory_stock').update({ current_balance: Number(exist.current_balance) + balanceAdjustment }).eq('id', exist.id);
                              }
                              await (api as any).from('stock_receipts').update({ quantity_kg: val, receipt_date: openingDate }).eq('id', oldReceipt.id);
                            } else {
                              if (exist) {
                                await (api as any).from('inventory_stock').update({ current_balance: Number(exist.current_balance) + val }).eq('id', exist.id);
                              } else {
                                await (api as any).from('inventory_stock').insert({ 
                                  teacher_id: userId, 
                                  item_name: name, 
                                  item_code: code,
                                  current_balance: val, 
                                  standard_group: 'primary' 
                                });
                              }
                              await (api as any).from('stock_receipts').insert({
                                teacher_id: userId,
                                item_name: name,
                                item_code: code,
                                quantity_kg: val,
                                receipt_date: openingDate,
                                bill_no: 'OPENING_BALANCE',
                                standard_group: 'primary'
                              });
                            }
                          }
                          setMessage({ type: 'success', text: 'Opening balances updated successfully!' });
                          setShowOpeningModal(false);
                          fetchStockData();
                          setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                        } catch (err: any) {
                          setMessage({ type: 'error', text: 'Error saving: ' + err.message });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-emerald-200 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />} जतन करा (SAVE)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}
