const Bull = require('bull');
const { redisClient } = require('../config/redis');

// Create queue for location processing with optimized memory settings
const locationQueue = new Bull('location processing', {
    redis: {
        host: 'redis-15696.c330.asia-south1-1.gce.redns.redis-cloud.com',
        port: 15696,
        username: 'default',
        password: 'DpPWHkIXy07EG2uTadRFYv13NeVk8Bco',
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        maxmemoryPolicy: 'allkeys-lru'
    },
    prefix: 'bull',
    defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 50 }, // Keep max 50 jobs or 1 hour old
        removeOnFail: { age: 3600, count: 25 }, // Keep max 25 failed jobs or 1 hour old
        attempts: 1, // Reduce attempts to save memory
        backoff: {
            type: 'exponential',
            delay: 1000
        },
        ttl: 3600000, // Job TTL: 1 hour
        delay: 0
    },
    settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1
    },
    // Rate limiting to prevent memory overflow
    limiter: {
        max: 30, // Max 30 jobs per duration
        duration: 1000 // Per second
    }
});

// Queue events
locationQueue.on('completed', (job, result) => {
    // Location job completed
});

locationQueue.on('failed', (job, err) => {
    // Location job failed
});

locationQueue.on('stalled', (job) => {
    // Location job stalled
});

// Add location event to queue with deduplication
const addLocationEvent = async (locationData) => {
    try {
        // Simple deduplication: skip if same user location within 30 seconds
        const jobId = `${locationData.userId}-${Math.floor(Date.now() / 30000)}`;
        
        const jobData = {
            userId: locationData.userId,
            lat: parseFloat(locationData.lat),
            lng: parseFloat(locationData.lng),
            speed: locationData.speed || 0,
            accuracy: locationData.accuracy || null,
            timestamp: locationData.timestamp || new Date(),
            batteryLevel: locationData.batteryLevel || null,
            networkType: locationData.networkType || 'unknown'
        };

        // Skip if accuracy is too poor (>100m) to save memory
        if (jobData.accuracy && jobData.accuracy > 100) {
            console.log(`Skipping location for user ${locationData.userId}: poor accuracy (${jobData.accuracy}m)`);
            return null;
        }

        const job = await locationQueue.add('process-location', jobData, {
            priority: 1,
            delay: 0,
            jobId: jobId, // Prevents duplicate jobs
            removeOnComplete: { age: 1800, count: 20 }, // More aggressive cleanup
            removeOnFail: { age: 1800, count: 10 },
            attempts: 1 // Single attempt to save memory
        });

        return job;
    } catch (error) {
        // Don't throw on duplicate job errors
        if (error.message && error.message.includes('duplicate')) {
            return null;
        }
        console.error('Error adding location event to queue:', error);
        throw error;
    }
};

// Add batch location events
const addBatchLocationEvents = async (locationDataArray) => {
    try {
        const jobs = locationDataArray.map((locationData, index) => ({
            name: 'process-location',
            data: {
                userId: locationData.userId,
                lat: locationData.lat,
                lng: locationData.lng,
                speed: locationData.speed || 0,
                accuracy: locationData.accuracy || null,
                timestamp: locationData.timestamp || new Date(),
                batteryLevel: locationData.batteryLevel || null,
                networkType: locationData.networkType || 'unknown'
            },
            opts: {
                priority: 2, // Lower priority for batch data
                delay: index * 100, // Stagger processing
                jobId: `batch-${locationData.userId}-${Date.now()}-${index}`
            }
        }));

        const addedJobs = await locationQueue.addBulk(jobs);
        // Added batch location jobs
        return addedJobs;
    } catch (error) {
        // Error adding batch location events to queue
        throw error;
    }
};

// Get queue statistics
const getQueueStats = async () => {
    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            locationQueue.getWaiting(),
            locationQueue.getActive(),
            locationQueue.getCompleted(),
            locationQueue.getFailed(),
            locationQueue.getDelayed()
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            total: waiting.length + active.length + completed.length + failed.length + delayed.length
        };
    } catch (error) {
        // Error getting queue stats
        return null;
    }
};

// Clean old jobs aggressively
const cleanQueue = async () => {
    try {
        // Clean completed jobs older than 30 minutes
        await locationQueue.clean(30 * 60 * 1000, 'completed', 100);
        // Clean failed jobs older than 30 minutes
        await locationQueue.clean(30 * 60 * 1000, 'failed', 50);
        // Clean stalled jobs older than 10 minutes
        await locationQueue.clean(10 * 60 * 1000, 'stalled', 10);
        // Clean active jobs older than 5 minutes (stuck jobs)
        await locationQueue.clean(5 * 60 * 1000, 'active', 5);
        
        console.log('Location queue cleaned successfully');
        
        // Get stats after cleanup
        const stats = await getQueueStats();
        console.log('Queue stats after cleanup:', stats);
        
    } catch (error) {
        console.error('Error cleaning queue:', error);
    }
};

// Auto-cleanup every 5 minutes
setInterval(cleanQueue, 5 * 60 * 1000);

// Pause/Resume queue
const pauseQueue = async () => {
    await locationQueue.pause();
    console.log('Location queue paused');
};

const resumeQueue = async () => {
    await locationQueue.resume();
    console.log('Location queue resumed');
};

// Monitor Redis memory usage
const monitorRedisMemory = async () => {
    try {
        const Redis = require('ioredis');
        const redis = new Redis({
            host: 'redis-15696.c330.asia-south1-1.gce.redns.redis-cloud.com',
            port: 15696,
            username: 'default',
            password: 'DpPWHkIXy07EG2uTadRFYv13NeVk8Bco'
        });
        
        const memoryInfo = await redis.memory('usage');
        const maxMemory = await redis.config('get', 'maxmemory');
        
        console.log('Redis Memory Info:', {
            memoryUsage: memoryInfo,
            maxMemory: maxMemory[1],
            usagePercentage: maxMemory[1] ? ((memoryInfo / parseInt(maxMemory[1])) * 100).toFixed(2) + '%' : 'N/A'
        });
        
        redis.disconnect();
        return { usage: memoryInfo, max: maxMemory[1] };
    } catch (error) {
        console.error('Error monitoring Redis memory:', error);
        return null;
    }
};

// Emergency memory cleanup
const emergencyCleanup = async () => {
    try {
        console.log('🚨 Emergency cleanup initiated');
        
        // Pause queue
        await locationQueue.pause();
        
        // Clean all job types aggressively
        await locationQueue.clean(0, 'completed', 0); // Clean all completed
        await locationQueue.clean(0, 'failed', 0); // Clean all failed
        await locationQueue.clean(0, 'stalled', 0); // Clean all stalled
        await locationQueue.clean(0, 'waiting', 0); // Clean all waiting
        
        // Clean user location cache
        const { redisClient } = require('../config/redis');
        if (redisClient.isReady()) {
            const keys = await redisClient.getClient().keys('user:location:*');
            if (keys.length > 0) {
                await redisClient.getClient().del(...keys);
                console.log(`🗑️ Cleaned ${keys.length} user location cache entries`);
            }
        }
        
        // Resume queue
        await locationQueue.resume();
        
        console.log('✅ Emergency cleanup completed');
        
        // Monitor memory after cleanup
        await monitorRedisMemory();
        
    } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
    }
};

// Graceful shutdown
const closeQueue = async () => {
    try {
        await locationQueue.close();
        console.log('Location queue closed');
    } catch (error) {
        console.error('Error closing location queue:', error);
    }
};

module.exports = {
    locationQueue,
    addLocationEvent,
    addBatchLocationEvents,
    getQueueStats,
    cleanQueue,
    pauseQueue,
    resumeQueue,
    closeQueue,
    monitorRedisMemory,
    emergencyCleanup
};