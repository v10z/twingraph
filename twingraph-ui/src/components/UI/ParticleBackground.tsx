import React from 'react';

export const ParticleBackground: React.FC = () => {
  const svgPattern = `data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(122,166,218,0.05)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E`;

  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#002451] via-[#001733] to-[#00346e] opacity-90" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{ backgroundImage: `url("${svgPattern}")` }}
      />
    </div>
  );
};