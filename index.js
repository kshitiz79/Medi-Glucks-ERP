// backend/index.js

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { redisClient } = require('./src/config/redis');
const LocationWebSocket = require('./src/location/locationWebSocket');

// Initialize location worker (starts processing queue)
require('./src/location/locationWorker');

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
            // CORS rejected origin (security check)
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- MongoDB Connection & Index Cleanup ---
const mongoOptions = {
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain a minimum of 5 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
    retryWrites: true
};

mongoose.connect(process.env.MONGO_URI, mongoOptions)
    .then(async () => {
        // MongoDB connected successfully

        // Drop old unique index on registration_number (if present)
        const coll = mongoose.connection.db.collection('doctors');
        try {
            await coll.dropIndex('registration_number_1');
            // Dropped unique index on registration_number
        } catch (err) {
            if (err.codeName === 'IndexNotFound') {
                // No registration_number index to drop
            } else {
                // Error dropping registration_number index
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
        const gpsTrackingRoutes = require('./src/location/gpsTrackingRoutes');
        const dashboardRoutes = require('./src/dashboard/userDashboardRoutes');
        const debugRoutes = require('./src/debug/debugRoutes');

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
        app.use('/api/gps-tracking', gpsTrackingRoutes);
        app.use('/api/mobile/dashboard', dashboardRoutes);
        app.use('/api/debug', debugRoutes);

        app.get('/', (req, res) => {
            res.send('Sales Management API is running');
        });

        // Health check endpoint
        app.get('/health', (req, res) => {
            const dbState = mongoose.connection.readyState;
            const dbStates = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: {
                    state: dbStates[dbState],
                    connected: dbState === 1
                },
                uptime: process.uptime()
            });
        });

        const PORT = process.env.PORT || 5050;
        server.listen(PORT, async () => {
            // Server running on port
            // Socket.IO server initialized
            
            // Initialize Redis connection
            try {
                await redisClient.connect();
                // Redis connected and ready for GPS tracking
            } catch (error) {
                // Redis connection failed
            }
            
            // Initialize Location WebSocket service
            const locationWS = new LocationWebSocket(io);
            // Location WebSocket service initialized
        });

        // Socket.IO connection handling
        io.on('connection', (socket) => {
            // console.log('Client connected:', socket.id); // Debug log (commented out)

            // Join user-specific room for attendance updates
            socket.on('join-user-room', (userId) => {
                socket.join(`user-${userId}`);
                // console.log(`User ${userId} joined their room`); // Debug log (commented out)
            });

            // GPS Tracking - Join location tracking room
            socket.on('join-location-tracking', (data) => {
                const { userId, userType } = data;
                
                if (userType === 'admin') {
                    socket.join('admin-location-tracking');
                    // Admin client joined location tracking
                } else if (userId) {
                    socket.join(`user-location-${userId}`);
                    // User joined location tracking
                }
            });

            // GPS Tracking - Handle real-time location updates
            socket.on('location-update', (data) => {
                const { userId } = data;
                if (userId) {
                    // Broadcast to admin clients
                    io.to('admin-location-tracking').emit('user-location-update', {
                        userId,
                        ...data,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            socket.on('disconnect', () => {
                // Client disconnected
            });

            socket.on('disconnect', () => {
                // console.log('Client disconnected:', socket.id); // Debug log (commented out)
            });
        });
    })
    .catch(err => {
        // MongoDB connection error
        process.exit(1);
    });

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
    // Mongoose connected to MongoDB
});

mongoose.connection.on('error', (err) => {
    // Mongoose connection error
});

mongoose.connection.on('disconnected', () => {
    // Mongoose disconnected from MongoDB
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        // MongoDB connection closed through app termination
        process.exit(0);
    } catch (err) {
        // Error closing MongoDB connection
        process.exit(1);
    }
});
