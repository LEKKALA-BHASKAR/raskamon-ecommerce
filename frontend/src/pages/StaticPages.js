import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from 'lucide-react';
import Layout from '../components/layout/Layout';

const pageShell = 'container-sattva py-14';
const contentShell = 'max-w-4xl mx-auto';
const cardShell = 'card-sattva p-6';

const contactDetails = {
  address: 'Delhi, New Delhi, 110034',
  phone: '+91-8860908070',
  email: 'info@drmediscie.com',
};

const faqItems = [
  {
    question: 'What is Dr MediScie?',
    answer:
      'Dr MediScie is an online platform offering high-quality health and wellness products, including supplements, vitamins, herbal remedies, and personal care items backed by trusted, science-led sourcing.',
  },
  {
    question: 'Are all products genuine and safe?',
    answer:
      'Yes. Dr MediScie states that products are sourced directly from trusted manufacturers and brands, and each product goes through quality checks for safety and efficacy.',
  },
  {
    question: 'How do I place an order?',
    answer:
      'Browse the catalog, add the products you want to your cart, and complete checkout. If you need help during the process, you can contact the support team.',
  },
  {
    question: 'What payment methods are available?',
    answer:
      'The existing site lists Credit and Debit Cards, UPI, Net Banking, and Wallets as supported payment methods.',
  },
];

const policyBlockClass = 'mt-6 space-y-6 text-sm text-[var(--sattva-ink)] leading-relaxed';

export const About = () => (
  <Layout>
    <div className={pageShell}>
      <div className={contentShell}>
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-widest mb-3">About Us</p>
        <h1 className="font-heading text-4xl font-semibold text-[var(--sattva-ink)] mb-4">Healthcare innovation with science, trust, and care</h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Dr MediScie is positioned as a trusted partner in healthcare innovation and medical excellence, focused on making premium healthcare accessible, reliable, and practical for everyday life.
        </p>

        <div className="aspect-[16/7] rounded-2xl overflow-hidden mb-8">
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=85"
            alt="Dr MediScie healthcare and wellness"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">What We Do</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We provide medical and wellness products designed to help people live healthier, safer, and more comfortable lives.
            </p>
          </div>
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">How We Work</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Dr MediScie combines scientific research with modern technology to deliver products built around safety, efficacy, and reliability.
            </p>
          </div>
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">Why It Matters</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every product is quality-assured to support better outcomes for both patients and healthcare-conscious customers.
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-[var(--sattva-ink)] space-y-4">
          <p>
            Welcome to Dr MediScie, your trusted partner in healthcare innovation and medical excellence. We are dedicated to providing high-quality medical products and advanced healthcare solutions that empower people to live healthier, safer, and more comfortable lives.
          </p>
          <p>
            At Dr MediScie, we combine scientific research with modern technology to deliver products that meet the highest standards of safety, efficacy, and reliability. Our mission is to make premium healthcare accessible and affordable for everyone, supported by a commitment to integrity, trust, and care.
          </p>
          <p>
            From essential medical supplies to wellness-focused formulations and diagnostic support products, every item is thoroughly tested and quality-assured before it reaches customers.
          </p>
          <p className="font-medium text-[var(--sattva-forest)]">
            Your health is our priority — because with Dr MediScie, science cares.
          </p>
        </div>
      </div>
    </div>
  </Layout>
);

export const Contact = () => {
  const [form, setForm] = React.useState({ name: '', email: '', topic: '', message: '' });
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <Layout>
      <div className={pageShell}>
        <div className={contentShell}>
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-widest mb-3">Contact Us</p>
          <h1 className="font-heading text-4xl font-semibold text-[var(--sattva-ink)] mb-3">We’d love to hear from you</h1>
          <p className="text-gray-600 mb-8">
            Reach Dr MediScie for product questions, order support, or general inquiries.
          </p>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className={cardShell}>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 text-[var(--sattva-forest)]" size={18} />
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Store Address</h2>
                    <p className="text-sm text-gray-600 mt-1">{contactDetails.address}</p>
                  </div>
                </div>
              </div>
              <div className={cardShell}>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 text-[var(--sattva-forest)]" size={18} />
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Call Us</h2>
                    <p className="text-sm text-gray-600 mt-1">{contactDetails.phone}</p>
                  </div>
                </div>
              </div>
              <div className={cardShell}>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 text-[var(--sattva-forest)]" size={18} />
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Mail ID</h2>
                    <p className="text-sm text-gray-600 mt-1">{contactDetails.email}</p>
                  </div>
                </div>
              </div>
              <div className={cardShell}>
                <h2 className="font-heading text-lg font-semibold mb-2">Our Location</h2>
                <p className="text-sm text-gray-600">Dr MediScie</p>
                <p className="text-sm text-gray-600">{contactDetails.address}</p>
              </div>
            </div>

            <div className={cardShell}>
              <h2 className="font-heading text-2xl font-semibold mb-1">Leave Us a Message</h2>
              <p className="text-sm text-gray-500 mb-6">
                Send a message for support, product information, or order assistance.
              </p>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Name</label>
                  <input {...field('name')} className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Your Email</label>
                  <input type="email" {...field('email')} className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Topic</label>
                  <select {...field('topic')} className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]">
                    <option value="">Please Select</option>
                    <option value="orders">Order Support</option>
                    <option value="products">Product Information</option>
                    <option value="partnerships">Partnerships</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
                  <textarea {...field('message')} rows={5} className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] resize-none" />
                </div>
                <button className="btn-primary w-full py-3">Submit</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const FAQ = () => (
  <Layout>
    <div className={pageShell}>
      <div className="max-w-3xl mx-auto">
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-widest mb-3">Frequently Asked Questions</p>
        <h1 className="font-heading text-4xl font-semibold text-[var(--sattva-ink)] mb-4">Answers to common questions</h1>
        <p className="text-gray-600 mb-8">
          These answers are based on the information currently published on the existing Dr MediScie website.
        </p>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className={cardShell}>
              <h2 className="font-heading text-lg font-semibold mb-2">{item.question}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className={cardShell}>
            <Wallet size={18} className="text-[var(--sattva-forest)] mb-2" />
            <h3 className="font-semibold mb-1">Payments</h3>
            <p className="text-sm text-gray-600">Cards, UPI, Net Banking, and Wallets.</p>
          </div>
          <div className={cardShell}>
            <ShieldCheck size={18} className="text-[var(--sattva-forest)] mb-2" />
            <h3 className="font-semibold mb-1">Quality</h3>
            <p className="text-sm text-gray-600">Products are presented as genuine and quality-checked.</p>
          </div>
          <div className={cardShell}>
            <Truck size={18} className="text-[var(--sattva-forest)] mb-2" />
            <h3 className="font-semibold mb-1">Order Flow</h3>
            <p className="text-sm text-gray-600">Browse, add to cart, and complete checkout online.</p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export const Privacy = () => (
  <Layout>
    <div className={pageShell}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl mb-2">Privacy Policy</h1>
        <p className="text-gray-600 text-sm">Based on the current policy published at drmediscie.com</p>
        <div className={policyBlockClass}>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Name</li>
              <li>Contact information including email, phone number, and shipping or billing address</li>
              <li>Payment details handled securely via payment partners</li>
              <li>Information shared while communicating with Dr MediScie</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Process and fulfill orders</li>
              <li>Provide customer support</li>
              <li>Improve products and services</li>
              <li>Communicate offers, promotions, or updates when opted in</li>
              <li>Comply with legal requirements</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">3. Data Security and Sharing</h2>
            <p className="text-gray-600">The site states that industry-standard security measures are used, payment details are processed through encrypted channels, and personal information is not sold or rented to third parties.</p>
            <p className="text-gray-600 mt-2">Data may be shared only with trusted service providers such as payment gateways or courier services, or with legal authorities when required by law.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">4. Cookies and Your Rights</h2>
            <p className="text-gray-600">Cookies may be used to improve browsing and gather analytics. Users may disable cookies in browser settings.</p>
            <p className="text-gray-600 mt-2">You may request access, correction, deletion, or withdrawal of consent for marketing communications by contacting {contactDetails.email}.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">5. Contact</h2>
            <p className="text-gray-600">Store Address: {contactDetails.address}</p>
            <p className="text-gray-600">Call Us: {contactDetails.phone}</p>
            <p className="text-gray-600">Mail ID: {contactDetails.email}</p>
          </section>
        </div>
      </div>
    </div>
  </Layout>
);

export const Terms = () => (
  <Layout>
    <div className={pageShell}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl mb-2">Terms & Conditions</h1>
        <p className="text-gray-600 text-sm">Based on the current terms published at drmediscie.com</p>
        <div className={policyBlockClass}>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">1. General</h2>
            <p className="text-gray-600">Dr MediScie may change these terms at any time without prior notice. Continued use of the website constitutes acceptance of those changes.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">2. Products and Orders</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>All products are subject to availability.</li>
              <li>Dr MediScie may limit purchase quantities.</li>
              <li>Prices may change without prior notice.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">3. Payments</h2>
            <p className="text-gray-600">Payments must be made in full before products are shipped, and the website uses secure payment gateways for customer safety.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">4. Shipping, Cancellations, and Returns</h2>
            <p className="text-gray-600">Shipping timelines are estimates and delays may occur beyond the company’s control. Orders may be canceled before dispatch. Once shipped, returns are handled under the return and refund policy.</p>
            <p className="text-gray-600 mt-2">The published terms also state that opened or used healthcare products are generally not returnable unless defective.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">5. User Responsibilities and IP</h2>
            <p className="text-gray-600">Users agree not to misuse the website or attempt unauthorized access, and they must provide accurate, up-to-date information. Site content including text, images, logos, and trademarks belongs to Dr MediScie unless otherwise stated.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">6. Liability and Governing Law</h2>
            <p className="text-gray-600">Liability is limited to the amount paid for the products. The published terms state that these conditions are governed by Indian law and disputes fall under Delhi jurisdiction.</p>
          </section>
          <section>
            <h2 className="font-heading text-xl font-semibold mb-2">7. Contact</h2>
            <p className="text-gray-600">Store Address: {contactDetails.address}</p>
            <p className="text-gray-600">Call Us: {contactDetails.phone}</p>
            <p className="text-gray-600">Mail ID: {contactDetails.email}</p>
          </section>
        </div>
      </div>
    </div>
  </Layout>
);

export const Shipping = () => (
  <Layout>
    <div className={pageShell}>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl mb-2">Shipping & Returns</h1>
        <p className="text-gray-600 text-sm">Aligned to the current Dr MediScie site policies and support details</p>
        <div className="mt-6 space-y-6 text-sm">
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">Shipping Policy</h2>
            <ul className="space-y-2 text-gray-600">
              <li>Shipping timelines are treated as estimates and may vary due to operational or courier delays.</li>
              <li>Orders are processed against stock availability.</li>
              <li>Customers can contact support for delivery-related help at {contactDetails.phone} or {contactDetails.email}.</li>
            </ul>
          </div>
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">Cancellation & Return Policy</h2>
            <ul className="space-y-2 text-gray-600">
              <li>Orders can be canceled before dispatch.</li>
              <li>Once shipped, returns are subject to the return and refund policy.</li>
              <li>Opened or used healthcare products are generally not accepted for return unless defective.</li>
            </ul>
          </div>
          <div className={cardShell}>
            <h2 className="font-heading text-lg font-semibold mb-2">Support Contact</h2>
            <p className="text-gray-600">Address: {contactDetails.address}</p>
            <p className="text-gray-600">Phone: {contactDetails.phone}</p>
            <p className="text-gray-600">Email: {contactDetails.email}</p>
          </div>
        </div>
      </div>
    </div>
  </Layout>
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
