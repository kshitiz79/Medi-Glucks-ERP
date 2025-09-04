const { redisClient } = require('../config/redis');

class LocationWebSocket {
    constructor(io) {
        this.io = io;
        this.connectedUsers = new Map();
        this.adminClients = new Set();
        this.redisSubscriber = null;
        
        this.setupSocketHandlers();
        this.setupRedisSubscription();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Handle user joining for location updates
            socket.on('join-location-tracking', (data) => {
                const { userId, userType } = data;
                
                if (userType === 'admin') {
                    this.adminClients.add(socket.id);
                    socket.join('admin-location-tracking');
                    console.log(`Admin client ${socket.id} joined location tracking`);
                    
                    // Send initial active users data
                    this.sendActiveUsersToAdmin(socket);
                } else if (userId) {
                    this.connectedUsers.set(socket.id, userId);
                    socket.join(`user-location-${userId}`);
                    console.log(`User ${userId} joined location tracking`);
                }
            });

            // Handle real-time location updates from mobile clients
            socket.on('location-update', async (data) => {
                try {
                    const { userId, lat, lng, speed, accuracy, timestamp, batteryLevel, networkType } = data;
                    
                    if (!userId || !lat || !lng) {
                        socket.emit('location-error', { message: 'Invalid location data' });
                        return;
                    }

                    // Store in Redis for real-time access
                    const locationData = {
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        speed: speed ? parseFloat(speed) : 0,
                        accuracy: accuracy ? parseFloat(accuracy) : null,
                        timestamp: timestamp ? new Date(timestamp) : new Date(),
                        batteryLevel: batteryLevel ? parseFloat(batteryLevel) : null,
                        networkType: networkType || 'unknown'
                    };

                    await redisClient.setUserLocation(userId, locationData);
                    await redisClient.publishLocationUpdate(userId, locationData);

                    // Emit to admin clients
                    this.io.to('admin-location-tracking').emit('user-location-update', {
                        userId,
                        ...locationData
                    });

                    // Confirm update to sender
                    socket.emit('location-update-confirmed', {
                        userId,
                        timestamp: locationData.timestamp
                    });

                } catch (error) {
                    console.error('Error handling location update:', error);
                    socket.emit('location-error', { message: 'Failed to update location' });
                }
            });

            // Handle admin requesting specific user location
            socket.on('get-user-location', async (data) => {
                try {
                    const { userId } = data;
                    
                    if (!this.adminClients.has(socket.id)) {
                        socket.emit('location-error', { message: 'Unauthorized' });
                        return;
                    }

                    const location = await redisClient.getUserLocation(userId);
                    socket.emit('user-location-response', {
                        userId,
                        location
                    });

                } catch (error) {
                    console.error('Error getting user location:', error);
                    socket.emit('location-error', { message: 'Failed to get user location' });
                }
            });

            // Handle admin requesting all active users
            socket.on('get-all-active-users', async () => {
                try {
                    if (!this.adminClients.has(socket.id)) {
                        socket.emit('location-error', { message: 'Unauthorized' });
                        return;
                    }

                    await this.sendActiveUsersToAdmin(socket);

                } catch (error) {
                    console.error('Error getting all active users:', error);
                    socket.emit('location-error', { message: 'Failed to get active users' });
                }
            });

            // Handle stop event updates
            socket.on('stop-event', async (data) => {
                try {
                    const { userId, type, location, duration } = data;
                    
                    // Emit to admin clients
                    this.io.to('admin-location-tracking').emit('user-stop-event', {
                        userId,
                        type,
                        location,
                        duration,
                        timestamp: new Date()
                    });

                } catch (error) {
                    console.error('Error handling stop event:', error);
                }
            });

            // Handle movement event updates
            socket.on('movement-event', async (data) => {
                try {
                    const { userId, type, fromLocation, toLocation } = data;
                    
                    // Emit to admin clients
                    this.io.to('admin-location-tracking').emit('user-movement-event', {
                        userId,
                        type,
                        fromLocation,
                        toLocation,
                        timestamp: new Date()
                    });

                } catch (error) {
                    console.error('Error handling movement event:', error);
                }
            });

            // Handle client disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
                
                if (this.adminClients.has(socket.id)) {
                    this.adminClients.delete(socket.id);
                    console.log(`Admin client ${socket.id} disconnected`);
                }
                
                if (this.connectedUsers.has(socket.id)) {
                    const userId = this.connectedUsers.get(socket.id);
                    this.connectedUsers.delete(socket.id);
                    console.log(`User ${userId} disconnected`);
                }
            });
        });
    }

    async setupRedisSubscription() {
        try {
            this.redisSubscriber = await redisClient.subscribeToLocationUpdates((locationData) => {
                // Broadcast to all admin clients
                this.io.to('admin-location-tracking').emit('real-time-location-update', locationData);
            });
            
            console.log('Redis location updates subscription established');
        } catch (error) {
            console.error('Error setting up Redis subscription:', error);
        }
    }

    async sendActiveUsersToAdmin(socket) {
        try {
            const activeUsers = await redisClient.getAllActiveUsers();
            socket.emit('active-users-update', {
                users: activeUsers,
                totalCount: activeUsers.length,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error sending active users to admin:', error);
        }
    }

    // Broadcast location update to specific user's room
    broadcastToUser(userId, event, data) {
        this.io.to(`user-location-${userId}`).emit(event, data);
    }

    // Broadcast to all admin clients
    broadcastToAdmins(event, data) {
        this.io.to('admin-location-tracking').emit(event, data);
    }

    // Send system notification
    sendSystemNotification(type, message, data = {}) {
        this.io.emit('system-notification', {
            type,
            message,
            data,
            timestamp: new Date()
        });
    }

    // Get connection statistics
    getConnectionStats() {
        return {
            totalConnections: this.io.engine.clientsCount,
            connectedUsers: this.connectedUsers.size,
            adminClients: this.adminClients.size,
            rooms: Object.keys(this.io.sockets.adapter.rooms)
        };
    }

    // Cleanup method
    async cleanup() {
        if (this.redisSubscriber) {
            await this.redisSubscriber.disconnect();
        }
    }
}

module.exports = LocationWebSocket;