const express = require('express');
const router = express.Router();
const { createOrder, getOrders } = require('./orderController');

// POST /api/orders - Create a new order
router.post('/', createOrder);

// GET /api/orders - Get all orders (for admin panel)
router.get('/', getOrders);



module.exports = router;
