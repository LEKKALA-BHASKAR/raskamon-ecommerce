import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';

const Footer = () => {
  return (
    <footer className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]" data-testid="site-footer">
      {/* Main Footer */}
      <div className="container-sattva py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-4">
              <BrandLogo size="sm" />
            </div>
            <p className="text-[rgba(250,248,245,0.65)] text-sm leading-relaxed mb-4">
              Premium Ayurvedic wellness crafted with ancient wisdom for modern lives. Dr MediScie brings science-backed care and nature's finest ingredients together.
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
                { label: 'FAQ', to: '/faq' },
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
                <span>info@drmediscie.com</span>
              </li>
              <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                <Phone size={14} className="mt-0.5 flex-shrink-0" />
                <span>+91-8860908070</span>
              </li>
              <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>Delhi, New Delhi, 110034</span>
              </li>
            </ul>
          </div>
        </div>
      </div>


    </footer>
  );
};

export default Footer;
