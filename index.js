// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cors = require('cors'); // <-- Import CORS



dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '25mb' })); 
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',  // For local development
  'https://gluckscare.com'  // Your frontend production domain
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);  // Allow request
    } else {
      callback(new Error('Not allowed by CORS'));  // Block request
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));




const authRoutes = require('./src/auth/auth');
const userRoutes = require('./src/user/userRoutes');
const pdfRoutes = require('./src/pdf/Route');
const headOfficeRouter = require('./src/headoffice/Route');
const doctorRouter = require('./src/doctor/DoctorRoute');
const salesActivityRoutes = require('./src/sales/SalesRoute');
const doctorsVisitRoutes = require('./src/DoctorVisite/Route');
const expenseRoutes = require('./src/expencse/expensesRoute');

const orderRoutes = require('./src/order/orderRoutes');
// In your index.js or app.js
const productRoutes = require('./src/product/productRoutes');

const locationRoutes = require('./src/location/locationRoutes');


const stockistRoutes = require('./src/stockist/Route');

const chemistRoutes = require('./src/chemist/Route');

const ticketRoutes = require('./src/raseticket/Route');


const notificatonRoutes = require('./src/notification/Route');








app.use('/api/chemists', chemistRoutes);

app.use('/api/tickets', ticketRoutes);


app.use('/api/locations', locationRoutes);


app.use('/api/stockists', stockistRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/pdfs', pdfRoutes);
app.use('/api/headoffices', headOfficeRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/sales', salesActivityRoutes);
app.use('/api/doctor-visits', doctorsVisitRoutes);

app.use('/api/expenses', expenseRoutes);

app.use('/api/orders', orderRoutes);


app.use('/api/products', productRoutes);


app.use('/api/notifications', notificatonRoutes);

app.get('/', (req, res) => {
  res.send('Sales Management API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
