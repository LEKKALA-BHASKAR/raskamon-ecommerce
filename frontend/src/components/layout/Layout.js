import React from 'react';
import Header from './Header';
import Footer from './Footer';
import WhatsAppButton from '../ui/WhatsAppButton';

const Layout = ({ children, noFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--sattva-cream)]">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      {!noFooter && <Footer />}
      <WhatsAppButton />
    </div>
  );
};

export default Layout;
