const Order = require('./Order');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { userId, userName, doctorName, productName, quantity, note } = req.body;

    // Validate required fields (you can add more robust validation)
    if (!userId || !userName || !doctorName || !productName || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const order = new Order({
      user: userId,
      userName,
      doctorName,
      productName,
      quantity,
      note,
      dateTime: new Date()
    });

    const createdOrder = await order.save();
    console.log('Order created successfully:', createdOrder);
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    // If needed, you can add filtering by query parameters
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: error.message });
  }
};


// controllers/orderController.js
exports.getOrders = async (req, res) => {
    try {
      const { userId } = req.query;
      let orders;
      if (userId) {
        orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
      } else {
        orders = await Order.find({}).sort({ createdAt: -1 });
      }
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: error.message });
    }
  };
  