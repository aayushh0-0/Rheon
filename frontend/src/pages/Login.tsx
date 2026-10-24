import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, UserRole } from '../services/auth';

const roles: { role: UserRole; label: string; description: string; icon: string }[] = [
  { role: 'PATIENT', label: 'Patient', description: 'Request & Track Blood Support', icon: '🏥' },
  { role: 'HOSPITAL_COORDINATOR', label: 'Hospital Coordinator', description: 'Manage Requests & Coordination', icon: '📋' },
  { role: 'ADMINISTRATOR', label: 'Administrator', description: 'Manage Network & System', icon: '⚙️' },
];

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('HOSPITAL_COORDINATOR');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(email, password, role);
            localStorage.setItem('user', JSON.stringify(user));
            switch (user.role) {
                case 'PATIENT': navigate('/patient-dashboard'); break;
                case 'HOSPITAL_COORDINATOR': navigate('/command-center'); break;
                case 'ADMINISTRATOR': navigate('/admin-dashboard'); break;
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white text-gray-900 font-sans">
            {/* Promotional Panel */}
            <div className="hidden lg:flex lg:w-[55%] bg-teal-900 text-white p-12 xl:p-20 flex-col justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">RHEON AI</h1>
                  <p className="text-lg text-teal-200 mt-1">Predict. Orchestrate. Respond.</p>
                </div>

                <div className="mt-12">
                  <h2 className="text-5xl xl:text-6xl font-black leading-[1.1] mb-6 tracking-tighter">Every Drop <br/>Creates Hope</h2>
                  <div className="space-y-4 text-teal-100/90 text-lg">
                    <p className="flex items-center gap-3">✓ <span className="font-medium">Faster Response</span></p>
                    <p className="flex items-center gap-3">✓ <span className="font-medium">Smarter Coordination</span></p>
                    <p className="flex items-center gap-3">✓ <span className="font-medium">Safer Communities</span></p>
                  </div>
                </div>

                <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                     <p className="text-white font-medium text-sm">Logistics Dashboard • NCR Network Active</p>
                </div>
            </div>

            {/* Authentication Panel */}
            <div className="flex-1 p-8 md:p-12 xl:p-20 flex flex-col justify-center bg-gray-50/50">
                <div className="max-w-md w-full mx-auto">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold tracking-tight text-gray-950">Welcome back</h2>
                      <p className="text-gray-600 mt-2">Access your RHEON AI dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Role Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700">Select Role</label>
                            <div className="grid grid-cols-1 gap-3">
                                {roles.map((r) => (
                                    <button
                                        key={r.role}
                                        type="button"
                                        onClick={() => setRole(r.role)}
                                        className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all duration-200 ${role === r.role ? 'border-teal-600 bg-teal-50 shadow-inner' : 'border-gray-200 bg-white hover:border-teal-200'}`}
                                    >
                                        <span className="text-2xl pt-0.5">{r.icon}</span>
                                        <div className="text-left">
                                            <div className={`font-semibold ${role === r.role ? 'text-teal-900' : 'text-gray-900'}`}>{r.label}</div>
                                            <div className="text-xs text-gray-500">{r.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none transition-all" required />
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-600 focus:border-transparent outline-none transition-all" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-sm font-medium text-teal-800 hover:text-teal-950">
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

                        <button type="submit" disabled={isLoading} className="w-full p-4 bg-teal-900 hover:bg-teal-950 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-900/20 active:translate-y-0.5">
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
