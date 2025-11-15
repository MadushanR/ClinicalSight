import React, { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Auth() {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultTab = params.get('tab') === 'register' ? 'register' : 'login';
  const [tab, setTab] = useState(defaultTab);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const submitLogin = async (e) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/');
    } catch (err) {
      alert('Login failed: ' + (err.message || 'Unknown error'));
    }
  };

  // Register form
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', sex: 'unspecified', email: '', password: '', confirm: '' });
  const [showPwdTips, setShowPwdTips] = useState(false);
  const submitRegister = async (e) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      await register({
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        sex: regForm.sex,
        email: regForm.email,
        password: regForm.password,
      });
      alert('Registration successful. Please log in.');
      setTab('login');
      navigate('/auth?tab=login', { replace: true });
    } catch (err) {
      alert('Registration failed: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Access</h1>
      <div className="card auth-card">
        <div className="tab-list auth-tabs" role="tablist" aria-label="Authentication">
          <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')} role="tab" aria-selected={tab==='login'}>
            Login
          </button>
          <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')} role="tab" aria-selected={tab==='register'}>
            Register
          </button>
        </div>

        {/* Login Panel */}
        <div role="tabpanel" hidden={tab !== 'login'} className="tab-panel">
          <form onSubmit={submitLogin}>
            <div className="form-row single">
              <label>
                Email
                <input type="email" value={loginForm.email} onChange={(e)=>setLoginForm(f=>({...f,email:e.target.value}))} />
              </label>
            </div>
            <div className="form-row single">
              <label>
                Password
                <input type="password" value={loginForm.password} onChange={(e)=>setLoginForm(f=>({...f,password:e.target.value}))} />
              </label>
            </div>
            <div className="auth-actions">
              <button className="btn btn-primary" type="submit">Login</button>
              <div className="auth-links">
                <a href="https://support.clinicalsight.com/s/" target="_blank" rel="noreferrer">Login Help</a>
                <span className="dot" aria-hidden>•</span>
                <a href="https://clinicalsight.com/privacy-policy/" target="_blank" rel="noreferrer">Privacy Policy</a>
              </div>
            </div>
          </form>
        </div>

        {/* Register Panel */}
        <div role="tabpanel" hidden={tab !== 'register'} className="tab-panel">
          <form onSubmit={submitRegister}>
            <div className="form-row">
              <label>
                First Name
                <input value={regForm.firstName} onChange={(e)=>setRegForm(f=>({...f,firstName:e.target.value}))} />
              </label>
              <label>
                Last Name
                <input value={regForm.lastName} onChange={(e)=>setRegForm(f=>({...f,lastName:e.target.value}))} />
              </label>
            </div>
            <div className="form-row single">
              <label>
                Email
                <input type="email" value={regForm.email} onChange={(e)=>setRegForm(f=>({...f,email:e.target.value}))} />
              </label>
            </div>
            <div className="form-row" style={{ position: 'relative' }}>
              <label>
                Password
                <input
                  type="password"
                  value={regForm.password}
                  onChange={(e)=>setRegForm(f=>({...f,password:e.target.value}))}
                  onFocus={()=>setShowPwdTips(true)}
                  onBlur={()=>setShowPwdTips(false)}
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  value={regForm.confirm}
                  onChange={(e)=>setRegForm(f=>({...f,confirm:e.target.value}))}
                  onFocus={()=>setShowPwdTips(true)}
                  onBlur={()=>setShowPwdTips(false)}
                />
              </label>
            </div>
            {(showPwdTips || regForm.password) && (
              <div className="pwd-popover" role="note" aria-live="polite">
                <div className="tips-title">Password requirements</div>
                <ul>
                  <li>At least 8 characters</li>
                  <li>At most 1 uppercase letter</li>
                  <li>At least 1 lowercase letter</li>
                  <li>At least 1 number or symbol</li>
                </ul>
              </div>
            )}
            <div className="form-row single">
              <label>
                Sex / Gender
                <select value={regForm.sex} onChange={(e)=>setRegForm(f=>({...f,sex:e.target.value}))}>
                  <option value="unspecified">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">Create Account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
