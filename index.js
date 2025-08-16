// backend/index.js

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// --- Middleware ---
app.use(express.json({ limit: '25mb' }));
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://gluckscare.com',
  'https://gluckscare.com',
  'https://sales-rep-visite.gluckscare.com/',
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS Origin:', origin); // Debug log
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS rejected origin:', origin); // Debug log
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- MongoDB Connection & Index Cleanup ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('MongoDB connected successfully');

    // Drop old unique index on registration_number (if present)
    const coll = mongoose.connection.db.collection('doctors');
    try {
      await coll.dropIndex('registration_number_1');
      console.log('✔ Dropped unique index on registration_number');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ No registration_number index to drop');
      } else {
        console.error('⚠ Error dropping registration_number index:', err);
      }
    }

    // Load your models _after_ dropping the index
    require('./src/doctor/Doctor');    // ensures schema is registered without unique
    // ... you can require other models here if they define indexes

    // Then mount routes and start server
    const authRoutes = require('./src/auth/auth');
    const userRoutes = require('./src/user/userRoutes');
    const pdfRoutes = require('./src/pdf/Route');
    const headOfficeRouter = require('./src/headoffice/Route');
    const stateRouter = require('./src/state/Route');

    const doctorRouter = require('./src/doctor/DoctorRoute');
    const salesActivityRoutes = require('./src/sales/SalesRoute');
    const doctorsVisitRoutes = require('./src/DoctorVisite/Route');
    const expenseRoutes = require('./src/expencse/expensesRoute');
    const orderRoutes = require('./src/order/orderRoutes');
    const productRoutes = require('./src/product/productRoutes');
    const locationRoutes = require('./src/location/locationRoutes');
    const stockistRoutes = require('./src/stockist/Route');
    const chemistRoutes = require('./src/chemist/Route');
    const ticketRoutes = require('./src/raseticket/Route');
    const notificationRoutes = require('./src/notification/Route');
    const visitRoutes = require('./src/visit/visitRoutes');

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/pdfs', pdfRoutes);
    app.use('/api/headoffices', headOfficeRouter);
    app.use('/api/states', stateRouter);

    app.use('/api/doctors', doctorRouter);
    app.use('/api/sales', salesActivityRoutes);
    app.use('/api/doctor-visits', doctorsVisitRoutes);
    app.use('/api/expenses', expenseRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/locations', locationRoutes);
    app.use('/api/stockists', stockistRoutes);
    app.use('/api/chemists', chemistRoutes);
    app.use('/api/tickets', ticketRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/visits', visitRoutes);

    app.get('/', (req, res) => {
      res.send('Sales Management API is running');
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
