import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout: React.FC = () => (
  <div className="w-full min-h-screen flex flex-col flex-1">
    <Outlet />
  </div>
);

export default PublicLayout;
