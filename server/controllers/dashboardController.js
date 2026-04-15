import Invoice from '../models/Invoice.js';

/**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDashboardStats = async (req, res) => {
  try {
    const freelancerId = req.userId;

    // Get all invoices for the freelancer
    const invoices = await Invoice.find({ freelancerId });

    // Calculate statistics
    const totalEarned = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalPending = invoices
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalOverdue = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalInvoices = invoices.length;

    res.json({
      stats: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalInvoices
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Error retrieving dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get monthly revenue data for chart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMonthlyRevenue = async (req, res) => {
  try {
    const freelancerId = req.userId;
    const { year } = req.query; // Optional year filter

    // Build query
    const query = {
      freelancerId,
      status: 'paid' // Only count paid invoices
    };

    // If year is provided, filter by year
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31T23:59:59`);
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Get all paid invoices
    const invoices = await Invoice.find(query).select('total createdAt');

    // Aggregate by month
    const monthlyData = {};
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          revenue: 0,
          count: 0
        };
      }
      
      monthlyData[monthKey].revenue += invoice.total;
      monthlyData[monthKey].count += 1;
    });

    // Convert to array and sort by month
    const revenueData = Object.keys(monthlyData)
      .sort()
      .map(key => ({
        ...monthlyData[key],
        revenue: Math.round(monthlyData[key].revenue * 100) / 100
      }));

    // Fill in missing months for the last 12 months if no year filter
    if (!year) {
      const last12Months = [];
      const today = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const existingData = monthlyData[monthKey];
        last12Months.push({
          month: monthName,
          revenue: existingData ? existingData.revenue : 0,
          count: existingData ? existingData.count : 0
        });
      }
      
      return res.json({
        revenueData: last12Months
      });
    }

    res.json({
      revenueData
    });
  } catch (error) {
    console.error('Get monthly revenue error:', error);
    res.status(500).json({
      message: 'Error retrieving monthly revenue',
      error: error.message
    });
  }
};

/**
 * Get yearly revenue data for chart
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getYearlyRevenue = async (req, res) => {
  try {
    const freelancerId = req.userId;

    const invoices = await Invoice.find({
      freelancerId,
      status: 'paid'
    }).select('total createdAt');

    const yearlyData = {};
    invoices.forEach(invoice => {
      const year = new Date(invoice.createdAt).getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { revenue: 0, count: 0 };
      }
      yearlyData[year].revenue += invoice.total;
      yearlyData[year].count += 1;
    });

    const currentYear = new Date().getFullYear();
    const revenueData = [];
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i;
      const data = yearlyData[year];
      revenueData.push({
        year: year.toString(),
        revenue: data ? Math.round(data.revenue * 100) / 100 : 0,
        count: data ? data.count : 0
      });
    }

    return res.json({ revenueData });
  } catch (error) {
    console.error('Get yearly revenue error:', error);
    res.status(500).json({
      message: 'Error retrieving yearly revenue',
      error: error.message
    });
  }
};

/**
 * Get recent invoices for dashboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRecentInvoices = async (req, res) => {
  try {
    const freelancerId = req.userId;
    const limit = parseInt(req.query.limit) || 5;

    const invoices = await Invoice.find({ freelancerId })
      .populate('clientId', 'name email company')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      invoices
    });
  } catch (error) {
    console.error('Get recent invoices error:', error);
    res.status(500).json({
      message: 'Error retrieving recent invoices',
      error: error.message
    });
  }
};
