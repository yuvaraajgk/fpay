import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient } from '../services/clientService';

const initialsOf = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getClient(id);
      setClient(response.client);
    } catch (err) {
      console.error('Error fetching client:', err);
      setError(err.response?.data?.message || 'Failed to load client');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
            <p className="text-rose-800">{error || 'Client not found'}</p>
            <button
              onClick={() => navigate('/clients')}
              className="mt-4 px-4 py-2 bg-white border border-slate-200 text-ink-700 rounded-lg hover:bg-slate-50"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/clients"
          className="inline-flex items-center text-ink-500 hover:text-ink-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Clients
        </Link>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div className="px-6 py-6 border-b border-slate-100">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {initialsOf(client.name)}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-ink-900">{client.name}</h1>
                  {client.company && (
                    <p className="mt-1 text-ink-500 text-sm">{client.company}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/clients', { state: { editClientId: client._id } })}
                className="px-4 py-2 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft transition-colors"
              >
                Edit Client
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            <h2 className="font-display font-semibold text-ink-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">Email</dt>
                <dd className="mt-1 text-sm text-ink-900">
                  <a href={`mailto:${client.email}`} className="text-brand-600 hover:text-brand-700 hover:underline">
                    {client.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm text-ink-900">{client.phone || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">Address</dt>
                <dd className="mt-1 text-sm text-ink-900">{client.address || '—'}</dd>
              </div>
            </dl>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h2 className="font-display font-semibold text-ink-900 mb-4">Record Info</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">Added</dt>
                  <dd className="mt-1 text-sm text-ink-900">
                    {client.createdAt ? formatDate(client.createdAt) : '—'}
                  </dd>
                </div>
                {client.updatedAt && client.updatedAt !== client.createdAt && (
                  <div>
                    <dt className="text-xs font-medium text-ink-500 uppercase tracking-wide">Last Updated</dt>
                    <dd className="mt-1 text-sm text-ink-900">
                      {formatDate(client.updatedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => navigate('/clients')}
            className="px-4 py-2 bg-white border border-slate-200 text-ink-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Back to Clients
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
