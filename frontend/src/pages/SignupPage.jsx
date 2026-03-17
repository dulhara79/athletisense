import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, User, Eye, EyeOff, ShieldCheck, Users, UserPlus, Search } from 'lucide-react';

export default function SignupPage({ onToggle }) {
    const { signup, checkUsernameAvailable } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('athlete');
    const [username, setUsername] = useState('');
    const [age, setAge] = useState('');
    const [sport, setSport] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Athlete-specific: independent or has a coach
    const [athleteType, setAthleteType] = useState('independent'); // 'independent' | 'has_coach'
    const [coachUsername, setCoachUsername] = useState('');

    // Username validation state
    const [usernameStatus, setUsernameStatus] = useState(''); // '' | 'checking' | 'available' | 'taken'

    const [showAccountTypeOptions, setShowAccountTypeOptions] = useState(false);
    const [selectedAccountTypeTitle, setSelectedAccountTypeTitle] = useState('Athlete');

    const handleAccountTypeChange = (newRole, newTitle) => {
        setRole(newRole);
        setSelectedAccountTypeTitle(newTitle);
        setShowAccountTypeOptions(false);
    };

    const handleUsernameCheck = async (value) => {
        setUsername(value);
        setUsernameStatus('');
        if (!value.trim() || value.length < 3) return;

        setUsernameStatus('checking');
        const available = await checkUsernameAvailable(value.trim());
        setUsernameStatus(available ? 'available' : 'taken');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (!username.trim() || username.length < 3) {
            setError('Username must be at least 3 characters');
            setLoading(false);
            return;
        }

        if (usernameStatus === 'taken') {
            setError('This username is already taken');
            setLoading(false);
            return;
        }

        if (role === 'athlete' && athleteType === 'has_coach' && !coachUsername.trim()) {
            setError("Please enter your coach's username");
            setLoading(false);
            return;
        }

        const isAthlete = role === 'athlete';
        const metadata = {
            name,
            username: username.trim(),
            role: isAthlete ? 'athlete' : 'admin',
            title: role === 'coach' ? 'Coach' : role === 'therapist' ? 'Therapist' : 'Athlete',
            athleteId: isAthlete ? username.trim() : null,
            age: parseInt(age, 10) || null,
            sport: isAthlete ? sport : null,
            independent: isAthlete ? athleteType === 'independent' : null,
            coachUsername: (isAthlete && athleteType === 'has_coach') ? coachUsername.trim() : null,
        };

        const result = await signup(email, password, metadata);
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    const usernameIndicator = {
        checking: { text: 'Checking...', color: 'text-premium-400' },
        available: { text: '✓ Available', color: 'text-emerald-600' },
        taken: { text: '✗ Taken', color: 'text-rose-500' },
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
                        {/* Full Name */}
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

                        {/* Email */}
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

                        {/* Username + Account Type row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">
                                    Username {role === 'athlete' && <span className="text-premium-400 normal-case">(= Device ID)</span>}
                                </label>
                                <div className="relative">
                                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => handleUsernameCheck(e.target.value)}
                                        placeholder={role === 'athlete' ? 'e.g., ATH_001' : 'e.g., coach_rivera'}
                                        className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required
                                    />
                                </div>
                                {usernameStatus && (
                                    <p className={`text-xs font-bold mt-1 ${usernameIndicator[usernameStatus]?.color}`}>
                                        {usernameIndicator[usernameStatus]?.text}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Account Type</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowAccountTypeOptions(!showAccountTypeOptions)}
                                        className="w-full flex items-center justify-between bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-premium-400" />
                                            <span>{selectedAccountTypeTitle || 'Select Type'}</span>
                                        </div>
                                        <ChevronDown size={16} className={`text-premium-400 transition-transform ${showAccountTypeOptions ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showAccountTypeOptions && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-premium-200 rounded-xl shadow-lg z-20 py-2">
                                            <button
                                                type="button"
                                                onClick={() => handleAccountTypeChange('athlete', 'Athlete')}
                                                className="w-full text-left px-4 py-2 hover:bg-premium-50 text-sm font-medium text-premium-900 transition-colors flex items-center gap-2"
                                            >
                                                <Activity size={16} className="text-accent-blue" />
                                                Athlete
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAccountTypeChange('coach', 'Coach')}
                                                className="w-full text-left px-4 py-2 hover:bg-premium-50 text-sm font-medium text-premium-900 transition-colors flex items-center gap-2"
                                            >
                                                <Activity size={16} className="text-accent-purple" />
                                                Coach
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAccountTypeChange('therapist', 'Therapist')}
                                                className="w-full text-left px-4 py-2 hover:bg-premium-50 text-sm font-medium text-premium-900 transition-colors flex items-center gap-2"
                                            >
                                                <Activity size={16} className="text-accent-green" />
                                                Therapist
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Password + Age row */}
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Age</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={e => setAge(e.target.value)}
                                    placeholder="24"
                                    className="w-full bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Athlete-specific fields */}
                        {role === 'athlete' && (
                            <div className="space-y-4 animate-fade-up">
                                {/* Sport */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Sport</label>
                                    <input
                                        type="text"
                                        value={sport}
                                        onChange={e => setSport(e.target.value)}
                                        placeholder="e.g., Sprinter"
                                        className="w-full bg-surface border border-premium-200 rounded-xl px-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                        required
                                    />
                                </div>

                                {/* Independent or Has Coach */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-3 block">Training Setup</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setAthleteType('independent'); setCoachUsername(''); }}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                                                athleteType === 'independent'
                                                    ? 'border-accent-purple bg-violet-50 text-accent-purple'
                                                    : 'border-premium-200 bg-surface text-premium-500 hover:border-premium-300'
                                            }`}
                                        >
                                            <User size={16} />
                                            Independent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAthleteType('has_coach')}
                                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                                                athleteType === 'has_coach'
                                                    ? 'border-accent-purple bg-violet-50 text-accent-purple'
                                                    : 'border-premium-200 bg-surface text-premium-500 hover:border-premium-300'
                                            }`}
                                        >
                                            <Users size={16} />
                                            I Have a Coach
                                        </button>
                                    </div>
                                </div>

                                {/* Coach username input */}
                                {athleteType === 'has_coach' && (
                                    <div className="animate-fade-up">
                                        <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Coach's Username</label>
                                        <div className="relative">
                                            <UserPlus size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                                            <input
                                                type="text"
                                                value={coachUsername}
                                                onChange={e => setCoachUsername(e.target.value)}
                                                placeholder="Enter your coach's username"
                                                className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-premium-400 mt-1">A connection request will be sent to your coach</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-accent-danger text-sm font-medium flex items-center gap-2">
                                <span className="text-lg leading-none">⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || usernameStatus === 'taken'}
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
