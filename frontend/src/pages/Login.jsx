import React, { useState } from 'react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); alert(`Logged in as ${form.email}`); };

  return (
    <div className="container">
      <h1 className="page-title">Login</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row single">
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </label>
          </div>
          <div className="form-row single">
            <label>
              Password
              <input name="password" type="password" value={form.password} onChange={handleChange} />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}

