import React, { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getNavAdmin, saveNav, broadcastSiteContentChange } from '../../utils/siteContent';

const Field = ({ label, value = '', onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{label}</label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]"
    />
  </div>
);

export default function AdminNavigation() {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNavAdmin().then(setDraft).catch(() => {
      toast.error('Failed to load nav config');
      setDraft({ announcements: [], footer: { helpLinks: [], contact: {}, socials: {} }, simpleLinks: [] });
    });
  }, []);

  if (!draft) return <p className="text-sm text-gray-500">Loading…</p>;

  const set = (patch) => setDraft({ ...draft, ...patch });
  const setFooter = (patch) => setDraft({ ...draft, footer: { ...draft.footer, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      await saveNav(draft);
      await broadcastSiteContentChange();
      toast.success('Navigation saved — header & footer updated');
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const announcements = draft.announcements || [];
  const helpLinks = draft.footer?.helpLinks || [];
  const simpleLinks = draft.simpleLinks || [];
  const contact = draft.footer?.contact || {};
  const socials = draft.footer?.socials || {};

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Navigation & Footer</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage announcement strip, header simple links, and footer content (categories come from the Categories page).</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--sattva-forest)] text-white hover:opacity-90 disabled:opacity-50">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-700 flex gap-2">
        <Info size={16} className="mt-0.5 flex-shrink-0" />
        <span>The header's category dropdowns and the footer's Shop column share the same category tree (managed under <strong>Categories</strong>).</span>
      </div>

      {/* Announcements */}
      <section className="bg-white rounded-2xl border p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Announcement Bar (rotates every 3.5s)</h3>
          <button
            onClick={() => set({ announcements: [...announcements, ''] })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sattva-forest)] text-white text-xs font-semibold"
          ><Plus size={12} /> Add</button>
        </div>
        <div className="space-y-2">
          {announcements.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={a}
                onChange={e => {
                  const next = [...announcements];
                  next[i] = e.target.value;
                  set({ announcements: next });
                }}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                placeholder="🌿 Free delivery on orders above ₹499"
              />
              <button
                onClick={() => set({ announcements: announcements.filter((_, j) => j !== i) })}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
              ><Trash2 size={14} /></button>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-sm text-gray-400 italic">No announcements — bar will be empty.</p>}
        </div>
      </section>

      {/* Header simple links */}
      <section className="bg-white rounded-2xl border p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Header Extra Links (next to category dropdowns)</h3>
          <button
            onClick={() => set({ simpleLinks: [...simpleLinks, { label: '', href: '' }] })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sattva-forest)] text-white text-xs font-semibold"
          ><Plus size={12} /> Add</button>
        </div>
        <div className="space-y-2">
          {simpleLinks.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input value={l.label} onChange={e => { const n = [...simpleLinks]; n[i] = { ...l, label: e.target.value }; set({ simpleLinks: n }); }} placeholder="Label" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <input value={l.href} onChange={e => { const n = [...simpleLinks]; n[i] = { ...l, href: e.target.value }; set({ simpleLinks: n }); }} placeholder="/path" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <button onClick={() => set({ simpleLinks: simpleLinks.filter((_, j) => j !== i) })} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <section className="bg-white rounded-2xl border p-5 mb-5">
        <h3 className="font-semibold text-sm mb-3">Footer — Tagline, Help links, Contact, Socials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Tagline" value={draft.footer?.tagline} onChange={v => setFooter({ tagline: v })} placeholder="Premium Ayurvedic wellness…" />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Help links</p>
            <button onClick={() => setFooter({ helpLinks: [...helpLinks, { label: '', to: '' }] })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sattva-forest)] text-white text-xs font-semibold"><Plus size={12} /> Add</button>
          </div>
          <div className="space-y-2">
            {helpLinks.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={l.label} onChange={e => { const n = [...helpLinks]; n[i] = { ...l, label: e.target.value }; setFooter({ helpLinks: n }); }} placeholder="Label" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                <input value={l.to} onChange={e => { const n = [...helpLinks]; n[i] = { ...l, to: e.target.value }; setFooter({ helpLinks: n }); }} placeholder="/path" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                <button onClick={() => setFooter({ helpLinks: helpLinks.filter((_, j) => j !== i) })} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Field label="Contact email" value={contact.email} onChange={v => setFooter({ contact: { ...contact, email: v } })} />
          <Field label="Contact phone" value={contact.phone} onChange={v => setFooter({ contact: { ...contact, phone: v } })} />
          <Field label="Contact address" value={contact.address} onChange={v => setFooter({ contact: { ...contact, address: v } })} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Instagram URL" value={socials.instagram} onChange={v => setFooter({ socials: { ...socials, instagram: v } })} />
          <Field label="Facebook URL" value={socials.facebook} onChange={v => setFooter({ socials: { ...socials, facebook: v } })} />
          <Field label="Twitter URL" value={socials.twitter} onChange={v => setFooter({ socials: { ...socials, twitter: v } })} />
          <Field label="YouTube URL" value={socials.youtube} onChange={v => setFooter({ socials: { ...socials, youtube: v } })} />
        </div>
      </section>
    </>
  );
}
