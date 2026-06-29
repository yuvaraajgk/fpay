import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';

export const createClient = async (req, res) => {
  try {
    const { name, email, phone, company, address } = req.body;
    const freelancerId = req.userId;

    const client = await Client.create({
      freelancerId,
      name,
      email,
      phone: phone || '',
      company: company || '',
      address: address || ''
    });

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A client with this email already exists'
      });
    }
    res.status(500).json({
      message: 'Error creating client',
      error: error.message
    });
  }
};

export const getClients = async (req, res) => {
  try {
    const freelancerId = req.userId;

    const clients = await Client.find({ freelancerId })
      .sort({ createdAt: -1 });

    res.json({
      message: 'Clients retrieved successfully',
      count: clients.length,
      clients
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      message: 'Error retrieving clients',
      error: error.message
    });
  }
};

export const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const client = await Client.findOne({
      _id: id,
      freelancerId
    });

    if (!client) {
      return res.status(404).json({
        message: 'Client not found or you do not have permission to access it'
      });
    }

    res.json({
      message: 'Client retrieved successfully',
      client
    });
  } catch (error) {
    console.error('Get client error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid client ID format'
      });
    }
    res.status(500).json({
      message: 'Error retrieving client',
      error: error.message
    });
  }
};

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;
    const { name, email, phone, company, address } = req.body;

    const client = await Client.findOne({
      _id: id,
      freelancerId
    });

    if (!client) {
      return res.status(404).json({
        message: 'Client not found or you do not have permission to update it'
      });
    }

    if (name !== undefined) client.name = name;
    if (email !== undefined) client.email = email;
    if (phone !== undefined) client.phone = phone;
    if (company !== undefined) client.company = company;
    if (address !== undefined) client.address = address;

    await client.save();

    res.json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Update client error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A client with this email already exists'
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid client ID format'
      });
    }
    res.status(500).json({
      message: 'Error updating client',
      error: error.message
    });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId;

    const client = await Client.findOne({ _id: id, freelancerId });

    if (!client) {
      return res.status(404).json({
        message: 'Client not found or you do not have permission to delete it'
      });
    }

    const activeInvoiceCount = await Invoice.countDocuments({
      clientId: id,
      status: { $in: ['draft', 'sent', 'overdue'] }
    });

    if (activeInvoiceCount > 0) {
      return res.status(400).json({
        message: `Cannot delete client with ${activeInvoiceCount} active invoice${activeInvoiceCount > 1 ? 's' : ''}. Cancel or resolve them first.`
      });
    }

    await client.deleteOne();

    res.json({
      message: 'Client deleted successfully',
      client
    });
  } catch (error) {
    console.error('Delete client error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid client ID format'
      });
    }
    res.status(500).json({
      message: 'Error deleting client',
      error: error.message
    });
  }
};
