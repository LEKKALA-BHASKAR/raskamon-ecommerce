import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    api.get(`/products?search=${encodeURIComponent(query)}&limit=24`)
      .then(r => setResults(r.data.products))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <Layout>
      <div className="container-sattva py-8">
        <h1 className="font-heading text-2xl font-semibold mb-2">
          Search results for <span className="text-[var(--sattva-forest)]">"{ query }"</span>
        </h1>
        <p className="text-gray-500 text-sm mb-6">{results.length} products found</p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] skeleton rounded-xl" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heading text-xl mb-4">No results found</p>
            <p className="text-gray-500 mb-6">Try searching for something else or browse our categories</p>
            <Link to="/products" className="btn-primary px-8 py-3">Browse All Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchResults;
