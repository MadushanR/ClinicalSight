import React from 'react';
import '../styles.css';

export default function ProgressBar({ current, total }) {
  const max = Math.max(total || 0, 1);
  const value = Math.min(Math.round((current / max) * 100), 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <progress className="progressBar" value={value} max={100} />
      <span style={{ fontSize: 12 }}>{value}%</span>
    </div>
  );
}

