import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, Eye, EyeOff, Wifi } from 'lucide-react';

export default function LoginPage({ onToggle }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(79,70,229,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-primary border border-indigo-100 flex items-center justify-center shadow-sm">
              <Activity size={28} className="text-accent-primary" />
            </div>
            <div className="text-left">
              <h1 className="font-display text-3xl tracking-wider text-premium-900 leading-none">ATHLETISENSE</h1>
              <p className="text-xs font-bold text-premium-500 tracking-widest uppercase mt-1">IoT Performance Platform</p>
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="card shadow-premium-hover border-premium-200 animate-fade-up bg-card/80 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-premium-900">Sign in</h2>
            <p className="text-sm font-medium text-premium-500 mt-1">Access your performance dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-premium-500 mb-2 block">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-premium-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all shadow-sm"
                  required
                />
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
                  className="w-full bg-surface border border-premium-200 rounded-xl pl-11 pr-11 py-3 text-sm font-medium text-premium-900 placeholder-premium-400 focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all shadow-sm"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-premium-400 hover:text-accent-primary transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-surface-danger border border-rose-200 rounded-xl px-4 py-3 text-accent-danger text-sm font-medium flex items-center gap-2">
                <span className="text-lg leading-none">⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-primary text-white font-bold tracking-wide py-3.5 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 mt-2 shadow-sm"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'SIGN IN'}
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="w-full text-premium-500 hover:text-accent-primary font-medium text-sm transition-colors mt-2"
            >
              Don't have an account? Sign Up
            </button>
          </form>
        </div>


      </div>
    </div>
  );
}
