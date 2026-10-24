import React, { useState } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  ClipboardCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Droplets,
  Activity,
  Truck,
  CheckCircle2,
  Lock,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types/auth';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [email, setEmail] = useState<string>('priya.sharma@patientcare.in');
  const [password, setPassword] = useState<string>('demo-pass-2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const roleConfigs: Record<
    UserRole,
    {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      badge: string;
      description: string;
      defaultEmail: string;
      buttonText: string;
      landingRoute: string;
      features: string[];
    }
  > = {
    patient: {
      title: 'Patient Portal',
      icon: HeartPulse,
      badge: 'Public & Caregiver',
      description: 'Request emergency blood units, track real-time delivery dispatches, and access hospital guidance.',
      defaultEmail: 'priya.sharma@patientcare.in',
      buttonText: 'Continue as Patient',
      landingRoute: '/patient',
      features: ['Dedicated request submission', 'Real-time transit tracker', 'Strict data privacy scoping'],
    },
    admin: {
      title: 'Command Center',
      icon: ShieldCheck,
      badge: 'Operational Authority',
      description: 'Full NCR network oversight, autonomous drone & ambulance dispatch, and inventory rebalancing.',
      defaultEmail: 'ayush.rawat@rheon.ai',
      buttonText: 'Continue as Admin',
      landingRoute: '/admin',
      features: ['Live NCR grid analytics', 'Autonomous route dispatch', 'Trauma center & donor registry'],
    },
    verifier: {
      title: 'Safety Verifier',
      icon: ClipboardCheck,
      badge: 'Clinical Immunohematology',
      description: 'Read-oriented clinical audit queue, deterministic compatibility validation, and cold-chain compliance.',
      defaultEmail: 'sunita.rao@delhi-transfusion.gov.in',
      buttonText: 'Continue as Verifier',
      landingRoute: '/verifier',
      features: ['Clinical inspection queue', 'Deterministic 6-Point Gate', 'Cold-chain telemetry audit'],
    },
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(roleConfigs[role].defaultEmail);
    setEmailError('');
    setPasswordError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password || password.trim().length === 0) {
      setPasswordError('Please enter a password');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) return;

    setIsLoading(true);

    // Realistic brief submission feedback
    setTimeout(() => {
      login(selectedRole, email);
      navigate(roleConfigs[selectedRole].landingRoute);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-canvas-sage p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased">
      {/* Split Screen Container */}
      <div className="w-full max-w-[1400px] min-h-[680px] bg-white rounded-3xl shadow-shell border border-white/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Panel: Brand & Mission */}
        <div className="lg:col-span-5 bg-teal-brand text-white p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle geometric background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-[32px] border-white" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border-[32px] border-white" />
          </div>

          <div className="relative z-10">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-card">
                <img src="/logo.png" alt="RHEON AI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-white">RHEON AI</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-crimson text-white rounded font-mono">
                    NCR
                  </span>
                </div>
                <p className="text-xs text-teal-muted font-medium">Predict. Orchestrate. Respond.</p>
              </div>
            </div>

            {/* Main Headline & Mission */}
            <div className="mt-10 sm:mt-14">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-300 border border-white/15 backdrop-blur-xs">
                <Activity className="w-3.5 h-3.5" />
                Live Emergency Blood Logistics Grid
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4 leading-tight">
                Every second <br />
                <span className="text-emerald-300">matters.</span>
              </h1>
              <p className="text-sm text-teal-muted/90 mt-4 leading-relaxed font-normal">
                Intelligent, multi-source blood supply coordination engineered for time-critical surgical and trauma emergencies across 13 major Delhi NCR medical hubs.
              </p>
            </div>

            {/* Coordination Architecture Visual */}
            <div className="mt-8 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
              <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase block mb-3">
                Autonomous Coordination Flow
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center">
                  <Droplets className="w-5 h-5 text-crimson-light mb-1.5" />
                  <span className="font-bold text-white text-[11px]">Availability</span>
                  <span className="text-[10px] text-teal-muted">Real-time Stock</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-300 mb-1.5" />
                  <span className="font-bold text-white text-[11px]">6-Point Gate</span>
                  <span className="text-[10px] text-teal-muted">Zero Heuristics</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex flex-col items-center">
                  <Truck className="w-5 h-5 text-sky-300 mb-1.5" />
                  <span className="font-bold text-white text-[11px]">Rapid Transit</span>
                  <span className="text-[10px] text-teal-muted">Drone & Siren</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer supporting details */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-muted">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Safety-first decision support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Deterministic allocation</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Role-Based Sign In Form */}
        <div className="lg:col-span-7 bg-shell-bg p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-shell-border">
              <div>
                <h2 className="text-2xl font-bold text-ink-primary tracking-tight">Welcome to RHEON</h2>
                <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
                  Sign in to continue to your authorized workspace.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-shell-border rounded-full text-xs font-semibold text-teal-brand shadow-xs self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5" />
                <span>Demo Evaluation Mode</span>
              </div>
            </div>

            {/* Select Role Label */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-ink-primary uppercase tracking-wider">
                  Select Workspace Role
                </label>
                <span className="text-xs text-ink-secondary">Choose any role to test its specific experience</span>
              </div>

              {/* 3 Selectable Role Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['patient', 'admin', 'verifier'] as UserRole[]).map((r) => {
                  const cfg = roleConfigs[r];
                  const Icon = cfg.icon;
                  const isSelected = selectedRole === r;

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`text-left p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between min-h-[140px] ${
                        isSelected
                          ? 'bg-white border-teal-brand ring-2 ring-teal-brand/20 shadow-md'
                          : 'bg-white/80 hover:bg-white border-shell-border hover:border-teal-brand/40 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-teal-brand text-white shadow-xs'
                                : 'bg-shell-bg text-ink-secondary'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-teal-brand text-white flex items-center justify-center text-[10px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-ink-primary">{cfg.title}</h3>
                        <p className="text-[11px] text-ink-secondary mt-1 leading-snug line-clamp-2">
                          {cfg.description}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-shell-border/60">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-teal-brand/10 text-teal-brand'
                              : 'bg-shell-bg text-ink-secondary'
                          }`}
                        >
                          {cfg.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Role Feature Highlights */}
              <div className="mt-3 p-3 bg-white border border-shell-border rounded-xl flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                <span className="font-bold text-teal-brand flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  {roleConfigs[selectedRole].title} Scope:
                </span>
                {roleConfigs[selectedRole].features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-brand" />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-ink-primary mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    placeholder="Enter registered email"
                    className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 transition-all ${
                      emailError ? 'border-crimson focus:border-crimson' : 'border-shell-border focus:border-teal-brand'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-crimson flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-ink-primary">Password</label>
                  <span className="text-[11px] text-ink-secondary">Any value accepted in demo</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="••••••••••••"
                    className={`w-full pl-4 pr-11 py-2.5 bg-white border rounded-xl text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-teal-brand/20 transition-all ${
                      passwordError ? 'border-crimson focus:border-crimson' : 'border-shell-border focus:border-teal-brand'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-secondary hover:text-ink-primary"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-crimson flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Remember Me & Demo Notice */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-ink-primary font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-brand focus:ring-teal-brand border-shell-border"
                  />
                  <span>Remember demo session</span>
                </label>
                <span className="text-ink-secondary text-[11px]">Local browser storage only</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-5 bg-teal-brand hover:bg-teal-brand-hover text-white rounded-xl text-sm font-bold shadow-pill flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{roleConfigs[selectedRole].buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Privacy & Prototype Transparency Disclaimer */}
          <div className="mt-6 pt-4 border-t border-shell-border">
            <div className="p-3 bg-white/70 rounded-xl border border-shell-border text-[11px] text-ink-secondary leading-relaxed flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-teal-brand shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink-primary font-semibold">Frontend Demonstration Sign-In:</strong>{' '}
                This prototype allows switching between Patient, Admin, and Verifier workspaces without backend authentication endpoints. Passwords are never transmitted or stored.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
