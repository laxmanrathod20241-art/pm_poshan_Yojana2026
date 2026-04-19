import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Package, Check, Loader2 } from 'lucide-react';

interface OpeningBalanceFormProps {
  userId: string;
  onSuccess?: () => void;
}

interface StockItem {
  id?: string;
  item_code: string;
  item_name: string;
  current_balance: number;
  standard_group: 'PRIMARY' | 'UPPER_PRIMARY' | 'BOTH';
}

export default function OpeningBalanceForm({ userId, onSuccess }: OpeningBalanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  useEffect(() => {
    if (userId) {
      initData();
    }
  }, [userId]);

  const initData = async () => {
    setFetchLoading(true);
    try {
      const { data: profile } = await (api as any).from('profiles').select('has_primary, has_upper_primary').eq('id', userId).single();

      const { data: menuItems } = await (api as any).from('menu_master').select('item_code, item_name').eq('teacher_id', userId);
      const { data: existingStock } = await (api as any).from('inventory_stock').select('*').eq('teacher_id', userId);

      const items: StockItem[] = [];
      const codes = new Set<string>((menuItems || []).map((m: any) => String(m.item_code)));

      codes.forEach(code => {
        const name = menuItems?.find((m: any) => m.item_code === code)?.item_name || 'Unknown';
        
        // If they have both, we need two entries or handle it as one if table supports single entry?
        // inventory_stock normally has standard_group. 
        if (profile?.has_primary) {
          const existing = existingStock?.find((s: any) => s.item_code === code && s.standard_group === 'PRIMARY');
          items.push({ id: existing?.id, item_code: code, item_name: name, current_balance: existing?.current_balance || 0, standard_group: 'PRIMARY' });
        }
        if (profile?.has_upper_primary) {
          const existing = existingStock?.find((s: any) => s.item_code === code && s.standard_group === 'UPPER_PRIMARY');
          items.push({ id: existing?.id, item_code: code, item_name: name, current_balance: existing?.current_balance || 0, standard_group: 'UPPER_PRIMARY' });
        }
      });

      setStockItems(items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleBalanceChange = (index: number, value: string) => {
    const newItems = [...stockItems];
    newItems[index].current_balance = Number(value);
    setStockItems(newItems);
  };

  const saveBalances = async () => {
    setLoading(true);
    try {
      const payload = stockItems.map(item => ({
        teacher_id: userId,
        item_code: item.item_code,
        item_name: item.item_name,
        current_balance: item.current_balance,
        standard_group: item.standard_group
      }));

      const { error } = await (api as any).from('inventory_stock').upsert(payload, { onConflict: 'teacher_id,item_code,standard_group' });
      if (error) throw error;

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('अयशस्वी: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="flex flex-col items-center justify-center p-12 space-y-4"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 shadow-sm">
        <div className="text-[13px] text-blue-800 font-bold">
          📌 सूचना: तुमच्याकडे सध्या शिल्लक असलेला साठा किलो (KG) मध्ये नोंदवा.
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-[#474379] p-4 text-white font-black text-xs uppercase flex items-center justify-between">
          <div className="flex items-center gap-2"><Package size={16}/> उपलब्ध माल साठा</div>
          <button onClick={saveBalances} disabled={loading} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded font-black text-[10px] uppercase flex items-center gap-2 transition-all">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} जतन करा
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
              <tr>
                <th className="p-4">Item Name (माल/पदार्थाचे नाव)</th>
                <th className="p-4 text-center">Group (स्तर)</th>
                <th className="p-4 w-48 text-right">Current Balance (KG)</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[13px] font-bold text-slate-700">
              {stockItems.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">कृपया आधी 'मेनू सेटिंग्ज' पायरीवर आयटम जोडा.</td></tr>
              ) : (
                stockItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">{item.item_name}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${item.standard_group === 'PRIMARY' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {item.standard_group === 'PRIMARY' ? 'Std 1-5' : 'Std 6-8'}
                      </span>
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" step="0.001" min="0" 
                        title={`Current Balance for ${item.item_name}`}
                        aria-label="Current Balance"
                        placeholder="0.000"
                        value={item.current_balance} 
                        onChange={e => handleBalanceChange(idx, e.target.value)}
                        className="w-full border p-2 text-right font-black text-slate-900 focus:border-blue-500 outline-none bg-slate-50/50"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
