import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="xs" />

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/login" className="hover:text-blue-600 transition-colors">
              Student Sign In
            </Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">
              Print Documents
            </Link>
          </div>

          <p className="text-[11px] text-slate-400">
            © 2026 CampusPrint. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
