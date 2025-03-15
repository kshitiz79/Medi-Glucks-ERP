// backend/index.js
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cors = require('cors'); // <-- Import CORS



dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173' // or an array of allowed origins
}));


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







app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/pdfs', pdfRoutes);
app.use('/api/headoffices', headOfficeRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/sales', salesActivityRoutes);
app.get('/', (req, res) => {
  res.send('Sales Management API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
