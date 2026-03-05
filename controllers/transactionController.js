const Transaction = require('../models/Transaction');

const computeBalance = async () => {
  const result = await Transaction.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  result.forEach((entry) => {
    if (entry._id === 'income') totalIncome = entry.total;
    if (entry._id === 'expense') totalExpense = entry.total;
  });

  return {
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    totalExpense: parseFloat(totalExpense.toFixed(2)),
    balance: parseFloat((totalIncome - totalExpense).toFixed(2)),
  };
};

const createTransaction = async (req, res, next) => {
  try {
    const { title, amount, type, category, date } = req.body;

    const transaction = await Transaction.create({
      title,
      amount,
      type,
      category: type === 'expense' ? category : undefined,
      date,
    });

    const balanceSummary = await computeBalance();

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        transaction,
        ...balanceSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      date,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (type) filter.type = type;

    if (category) filter.category = { $regex: new RegExp(category, 'i') };

    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter),
    ]);

    const balanceSummary = await computeBalance();

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        ...balanceSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const balanceSummary = await computeBalance();

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        transaction,
        ...balanceSummary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMonthlyStats = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

    const totals = await Transaction.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    totals.forEach((entry) => {
      if (entry._id === 'income') totalIncome = entry.total;
      if (entry._id === 'expense') totalExpense = entry.total;
    });

    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Compute percentage per category
    const categories = categoryBreakdown.map((cat) => ({
      category: cat._id,
      total: parseFloat(cat.total.toFixed(2)),
      percentage:
        totalExpense > 0
          ? parseFloat(((cat.total / totalExpense) * 100).toFixed(2))
          : 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        period: {
          month: monthNum,
          year: yearNum,
        },
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpense: parseFloat(totalExpense.toFixed(2)),
        balance: parseFloat((totalIncome - totalExpense).toFixed(2)),
        expenseByCategory: categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyStats,
};