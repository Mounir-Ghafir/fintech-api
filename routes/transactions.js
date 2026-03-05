const express = require('express');
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
  getMonthlyStats,
} = require('../controllers/transactionController');

const {
  validateTransaction,
  validateQueryFilters,
  validateStatsQuery,
} = require('../middleware/validation');

const checkBalance = require('../middleware/checkBalance');

router.get('/stats', validateStatsQuery, getMonthlyStats);

router.get('/', validateQueryFilters, getTransactions);

router.get('/:id', getTransactionById);

router.post('/', validateTransaction, checkBalance, createTransaction);

router.delete('/:id', deleteTransaction);

module.exports = router;