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

    // Match by full name, email, or role credential
    const trimmedUser = username.trim().toLowerCase();
    let emp = employees.find(emp => 
      emp.name.toLowerCase() === trimmedUser ||
      emp.email.toLowerCase() === trimmedUser
    );

    if (!emp && trimmedUser === 'admin') {
      emp = employees.find(e => e.role === 'Admin');
    }

    if (!emp) {
      setError('Username or email address not found in system records. Please verify credentials or request access.');
      return;
    }

    if (emp.status !== 'Active') {
      setError(`Account Access Denied: Your account status is currently '${emp.status}'. An active account is required to access the system and backup data.`);
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
      setError('Incorrect password or PIN code. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Please provide your name.');
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 relative overflow-hidden antialiased font-sans">
      
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-400/20 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-400/15 rounded-full blur-[130px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2 bg-white rounded-2xl border border-amber-500/30 text-slate-900 shadow-md mb-3.5">
            <img src="/logo.svg" alt="Swedswood Enterprise Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="font-display font-black text-2xl uppercase tracking-widest text-amber-600">
            SWEDSWOOD<span className="text-slate-900 ml-1">ENTERPRISE</span>
          </h1>
          <p className="text-xs text-slate-600 tracking-wider font-semibold uppercase mt-1 flex items-center justify-center gap-1.5">
            <span className="text-sm">🇸🇱</span> Bespoke Woodwork & Invoice Management System
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {successMsg ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6 space-y-4"
              >
                <div className="mx-auto w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">Access Request Received</h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    Your request under the name <span className="text-amber-600 font-bold">{regName}</span> has been submitted to the database.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-slate-800">Next Steps:</p>
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
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition"
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
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Register For Access</h2>
                    <p className="text-[10px] text-slate-500">Submit a profile request for approval</p>
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Full Name (Sierra Leonean Name) *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alimamy Kamara"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-slate-900"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-semibold italic">
                      🇸🇱 Please use a standard Sierra Leonean surname (e.g. Kamara, Sesay, Bangura, Kargbo, Jalloh, Fofanah, Conteh).
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        required
                        placeholder="name@swedsfree.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="+232 76 123 456"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Assigned Workshop Role *
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as EmployeeRole)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-slate-900"
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
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Choose Password/PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="password"
                        required
                        placeholder="Choose a PIN or password..."
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-[11px] text-red-700 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 font-bold text-white rounded-xl flex items-center justify-center gap-2 transition duration-200 text-xs shadow-md"
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
                  <LogIn className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-slate-900">Workshop Portal Sign In</h2>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  {/* User Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Username / Email Address *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mohamed Kamara or admin"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 text-slate-900 placeholder-slate-400"
                        id="login-username-input"
                      />
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Security Password / PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="password"
                        required
                        placeholder="Enter access code..."
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-slate-900 placeholder-slate-400"
                        id="login-password-input"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3.5">
                    <button
                      type="submit"
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 font-bold text-white rounded-xl flex items-center justify-center gap-2 transition duration-200 shadow-md text-sm"
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
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-200 text-xs"
                    >
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      <span>Request New Access Registration</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info banner */}
        <div className="mt-6 space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 rounded-full text-[10px] font-bold">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Active Account Required: Users must hold an active account to backup data & access workshop tools.</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            Swedsfree Workshop Hub secure local cryptographic sandbox authentication environment.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
