import { Calculator, CheckCircle, ArrowDownToLine, AlertCircle, ChevronRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="font-sans text-gray-900 min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50">
      
      {/* Fixed Top Container for Notification & Header */}
      <div className="fixed w-full top-0 z-50">
        {/* Sleek Alert Banner */}
        <div className="bg-indigo-950 text-indigo-100 text-sm py-2.5 font-medium tracking-wide flex justify-center items-center gap-2 px-4 text-center">
          <AlertCircle size={16} className="text-indigo-300" />
          <span>⚠️ Notification: Social Audit is mandatory for 2026 compliance. Monthly reports must be generated before the 5th.</span>
        </div>

        {/* Glassmorphism Header */}
        <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tight">
            PM-POSHAN Tracker
          </div>
          <Link to="/login" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all duration-200">
            Teacher Login
          </Link>
        </header>
      </div>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 text-center relative">
        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
            Simplify Your <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">School Food</span> Management.
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate paperwork. Automate math for grain usage, track nutritional norms, and generate compliance reports instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-lg">
              Enter Daily Log
              <ChevronRight size={20} />
            </Link>
            <button className="bg-white/80 hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3.5 px-8 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-lg backdrop-blur-sm">
              <BookOpen size={20} className="text-slate-500" />
              Read Guidelines
            </button>
          </div>
        </div>
      </section>

      {/* Features Section (Grid) */}
      <section className="py-16 px-4 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          
          {/* Card 1: Math */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:border-blue-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Calculator size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Automatic Math</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Calculate 100g/150g grain usage instantly for different sections without any manual spreadsheets.
            </p>
          </div>

          {/* Card 2: Nutrition */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:border-orange-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="bg-orange-100 text-orange-600 p-4 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Nutritional Compliance</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Verify 450/700 Calorie and 12g/20g Protein daily requirements automatically.
            </p>
          </div>

          {/* Card 3: Reports */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:border-indigo-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <ArrowDownToLine size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">One-Click Reports</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Generate official PDF summaries tailored for your required monthly state audits.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works (Instructions) */}
      <section className="py-24 px-4 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              How It Works
            </h2>
            <p className="mt-4 text-slate-500 font-medium text-lg">Three easy steps to streamline your operations.</p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center items-center md:items-start gap-8 max-w-5xl mx-auto">
            
            <div className="flex flex-col items-center text-center max-w-xs relative group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-black flex items-center justify-center text-3xl mb-6 shadow-md shadow-blue-100/50 group-hover:scale-110 transition-transform duration-300 border border-blue-200/50">
                1
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Secure Login</h4>
              <p className="font-medium text-slate-500">Access the portal using your authorized School ID.</p>
            </div>
            
            <div className="flex flex-col items-center text-center max-w-xs relative group">
              <div className="hidden md:block absolute top-8 -left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-100 to-indigo-100 -z-10"></div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 font-black flex items-center justify-center text-3xl mb-6 shadow-md shadow-indigo-100/50 group-hover:scale-110 transition-transform duration-300 border border-indigo-200/50 relative z-10">
                2
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Automated Logs</h4>
              <p className="font-medium text-slate-500">Enter daily attendance points and let the system verify norms.</p>
            </div>
            
            <div className="flex flex-col items-center text-center max-w-xs relative group">
              <div className="hidden md:block absolute top-8 -left-1/2 w-full h-0.5 bg-gradient-to-r from-indigo-100 to-orange-100 -z-10"></div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-red-50 text-orange-600 font-black flex items-center justify-center text-3xl mb-6 shadow-md shadow-orange-100/50 group-hover:scale-110 transition-transform duration-300 border border-orange-200/50 relative z-10">
                3
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Export Data</h4>
              <p className="font-medium text-slate-500">Download your Monthly Summary with just a click.</p>
            </div>
            
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400 px-4 text-center border-t border-slate-900 mt-10">
        <div className="mb-4 text-2xl font-bold text-slate-300 tracking-tight">PM-POSHAN Tracker</div>
        <p className="font-medium tracking-wide">© 2026 PM-POSHAN Tracker - Independent Standalone Project.</p>
        <p className="text-sm mt-2 opacity-50">Designed to meet Maharashtra Food Management guidelines.</p>
      </footer>
    </div>
  );
}
