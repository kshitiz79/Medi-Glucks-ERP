// backend/index.js

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://gluckscare.com',
            'https://sales-rep-visite.gluckscare.com'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible throughout the app
app.set('io', io);

// --- Middleware ---
app.use(express.json({ limit: '25mb' }));
app.use(helmet());

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://gluckscare.com',
    'https://gluckscare.com',
    'https://sales-rep-visite.gluckscare.com',
];

app.use(cors({
    origin: (origin, callback) => {
        // console.log('CORS Origin:', origin); // Debug log (commented out)
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
mongoose.connect(process.env.MONGO_URI)
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
        require('./src/doctor/Doctor'); // ensures schema is registered without unique
        // ... you can require other models here if they define indexes

        // Then mount routes and start server
        const authRoutes = require('./src/auth/auth');
        const userRoutes = require('./src/user/userRoutes');
        const masterRoutes = require('./src/user/masterRoutes');
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
        const salesTargetRoutes = require('./src/salesTarget/Route');
        const leaveTypeRoutes = require('./src/leaveType/Route');
        const holidayRoutes = require('./src/holiday/Route');
        const leaveRoutes = require('./src/leave/Route');
        const attendanceRoutes = require('./src/attendance/attendanceRoutes');
        const shiftRoutes = require('./src/shift/shiftRoutes');
        const versionRoutes = require('./src/version/versionRoutes');
        const payrollRoutes = require('./src/payroll/payrollRoutes');
        const cleanupRoutes = require('./src/admin/cleanupRoutes');
        const designationRoutes = require('./src/designation/Route');
        const dashboardRoutes = require('./src/dashboard/userDashboardRoutes');

        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/master', masterRoutes);
        app.use('/api/pdfs', pdfRoutes);
        app.use('/api/headoffices', headOfficeRouter);
        app.use('/api/states', stateRouter);
        app.use('/api/designations', designationRoutes);

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
        app.use('/api/sales-targets', salesTargetRoutes);
        app.use('/api/leave-types', leaveTypeRoutes);
        app.use('/api/holidays', holidayRoutes);
        app.use('/api/leaves', leaveRoutes);
        app.use('/api/attendance', attendanceRoutes);
        app.use('/api/shifts', shiftRoutes);
        app.use('/api/version', versionRoutes);
        app.use('/api/payroll', payrollRoutes);
        app.use('/api/admin/cleanup', cleanupRoutes);
        app.use('/api/mobile/dashboard', dashboardRoutes);

        app.get('/', (req, res) => {
            res.send('Sales Management API is running');
        });

        const PORT = process.env.PORT || 5050;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Socket.IO server initialized');
        });

        // Socket.IO connection handling
        io.on('connection', (socket) => {
            // console.log('Client connected:', socket.id); // Debug log (commented out)

            // Join user-specific room for attendance updates
            socket.on('join-user-room', (userId) => {
                socket.join(`user-${userId}`);
                // console.log(`User ${userId} joined their room`); // Debug log (commented out)
            });

            socket.on('disconnect', () => {
                // console.log('Client disconnected:', socket.id); // Debug log (commented out)
            });
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });
