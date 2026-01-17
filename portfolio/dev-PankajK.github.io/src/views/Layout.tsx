import { ModeToggle } from '@/components/ModeToggle';
import Navbar from '@/components/Navbar';
import React from 'react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ModeToggle />
      
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

export default Layout;