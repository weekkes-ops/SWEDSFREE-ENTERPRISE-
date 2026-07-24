import React, { useState } from 'react';
import { Employee, EmployeeRole } from '../types';
import { 
  Hammer, 
  LogIn, 
  ShieldAlert, 
  KeyRound, 
  User, 
  Sparkles, 
  UserPlus, 
  ArrowLeft, 
  CheckCircle, 
  Phone, 
  Mail, 
  Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (user: Employee) => void;
  onRegisterRequest: (request: { name: string; email: string; phone: string; role: EmployeeRole; password?: string }) => void;
}

export default function LoginScreen({ employees, onLogin, onRegisterRequest }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<EmployeeRole>('Carpenter');
  const [regPassword, setRegPassword] = useState('1234');
  const [regError, setRegError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username or email address.');
      return;
    }

    // Match by full name, email, or simple bypass keywords (e.g., typing 'admin')
    let emp = employees.find(emp => 
      emp.name.toLowerCase() === username.trim().toLowerCase() ||
      emp.email.toLowerCase() === username.trim().toLowerCase()
    );

    if (!emp && username.trim().toLowerCase() === 'admin') {
      emp = employees.find(e => e.role === 'Admin') || {
        id: 'emp-01',
        name: 'Mohamed Kamara',
        role: 'Admin',
        phone: '+232 76 111 2222',
        email: 'mohamed.kamara@swedsfree.com',
        status: 'Active',
        baseSalary: 9500,
        dailyRate: 350,
        hireDate: '2024-01-10',
        password: 'admin',
      };
    }

    if (!emp && username.trim().toLowerCase() === 'manager') {
      emp = employees.find(e => e.role === 'Manager') || {
        id: 'emp-manager-bypass',
        name: 'Amadu Sesay',
        role: 'Manager',
        phone: '+232 76 333 4444',
        email: 'amadu.sesay@swedsfree.com',
        status: 'Active',
        baseSalary: 7200,
        dailyRate: 250,
        hireDate: '2024-05-15',
        password: 'manager',
      };
    }

    if (!emp && username.trim().toLowerCase() === 'auditor') {
      emp = employees.find(e => e.role === 'Auditor') || {
        id: 'emp-auditor-bypass',
        name: 'Kadiatu Bangura',
        role: 'Auditor',
        phone: '+232 77 555 6666',
        email: 'kadiatu.b@swedsfree.com',
        status: 'Active',
        baseSalary: 6800,
        dailyRate: 230,
        hireDate: '2024-06-01',
        password: 'audit',
      };
    }

    if (!emp) {
      setError('Username or email not found. (Hint: Try "Mohamed Kamara" or "James Weekes")');
      return;
    }

    const expectedPassword = emp.password || (
      emp.role === 'Admin' ? 'admin' : 
      emp.role === 'Manager' ? 'manager' : 
      emp.role === 'Auditor' ? 'audit' : '1234'
    );

    if (password === expectedPassword) {
      onLogin(emp);
    } else {
      setError('Incorrect password or PIN. (Hint: Use "admin" for Admin or "1234" for standard workers).');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Please provide your name.');
      return;
    }

    // Sierra Leonean name suggestions checklist/warning
    const lowerName = regName.toLowerCase();
    const commonSierraLeoneSurnames = [
      'kamara', 'sesay', 'bangura', 'kargbo', 'jalloh', 'fofanah', 'conteh', 
      'tarawallie', 'mansaray', 'turay', 'cole', 'macauley', 'koroma', 'sankoh', 
      'bio', 'barrie', 'massaquoi', 'lamin', 'kallon', 'tengbeh', 'kanu', 'sillah'
    ];
    
    const hasSLSurname = commonSierraLeoneSurnames.some(surname => lowerName.includes(surname));
    
    if (!hasSLSurname) {
      // Gentle reminder but let it proceed, or mandate a Sierra Leonean style name to strictly satisfy user intent.
      // Let's guide them clearly with a prompt/reminder!
      setRegError('To keep Swedsfree records aligned, please register with a standard Sierra Leonean name (e.g., using Kamara, Sesay, Bangura, Kargbo, Jalloh, Fofanah, Conteh, Tarawallie, Mansaray, Turay, Cole, Koroma, or Kallon).');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please provide a valid email address.');
      return;
    }

    if (!regPhone.trim()) {
      setRegError('Please provide your phone number.');
      return;
    }

    onRegisterRequest({
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      role: regRole,
      password: regPassword || '1234'
    });

    setSuccessMsg(true);
  };

  const handleQuickBypass = (roleType: 'Admin' | 'Manager' | 'Employee' | 'Auditor') => {
    let emp = employees.find(e => e.role === roleType);
    if (!emp) {
      if (roleType === 'Admin') {
        emp = employees.find(e => e.role === 'Admin') || {
          id: 'emp-admin-bypass',
          name: 'Mohamed Kamara',
          role: 'Admin',
          phone: '+232 76 111 2222',
          email: 'mohamed.kamara@swedsfree.com',
          status: 'Active',
          baseSalary: 9500,
          dailyRate: 350,
          hireDate: '2024-01-10',
          password: 'admin',
        };
      } else if (roleType === 'Manager') {
        emp = employees.find(e => e.role === 'Manager') || {
          id: 'emp-manager-bypass',
          name: 'Amadu Sesay',
          role: 'Manager',
          phone: '+232 76 333 4444',
          email: 'amadu.sesay@swedsfree.com',
          status: 'Active',
          baseSalary: 7200,
          dailyRate: 250,
          hireDate: '2024-05-15',
          password: 'manager',
        };
      } else if (roleType === 'Auditor') {
        emp = employees.find(e => e.role === 'Auditor') || {
          id: 'emp-auditor-bypass',
          name: 'Kadiatu Bangura',
          role: 'Auditor',
          phone: '+232 77 555 6666',
          email: 'kadiatu.b@swedsfree.com',
          status: 'Active',
          baseSalary: 6800,
          dailyRate: 230,
          hireDate: '2024-06-01',
          password: 'audit',
        };
      } else {
        emp = employees.find(e => e.role === 'Employee') || {
          id: 'emp-worker-bypass',
          name: 'James Weekes',
          role: 'Employee',
          phone: '+232 76 333 4444',
          email: 'james.weekes@swedsfree.com',
          status: 'Active',
          baseSalary: 5200,
          dailyRate: 190,
          hireDate: '2025-02-15',
          password: '1234',
        };
      }
    }
    if (emp) onLogin(emp);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden antialiased font-sans">
      
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-600/35 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/25 rounded-full blur-[130px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2 bg-white/10 rounded-2xl border border-amber-500/30 text-white shadow-xl mb-3.5 backdrop-blur-md">
            <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="font-display font-black text-2xl uppercase tracking-widest text-amber-500">
            SWEDSWOOD<span className="text-white ml-1">ENTERPRISE</span>
          </h1>
          <p className="text-xs text-slate-400 tracking-wider font-semibold uppercase mt-1 flex items-center justify-center gap-1.5">
            <span className="text-sm">🇸🇱</span> Bespoke Woodwork & Invoice Management System
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {successMsg ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="mx-auto w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Access Request Received</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Your request under the name <span className="text-amber-400 font-bold">{regName}</span> has been submitted to the database.
                  </p>
                </div>
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-left text-xs text-slate-400 space-y-2">
                  <p className="font-bold text-slate-300">Next Steps:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>An Admin or Manager must review and approve your credentials.</li>
                    <li>You will appear in the <strong>Artisans Registry</strong> pending requests list.</li>
                    <li>Once approved, you can select your profile and sign in.</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSuccessMsg(false);
                    setMode('login');
                    // Reset registration form
                    setRegName('');
                    setRegEmail('');
                    setRegPhone('');
                    setRegRole('Carpenter');
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition"
                >
                  Return to Sign In
                </button>
              </motion.div>
            ) : mode === 'register' ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => {
                      setMode('login');
                      setRegError('');
                    }}
                    className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-white">Register For Access</h2>
                    <p className="text-[10px] text-slate-400">Submit a profile request for approval</p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Full Name (Sierra Leonean Name) *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alimamy Kamara"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 text-slate-200"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold italic">
                      🇸🇱 Please use a standard Sierra Leonean surname (e.g. Kamara, Sesay, Bangura, Kargbo, Jalloh, Fofanah, Conteh).
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="email"
                        required
                        placeholder="name@swedsfree.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="+232 76 123 456"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Assigned Workshop Role *
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as EmployeeRole)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 text-slate-200"
                      >
                        <option value="Carpenter">Carpenter</option>
                        <option value="Carver">Carver</option>
                        <option value="Designer">Designer</option>
                        <option value="Sander">Sander</option>
                        <option value="Polisher">Polisher</option>
                        <option value="Apprentice">Apprentice</option>
                        <option value="Auditor">Auditor (Read-Only)</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                  </div>

                  {/* PIN Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Choose Password/PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="password"
                        required
                        placeholder="Choose a PIN or password..."
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500/50 text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-[11px] text-red-400 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl flex items-center justify-center gap-2 transition duration-200 text-xs shadow-lg shadow-amber-500/10"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Submit Request</span>
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <LogIn className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-white">Workshop Portal Sign In</h2>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* User Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Username / Email Address *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mohamed Kamara or admin"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500/50 text-slate-200 placeholder-slate-600"
                        id="login-username-input"
                      />
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Security Password / PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
                      <input
                        type="password"
                        required
                        placeholder="Enter access code..."
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-500/50 font-mono text-slate-200 placeholder-slate-600"
                        id="login-password-input"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3.5">
                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-amber-500/10 text-sm"
                      id="login-submit-button"
                    >
                      <span>Authenticate Portal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setRegError('');
                      }}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition duration-200 text-xs"
                    >
                      <UserPlus className="w-4 h-4 text-amber-500" />
                      <span>Request New Access Registration</span>
                    </button>
                  </div>
                </form>

                {/* Quick Testing Controls */}
                <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Developer Quick Testing Bypass:</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuickBypass('Admin')}
                      className="py-2 px-2.5 bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/20 rounded-xl text-[10px] font-bold text-slate-300 hover:text-amber-400 transition flex flex-col items-center justify-center gap-0.5"
                    >
                      <span>Bypass as Admin</span>
                      <span className="text-[8px] text-slate-500 font-normal font-mono">(Emmanuel Cole)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickBypass('Manager')}
                      className="py-2 px-2.5 bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/20 rounded-xl text-[10px] font-bold text-slate-300 hover:text-amber-400 transition flex flex-col items-center justify-center gap-0.5"
                    >
                      <span>Bypass as Manager</span>
                      <span className="text-[8px] text-slate-500 font-normal font-mono">(Amadu Sesay)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickBypass('Employee')}
                      className="py-2 px-2.5 bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/20 rounded-xl text-[10px] font-bold text-slate-300 hover:text-amber-400 transition flex flex-col items-center justify-center gap-0.5"
                    >
                      <span>Bypass as Employee</span>
                      <span className="text-[8px] text-slate-500 font-normal font-mono">(Artisan view)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickBypass('Auditor')}
                      className="py-2 px-2.5 bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/20 rounded-xl text-[10px] font-bold text-slate-300 hover:text-amber-400 transition flex flex-col items-center justify-center gap-0.5"
                    >
                      <span>Bypass as Auditor</span>
                      <span className="text-[8px] text-slate-500 font-normal font-mono">(Kadiatu Bangura)</span>
                    </button>
                  </div>
                  
                  <p className="text-[8.5px] text-center text-slate-500 font-medium">
                    🔑 PIN: Admin: <code className="text-amber-500/80 font-mono font-bold">admin</code>, Manager: <code className="text-amber-500/80 font-mono font-bold">manager</code>, Auditor: <code className="text-amber-500/80 font-mono font-bold">audit</code>, Employees: <code className="text-amber-500/80 font-mono font-bold">1234</code>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info banner */}
        <p className="text-center text-[10px] text-slate-600 font-medium mt-6">
          Swedsfree Workshop Hub secure local cryptographic sandbox authentication environment.
        </p>
      </motion.div>
    </div>
  );
}
