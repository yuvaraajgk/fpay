import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient } from '../services/clientService';

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error || 'Client not found'}</p>
            <button
              onClick={() => navigate('/clients')}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/clients"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Clients
        </Link>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                {client.company && (
                  <p className="mt-1 text-gray-600">{client.company}</p>
                )}
              </div>
              <button
                onClick={() => navigate('/clients', { state: { editClientId: client._id } })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Edit Client
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                    {client.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.phone || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{client.address || '—'}</dd>
              </div>
            </dl>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Info</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Added</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {client.createdAt ? formatDate(client.createdAt) : '—'}
                  </dd>
                </div>
                {client.updatedAt && client.updatedAt !== client.createdAt && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
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
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Clients
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
