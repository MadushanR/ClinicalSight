import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AvatarMenu() {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (!user) return null;

  const initials = `${(user.firstName||'U').slice(0,1)}${(user.lastName||'').slice(0,1)}`.toUpperCase();
  const roleLabel = (user.role || 'Support Worker').toString();

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Keep name inside the dropdown and greeting on the left to reduce clutter */}
      <button
        aria-label="User menu"
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        title={`${user.firstName} ${user.lastName}`.trim()}
      >
        {user.avatarUrl ? (
          <img className="avatar-circle avatar-img" src={user.avatarUrl} alt="avatar" />
        ) : (
          <div className="avatar-circle">{initials}</div>
        )}
      </button>
      {open && (
        <div className="menu">
          <div className="menu-header">{user.firstName} {user.lastName} • {roleLabel}</div>
          <button className="menu-item" onClick={() => { setOpen(false); nav('/profile'); }}>My Profile</button>
          <button className="menu-item" onClick={() => { logout(); setOpen(false); nav('/'); }}>Logout</button>
        </div>
      )}
    </div>
  );
}
