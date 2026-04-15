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

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Open edit form if navigated with editClientId in state (e.g. from ClientDetail)
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
        // Update existing client
        await updateClient(editingClient._id, formData);
      } else {
        // Create new client
        await createClient(formData);
      }

      // Refresh clients list
      await fetchClients();
      
      // Close form
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
      // Refresh clients list
      await fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      alert(err.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Link */}
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm"
        >
          <span className="mr-2">←</span> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
              <p className="mt-2 text-gray-600">Manage your client information</p>
            </div>
            {!showForm && (
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                + Add New Client
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Client Form */}
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

        {/* Clients List */}
        {!showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6">
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
