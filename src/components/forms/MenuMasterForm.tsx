import React, { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Trash2, Loader2, Edit2 } from 'lucide-react';
import { getMarathiQuantityWord } from '../../utils/inventoryUtils';

interface FoodOption {
  code: string;
  name: string;
  nameEn?: string;
  type: 'global' | 'local';
  item_category: 'MAIN' | 'INGREDIENT';
}

interface MenuItem {
  id: string;
  item_name: string;
  item_code: string;
  grams_primary: number;
  grams_upper_primary: number;
  source: 'global' | 'local';
  item_category?: 'MAIN' | 'INGREDIENT';
  sort_rank?: number;
}

interface MenuMasterFormProps {
  userId: string;
  onSuccess?: () => void;
}

export default function MenuMasterForm({ userId, onSuccess }: MenuMasterFormProps) {
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saveRanksLoading, setSaveRanksLoading] = useState(false);
  const [saveRanksSuccess, setSaveRanksSuccess] = useState(false);

  const [selectedCode, setSelectedCode] = useState('');
  const [gramsPrimary, setGramsPrimary] = useState<number | ''>('');
  const [gramsUpperPrimary, setGramsUpperPrimary] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFoodCode, setCustomFoodCode] = useState('');
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodNameEn, setCustomFoodNameEn] = useState('');
  const [customFoodCategory] = useState<'MAIN' | 'INGREDIENT'>('INGREDIENT');
  const [isCustomValidated, setIsCustomValidated] = useState(false);
  const [, setCustomLoading] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (userId) {
      fetchFoodOptions();
      fetchMenu();
      fetchConfiguration();
    }
  }, [userId]);

  const fetchFoodOptions = async () => {
    if (!userId) return;
    setListLoading(true);
    try {
      const [{ data: globalData }, { data: localData }] = await Promise.all([
        api.from('global_food_master').select('code, name, name_en, item_category').order('name'),
        api.from('local_food_master').select('local_code, name, name_en, item_category').eq('teacher_id', userId).order('name'),
      ]);

      const global: FoodOption[] = (globalData || []).map((g: any) => ({
        code: g.code,
        name: g.name,
        nameEn: g.name_en,
        type: 'global',
        item_category: g.item_category || 'MAIN',
      }));

      const local: FoodOption[] = (localData || []).map((l: any) => ({
        code: l.local_code,
        name: l.name,
        nameEn: l.name_en,
        type: 'local',
        item_category: l.item_category || 'INGREDIENT',
      }));

      setFoodOptions([...global, ...local]);
    } catch (err: any) {
      console.error('Error fetching food options:', err.message);
    } finally {
      setListLoading(false);
    }
  };

  const fetchMenu = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data, error } = await (api as any)
        .from('menu_master')
        .select('*')
        .eq('teacher_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching menu:', err.message);
    } finally {
      setFetchLoading(false);
    }
  };
  
  const fetchConfiguration = async () => {
    if (!userId) return;
    try {
      const { data } = await (api as any)
        .from('profiles')
        .select('has_primary, has_upper_primary')
        .eq('id', userId)
        .single();
      
      if (data) {
        setHasPrimary(data.has_primary ?? true);
        setHasUpperPrimary(data.has_upper_primary ?? true);
      }
    } catch (err) { console.error(err); }
  };

  const handleValidateCustom = () => {
    if (!customFoodName.trim() || !customFoodNameEn.trim()) {
      setMessage({ type: 'error', text: 'कृपया मराठी आणि इंग्रजी दोन्ही नावे भरा.' });
      return;
    }

    const mrName = customFoodName.trim().toLowerCase();
    const enName = customFoodNameEn.trim().toLowerCase();
    const baseCode = customFoodNameEn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const generatedCode = `L_${baseCode}`;
    setCustomFoodCode(generatedCode);

    const duplicate = foodOptions.find(f => 
      f.code === generatedCode ||
      f.name.toLowerCase() === mrName || 
      (f.nameEn && f.nameEn.toLowerCase() === enName)
    );

    if (duplicate) {
      setMessage({ type: 'error', text: `हा पदार्थ किंवा कोड (${generatedCode}) आधीच यादीत आहे.` });
      setIsCustomValidated(false);
    } else {
      setMessage({ type: 'success', text: `कोड '${generatedCode}' पडताळला! आता जतन करू शकता.` });
      setIsCustomValidated(true);
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleCustomNameChange = (val: string, lang: 'mr' | 'en') => {
    if (lang === 'mr') setCustomFoodName(val);
    else setCustomFoodNameEn(val);
    setCustomFoodCode('');
    setIsCustomValidated(false);
  };


  const handleEditClick = (item: MenuItem) => {
    setSelectedCode(item.item_code);
    setGramsPrimary(item.grams_primary / 1000);
    setGramsUpperPrimary(item.grams_upper_primary / 1000);
    setEditingItem(item);
    setMessage({ type: '', text: '' });
  };


  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const pVal = hasPrimary ? gramsPrimary : 0;
    const uVal = hasUpperPrimary ? gramsUpperPrimary : 0;

    if (!userId || !selectedCode || (hasPrimary && gramsPrimary === '') || (hasUpperPrimary && gramsUpperPrimary === '')) {
      setMessage({ type: 'error', text: 'कृपया सर्व माहिती भरा.' });
      return;
    }

    const selectedFood = foodOptions.find(f => f.code === selectedCode);
    if (!selectedFood && !editingItem) return;

    setLoading(true);
    try {
      const payload = {
        teacher_id: userId,
        item_name: editingItem ? editingItem.item_name : selectedFood!.name,
        item_code: selectedCode,
        grams_primary: Number(pVal) * 1000,
        grams_upper_primary: Number(uVal) * 1000,
        source: editingItem ? editingItem.source : selectedFood!.type,
        item_category: editingItem ? editingItem.item_category : selectedFood!.item_category,
        sort_rank: editingItem ? editingItem.sort_rank : 999
      };

      if (editingItem) {
        const { error } = await (api as any).from('menu_master').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        setMessage({ type: 'success', text: `"${editingItem.item_name}" अपडेट केले.` });
      } else {
        const { error } = await (api as any).from('menu_master').insert(payload);
        if (error) throw error;
        setMessage({ type: 'success', text: `"${selectedFood!.name}" यादीत जोडले.` });
      }

      setEditingItem(null);
      setSelectedCode('');
      setGramsPrimary('');
      setGramsUpperPrimary('');
      fetchMenu();
      if (onSuccess) onSuccess();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'अपयश: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const addCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isCustomValidated) return;
    setCustomLoading(true);
    try {
      const { data, error } = await (api as any)
        .from('local_food_master')
        .insert({ 
          teacher_id: userId, 
          local_code: customFoodCode,
          name: customFoodName.trim(),
          name_en: customFoodNameEn.trim(),
          item_category: customFoodCategory
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('No data returned.');
      setFoodOptions(prev => [...prev, { code: data.local_code, name: data.name, nameEn: data.name_en, type: 'local', item_category: data.item_category }]);
      setSelectedCode(data.local_code); 
      setCustomFoodName('');
      setCustomFoodNameEn('');
      setIsCustomValidated(false);
      setShowCustomForm(false);
      setMessage({ type: 'success', text: `"${data.name}" यशस्वीरित्या जोडले.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'जोडणे अयशस्वी: ' + err.message });
    } finally {
      setCustomLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('हा आयटम काढायचा आहे का?')) return;
    try {
      const { error } = await (api as any).from('menu_master').delete().eq('id', id);
      if (error) throw error;
      fetchMenu();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'हटवणे अयशस्वी: ' + err.message });
    }
  };

  const updateRank = (id: string, newRank: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, sort_rank: newRank } : item));
    setSaveRanksSuccess(false);
  };

  const handleSaveAllRanks = async () => {
    setSaveRanksLoading(true);
    try {
      const payload = items.map(item => ({
        id: item.id,
        sort_rank: item.sort_rank ?? 999
      }));

      await api.patch('/data/menu_master/bulk', payload);
      setSaveRanksSuccess(true);
      setMessage({ type: 'success', text: 'सर्व क्रम यशस्वीरित्या जतन केले!' });
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSaveRanksSuccess(false);
        setMessage({ type: '', text: '' });
      }, 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'क्रम जतन करणे अयशस्वी: ' + err.message });
    } finally {
      setSaveRanksLoading(false);
    }
  };

  // Derived state for available options (filter out items already in the menu)
  const availableOptions = foodOptions.filter(option => 
    !items.some(item => item.item_code === option.code) || 
    (editingItem && editingItem.item_code === option.code)
  );

  const globalOptions = availableOptions.filter(f => f.type === 'global');
  const localOptions  = availableOptions.filter(f => f.type === 'local');
  const mainFoods = items.filter(item => item.item_category === 'MAIN');
  const ingredients = items.filter(item => item.item_category === 'INGREDIENT');

  if (fetchLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {message.text && (
        <div className={`p-4 text-[13px] font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-black text-[#474379] mb-4 border-b pb-2 uppercase tracking-wider">दैनिक मेनूमध्ये आयटम जोडा</h3>
        
        {/* Informational Banner */}
        <div className="bg-blue-50/50 border border-blue-200/50 p-6 mb-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <p className="text-[13px] font-black text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-red-500 animate-pulse">★</span> महत्वाची सूचना: कृपया प्रमाण किलो (KG) मध्ये भरा.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex items-center justify-between border-b border-blue-100 pb-1">
              <span className="text-[11px] font-bold text-slate-600">१०० ग्रॅम भरायचे असल्यास</span>
              <span className="text-[11px] font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">०.१००००</span>
            </div>
            <div className="flex items-center justify-between border-b border-blue-100 pb-1">
              <span className="text-[11px] font-bold text-slate-600">२० ग्रॅम भरायचे असल्यास</span>
              <span className="text-[11px] font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">०.०२०००</span>
            </div>
            <div className="flex items-center justify-between border-b border-blue-100 pb-1">
              <span className="text-[11px] font-bold text-slate-600">१ ग्रॅम भरायचे असल्यास</span>
              <span className="text-[11px] font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">०.००१००</span>
            </div>
            <div className="flex items-center justify-between border-b border-blue-100 pb-1">
              <span className="text-[11px] font-bold text-slate-600">२० मिलीग्रॅम (मोहरी, जिरे इ.)</span>
              <span className="text-[11px] font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">०.००००२</span>
            </div>
          </div>
        </div>
        
        <form onSubmit={addItem} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">खाद्यपदार्थ निवडा</label>
              <div className="flex gap-2">
                <select
                  required value={selectedCode} onChange={e => setSelectedCode(e.target.value)}
                  title="Select Food Item" aria-label="Select Food Item"
                  disabled={listLoading || !!editingItem}
                  className="flex-1 border border-slate-300 p-2.5 text-sm font-bold focus:border-[#474379] outline-none bg-white rounded-none"
                >
                  <option value="">{listLoading ? 'लोड होत आहे...' : '-- निवडा --'}</option>
                  {globalOptions.length > 0 && <optgroup label="🏛️ शासकीय यादी">{globalOptions.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}</optgroup>}
                  {localOptions.length > 0 && <optgroup label="📌 माझी यादी">{localOptions.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}</optgroup>}
                </select>
                {!editingItem && (
                  <button type="button" onClick={() => setShowCustomForm(true)} className="border-2 border-[#3c8dbc] text-[#3c8dbc] hover:bg-[#3c8dbc] hover:text-white px-4 py-2 font-black text-[10px] uppercase tracking-widest transition-all">
                    + New
                  </button>
                )}
              </div>
            </div>

            <div className={`grid ${hasPrimary && hasUpperPrimary ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full md:w-64`}>
              {hasPrimary && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Std 1-5 (KG)</label>
                  <input type="number" required min="0" step="0.00001" value={gramsPrimary} onChange={e => setGramsPrimary(e.target.value === '' ? '' : Number(e.target.value))} title="Primary Grams" aria-label="Primary Grams" placeholder="0.00" className="w-full border border-slate-300 p-2.5 text-sm font-black" />
                  {gramsPrimary !== '' && <p className="text-[10px] font-bold text-green-600 mt-1 italic flex items-center gap-1">↓ म्हणजे: <span className="underline">{Number(gramsPrimary) * 1000}</span> ग्रॅम</p>}
                </div>
              )}
              {hasUpperPrimary && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Std 6-8 (KG)</label>
                  <input type="number" required min="0" step="0.00001" value={gramsUpperPrimary} onChange={e => setGramsUpperPrimary(e.target.value === '' ? '' : Number(e.target.value))} title="Upper Primary Grams" aria-label="Upper Primary Grams" placeholder="0.00" className="w-full border border-slate-300 p-2.5 text-sm font-black" />
                  {gramsUpperPrimary !== '' && <p className="text-[10px] font-bold text-green-600 mt-1 italic flex items-center gap-1">↓ म्हणजे: <span className="underline">{Number(gramsUpperPrimary) * 1000}</span> ग्रॅम</p>}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !selectedCode} className={`w-full md:w-auto text-white px-8 py-2.5 font-black uppercase tracking-widest h-[46px] ${editingItem ? 'bg-blue-600' : 'bg-green-600'}`}>
              {editingItem ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-black text-[#474379] uppercase tracking-wider">मेनू आयटम आणि क्रम (Rank)</h3>
        <button
          onClick={handleSaveAllRanks}
          disabled={saveRanksLoading}
          className={`flex items-center gap-2 px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all shadow-md ${
            saveRanksSuccess 
              ? 'bg-green-600 text-white' 
              : 'bg-[#474379] hover:bg-[#36325c] text-white'
          } disabled:opacity-50`}
        >
          {saveRanksLoading ? (
            <><Loader2 className="animate-spin" size={14} /> जतन करत आहे...</>
          ) : saveRanksSuccess ? (
            '✓ जतन केले (Saved)'
          ) : (
            'क्रम जतन करा (Save Ranks)'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {[ { title: 'Main Foods', list: mainFoods, color: '#474379' }, { title: 'Ingredients', list: ingredients, color: '#3c8dbc' } ].map((group, idx) => (
          <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <div className={`p-3 text-white font-black text-xs uppercase ${group.color === '#474379' ? 'bg-[#474379]' : 'bg-[#3c8dbc]'}`}>{group.title} ({group.list.length})</div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                <tr>
                  <th className="p-3 w-16">RANK (क्रम)</th>
                  <th className="p-3">Item</th>
                  {hasPrimary && <th className="p-3 text-right">Std 1-5</th>}
                  {hasUpperPrimary && <th className="p-3 text-right">Std 6-8</th>}
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[13px] font-bold text-slate-700">
                {group.list
                  .sort((a, b) => (a.sort_rank ?? 999) - (b.sort_rank ?? 999))
                  .map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <input 
                        type="number" 
                        className="w-14 border border-slate-200 p-1 text-[11px] font-black text-center focus:border-blue-500 outline-none"
                        value={item.sort_rank ?? ''}
                        onChange={(e) => updateRank(item.id, parseInt(e.target.value) || 0)}
                        title="Sort Rank"
                      />
                    </td>
                    <td className="p-3">{item.item_name}</td>
                    {hasPrimary && (
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold">{(item.grams_primary / 1000).toFixed(4)}</span>
                          <span className="text-[10px] text-slate-400 font-bold italic">({getMarathiQuantityWord(item.grams_primary / 1000)})</span>
                        </div>
                      </td>
                    )}
                    {hasUpperPrimary && <td className="p-3 text-right">{(item.grams_upper_primary / 1000).toFixed(4)}</td>}
                    <td className="p-3 flex justify-center gap-2">
                       <button title="Edit Item" aria-label="Edit Item" onClick={() => handleEditClick(item)} className="text-slate-300 hover:text-blue-600"><Edit2 size={14}/></button>
                       <button title="Delete Item" aria-label="Delete Item" onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showCustomForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h4 className="text-sm font-black text-[#3c8dbc] uppercase mb-4">नवीन पदार्थ जोडा</h4>
            <div className="space-y-4">
               <input placeholder="नाव (Marathi)" value={customFoodName} onChange={e => handleCustomNameChange(e.target.value, 'mr')} className="w-full border p-2.5 font-bold" />
               <input placeholder="Name (English)" value={customFoodNameEn} onChange={e => handleCustomNameChange(e.target.value, 'en')} className="w-full border p-2.5 font-bold" />
               <div className="flex gap-2">
                  <button onClick={handleValidateCustom} className="flex-1 border-2 border-[#3c8dbc] text-[#3c8dbc] font-black p-2 text-xs uppercase">Validate</button>
                  <button onClick={addCustomFood} disabled={!isCustomValidated} className="flex-1 bg-green-600 text-white font-black p-2 text-xs uppercase disabled:opacity-50">Save</button>
               </div>
               <button onClick={() => setShowCustomForm(false)} className="w-full bg-slate-100 text-slate-500 font-black p-2 text-xs uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
