import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Eye, EyeOff, Loader } from 'lucide-react';
import Logo from '../Common/Logo';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Login attempt:', formData.email);

    try {
      const result = await login(formData.email, formData.password);
      console.log('Login successful:', result);
      // No redirections - App.jsx will handle showing the right page based on role
    } catch (error) {
      console.error('Login failed:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        <span className="fspro-bg-text">FSPro</span>
      </div>
      <div className="login-card" style={{ boxShadow: '0 10px 32px rgba(52, 78, 123, 0.15)', position: 'relative', zIndex: 2, padding: '32px 28px 28px 28px', maxWidth: 380, width: '100%', margin: '20px 0' }}>
        <div className="text-center mb-20">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
            padding: '0 20px'
          }}>
            <Logo
              height="auto"
              width="280px"
              style={{
                maxHeight: '90px',
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
              }}
            />
          </div>
          <h1 className="login-title" style={{ fontWeight: 800, letterSpacing: 1, fontSize: '2rem', marginBottom: 6, marginTop: 0 }}>Login</h1>
          <div style={{ width: '60px', height: '3px', background: 'linear-gradient(135deg, #000000 0%, #1a237e 50%, #1E88E5 100%)', borderRadius: 2, margin: '0 auto 12px auto' }} />
          <div style={{
            background: 'linear-gradient(135deg, #000000 0%, #1a237e 50%, #1E88E5 100%)',
            color: '#ffffff !important',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            marginBottom: 20,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textTransform: 'uppercase',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'inline-block',
          }}>
            <span style={{ color: '#ffffff' }}>Employee Management System</span>
          </div>
        </div>
        {error && (
          <div style={{ background: '#ffeaea', color: '#c0392b', padding: '10px', borderRadius: '6px', marginBottom: '18px', textAlign: 'center', fontSize: '14px' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group" style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
              placeholder=" "
              aria-label="Email"
              autoFocus
              style={{ paddingTop: '18px', paddingBottom: '8px' }}
              autoComplete="email"
            />
            <label className="form-label" htmlFor="email" style={{ position: 'absolute', left: '12px', top: formData.email ? '2px' : '14px', fontSize: formData.email ? '12px' : '15px', color: formData.email ? '#1a237e' : '#333', background: 'white', padding: '0 4px', transition: 'all 0.2s', pointerEvents: 'none' }}>Email</label>
          </div>
          <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
              placeholder=" "
              aria-label="Password"
              style={{ paddingTop: '18px', paddingBottom: '8px' }}
              autoComplete="current-password"
            />
            <label className="form-label" htmlFor="password" style={{ position: 'absolute', left: '12px', top: formData.password ? '2px' : '14px', fontSize: formData.password ? '12px' : '15px', color: formData.password ? '#1a237e' : '#333', background: 'white', padding: '0 4px', transition: 'all 0.2s', pointerEvents: 'none' }}>Password</label>
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
                padding: 0
              }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#1a237e', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ marginRight: '7px' }}
              />
              Remember me
            </label>
            <a href="#" style={{ color: '#1a237e', fontSize: '14px', textDecoration: 'none' }} tabIndex={0}>
              Forgot password?
            </a>
          </div>
          <button
            type="submit"
            className="btn btn-primary modern-login-btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, fontSize: '16px', letterSpacing: 0.5, marginTop: 4 }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <Loader size={20} className="spin" /> : <LogIn size={20} />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
