import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      alert("Success: Successfully Logged In!");
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans text-gray-900 min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50 flex flex-col relative overflow-hidden">
      
      {/* Background blobs for premium aesthetic */}
      <div className="absolute top-1/4 -right-1/4 w-[800px] h-[800px] bg-orange-100 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

      {/* Fixed Top Container for Notification & Header */}
      <div className="fixed w-full top-0 z-50">
        {/* Sleek Alert Banner */}
        <div className="bg-indigo-950 text-indigo-100 text-sm py-2.5 font-medium tracking-wide flex justify-center items-center gap-2 px-4 text-center">
          <AlertCircle size={16} className="text-indigo-300" />
          <span>⚠️ Secure Portal: Ensure you never share your Teacher Login credentials.</span>
        </div>

        {/* Glassmorphism Header */}
        <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tight">
            PM-POSHAN Tracker
          </div>
          <Link to="/" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2 px-5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 text-sm backdrop-blur-sm">
            <ArrowLeft size={16} className="text-slate-500" />
            Back to Home
          </Link>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-grow pt-36 pb-20 px-4 flex items-center justify-center relative z-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Instructions Box (Left Side) */}
          <div className="hidden lg:flex flex-col space-y-8 pr-8">
            <div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Portal Access</span>
              <h1 className="text-5xl font-extrabold text-slate-900 mt-6 leading-tight tracking-tight">
                Secure Regional <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">Teacher Login</span>
              </h1>
              <p className="text-lg text-slate-500 font-medium mt-4 leading-relaxed">
                Log in to access your school's daily log dashboard, verify nutritional distributions, and automatically generate monthly state compliance reports.
              </p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm border border-white/60 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl shadow-inner mt-1">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">Authentication Setup</h4>
                  <p className="text-slate-500 font-medium leading-relaxed">Please use your official, pre-registered School ID credential block.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl shadow-inner mt-1">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">Daily Validation</h4>
                  <p className="text-slate-500 font-medium leading-relaxed">Once inside, input daily attendance, and the system automatically calculates exactly 100g/150g allocations.</p>
                </div>
              </div>

               <div className="flex items-start gap-4">
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl shadow-inner mt-1">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 tracking-tight">Report Compilation</h4>
                  <p className="text-slate-500 font-medium leading-relaxed">Your data securely cascades into finalized PDF reports ready for Social Audit compliance.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form Box (Right Side) */}
          <div className="flex justify-center w-full">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white relative overflow-hidden flex flex-col">
              
              {/* Header inside the card */}
              <div className="mb-8 relative z-10 text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Welcome Back
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Enter your credentials to access your dashboard.
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 text-red-600 border border-red-100 p-3 rounded-lg text-sm font-medium animate-pulse relative z-10">
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5 relative z-10 w-full">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="school@example.com"
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all outline-none text-slate-700 placeholder-slate-400 font-medium shadow-sm hover:border-gray-300"
                  />
                </div>
                
                {/* Password Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all outline-none text-slate-700 placeholder-slate-400 font-medium shadow-sm hover:border-gray-300"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-70 mt-4 flex justify-center items-center h-14"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Sign In to Dashboard'
                  )}
                </button>
              </form>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-slate-950 text-slate-400 px-4 text-center border-t border-slate-900 mt-auto w-full z-10">
        <div className="mb-3 text-xl font-bold text-slate-300 tracking-tight">PM-POSHAN Tracker Auth</div>
        <p className="font-medium tracking-wide">© 2026 PM-POSHAN Tracker - Secure Gateway.</p>
        <p className="text-sm mt-2 opacity-50">Authorized access only. Monitored for compliance.</p>
      </footer>
    </div>
  );
}
