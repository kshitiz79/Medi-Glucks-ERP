const { createClient } = require('redis');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = createClient({
                username: 'default',
                password: 'DpPWHkIXy07EG2uTadRFYv13NeVk8Bco',
                socket: {
                    host: 'redis-15696.c330.asia-south1-1.gce.redns.redis-cloud.com',
                    port: 15696,
                    connectTimeout: 30000,
                    lazyConnect: true
                },
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.error('Redis connection refused');
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        console.error('Redis retry time exhausted');
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        console.error('Redis max retry attempts reached');
                        return undefined;
                    }
                    // Reconnect after
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('Redis client ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                console.log('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
            console.log('✅ Redis connected successfully');
            return this.client;
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
            console.log('Redis disconnected');
        }
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isConnected && this.client;
    }

    // Location-specific methods with TTL
    async setUserLocation(userId, locationData) {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const key = `user:location:${userId}`;
        const data = {
            ...locationData,
            lastUpdated: new Date().toISOString()
        };
        
        // Set with shorter TTL to save memory (30 minutes)
        await this.client.setEx(key, 1800, JSON.stringify(data));
        return data;
    }

    async getUserLocation(userId) {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const key = `user:location:${userId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async getAllActiveUsers() {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const keys = await this.client.keys('user:location:*');
        const users = [];
        
        for (const key of keys) {
            const userId = key.split(':')[2];
            const data = await this.client.get(key);
            if (data) {
                users.push({
                    userId,
                    ...JSON.parse(data)
                });
            }
        }
        
        return users;
    }

    async removeUserLocation(userId) {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const key = `user:location:${userId}`;
        await this.client.del(key);
    }

    // Pub/Sub methods for real-time updates
    async publishLocationUpdate(userId, locationData) {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const channel = 'location:updates';
        const message = JSON.stringify({
            userId,
            ...locationData,
            timestamp: new Date().toISOString()
        });
        
        await this.client.publish(channel, message);
    }

    async subscribeToLocationUpdates(callback) {
        if (!this.isReady()) {
            throw new Error('Redis client not ready');
        }
        
        const subscriber = this.client.duplicate();
        await subscriber.connect();
        
        await subscriber.subscribe('location:updates', (message) => {
            try {
                const data = JSON.parse(message);
                callback(data);
            } catch (error) {
                console.error('Error parsing location update message:', error);
            }
        });
        
        return subscriber;
    }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = {
    redisClient,
    RedisClient
};