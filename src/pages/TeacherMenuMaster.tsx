import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { Trash2, PlusCircle, X, Check, Loader2, Search, Edit2 } from 'lucide-react';

// Combined food item for the dropdown
interface FoodOption {
  code: string;
  name: string;
  nameEn?: string;
  type: 'global' | 'local';
  item_category: 'MAIN' | 'INGREDIENT';
}

// A configured menu entry saved in menu_master
interface MenuItem {
  id: string;
  item_name: string;
  item_code: string;
  grams_primary: number;
  grams_upper_primary: number;
  source: 'global' | 'local';
  item_category?: 'MAIN' | 'INGREDIENT';
}

export default function TeacherMenuMaster() {
  const [userId, setUserId] = useState<string | null>(null);

  // Combined dropdown list state
  const [foodOptions, setFoodOptions] = useState<FoodOption[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Configured menu items table
  const [items, setItems] = useState<MenuItem[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Main form
  const [selectedCode, setSelectedCode] = useState('');
  const [gramsPrimary, setGramsPrimary] = useState<number | ''>('');
  const [gramsUpperPrimary, setGramsUpperPrimary] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Section Configuration
  const [hasPrimary, setHasPrimary] = useState<boolean>(true);
  const [hasUpperPrimary, setHasUpperPrimary] = useState<boolean>(true);

  // Add Custom Food (local_food_master) modal state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFoodCode, setCustomFoodCode] = useState('');
  const [customFoodName, setCustomFoodName] = useState('');
  const [customFoodNameEn, setCustomFoodNameEn] = useState('');
  const [customFoodCategory, setCustomFoodCategory] = useState<'MAIN' | 'INGREDIENT'>('INGREDIENT');
  const [isCustomValidated, setIsCustomValidated] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchFoodOptions();
      fetchMenu();
      fetchConfiguration();
    }
  }, [userId]);

  // ── Fetch combined dropdown list ──────────────────────────────────
  const fetchFoodOptions = async () => {
    if (!userId) return;
    setListLoading(true);
    try {
      const [{ data: globalData }, { data: localData }] = await Promise.all([
        supabase.from('global_food_master').select('code, name, name_en, item_category').order('name'),
        supabase.from('local_food_master').select('local_code, name, name_en, item_category').eq('teacher_id', userId).order('name'),
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

  // ── Fetch configured menu entries ────────────────────────────────
  const fetchMenu = async () => {
    if (!userId) return;
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
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
      const { data } = await (supabase as any)
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

  // ── Validation logic for custom food ──────────────────────────────
  const handleValidateCustom = () => {
    if (!customFoodName.trim() || !customFoodNameEn.trim()) {
      setMessage({ type: 'error', text: 'कृपया मराठी आणि इंग्रजी दोन्ही नावे भरा.' });
      return;
    }

    const mrName = customFoodName.trim().toLowerCase();
    const enName = customFoodNameEn.trim().toLowerCase();
    
    // Generate Code
    const baseCode = customFoodNameEn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const generatedCode = `L_${baseCode}`;
    setCustomFoodCode(generatedCode);

    // Check against all existing options (global + local)
    const duplicate = foodOptions.find(f => 
      f.code === generatedCode ||
      f.name.toLowerCase() === mrName || 
      (f.nameEn && f.nameEn.toLowerCase() === enName)
    );

    if (duplicate) {
      setMessage({ 
        type: 'error', 
        text: `हा पदार्थ किंवा कोड (${generatedCode}) आधीच यादीत आहे.` 
      });
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
    setIsCustomValidated(false); // require re-validation if they change anything
  };

  const formatCalibrationValue = (val: number | string) => {
    if (val === '' || val === 0) return null;
    const num = Number(val);
    if (isNaN(num) || num < 0) return null;
    
    if (num >= 0.001) {
      return `${(num * 1000).toLocaleString('mr-IN', { maximumFractionDigits: 2 })} ग्रॅम`;
    } else if (num > 0) {
      return `${(num * 1000000).toLocaleString('mr-IN', { maximumFractionDigits: 2 })} मिलीग्रॅम`;
    }
    return null;
  };

  const handleEditClick = (item: MenuItem) => {
    setSelectedCode(item.item_code);
    setGramsPrimary(item.grams_primary / 1000);
    setGramsUpperPrimary(item.grams_upper_primary / 1000);
    setEditingItem(item);
    setMessage({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setSelectedCode('');
    setGramsPrimary('');
    setGramsUpperPrimary('');
    setMessage({ type: '', text: '' });
  };

  // ── Add item to menu_master ──────────────────────────────────────
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate only enabled sections
    const pVal = hasPrimary ? gramsPrimary : 0;
    const uVal = hasUpperPrimary ? gramsUpperPrimary : 0;

    if (!userId || !selectedCode || (hasPrimary && gramsPrimary === '') || (hasUpperPrimary && gramsUpperPrimary === '')) {
      setMessage({ type: 'error', text: 'कृपया सर्व माहिती भरा.' });
      return;
    }

    const selectedFood = foodOptions.find(f => f.code === selectedCode);
    if (!selectedFood && !editingItem) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        teacher_id: userId,
        item_name: editingItem ? editingItem.item_name : selectedFood!.name,
        item_code: selectedCode,
        grams_primary: Number(pVal) * 1000,
        grams_upper_primary: Number(uVal) * 1000,
        source: editingItem ? editingItem.source : selectedFood!.type,
        item_category: editingItem ? editingItem.item_category : selectedFood!.item_category
      };

      if (editingItem) {
        const { error } = await (supabase as any)
          .from('menu_master')
          .update(payload)
          .eq('id', editingItem.id)
          .eq('teacher_id', userId);
        if (error) throw error;
        setMessage({ type: 'success', text: `"${editingItem.item_name}" अपडेट केले.` });
      } else {
        const { error } = await (supabase as any).from('menu_master').insert(payload);
        if (error) throw error;
        setMessage({ type: 'success', text: `"${selectedFood!.name}" यादीत जोडले.` });
      }

      setEditingItem(null);
      setSelectedCode('');
      setGramsPrimary('');
      setGramsUpperPrimary('');
      fetchMenu();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: (editingItem ? 'अपडेट' : 'जोडणे') + ' अयशस्वी: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Add custom food to local_food_master ─────────────────────────
  const addCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isCustomValidated) return;

    setCustomLoading(true);
    try {
      const { data, error } = await (supabase as any)
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

      // Update dropdown options
      const newOption: FoodOption = { 
        code: data.local_code, 
        name: data.name, 
        nameEn: data.name_en, 
        type: 'local',
        item_category: data.item_category
      };
      setFoodOptions(prev => [...prev, newOption]);
      setSelectedCode(data.local_code); 

      // Reset form
      setCustomFoodName('');
      setCustomFoodNameEn('');
      setIsCustomValidated(false);
      setShowCustomForm(false);
      setMessage({ type: 'success', text: `"${data.name}" यशस्वीरित्या जोडले.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'जोडणे अयशस्वी: ' + err.message });
    } finally {
      setCustomLoading(false);
    }
  };

  // ── Delete from menu_master ──────────────────────────────────────
  const deleteItem = async (id: string) => {
    if (!window.confirm('हा आयटम काढायचा आहे का?')) return;
    try {
      const { error } = await supabase
        .from('menu_master')
        .delete()
        .eq('id', id)
        .eq('teacher_id', userId!);
      if (error) throw error;
      fetchMenu();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'हटवणे अयशस्वी: ' + err.message });
    }
  };

  const globalOptions = foodOptions.filter(f => f.type === 'global');
  const localOptions  = foodOptions.filter(f => f.type === 'local');

  // Derived filtered arrays for the tables
  const mainFoods = items.filter(item => item.item_category === 'MAIN');
  const ingredients = items.filter(item => item.item_category === 'INGREDIENT');

  return (
    <Layout>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative mt-6">

        {/* Page Header */}


        {/* Status Message */}
        {message.text && (
          <div className={`mb-6 p-3.5 text-[13px] font-bold border ${
            message.type === 'success'
              ? 'bg-[#00a65a]/10 text-[#00a65a] border-[#00a65a]/30'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {message.type === 'success' ? '✓ ' : '✕ '}{message.text}
          </div>
        )}

        {/* ── Main Data Entry Card ─────────────────────────── */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 mb-6">
          <h3 className="text-sm font-extrabold text-[#474379] mb-4 border-b border-slate-200 pb-2 uppercase tracking-wider">
            दैनिक मेनूमध्ये आयटम जोडा
          </h3>

          {/* conversion advice banner */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 shadow-sm">
            <div className="text-[13px] text-blue-800">
              <p className="font-bold mb-1">📌 महत्त्वाची सूचना: कृपया प्रमाण किलो (KG) मध्येच भरा.</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><strong>१०० ग्रॅम</strong> भरायचे असल्यास <strong>0.10000</strong> लिहा.</li>
                <li><strong>२० ग्रॅम</strong> भरायचे असल्यास <strong>0.02000</strong> लिहा.</li>
                <li><strong>१ ग्रॅम</strong> भरायचे असल्यास <strong>0.00100</strong> लिहा.</li>
                <li><strong>२० मिलीग्रॅम</strong> (मोहरी/जिरे इ.) भरायचे असल्यास <strong>0.00002</strong> लिहा.</li>
              </ul>
            </div>
          </div>

          <form onSubmit={addItem}>
            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                  खाद्यपदार्थ निवडा
                </label>
                <div className="flex gap-2">
                  <select
                    required
                    value={selectedCode}
                    onChange={e => setSelectedCode(e.target.value)}
                    disabled={listLoading || !!editingItem}
                    title="खाद्यपदार्थ निवडा (Select Food Item)"
                    className="flex-1 border border-slate-300 p-2.5 text-sm font-bold focus:outline-none focus:border-[#474379] focus:ring-1 focus:ring-[#474379] text-slate-700 bg-white disabled:bg-slate-100 rounded-none shadow-sm"
                  >
                    <option value="">
                      {listLoading ? 'यादी लोड होत आहे...' : '-- निवडा --'}
                    </option>
                    {globalOptions.length > 0 && (
                      <optgroup label="🏛️ शासकीय यादी">
                        {globalOptions.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}
                      </optgroup>
                    )}
                    {localOptions.length > 0 && (
                      <optgroup label="📌 माझी यादी">
                        {localOptions.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(true)}
                    className="flex-shrink-0 border-2 border-[#3c8dbc] text-[#3c8dbc] hover:bg-[#3c8dbc] hover:text-white px-5 py-2.5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    <PlusCircle size={14} strokeWidth={3} /> नवीन जोडा (+ New)
                  </button>
                </div>
              </div>

              <div className={`w-full md:w-64 grid ${hasPrimary && hasUpperPrimary ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {hasPrimary && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                      Std 1-5 (KG)
                    </label>
                    <input
                      type="number" required min="0" step="0.00001" value={gramsPrimary}
                      onChange={e => setGramsPrimary(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-300 p-2.5 text-sm font-black text-slate-700 focus:outline-none focus:border-[#474379] focus:ring-1 focus:ring-[#474379] rounded-none shadow-sm bg-slate-50/30"
                      placeholder="0.00500"
                    />
                    {gramsPrimary !== '' && (
                      <div className="text-[10px] text-green-600 font-black mt-1 bg-green-50 px-2 py-0.5 border border-green-100 italic">
                        ↳ म्हणजे: {formatCalibrationValue(gramsPrimary)}
                      </div>
                    )}
                  </div>
                )}
                {hasUpperPrimary && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                      Std 6-8 (KG)
                    </label>
                    <input
                      type="number" required min="0" step="0.00001" value={gramsUpperPrimary}
                      onChange={e => setGramsUpperPrimary(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full border border-slate-300 p-2.5 text-sm font-black text-slate-700 focus:outline-none focus:border-[#474379] focus:ring-1 focus:ring-[#474379] rounded-none shadow-sm bg-slate-50/30"
                      placeholder="0.01000"
                    />
                    {gramsUpperPrimary !== '' && (
                      <div className="text-[10px] text-green-600 font-black mt-1 bg-green-50 px-2 py-0.5 border border-green-100 italic">
                        ↳ म्हणजे: {formatCalibrationValue(gramsUpperPrimary)}
                      </div>
                    )}
                  </div>
                )}
              </div>

               <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="submit" disabled={loading || !selectedCode}
                  className={`flex-1 md:w-auto text-white px-8 py-2.5 font-black uppercase tracking-widest transition-all shadow-md active:scale-95 text-[11px] h-[46px] ${editingItem ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#00a65a] hover:bg-[#008d4c]'}`}
                >
                  {loading ? 'Processing...' : editingItem ? 'Update Item' : 'Add to Active Menu'}
                </button>
                {editingItem && (
                  <button
                    type="button" onClick={cancelEdit}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 font-black uppercase tracking-widest transition-all shadow-sm text-[11px] h-[46px]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* ── Inline Custom Food Form (WITH VALIDATION) ────────────────── */}
          {showCustomForm && (
            <div className="mt-6 border-t-2 border-dashed border-slate-200 pt-6 animate-in fade-in duration-300">
              <div className="bg-slate-50 border border-slate-200 p-5 relative">
                <button 
                  onClick={() => setShowCustomForm(false)} 
                  title="फॉर्म बंद करा (Close Form)"
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
                
                <h4 className="text-sm font-extrabold text-[#3c8dbc] uppercase tracking-wide mb-4 flex items-center gap-2">
                   नवीन पदार्थ 'माझ्या यादीत' समाविष्ट करा
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">नाव (Marathi)</label>
                    <input
                      type="text" value={customFoodName}
                      onChange={e => handleCustomNameChange(e.target.value, 'mr')}
                      className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:border-[#3c8dbc] outline-none"
                      placeholder="उदा: बटाटा भाजी"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Name (English)</label>
                    <input
                      type="text" value={customFoodNameEn}
                      onChange={e => handleCustomNameChange(e.target.value, 'en')}
                      className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:border-[#3c8dbc] outline-none"
                      placeholder="e.g. Potato Sabji"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">श्रेणी (Category)</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 cursor-pointer transition-all ${customFoodCategory === 'MAIN' ? 'border-[#3c8dbc] bg-blue-50 text-[#3c8dbc]' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      <input 
                        type="radio" name="category" value="MAIN" className="hidden"
                        checked={customFoodCategory === 'MAIN'} onChange={() => setCustomFoodCategory('MAIN')}
                      />
                      <span className="text-xs font-black uppercase">Main Food (मुख्य अन्न)</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 cursor-pointer transition-all ${customFoodCategory === 'INGREDIENT' ? 'border-slate-400 bg-slate-100 text-slate-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      <input 
                        type="radio" name="category" value="INGREDIENT" className="hidden"
                        checked={customFoodCategory === 'INGREDIENT'} onChange={() => setCustomFoodCategory('INGREDIENT')}
                      />
                      <span className="text-xs font-black uppercase">Ingredient (साहित्य)</span>
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">System Generated ID</label>
                  <input
                    type="text" readOnly value={customFoodCode}
                    className="w-full border border-slate-200 p-2.5 text-sm font-mono font-bold bg-slate-100 text-slate-500 uppercase cursor-not-allowed"
                    placeholder="उदा: L_BATATA (पडताळणीनंतर कोड तयार होईल)"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button" onClick={handleValidateCustom}
                    className="flex-1 bg-white border-2 border-[#3c8dbc] text-[#3c8dbc] font-bold py-2 px-4 text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Search size={16} /> तपासा आणि पडताळणी करा (Validate)
                  </button>
                  <button
                    type="button" onClick={addCustomFood} disabled={!isCustomValidated || customLoading}
                    className="flex-1 bg-[#00a65a] disabled:bg-slate-300 text-white font-bold py-2 px-4 text-sm hover:bg-[#008d4c] transition-colors flex items-center justify-center gap-2"
                  >
                    {customLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    माझ्या यादीत जतन करा
                  </button>
                </div>
                {!isCustomValidated && (
                  <p className="text-[10px] text-slate-500 mt-3 italic">
                    * प्रथम 'पडताळणी करा' वर क्लिक करा. माहिती बरोबर असल्यासच 'जतन करा' बटण सुरू होईल.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Side-by-Side Tables Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Table 1: Main Foods */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-lg">
            <div className="bg-[#474379] p-3 flex justify-between items-center text-white text-[12px] font-bold uppercase tracking-wider">
               <span>Main Foods (मुख्य अन्न)</span>
               <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{mainFoods.length} Items</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#474379] uppercase text-left w-1/2 tracking-tighter">आयटम (Food Item)</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#474379] uppercase text-center w-20 tracking-tighter">स्त्रोत</th>
                    {hasPrimary && <th className="py-2.5 px-3 text-[10px] font-black text-[#474379] uppercase text-right w-24 tracking-tighter leading-none">१ ली - ५ वी <br/><span className="text-[8px] opacity-70">(KG)</span></th>}
                    {hasUpperPrimary && <th className="py-2.5 px-3 text-[10px] font-black text-[#474379] uppercase text-right w-24 tracking-tighter leading-none">६ वी - ८ वी <br/><span className="text-[8px] opacity-70">(KG)</span></th>}
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#474379] uppercase text-center w-20 tracking-tighter">अ‍ॅक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={3 + (hasPrimary ? 1 : 0) + (hasUpperPrimary ? 1 : 0)} className="p-8 text-center text-slate-400 text-xs italic">लोड होत आहे...</td></tr>
                  ) : mainFoods.length === 0 ? (
                    <tr><td colSpan={3 + (hasPrimary ? 1 : 0) + (hasUpperPrimary ? 1 : 0)} className="p-8 text-center text-slate-400 text-xs italic">अजून कोणतेही मुख्य अन्न जोडले नाही.</td></tr>
                  ) : (
                    mainFoods.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-2 px-3">
                          <span className="text-[13px] font-bold text-slate-700">{item.item_name}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${item.source==='global'?'bg-indigo-50 text-indigo-700 border border-indigo-100':'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            {item.source==='global'?'Govt':'Local'}
                          </span>
                        </td>
                        {hasPrimary && <td className="py-2 px-3 text-[12px] font-black text-slate-600 text-right">{(item.grams_primary / 1000).toFixed(5)}</td>}
                        {hasUpperPrimary && <td className="py-2 px-3 text-[12px] font-black text-slate-600 text-right">{(item.grams_upper_primary / 1000).toFixed(5)}</td>}
                        <td className="py-2 px-3 text-center flex items-center justify-center gap-2">
                          <button onClick={()=>handleEditClick(item)} title="बदल करा (Edit Item)" className="text-slate-300 hover:text-blue-600 p-1 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={()=>deleteItem(item.id)} title="काढून टाका (Delete Item)" className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Ingredients */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-lg">
            <div className="bg-[#3c8dbc] p-3 flex justify-between items-center text-white text-[12px] font-bold uppercase tracking-wider">
               <span>Ingredients (साहित्य)</span>
               <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{ingredients.length} Items</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#3c8dbc] uppercase text-left w-1/2 tracking-tighter">साहित्य (Ingredient)</th>
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#3c8dbc] uppercase text-center w-20 tracking-tighter">स्त्रोत</th>
                    {hasPrimary && <th className="py-2.5 px-3 text-[10px] font-black text-[#3c8dbc] uppercase text-right w-24 tracking-tighter leading-none">१ ली - ५ वी <br/><span className="text-[8px] opacity-70">(KG)</span></th>}
                    {hasUpperPrimary && <th className="py-2.5 px-3 text-[10px] font-black text-[#3c8dbc] uppercase text-right w-24 tracking-tighter leading-none">६ वी - ८ वी <br/><span className="text-[8px] opacity-70">(KG)</span></th>}
                    <th className="py-2.5 px-3 text-[10px] font-black text-[#3c8dbc] uppercase text-center w-20 tracking-tighter">अ‍ॅक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetchLoading ? (
                    <tr><td colSpan={3 + (hasPrimary ? 1 : 0) + (hasUpperPrimary ? 1 : 0)} className="p-8 text-center text-slate-400 text-xs italic">लोड होत आहे...</td></tr>
                  ) : ingredients.length === 0 ? (
                    <tr><td colSpan={3 + (hasPrimary ? 1 : 0) + (hasUpperPrimary ? 1 : 0)} className="p-8 text-center text-slate-400 text-xs italic">अजून कोणतेही साहित्य जोडले नाही.</td></tr>
                  ) : (
                    ingredients.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-2 px-3">
                          <span className="text-[13px] font-bold text-slate-700">{item.item_name}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${item.source==='global'?'bg-indigo-50 text-indigo-700 border border-indigo-100':'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            {item.source==='global'?'Govt':'Local'}
                          </span>
                        </td>
                        {hasPrimary && <td className="py-2 px-3 text-[12px] font-black text-slate-600 text-right">{(item.grams_primary / 1000).toFixed(5)}</td>}
                        {hasUpperPrimary && <td className="py-2 px-3 text-[12px] font-black text-slate-600 text-right">{(item.grams_upper_primary / 1000).toFixed(5)}</td>}
                        <td className="py-2 px-3 text-center flex items-center justify-center gap-2">
                          <button onClick={()=>handleEditClick(item)} title="बदल करा (Edit Item)" className="text-slate-300 hover:text-blue-600 p-1 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={()=>deleteItem(item.id)} title="काढून टाका (Delete Item)" className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
