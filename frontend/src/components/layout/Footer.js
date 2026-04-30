import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]" data-testid="site-footer">
      {/* Newsletter */}
      <div className="border-b border-[rgba(200,169,110,0.2)]">
        <div className="container-sattva py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-heading text-2xl font-semibold">Join the Sattva Circle</h3>
              <p className="text-[rgba(250,248,245,0.7)] text-sm mt-1">Wellness wisdom, rituals & exclusive offers — curated for you.</p>
            </div>
            <form className="flex w-full md:w-auto gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 md:w-72 px-4 py-2.5 rounded-lg bg-[rgba(255,255,255,0.1)] border border-[rgba(200,169,110,0.3)] text-[var(--sattva-cream)] placeholder-[rgba(250,248,245,0.5)] text-sm focus:outline-none focus:border-[var(--sattva-gold)]"
              />
              <button type="submit" className="px-5 py-2.5 bg-[var(--sattva-gold)] text-[var(--sattva-forest)] rounded-lg text-sm font-semibold hover:bg-[#b8985e] transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container-sattva py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[var(--sattva-gold)] rounded-full flex items-center justify-center">
                <span className="text-[var(--sattva-forest)] text-xs font-bold">S</span>
              </div>
              <span className="font-heading text-xl font-semibold tracking-tight">Sattva</span>
            </div>
            <p className="text-[rgba(250,248,245,0.65)] text-sm leading-relaxed mb-4">
              Premium Ayurvedic wellness crafted with ancient wisdom for modern lives. Every product tells a story of nature's finest.
            </p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[var(--sattva-gold)] hover:text-[var(--sattva-forest)] transition-colors">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{fontFamily: 'Manrope'}}>SHOP</h4>
            <ul className="space-y-2">
              {['Skincare', 'Hair Care', 'Wellness', 'Body Care', 'Aromatherapy'].map(cat => (
                <li key={cat}>
                  <Link to={`/products?category=${cat.replace(' ', '+')}`} className="text-[rgba(250,248,245,0.7)] text-sm hover:text-[var(--sattva-gold)] transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{fontFamily: 'Manrope'}}>HELP</h4>
            <ul className="space-y-2">
              {[
                { label: 'About Us', to: '/about' },
                { label: 'Contact Us', to: '/contact' },
                { label: 'Blog', to: '/blog' },
                { label: 'Shipping & Returns', to: '/shipping' },
                { label: 'Privacy Policy', to: '/privacy' },
                { label: 'Terms & Conditions', to: '/terms' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[rgba(250,248,245,0.7)] text-sm hover:text-[var(--sattva-gold)] transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{fontFamily: 'Manrope'}}>CONTACT</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                <Mail size={14} className="mt-0.5 flex-shrink-0" />
                <span>hello@sattva.in</span>
              </li>
              <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                <Phone size={14} className="mt-0.5 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>Mumbai, Maharashtra, India</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-[rgba(200,169,110,0.2)]">
        <div className="container-sattva py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[rgba(250,248,245,0.5)] text-xs">© 2024 Sattva. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" className="h-4 opacity-60" />
            <span className="text-[rgba(250,248,245,0.5)] text-xs">UPI · COD · Netbanking</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
