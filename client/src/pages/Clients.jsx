import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  getClients, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../services/clientService';
import ClientList from '../components/ClientList';
import ClientForm from '../components/ClientForm';

const Clients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const editClientId = location.state?.editClientId;
    if (editClientId && clients.length > 0 && !editingClient) {
      const client = clients.find(c => c._id === editClientId);
      if (client) {
        setEditingClient(client);
        setFormError(null);
        setShowForm(true);
        navigate('/clients', { replace: true, state: {} });
      }
    }
  }, [clients, location.state?.editClientId]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getClients();
      setClients(response.clients || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClient(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleView = (client) => {
    navigate(`/clients/${client._id}`);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormError(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingClient(null);
    setFormError(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      setFormError(null);

      if (editingClient) {
        await updateClient(editingClient._id, formData);
      } else {
        await createClient(formData);
      }

      await fetchClients();

      setShowForm(false);
      setEditingClient(null);
    } catch (err) {
      console.error('Error saving client:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.errors?.[0]?.msg ||
                          'Failed to save client';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) {
      return;
    }

    try {
      await deleteClient(id);
      await fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      alert(err.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center text-ink-500 hover:text-ink-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Clients</h1>
              <p className="mt-1 text-ink-500 text-sm">Manage your client information</p>
            </div>
            {!showForm && (
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 bg-gradient-to-b from-ink-700 to-ink-900 hover:from-ink-800 hover:to-ink-900 text-white text-sm font-medium rounded-lg shadow-soft transition-colors"
              >
                + Add New Client
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-800 text-sm">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="mb-8">
            <ClientForm
              client={editingClient}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={formLoading}
              error={formError}
            />
          </div>
        )}

        {!showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
            <ClientList
              clients={clients}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
