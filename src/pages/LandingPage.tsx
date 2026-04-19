import { 
  ChevronRight, BookOpen, User,
  LayoutDashboard, UserCircle, Users, ClipboardList, Archive, CalendarRange, 
  FileText, CreditCard, Briefcase, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="font-sans text-gray-900 min-h-screen bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-50 via-white to-orange-50">
      
      {/* Fixed Header */}
      <div className="fixed w-full top-0 z-50">
        <header className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col md:flex-row md:items-baseline gap-x-2">
            <span className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-800 tracking-tight">
                पीएम-शालेय पोषण आहार व्यवस्थापन-ट्रॅकर
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/register" className="hidden md:block bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all duration-200">
              Register School
            </Link>
            <Link to="/login" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all duration-200">
              Teacher Login
            </Link>
          </div>
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
            <Link to="/register" className="bg-white/80 hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-3.5 px-8 rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-lg backdrop-blur-sm">
              <User size={20} className="text-slate-500" />
              Register New School
            </Link>
          </div>
        </div>
      </section>

      {/* सुविधा मार्गदर्शिका (Feature Discovery Grid) */}
      <section className="py-24 px-4 bg-white/30 relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">
              सुविधा <span className="text-blue-600 underline decoration-blue-200">मार्गदर्शिका</span>
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">PM-POSHAN ट्रॅकरची वैशिष्ट्ये</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Dashboard */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">शिक्षक डॅशबोर्ड</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">शालेय पोषण आहाराचे नियंत्रण केंद्र.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> आजच्या आहाराची स्थिती पहा.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> धान्याचा साठा संपत असल्यास त्वरित सूचना.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> दैनंदिन नोंदींसाठी क्विक लिंक्स.
                </li>
              </ul>
            </div>

            {/* 2. Profile */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <UserCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">शिक्षक प्रोफाइल</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">शाळा आणि वैयक्तिक माहिती व्यवस्थापन.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> शाळेचा UDISE कोड आणि मराठी नाव.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> प्राथमिक/उच्च प्राथमिक विभाग सेटिंग्ज.
                </li>
              </ul>
            </div>

            {/* 3. Enrollment */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">विद्यार्थी नोंदणी</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">लाभार्थी विद्यार्थ्यांची अचूक माहिती.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> इयत्ता १ ली ते ८ वी पर्यंतची पटसंख्या.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> पटसंख्येनुसार आहाराचे उद्दिष्ट ठरते.
                </li>
              </ul>
            </div>

            {/* 4. Daily Log */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">दैनंदिन उपभोग नोंद</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">रोजच्या आहाराची डिजिटल हजेरी.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> लाभ घेतलेल्या विद्यार्थ्यांची संख्या नोंदवा.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> तांदूळ आणि मालाचे स्वयंचलित मोजमाप.
                </li>
              </ul>
            </div>

            {/* 5. Stock */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Archive size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">साठा नोंदवही</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">धान्य आणि मालाचे रिअल-टाइम ट्रॅकिंग.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> सर्व वस्तूंचा शिल्लक साठा पहा.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> नवीन मालाची पावती (Receipt) नोंदवा.
                </li>
              </ul>
            </div>

            {/* 6. Menu */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <CalendarRange size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">साप्ताहिक आहार नियोजन</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">निश्चित वेळापत्रकानुसार आहार वाटप.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> आठवड्याचा आहार (उदा. सोमवारी खिचडी) सेट करा.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> रोजचा खर्च आणि माल आपोआप मोजला जाईल.
                </li>
              </ul>
            </div>

            {/* 7. ZP Reports */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">मासिक झेड.पी. अहवाल</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">क्लिष्ट अहवाल आता एका क्लिकवर.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> प्रारंभीची शिल्लक, आवक, खर्च आणि अंतिम शिल्लक.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> जिल्हा परिषदेच्या निकषांनुसार अहवाल.
                </li>
              </ul>
            </div>

            {/* 8. Ledgers */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <BookOpen size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">आर्थिक आणि वस्तू खतावणी</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">ऑडिट-रेडी व्यवहारांची सविस्तर नोंद.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> वस्तू खतावणी (Item Ledger) ट्रॅकिंग.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> आचारी मानधन खतावणीचा हिशोब.
                </li>
              </ul>
            </div>

            {/* 9. Payment */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <CreditCard size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">सबस्क्रिप्शन आणि पेमेंट</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">प्रगत वैशिष्ट्यांसाठी खाते व्यवस्थापन.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> तुमच्या खात्याची मुदत आणि स्थिती पहा.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Razorpay द्वारे सुरक्षित वार्षिक शुल्क भरा.
                </li>
              </ul>
            </div>

            {/* 10. Staff */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hover:border-blue-200 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">कर्मचारी व्यवस्थापन</h3>
              <p className="text-sm font-bold text-slate-500 mb-4 italic leading-relaxed">स्वयंपाकी आणि मदतनीस यांचा हिशोब.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> बचत गट आणि मदतनीसांची माहिती.
                </li>
                <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> उपस्थिती आणि मानधनाचा अचूक हिशोब.
                </li>
              </ul>
            </div>
          </div>
          
          {/* Footer Note Banner */}
          <div className="mt-20 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                      <ShieldCheck className="text-white" size={24} />
                   </div>
                   <p className="text-white font-black uppercase italic tracking-tighter text-lg md:text-xl">
                     सुरक्षित लोकल-फर्स्ट तंत्रज्ञान
                   </p>
                </div>
                <p className="text-slate-400 font-bold text-xs md:text-sm max-w-xl text-center md:text-right leading-relaxed">
                  तुमची माहिती तुमच्याच डिव्हाइसवर सुरक्षित राहते, ज्यामुळे इंटरनेट नसतानाही काम करता येते आणि डेटा प्रायव्हसी जपली जाते.
                </p>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
          </div>
        </div>
      </section>

      {/* How It Works */}
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
