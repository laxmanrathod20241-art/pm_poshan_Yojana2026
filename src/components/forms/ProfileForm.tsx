import { useState, useEffect } from 'react';
import { api } from '../../lib/apiClient';
import { Save, CheckCircle2, Loader2 } from 'lucide-react';

interface ProfileFormProps {
  userId: string;
  onSuccess?: () => void;
}

export default function ProfileForm({ userId, onSuccess }: ProfileFormProps) {
  const [schoolNameMr, setSchoolNameMr] = useState('');
  const [centerNameMr, setCenterNameMr] = useState('');
  const [talukaMr, setTalukaMr] = useState('');
  const [districtMr, setDistrictMr] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalContact, setPrincipalContact] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolUdise, setSchoolUdise] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId]);

  const fetchProfile = async (id: string) => {
    setFetchLoading(true);
    try {
      const { data, error } = await api
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setSchoolNameMr((data as any).school_name_mr || '');
        setCenterNameMr((data as any).center_name_mr || '');
        setTalukaMr((data as any).taluka_mr || '');
        setDistrictMr((data as any).district_mr || '');
        setPrincipalName((data as any).principal_name || '');
        setPrincipalContact((data as any).principal_contact_number || '');
        setFirstName((data as any).first_name || '');
        setLastName((data as any).last_name || '');
        setMobileNumber((data as any).mobile_number || '');
        setSchoolName((data as any).school_name || '');
        setSchoolUdise((data as any).school_udise || '');
      }
    } catch (err: any) {
      console.error('Error fetching profile', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setLoading(true);
    setStatus({ type: '', text: '' });
    
    try {
      const { error } = await (api as any)
        .from('profiles')
        .update({
          school_name_mr: schoolNameMr,
          center_name_mr: centerNameMr,
          taluka_mr: talukaMr,
          district_mr: districtMr,
          principal_name: principalName,
          principal_contact_number: principalContact,
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobileNumber,
          school_name: schoolName,
          school_udise: schoolUdise
        })
        .eq('id', userId!);
        
      if (error) throw error;
      
      setStatus({ type: 'success', text: 'प्रोफाइल यशस्वीरित्या अपडेट केले!' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatus({ type: 'error', text: 'Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
      
      {/* Teacher Information */}
      <div className="p-5 pb-4 border-b border-slate-50 bg-slate-50/50">
        <h2 className="text-[13px] font-black text-[#474379] uppercase tracking-widest leading-loose">
          Teacher Information (शिक्षकांची माहिती)
        </h2>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100">
        <div className="space-y-1">
          <label htmlFor="firstName" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">पहिले नाव (First Name)</label>
          <input 
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="lastName" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">आडनाव (Last Name)</label>
          <input 
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mobileNumber" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">मोबाईल क्रमांक (Mobile Number)</label>
          <input 
            id="mobileNumber"
            type="text"
            maxLength={10}
            value={mobileNumber}
            onChange={e => setMobileNumber(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
          />
        </div>
      </div>

      {/* School Information */}
      <div className="p-5 pb-4 border-b border-slate-50 bg-slate-50/50">
        <h2 className="text-[13px] font-black text-[#474379] uppercase tracking-widest leading-loose">
          School Information (शाळेची माहिती)
        </h2>
      </div>
      
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100">
        <div className="space-y-1">
          <label htmlFor="schoolName" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">School Name (English)</label>
          <input 
            id="schoolName"
            type="text"
            required
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="schoolNameMr" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">शाळेचे नाव (Marathi)</label>
          <input 
            id="schoolNameMr"
            type="text"
            value={schoolNameMr}
            onChange={e => setSchoolNameMr(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="उदा. जि. प. प्राथमिक शाळा..."
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="schoolUdise" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">UDISE Code</label>
          <input 
            id="schoolUdise"
            type="text"
            maxLength={11}
            required
            value={schoolUdise}
            onChange={e => setSchoolUdise(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="centerNameMr" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">केंद्राचे नाव (Center Name)</label>
          <input 
            id="centerNameMr"
            type="text"
            value={centerNameMr}
            onChange={e => setCenterNameMr(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="उदा. केंद्र..."
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="talukaMr" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">तालुका (Taluka)</label>
          <input 
            id="talukaMr"
            type="text"
            value={talukaMr}
            onChange={e => setTalukaMr(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="तालुका"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="districtMr" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">जिल्हा (District)</label>
          <input 
            id="districtMr"
            type="text"
            value={districtMr}
            onChange={e => setDistrictMr(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="जिल्हा"
          />
        </div>
      </div>

      <div className="p-5 pb-4 border-b border-slate-50 bg-slate-50/50 border-t border-slate-100">
        <h2 className="text-[13px] font-black text-[#474379] uppercase tracking-widest leading-loose">
          Principal Information (मुख्याध्यापकांची माहिती)
        </h2>
      </div>
      
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="principalName" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">मुख्याध्यापकाचे नाव (Principal Name)</label>
          <input 
            id="principalName"
            type="text"
            required
            value={principalName}
            onChange={e => setPrincipalName(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="Principal Name"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="principalContact" className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">संपर्क क्रमांक (Contact Number)</label>
          <input 
            id="principalContact"
            type="text"
            maxLength={10}
            value={principalContact}
            onChange={e => setPrincipalContact(e.target.value)}
            className="w-full border-2 border-slate-100 p-2.5 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 outline-none transition-all rounded"
            placeholder="10-digit number"
          />
        </div>
      </div>

      <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div>
          {status.text && (
            <div className={`p-2.5 text-[11px] font-black uppercase tracking-widest border rounded flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {status.type === 'success' && <CheckCircle2 size={16} />} {status.text}
            </div>
          )}
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="bg-[#3c8dbc] hover:bg-[#2e7da6] text-white font-black py-2.5 px-6 shadow-lg shadow-blue-500/20 flex items-center gap-2 text-xs uppercase tracking-widest transition-all rounded disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> सेव्ह करा (Save Profile)</>}
        </button>
      </div>
    </form>
  );
}
