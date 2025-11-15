import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AvatarMenu from './AvatarMenu';
import banner from '../assets/banner.svg';

export default function Navbar() {
  const { user } = useContext(AuthContext);
  return (
    <nav className="nav" style={{
      backgroundImage: `linear-gradient(rgba(67, 80, 48, 0.92), rgba(67, 80, 48, 0.92)), url(${banner})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <div className="nav-title">{user ? `Welcome ${user.firstName || 'User'}` : 'Horizon Support Worker'}</div>
      <div className="nav-right">
        <div className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/resident-form">Care Form</Link>
          <Link to="/history">History</Link>
        </div>
        {user ? (
          <AvatarMenu />
        ) : (
          <Link to="/auth">Login / Register</Link>
        )}
      </div>
    </nav>
  );
}
