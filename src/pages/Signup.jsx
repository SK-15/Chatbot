import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';
import appIcon from '../assets/icon.png';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.signup(email, password);
            // Auto-redirect to login after signup
            navigate('/login', { state: { message: 'Account created! Please log in.' } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src={appIcon} alt="Logo" className="w-full h-full object-contain" />
                </div>

                <h1 className="auth-title">Create an account</h1>
                <p className="auth-subtitle">
                    Start your journey with us today.
                </p>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="Email address"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ marginBottom: '1rem' }}
                        />
                        <input
                            id="password"
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>
                    )}

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Continue'}
                    </button>
                </form>

                <p className="mt-6 text-xs text-text-muted" style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Log in</Link>
                </p>
            </div>
        </div>
    );
}
