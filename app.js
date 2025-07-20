// app.js
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const open = require('open');
const port = 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend-toyblox')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Routes
const itemRoutes = require('./routes/item');
const userRoutes = require('./routes/user');
const stockRoutes = require('./routes/stock');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const orderRoutes = require('./routes/order');

app.use('/api/v1', itemRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', stockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/orders', orderRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  open(`http://localhost:${port}/home.html`);
});

module.exports = app;
