import React, { useState } from "react";
import { ShieldCheck, Lock, Mail, ChevronRight, User, Database, Terminal } from "lucide-react";

interface LoginViewProps {
  onLogin: (role: "customer" | "admin" | "dev", email: string) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: "customer" as const,
      email: "customer@demo.com",
      password: "demo123",
      label: "Customer / Wellness Shopper",
      desc: "Order & reserve clinical products with live holding timers",
      icon: User,
      bgColor: "bg-indigo-50 border-indigo-100/85 hover:bg-indigo-100/40 text-indigo-700",
    },
    {
      role: "admin" as const,
      email: "admin@demo.com",
      password: "admin123",
      label: "Fulfillment Administrator",
      desc: "Monitor warehouse levels, release holds, and review logistics",
      icon: Database,
      bgColor: "bg-cyan-50 border-cyan-100 hover:bg-cyan-100/40 text-cyan-700",
    },
    {
      role: "dev" as const,
      email: "dev@demo.com",
      password: "dev123",
      label: "Platform Engineer Sandbox",
      desc: "Simulate massive concurrent thread locks & load diagnostics",
      icon: Terminal,
      bgColor: "bg-pink-50 border-pink-100 hover:bg-pink-100/40 text-pink-700",
    },
  ];

  const handleQuickLogin = (role: "customer" | "admin" | "dev", emailVal: string) => {
    setError(null);
    onLogin(role, emailVal);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const matched = demoAccounts.find(
      (acc) => acc.email === trimmedEmail && acc.password === password
    );

    if (matched) {
      onLogin(matched.role, matched.email);
    } else {
      setError("Invalid credentials. Try using one of the quick-access profiles below.");
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-gray-150 shadow-md">
        
        {/* Hub Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md tracking-wider">
            IR
          </div>
          <h2 className="mt-4 text-2xl font-black text-gray-900 tracking-tight">
            AuraMed Hub Portal
          </h2>
          <p className="mt-1.5 text-xs text-gray-400 font-medium">
            Dynamic Healthcare Inventory Reservation System
          </p>
        </div>

        {/* Form login tool */}
        <form className="mt-8 space-y-4" onSubmit={handleFormSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@demo.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-mono">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-900"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-1.5 py-3 px-4 border border-transparent text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 tracking-wider shadow-xs cursor-pointer transition-all"
          >
            <span>Proceed to Workspace</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Demo Access Badges */}
        <div className="pt-6 border-t border-gray-150 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 text-[9px] uppercase font-bold tracking-widest text-gray-400">
            Or Click a Quick Role Profile
          </div>

          <div className="space-y-2.5 mt-2">
            {demoAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleQuickLogin(account.role, account.email)}
                  className={`w-full p-3.5 rounded-xl border flex items-start gap-3 text-left transition-all duration-150 cursor-pointer ${account.bgColor}`}
                >
                  <div className="p-1.5 bg-white rounded-lg shadow-3xs mt-0.5 border border-gray-150/10 shrink-0">
                    <Icon className="h-4 w-4 text-inherit" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-gray-900">{account.label}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{account.desc}</p>
                    <p className="text-[9px] font-mono text-gray-400 mt-1 font-bold">
                      {account.email} &bull; {account.password}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust disclaimer */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-gray-400 font-medium inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
            Conforms strictly to double-sell protection sandbox
          </p>
        </div>

      </div>
    </div>
  );
}
