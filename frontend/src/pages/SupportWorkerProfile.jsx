import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { shiftWorkerAPI } from '../services/api';

export default function SupportWorkerProfile() {
  const { user, updateProfile } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    sex: 'unspecified',
    role: 'Support Worker',
    phone: '',
    email: '',
    shiftPreference: 'day',
    avatarUrl: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile((p) => ({
        ...p,
        firstName: user.firstName || p.firstName,
        lastName: user.lastName || p.lastName,
        sex: user.sex || p.sex,
        email: user.email || p.email,
        avatarUrl: user.avatarUrl || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If user has an ID, update on backend
      if (user?.id) {
        await shiftWorkerAPI.updateWorkerProfile(user.id, profile);
      }
      
      // Update local context
      updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        sex: profile.sex,
        role: profile.role,
        phone: profile.phone,
        email: profile.email,
        shiftPreference: profile.shiftPreference,
        notes: profile.notes,
        avatarUrl: profile.avatarUrl,
        avatar: `${(profile.firstName||'U').slice(0,1)}${(profile.lastName||'').slice(0,1)}`.toUpperCase(),
      });
      
      alert(`Saved profile for ${profile.firstName} ${profile.lastName}`);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
      alert('Error: ' + (err.message || 'Failed to save profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">My Profile</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              First Name
              <input name="firstName" value={profile.firstName} onChange={handleChange} />
            </label>
            <label>
              Last Name
              <input name="lastName" value={profile.lastName} onChange={handleChange} />
            </label>
          </div>

          <div className="form-row">
            <label>
              Role
              <input name="role" value={profile.role} onChange={handleChange} />
            </label>
            <label>
              Sex / Gender
              <select name="sex" value={profile.sex} onChange={handleChange}>
                <option value="unspecified">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Phone
              <input name="phone" value={profile.phone} onChange={handleChange} />
            </label>
            <label>
              Avatar URL (optional)
              <input name="avatarUrl" value={profile.avatarUrl} onChange={handleChange} placeholder="https://..." />
            </label>
          </div>

          <div className="form-row">
            <label>
              Email
              <input name="email" value={profile.email} onChange={handleChange} />
            </label>
            <label>
              Shift Preference
              <select name="shiftPreference" value={profile.shiftPreference} onChange={handleChange}>
                <option value="day">Day</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="flex">Flexible</option>
              </select>
            </label>
          </div>

          <div className="form-row single">
            <label>
              Notes
              <textarea rows={4} name="notes" value={profile.notes} onChange={handleChange} />
            </label>
          </div>

          {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
          
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
