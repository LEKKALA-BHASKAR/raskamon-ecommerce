import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';
import { useSiteNav } from '../../utils/useSiteNav';

const Footer = () => {
  const nav = useSiteNav();
  const categories = nav.categories || [];
  const footer = nav.footer || {};
  const help = footer.helpLinks || [];
  const contact = footer.contact || {};
  const socials = footer.socials || {};

  const socialIcons = [
    { Icon: Instagram, key: 'instagram' },
    { Icon: Facebook, key: 'facebook' },
    { Icon: Twitter, key: 'twitter' },
    { Icon: Youtube, key: 'youtube' },
  ];

  return (
    <footer className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]" data-testid="site-footer">
      <div className="container-sattva py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-4"><BrandLogo size="sm" /></div>
            <p className="text-[rgba(250,248,245,0.65)] text-sm leading-relaxed mb-4">
              {footer.tagline || "Premium Ayurvedic wellness crafted with ancient wisdom for modern lives."}
            </p>
            <div className="flex gap-3">
              {socialIcons.map(({ Icon, key }) => {
                const url = socials[key];
                if (!url) return null;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[var(--sattva-gold)] hover:text-[var(--sattva-forest)] transition-colors">
                    <Icon size={14} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Shop — driven by the same category tree as the header */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{ fontFamily: 'Manrope' }}>SHOP</h4>
            <ul className="space-y-2">
              {categories.length === 0 && (
                <li className="text-[rgba(250,248,245,0.5)] text-xs italic">Loading…</li>
              )}
              {categories.slice(0, 7).map(cat => (
                <li key={cat.id || cat.label}>
                  <Link to={cat.href || `/products?category=${encodeURIComponent(cat.label)}`} className="text-[rgba(250,248,245,0.7)] text-sm hover:text-[var(--sattva-gold)] transition-colors">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{ fontFamily: 'Manrope' }}>HELP</h4>
            <ul className="space-y-2">
              {help.map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[rgba(250,248,245,0.7)] text-sm hover:text-[var(--sattva-gold)] transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm tracking-wide mb-4 text-[var(--sattva-gold)]" style={{ fontFamily: 'Manrope' }}>CONTACT</h4>
            <ul className="space-y-3">
              {contact.email && (
                <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                  <Mail size={14} className="mt-0.5 flex-shrink-0" /><span>{contact.email}</span>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                  <Phone size={14} className="mt-0.5 flex-shrink-0" /><span>{contact.phone}</span>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-2 text-[rgba(250,248,245,0.7)] text-sm">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" /><span>{contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
