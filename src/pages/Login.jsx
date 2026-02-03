import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [password, setPassword] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await api.login(email, password);
            login(data.access_token, data.user_id);
            navigate('/chat');
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
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>

                <h1 className="auth-title">Log in or sign up</h1>
                <p className="auth-subtitle">
                    You'll get smarter responses and can upload files, images, and more.
                </p>

                <div className="form-group">
                    {['Google', 'Microsoft', 'Apple'].map((provider) => (
                        <button key={provider} type="button" className="social-btn">
                            <span className="social-icon">
                                <div className="w-5 h-5 bg-text-secondary/20 rounded-sm"></div>
                            </span>
                            <span className="mx-auto text-sm">Continue with {provider}</span>
                        </button>
                    ))}
                </div>

                <div className="divider">
                    <span className="divider-text">Or</span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4"> {/* space-y-4 is common util, can keep if desired or move to css. Let's assume strict vanilla and style form-group */}
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
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
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
                    Don't have an account?{' '}
                    <Link to="/signup" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}
