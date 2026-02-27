import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function SignupPage({ onToggle }) {
    const { signup } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('athlete');
    const [athleteId, setAthleteId] = useState('');
    const [age, setAge] = useState('');
    const [sport, setSport] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simple validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (role === 'athlete' && !athleteId.trim()) {
            setError('Athlete ID is required for Athletes');
            setLoading(false);
            return;
        }

        const metadata = {
            name,
            role: role === 'athlete' ? 'athlete' : 'admin',
            title: role === 'head_coach' ? 'Head Coach' : role === 'therapist' ? 'Therapist' : 'Athlete',
            athleteId: role === 'athlete' ? athleteId : null,
            age: role === 'athlete' ? parseInt(age, 10) || null : null,
            sport: role === 'athlete' ? sport : null
        };

        const result = await signup(email, password, metadata);
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: 'linear-gradient(rgba(124,58,237,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

            {/* Glow orbs */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md my-8">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-up">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                            <Activity size={28} className="text-accent-purple" />
                        </div>
                        <div className="text-left">
                            <h1 className="font-display text-3xl tracking-wider text-premium-900 leading-none">ATHLETISENSE</h1>
                            <p className="text-xs font-bold text-premium-500 tracking-widest uppercase mt-1">Create Performance Account</p>
                        </div>
                    </div>
                </div>

                {/* Signup card */}
                <div className="card shadow-premium-hover border-premium-200 animate-fade-up bg-card/80 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-premium-900">Sign Up</h2>
                        <p className="text-sm font-medium text-premium-500 mt-1">Join the IoT Performance Network</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Full Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Account Type</label>
                                <div className="relative">
                                    <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="athlete">Athlete</option>
                                        <option value="head_coach">Head Coach</option>
                                        <option value="therapist">Therapist</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Password</label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-11 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-premium-400 hover:text-accent-purple transition-colors">
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {role === 'athlete' && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-up">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Athlete ID</label>
                                    <input
                                        type="text"
                                        value={athleteId}
                                        onChange={e => setAthleteId(e.target.value)}
                                        placeholder="e.g., ATH_001"
                                        className="w-full bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required={role === 'athlete'}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Age</label>
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={e => setAge(e.target.value)}
                                        placeholder="24"
                                        className="w-full bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required={role === 'athlete'}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Sport</label>
                                    <input
                                        type="text"
                                        value={sport}
                                        onChange={e => setSport(e.target.value)}
                                        placeholder="e.g., Sprinter"
                                        className="w-full bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required={role === 'athlete'}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-accent-danger text-sm font-medium flex items-center gap-2">
                                <span className="text-lg leading-none">⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent-purple text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-violet-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 mt-6 shadow-sm"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'CREATE ACCOUNT'}
                        </button>

                        <button
                            type="button"
                            onClick={onToggle}
                            className="w-full text-premium-500 hover:text-accent-purple font-medium text-sm transition-colors mt-2"
                        >
                            Already have an account? Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
