import React, { useState } from 'react';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { alert('Passwords do not match'); return; }
    alert(`Registered ${form.firstName} ${form.lastName}`);
  };

  return (
    <div className="container">
      <h1 className="page-title">Register</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              First Name
              <input name="firstName" value={form.firstName} onChange={handleChange} />
            </label>
            <label>
              Last Name
              <input name="lastName" value={form.lastName} onChange={handleChange} />
            </label>
          </div>
          <div className="form-row single">
            <label>
              Email
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleChange} />
            </label>
            <label>
              Confirm Password
              <input type="password" name="confirm" value={form.confirm} onChange={handleChange} />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit">Create Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}

