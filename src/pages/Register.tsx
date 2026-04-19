import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, Copy, ArrowLeft, School, User, Lock, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/apiClient';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalContact, setPrincipalContact] = useState('');
  const [schoolUdise, setSchoolUdise] = useState('');

  // Step 2 Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3 Data (Success)
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredPassword, setRegisteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleNextStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (schoolUdise.length !== 11 || !/^\d+$/.test(schoolUdise)) {
      setError('School UDISE must be exactly 11 digits.');
      return;
    }

    if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }

    if (principalContact && (principalContact.length !== 10 || !/^\d+$/.test(principalContact))) {
      setError('Principal Contact Number must be exactly 10 digits.');
      return;
    }

    setLoading(true);
    try {
      // Validate UDISE with backend
      const response = await api.post('/register/validate-udise', { udise: schoolUdise });
      if (response.valid) {
        setStep(2);
      } else {
        setError(response.message || 'UDISE validation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate UDISE. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        password,
        step1_data: {
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobileNumber,
          school_name: schoolName,
          principal_name: principalName,
          principal_contact_number: principalContact,
          school_udise: schoolUdise,
        }
      };

      await api.post('/register', payload);
      
      setRegisteredEmail(email);
      setRegisteredPassword(password);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = `Login ID: ${registeredEmail}\nPassword: ${registeredPassword}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="font-sans text-gray-900 min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 flex flex-col relative overflow-hidden">
      {/* Background blobs for premium aesthetic */}
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-orange-100 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

      {/* Header */}
      <div className="fixed w-full top-0 z-50">
        <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tight">
            PM-POSHAN Tracker
          </div>
          <Link to="/login" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2 px-5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 text-sm backdrop-blur-sm">
            <ArrowLeft size={16} className="text-slate-500" />
            Back to Login
          </Link>
        </header>
      </div>

      <main className="flex-grow pt-28 pb-20 px-4 flex justify-center items-center relative z-10">
        <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white">
          
          {/* Progress Indicators */}
          <div className="flex justify-center items-center mb-8 space-x-4">
            <div className={`flex flex-col items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${step >= 1 ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' : 'bg-gray-100 text-gray-500'}`}>1</div>
              <span className="text-xs font-semibold uppercase tracking-wider">Details</span>
            </div>
            <div className={`w-16 h-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex flex-col items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${step >= 2 ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' : 'bg-gray-100 text-gray-500'}`}>2</div>
              <span className="text-xs font-semibold uppercase tracking-wider">Account</span>
            </div>
            <div className={`w-16 h-1 rounded-full ${step === 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`flex flex-col items-center ${step === 3 ? 'text-green-500' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2 ${step === 3 ? 'bg-green-100 text-green-600 border-2 border-green-500' : 'bg-gray-100 text-gray-500'}`}>3</div>
              <span className="text-xs font-semibold uppercase tracking-wider">Success</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-slate-900">School & Teacher Details</h2>
                <p className="text-slate-500 mt-2 font-medium">Please provide accurate information for verification.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><User size={16} className="text-slate-400" /> First Name</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="First Name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="Last Name" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Phone size={16} className="text-slate-400" /> Mobile Number</label>
                <input type="text" maxLength={10} required value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="10-digit mobile number" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><School size={16} className="text-slate-400" /> School Name</label>
                  <input type="text" required value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="Full School Name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">School UDISE Code</label>
                  <input type="text" maxLength={11} required value={schoolUdise} onChange={e => setSchoolUdise(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="11-digit numeric UDISE" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Principal Name</label>
                  <input type="text" required value={principalName} onChange={e => setPrincipalName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="Principal Name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Principal Contact (Optional)</label>
                  <input type="text" maxLength={10} value={principalContact} onChange={e => setPrincipalContact(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="10-digit number" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-70 mt-6 flex justify-center items-center gap-2">
                {loading ? 'Validating...' : <>Continue to Account Setup <ChevronRight size={20} /></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-slate-900">Secure Account</h2>
                <p className="text-slate-500 mt-2 font-medium">Create your login credentials.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Mail size={16} className="text-slate-400" /> Email Address (Login ID)</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="school@example.com" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Lock size={16} className="text-slate-400" /> Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="Minimum 6 characters" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Lock size={16} className="text-slate-400" /> Confirm Password</label>
                <input type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 outline-none text-slate-700 font-medium" placeholder="Repeat password" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-4 rounded-xl transition-all duration-200 flex justify-center items-center">
                  Back
                </button>
                <button type="submit" disabled={loading} className="w-2/3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-70 flex justify-center items-center gap-2">
                  {loading ? 'Registering...' : <>Complete Registration <CheckCircle2 size={20} /></>}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center animate-in zoom-in-95 duration-500 space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Registration Successful!</h2>
              <p className="text-slate-500 font-medium">Your account has been securely created. Please save your credentials below. For security reasons, <span className="text-red-500 font-bold">this password will not be shown again</span>.</p>
              
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-left shadow-sm my-8 relative group/card">
                <div className="mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Login ID (Email)</span>
                  <div className="font-mono text-slate-800 text-lg bg-white px-3 py-2 border border-slate-100 rounded-lg">{registeredEmail}</div>
                </div>
                <div className="relative">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</span>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-slate-800 text-lg bg-white px-3 py-2 border border-slate-100 rounded-lg flex-grow">
                      {showPassword ? registeredPassword : '•'.repeat(Math.min(registeredPassword.length, 12))}
                    </div>
                    <button 
                      type="button"
                      onMouseDown={() => setShowPassword(true)}
                      onMouseUp={() => setShowPassword(false)}
                      onMouseLeave={() => setShowPassword(false)}
                      onTouchStart={() => setShowPassword(true)}
                      onTouchEnd={() => setShowPassword(false)}
                      className="p-3 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                      title="Hold to reveal password"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="absolute top-6 right-6 flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold py-2 px-4 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-opacity"
                >
                  {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Credentials</>}
                </button>
              </div>

              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all duration-200"
              >
                Proceed to Login
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
