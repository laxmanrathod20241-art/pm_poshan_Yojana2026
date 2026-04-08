import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  FileText,
  Trash2,
  PlusCircle,
  Loader2
} from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'modules' | 'teachers' | 'foodmaster'>('modules');
  const [modules, setModules] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Food Master State
  const [globalFoods, setGlobalFoods] = useState<any[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [newFoodCode, setNewFoodCode] = useState('');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodNameEn, setNewFoodNameEn] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState<'MAIN' | 'INGREDIENT'>('MAIN');
  const [foodMsg, setFoodMsg] = useState({ type: '', text: '' });
  const [isCodeValidated, setIsCodeValidated] = useState(false);

  // New Teacher Management State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    schoolName: '',
    schoolId: ''
  });
  const [createMsg, setCreateMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
    fetchGlobalFoods();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchModules(), fetchTeachers()]);
    setLoading(false);
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      if (data) setModules(data);
    } catch (err: any) {
      console.error('Error fetching modules:', err.message);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setTeachers(data);
    } catch (err: any) {
      console.error('Error fetching teachers:', err.message);
    }
  };

  const toggleModule = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('system_modules')
        .update({ is_active_for_teachers: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      await fetchModules();
    } catch (err: any) {
      alert('Failed to update module access. ' + err.message);
    }
  };

  // ── Global Food Master CRUD ─────────────────────────────────────
  const fetchGlobalFoods = async () => {
    setFoodLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('global_food_master')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setGlobalFoods(data || []);
    } catch (err: any) {
      console.error('Food fetch error:', err.message);
    } finally {
      setFoodLoading(false);
    }
  };

  const handleNameChange = (val: string, lang: 'mr' | 'en') => {
    if (lang === 'mr') setNewFoodName(val);
    else setNewFoodNameEn(val);
    
    // Reset validation state whenever names change
    setNewFoodCode('');
    setIsCodeValidated(false);
    setFoodMsg({ type: '', text: '' });
  };

  const handleGenerateCode = () => {
    if (!newFoodName.trim() || !newFoodNameEn.trim()) {
      setFoodMsg({ type: 'error', text: 'Please enter both Marathi and English names to generate the code.' });
      return;
    }

    // Generate unique code based on English name
    const baseCode = newFoodNameEn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const generatedCode = `F_${baseCode}`;

    // Check for duplicates in local state
    const isCodeDuplicate = globalFoods.some(f => f.code === generatedCode);
    const isNameDuplicate = globalFoods.some(f => 
      f.name === newFoodName.trim() || 
      (f.name_en && f.name_en.toLowerCase() === newFoodNameEn.trim().toLowerCase())
    );

    if (isCodeDuplicate) {
      setFoodMsg({ type: 'error', text: `Duplicate Code: The code '${generatedCode}' already exists.` });
      setNewFoodCode(generatedCode);
      setIsCodeValidated(false);
    } else if (isNameDuplicate) {
      setFoodMsg({ type: 'error', text: `Duplicate Item: The food name already exists in the Government List.` });
      setNewFoodCode('');
      setIsCodeValidated(false);
    } else {
      setNewFoodCode(generatedCode);
      setIsCodeValidated(true);
      setFoodMsg({ type: 'success', text: `Code '${generatedCode}' generated and validated. Ready to add.` });
    }
  };

  const addGlobalFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCodeValidated) {
      setFoodMsg({ type: 'error', text: 'Please generate and validate the Food Code first.' });
      return;
    }
    setFoodMsg({ type: '', text: '' });
    try {
      const { error } = await (supabase as any).from('global_food_master').insert({
        code: newFoodCode,
        name: newFoodName.trim(),
        name_en: newFoodNameEn.trim(),
        item_category: newFoodCategory,
      });
      if (error) throw error;
      setFoodMsg({ type: 'success', text: `"${newFoodName}" added to the Government List.` });
      setNewFoodCode('');
      setNewFoodName('');
      setNewFoodNameEn('');
      setIsCodeValidated(false);
      fetchGlobalFoods();
      setTimeout(() => setFoodMsg({ type: '', text: '' }), 3000);
    } catch (err: any) {
      setFoodMsg({ type: 'error', text: 'Failed to add: ' + err.message });
    }
  };

  const deleteGlobalFood = async (code: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from the Government List?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('global_food_master')
        .delete()
        .eq('code', code);
      if (error) throw error;
      fetchGlobalFoods();
    } catch (err: any) {
      setFoodMsg({ type: 'error', text: 'Failed to delete: ' + err.message });
    }
  };



  const handleCreateTeacher = async () => {
    setCreateMsg({ type: '', text: '' });
    
    // Validate inputs
    if (!newTeacher.email || !newTeacher.password || !newTeacher.firstName) {
      setCreateMsg({ type: 'error', text: 'Email, Password, and First Name are required fields.' });
      return;
    }

    // Step 1: Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newTeacher.email,
      password: newTeacher.password
    });

    if (authError) {
      setCreateMsg({ type: 'error', text: authError.message });
      return;
    }

    if (authData?.user) {
      // Step 2: Insert into Profiles specifically passing the new fields via raw cast
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: newTeacher.email,
        role: 'teacher',
        first_name: newTeacher.firstName,
        last_name: newTeacher.lastName,
        school_name: newTeacher.schoolName,
        school_id: newTeacher.schoolId
      } as any);

      if (profileError) {
        setCreateMsg({ type: 'error', text: `Auth created but profile save failed: ${profileError.message}` });
        return;
      }
      
      setCreateMsg({ type: 'success', text: 'Success! New teaching personnel has been registered to the network.' });
      setNewTeacher({ email: '', password: '', firstName: '', lastName: '', schoolName: '', schoolId: '' });
      setShowCreateForm(false);
      fetchTeachers(); // Refresh the list
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-white/60 p-10 rounded-3xl backdrop-blur-md shadow-xl border border-white/50">
            <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl font-bold text-slate-800 tracking-tight">Syncing Database...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Sidebar Menu mapping
  const adminSidebar = (
    <>
      <li>
        <button 
          onClick={() => setActiveTab('modules')} 
          className={`w-full text-left p-3.5 rounded-xl text-[14px] font-extrabold transition-all shadow-sm border ${
            activeTab === 'modules' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/30 border-orange-500' 
              : 'bg-white/80 text-slate-700 hover:border-blue-200 hover:text-blue-700 border-white/60'
          }`}
        >
          Manage Modules
        </button>
      </li>
      <li>
        <button 
          onClick={() => setActiveTab('teachers')} 
          className={`w-full text-left p-3.5 rounded-xl text-[14px] font-extrabold transition-all shadow-sm border ${
            activeTab === 'teachers' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/30 border-orange-500' 
              : 'bg-white/80 text-slate-700 hover:border-blue-200 hover:text-blue-700 border-white/60'
          }`}
        >
          Manage Teachers
        </button>
      </li>
      <li>
        <button 
          onClick={() => setActiveTab('foodmaster')} 
          className={`w-full text-left p-3.5 rounded-xl text-[14px] font-extrabold transition-all shadow-sm border ${
            activeTab === 'foodmaster' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/30 border-orange-500' 
              : 'bg-white/80 text-slate-700 hover:border-blue-200 hover:text-blue-700 border-white/60'
          }`}
        >
          🏛 Global Food Master
        </button>
      </li>
    </>
  );

  return (
    <Layout sidebarLinks={adminSidebar}>
      <div className="w-[95%] max-w-[1400px] mx-auto z-10 relative">
        
        <div className="mb-6 text-left">
          <h1 className="text-5xl font-black text-[#474379] tracking-tighter uppercase italic font-['Outfit']">
            {activeTab === 'modules' ? 'System Configuration' 
              : activeTab === 'teachers' ? 'Teacher Management Panel'
              : 'Global Food Master'}
          </h1>
          <p className="text-slate-400 font-bold mt-1 text-[10px] uppercase tracking-widest">Enterprise Administrative Control Hub</p>
        </div>

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module) => {
              const isActive = module.is_active_for_teachers;
              const IconComponent = IconMap[module.icon_name] || LayoutDashboard;

              return (
                <div key={module.id} className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 hover:border-blue-200 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden">
                  <div className={`absolute -top-12 -right-12 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none transition-colors duration-500 ${isActive ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                  <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 shadow-md border border-blue-100 group-hover:scale-110 group-hover:shadow-blue-200/50 transition-all duration-300 relative z-10">
                    <IconComponent size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight relative z-10">{module.module_name}</h3>
                  <p className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100/80 px-3 py-1.5 rounded-lg w-fit truncate mb-8 border border-slate-200/60 shadow-inner relative z-10">
                    ROUTE: {module.route_path}
                  </p>
                  <div className="mt-auto pt-6 border-t border-slate-200/60 flex items-center justify-between relative z-10">
                    <span className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${isActive ? 'bg-green-100 text-green-700 border border-green-200/50' : 'bg-slate-200 text-slate-500 border border-slate-300/50'}`}>
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => toggleModule(module.id, isActive)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        isActive ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STRICT CET ENTERPRISE TAB - TEACHERS */}
        {activeTab === 'teachers' && (
          <div className="w-full">
            
            {createMsg.text && (
              <div className={`mb-6 p-4 rounded text-sm font-bold border ${createMsg.type === 'success' ? 'bg-[#00a65a]/10 text-[#00a65a] border-[#00a65a]/30' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {createMsg.text}
              </div>
            )}

            {/* CET Top Action Bar */}
            <div className="bg-white p-5 border-t-4 border-[#474379] shadow-lg flex justify-between items-center mb-6 rounded-none transform transition-all hover:translate-y-[-2px]">
              <span className="font-black text-[#474379] uppercase tracking-widest text-[11px]">Personnel Global Roster</span>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-8 py-3 rounded-none font-black shadow-xl shadow-blue-500/20 transition-all text-xs flex items-center gap-3 uppercase tracking-widest active:scale-95"
              >
                ＋ Register New Personnel
              </button>
            </div>

            {/* CET Creation Form Modal */}
            {showCreateForm && (
              <div className="bg-white border-2 border-[#3c8dbc] p-6 mb-6 shadow-md rounded-none relative">
                
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-bold px-2 py-1"
                >
                  ✕ Close
                </button>

                <h3 className="text-xl font-extrabold text-[#474379] mb-5 border-b border-slate-200 pb-3">Register Official Personnel</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                  {/* Column 1 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">First Name</label>
                      <input 
                        type="text" 
                        value={newTeacher.firstName}
                        onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="e.g. Rahul"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Last Name</label>
                      <input 
                        type="text" 
                        value={newTeacher.lastName}
                        onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="e.g. Patil"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Official Email</label>
                      <input 
                        type="email" 
                        value={newTeacher.email}
                        onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="teacher@school.edu.in"
                      />
                    </div>
                  </div>
                  
                  {/* Column 2 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">School Name</label>
                      <input 
                        type="text" 
                        value={newTeacher.schoolName}
                        onChange={e => setNewTeacher({...newTeacher, schoolName: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="e.g. ZP Primary School"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">School ID (UDISE)</label>
                      <input 
                        type="text" 
                        value={newTeacher.schoolId}
                        onChange={e => setNewTeacher({...newTeacher, schoolId: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="11-digit UDISE Code"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Secure Password</label>
                      <input 
                        type="password" 
                        value={newTeacher.password}
                        onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                        className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#3c8dbc] focus:ring-1 focus:ring-[#3c8dbc] transition-shadow text-[#2d3748]" 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="text-right border-t border-slate-200 pt-5">
                   <button 
                     onClick={handleCreateTeacher} 
                     className="bg-[#00a65a] hover:bg-[#008d4c] text-white px-8 py-3 rounded font-extrabold transition-colors shadow-sm text-sm uppercase tracking-wider"
                   >
                     Deploy Teacher Credentials
                   </button>
                </div>
              </div>
            )}

            {/* CET Teacher List Table */}
            <div className="bg-white border border-slate-300 shadow-sm rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-300">
                      <th className="p-4 text-xs font-bold text-[#474379] uppercase tracking-wider text-left border-r border-slate-200">Name</th>
                      <th className="p-4 text-xs font-bold text-[#474379] uppercase tracking-wider text-left border-r border-slate-200">School Name</th>
                      <th className="p-4 text-xs font-bold text-[#474379] uppercase tracking-wider text-left border-r border-slate-200">School ID</th>
                      <th className="p-4 text-xs font-bold text-[#474379] uppercase tracking-wider text-left border-r border-slate-200">Email</th>
                      <th className="p-4 text-xs font-bold text-[#474379] uppercase tracking-wider text-left">Date Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t, index) => {
                      const first = (t as any).first_name || '';
                      const last = (t as any).last_name || '';
                      const name = `${first} ${last}`.trim() || 'Data Unavailable';
                      const school = (t as any).school_name || 'Unassigned';
                      const uId = (t as any).school_id || 'N/A';

                      return (
                        <tr key={t.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="p-4 text-[13px] font-bold text-slate-800 border-r border-slate-200">{name}</td>
                          <td className="p-4 text-[13px] font-medium text-slate-700 border-r border-slate-200">{school}</td>
                          <td className="p-4 text-[13px] font-mono text-slate-600 border-r border-slate-200">{uId}</td>
                          <td className="p-4 text-[13px] font-medium text-blue-600 border-r border-slate-200">{t.email}</td>
                          <td className="p-4 text-[13px] font-semibold text-slate-500">
                            {new Date(t.created_at || new Date()).toLocaleDateString('en-GB', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            }).replace(/ /g, '-')}
                          </td>
                        </tr>
                      );
                    })}
                    {teachers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center font-bold text-slate-400 bg-slate-50">
                          No teaching personnel found in the active registry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── GLOBAL FOOD MASTER TAB ─────────────────────────── */}
        {activeTab === 'foodmaster' && (
          <div className="w-full">

            {foodMsg.text && (
              <div className={`mb-6 p-4 text-sm font-bold border ${
                foodMsg.type === 'success'
                  ? 'bg-[#00a65a]/10 text-[#00a65a] border-[#00a65a]/30'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {foodMsg.type === 'success' ? '✓ ' : '✕ '}{foodMsg.text}
              </div>
            )}

            {/* Add New Food Form */}
            <div className="bg-white border-t-4 border-[#474379] shadow-sm p-5 mb-5">
              <h3 className="text-sm font-extrabold text-[#474379] uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                <PlusCircle size={16} /> Add New Food Item to Government List
              </h3>
              <form onSubmit={addGlobalFood} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      नाव (Marathi) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newFoodName}
                      onChange={e => handleNameChange(e.target.value, 'mr')}
                      className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#474379] focus:ring-1 focus:ring-[#474379] text-[#2d3748]"
                      placeholder="e.g. मुगाची डाळ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Name (English) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newFoodNameEn}
                      onChange={e => handleNameChange(e.target.value, 'en')}
                      className="w-full border border-slate-300 p-2.5 text-sm font-medium focus:outline-none focus:border-[#474379] focus:ring-1 focus:ring-[#474379] text-[#2d3748]"
                      placeholder="e.g. Moong Dal"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 border border-slate-200 rounded-sm">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      System Generated Food Code
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        readOnly
                        value={newFoodCode}
                        className="flex-1 border border-slate-300 p-2.5 text-sm font-mono font-bold bg-slate-200 text-slate-500 uppercase cursor-not-allowed"
                        placeholder="e.g. F_MOONGDAL (Click Generate)"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="bg-[#3c8dbc] hover:bg-[#2e7da6] text-white px-5 py-2.5 font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
                      >
                        Generate & Validate
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full md:w-auto">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">श्रेणी (Category)</label>
                    <div className="flex gap-2">
                       <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 border-2 cursor-pointer transition-all ${newFoodCategory === 'MAIN' ? 'border-[#3c8dbc] bg-blue-50 text-[#3c8dbc]' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                          <input 
                            type="radio" name="gCategory" value="MAIN" className="hidden"
                            checked={newFoodCategory === 'MAIN'} onChange={() => setNewFoodCategory('MAIN')}
                          />
                          <span className="text-[10px] font-black uppercase whitespace-nowrap">Main Food (मुख्य)</span>
                       </label>
                       <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 border-2 cursor-pointer transition-all ${newFoodCategory === 'INGREDIENT' ? 'border-slate-400 bg-slate-100 text-slate-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                          <input 
                            type="radio" name="gCategory" value="INGREDIENT" className="hidden"
                            checked={newFoodCategory === 'INGREDIENT'} onChange={() => setNewFoodCategory('INGREDIENT')}
                          />
                          <span className="text-[10px] font-black uppercase whitespace-nowrap">Ingredient (साहित्य)</span>
                       </label>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <button
                      type="submit"
                      disabled={!isCodeValidated}
                      className="w-full md:w-auto bg-[#474379] hover:bg-[#34305c] disabled:bg-slate-300 disabled:text-slate-500 text-white px-10 py-3 rounded-none font-black text-xs transition-all shadow-xl shadow-slate-900/10 flex justify-center items-center gap-3 h-[48px] uppercase tracking-widest active:scale-95"
                    >
                      <PlusCircle size={16} /> Deploy to Government List
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Food Master Table */}
            <div className="bg-white border border-slate-300 shadow-sm overflow-hidden">
              <div className="bg-[#474379] p-4 flex justify-between items-center">
                <span className="font-bold text-white uppercase tracking-wider text-[13px]">
                  🏛 शासकीय खाद्यपदार्थ यादी — Government Food Register
                </span>
                <span className="text-white/60 text-xs bg-white/10 px-3 py-1">
                  {globalFoods.length} Items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-slate-300">
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest text-left border-r border-slate-200 w-36">Code</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest text-left border-r border-slate-200">नाम (Marathi) / श्रेणी</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest text-left border-r border-slate-200">Name (English)</th>
                      <th className="p-4 text-[11px] font-extrabold text-[#3c8dbc] uppercase tracking-widest text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodLoading ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center font-bold text-slate-400">
                          <Loader2 className="animate-spin inline mr-2" size={16} />Loading...
                        </td>
                      </tr>
                    ) : globalFoods.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center font-bold text-slate-400 bg-slate-50">
                          No food items in the Government List.
                        </td>
                      </tr>
                    ) : (
                      globalFoods.map((food, index) => (
                        <tr
                          key={food.code}
                          className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="p-4 text-[12px] font-mono font-black text-[#474379] border-r border-slate-200">{food.code}</td>
                          <td className="p-4 border-r border-slate-200">
                             <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-bold text-slate-800">{food.name}</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit ${food.item_category === 'MAIN' ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'}`}>
                                   {food.item_category === 'MAIN' ? 'MAIN FOOD' : 'INGREDIENT'}
                                </span>
                             </div>
                          </td>
                          <td className="p-4 text-[13px] font-medium text-slate-500 border-r border-slate-200">{food.name_en || '—'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => deleteGlobalFood(food.code, food.name)}
                              className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors inline-flex justify-center items-center"
                              title="Remove from Government List"
                            >
                              <Trash2 size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
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
