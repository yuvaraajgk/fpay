import React from 'react';

const initialsOf = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

const ClientList = ({ clients, onEdit, onDelete, onView, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-12 text-ink-500">
        <p className="text-lg">No clients found.</p>
        <p className="text-sm mt-2">Create your first client to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">
              Company
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-ink-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {clients.map((client) => (
            <tr key={client._id} className="hover:bg-slate-50/70">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {initialsOf(client.name)}
                  </span>
                  <span className="text-sm font-medium text-ink-900">{client.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-ink-500">{client.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-ink-500">{client.phone || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-ink-500">{client.company || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onView(client)}
                  className="text-ink-500 hover:text-ink-900 mr-4"
                >
                  View details
                </button>
                <button
                  onClick={() => onEdit(client)}
                  className="text-brand-600 hover:text-brand-700 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(client._id)}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientList;
