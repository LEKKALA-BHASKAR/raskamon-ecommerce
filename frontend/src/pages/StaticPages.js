import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';

export const About = () => (
  <Layout>
    <div className="container-sattva py-14">
      <div className="max-w-3xl mx-auto">
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-widest mb-3">Our Story</p>
        <h1 className="font-heading text-4xl font-semibold text-[var(--sattva-ink)] mb-6">About Sattva</h1>
        <div className="aspect-video rounded-2xl overflow-hidden mb-8">
          <img src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=85" alt="About Sattva" className="w-full h-full object-cover" />
        </div>
        <div className="prose prose-sm max-w-none text-[var(--sattva-ink)] space-y-4">
          <p className="text-lg leading-relaxed">Sattva was born from a simple belief: nature holds the answer to everything our modern lives deprive us of. Founded in 2020, we set out to bridge the 5,000-year wisdom of Ayurveda with the demands of contemporary wellness.</p>
          <p>Every product in our collection is crafted with intention. We source only the finest ingredients — wildcrafted herbs from the Himalayas, cold-pressed oils, and pure botanical extracts — and formulate them using traditional methods validated by modern science.</p>
          <p>We are proud to be 100% natural, cruelty-free, and sustainably packaged. No parabens, no sulfates, no synthetic fragrances. Just nature, in its purest form.</p>
        </div>
      </div>
    </div>
  </Layout>
);

export const Contact = () => {
  const [form, setForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({...p, [k]: e.target.value})) });
  return (
    <Layout>
      <div className="container-sattva py-14">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading text-3xl font-semibold mb-2">Get in Touch</h1>
          <p className="text-gray-500 mb-8">We'd love to hear from you. Our wellness experts are ready to help.</p>
          <div className="card-sattva p-8">
            <div className="space-y-4">
              {[{k:'name',l:'Name'},{k:'email',l:'Email',type:'email'},{k:'subject',l:'Subject'}].map(({k,l,type}) => (
                <div key={k}><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{l}</label>
                  <input type={type||'text'} {...f(k)} className="w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" /></div>
              ))}
              <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
                <textarea {...f('message')} rows={5} className="w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] resize-none" /></div>
              <button className="btn-primary w-full py-3">Send Message</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const Privacy = () => (
  <Layout><div className="container-sattva py-14 max-w-3xl"><h1 className="font-heading text-3xl mb-6">Privacy Policy</h1><p className="text-gray-600 text-sm">Last updated: December 2024</p><div className="mt-6 space-y-4 text-sm text-[var(--sattva-ink)] leading-relaxed"><p>Your privacy is important to us. Sattva collects personal information solely to fulfill orders, improve your experience, and communicate relevant wellness content.</p><p>We do not sell, trade, or rent your personal information to third parties. All payment transactions are processed through secure, encrypted gateways.</p><p>Cookies are used to enhance your browsing experience. You may disable cookies in your browser settings, though this may affect some functionality.</p></div></div></Layout>
);

export const Terms = () => (
  <Layout><div className="container-sattva py-14 max-w-3xl"><h1 className="font-heading text-3xl mb-6">Terms & Conditions</h1><div className="mt-6 space-y-4 text-sm text-[var(--sattva-ink)] leading-relaxed"><p>By using Sattva's website and services, you agree to these terms. Products are for personal use only. Reselling without authorization is prohibited.</p><p>All prices are in INR and inclusive of applicable taxes. We reserve the right to modify prices without notice. Orders may be cancelled if payment is not completed within 24 hours.</p><p>Returns accepted within 7 days of delivery for unused, sealed products. Refunds processed within 5-7 business days.</p></div></div></Layout>
);

export const Shipping = () => (
  <Layout><div className="container-sattva py-14 max-w-3xl"><h1 className="font-heading text-3xl mb-6">Shipping & Returns</h1><div className="mt-6 space-y-6 text-sm"><div className="card-sattva p-5"><h3 className="font-heading text-base font-semibold mb-2">Shipping Policy</h3><ul className="space-y-2 text-gray-600"><li>• Free shipping on orders above ₹499</li><li>• Standard delivery: 3-5 business days</li><li>• Express delivery: 1-2 business days (available in metro cities)</li><li>• All orders shipped via trusted courier partners</li></ul></div><div className="card-sattva p-5"><h3 className="font-heading text-base font-semibold mb-2">Return Policy</h3><ul className="space-y-2 text-gray-600"><li>• Returns accepted within 7 days of delivery</li><li>• Products must be unused and in original packaging</li><li>• Refunds processed within 5-7 business days</li><li>• Contact us at hello@sattva.in for return requests</li></ul></div></div></div></Layout>
);

export const NotFound = () => (
  <Layout>
    <div className="container-sattva py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-heading text-8xl font-bold text-[var(--sattva-muted)] mb-4">404</p>
        <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)] mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex justify-center gap-3">
          <Link to="/" className="btn-primary px-8 py-3">Go Home</Link>
          <Link to="/products" className="btn-outlined px-8 py-3">Browse Products</Link>
        </div>
      </motion.div>
    </div>
  </Layout>
);
