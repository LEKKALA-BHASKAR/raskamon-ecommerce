import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import api from '../../utils/api';

const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');

  const search = React.useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/products/search?q=${encodeURIComponent(q)}&limit=8`);
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [setResults, setLoading]);

  const debouncedSearch = React.useMemo(() => debounce(search, 300), [search]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const searches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    navigate(`/search?q=${encodeURIComponent(query)}`);
    onClose();
    setQuery('');
  };

  const handleProductClick = (slug) => {
    navigate(`/products/${slug}`);
    onClose();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto mt-20 bg-[var(--sattva-surface)] rounded-2xl shadow-[var(--shadow-md)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--sattva-border)]">
              <Search size={20} className="text-[var(--sattva-forest)] flex-shrink-0" />
              <input
                data-testid="search-input"
                type="text"
                value={query}
                onChange={handleInput}
                placeholder="Search products, brands, categories..."
                autoFocus
                className="flex-1 bg-transparent text-[var(--sattva-ink)] placeholder-gray-400 text-sm focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]); }}>
                  <X size={18} className="text-gray-400" />
                </button>
              )}
            </form>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      data-testid="search-suggestion-item"
                      onClick={() => handleProductClick(p.slug)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--sattva-muted)] transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--sattva-ink)] truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--sattva-forest)] tabular-nums">₹{p.discountPrice?.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--sattva-ink)] text-sm font-medium">No results for "{query}"</p>
                  <p className="text-gray-500 text-xs mt-1">Try searching for something else</p>
                </div>
              ) : recentSearches.length > 0 ? (
                <div className="py-2">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Searches</p>
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); debouncedSearch(s); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--sattva-muted)] transition-colors text-left"
                    >
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm text-[var(--sattva-ink)]">{s}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {['Skincare', 'Hair Care', 'Wellness', 'Body Care', 'Aromatherapy'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => { navigate(`/products?category=${cat.replace(' ', '+')}`); onClose(); }}
                        className="px-3 py-1.5 bg-[var(--sattva-muted)] text-[var(--sattva-forest)] text-xs font-medium rounded-full hover:bg-[var(--sattva-gold)] hover:text-[var(--sattva-forest)] transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
