require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const transactionRoutes = require('./routes/transactions');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FinTech API',
    version: '1.0.0',
    endpoints: {
      transactions: {
        'GET    /transactions': 'List transactions (filters + pagination)',
        'GET    /transactions/stats': 'Monthly statistics (?month=&year=)',
        'GET    /transactions/:id': 'Get single transaction',
        'POST   /transactions': 'Create a transaction',
        'DELETE /transactions/:id': 'Delete a transaction',
      },
    },
  });
});

app.use('/transactions', transactionRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;