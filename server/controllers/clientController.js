import Client from '../models/Client.js';

// Create a new client
export const createClient = async (req, res) => {
  try {
    const { name, email, phone, company, address } = req.body;
    const freelancerId = req.userId; // From JWT middleware

    // Create new client associated with the logged-in freelancer
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
    
    // Handle duplicate email error (from unique index)
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

// Get all clients for the logged-in freelancer
export const getClients = async (req, res) => {
  try {
    const freelancerId = req.userId; // From JWT middleware

    const clients = await Client.find({ freelancerId })
      .sort({ createdAt: -1 }); // Most recent first

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

// Get a single client by ID (verify ownership)
export const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId; // From JWT middleware

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
    
    // Handle invalid ObjectId format
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

// Update a client (verify ownership)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId; // From JWT middleware
    const { name, email, phone, company, address } = req.body;

    // Find client and verify ownership
    const client = await Client.findOne({ 
      _id: id, 
      freelancerId 
    });

    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found or you do not have permission to update it' 
      });
    }

    // Update fields (only update provided fields)
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
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A client with this email already exists' 
      });
    }
    
    // Handle invalid ObjectId format
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

// Delete a client (verify ownership)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.userId; // From JWT middleware

    // Find and delete client (only if owned by freelancer)
    const client = await Client.findOneAndDelete({ 
      _id: id, 
      freelancerId 
    });

    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found or you do not have permission to delete it' 
      });
    }

    res.json({
      message: 'Client deleted successfully',
      client
    });
  } catch (error) {
    console.error('Delete client error:', error);
    
    // Handle invalid ObjectId format
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
