const Bull = require('bull');
const { redisClient } = require('../config/redis');

// Create queue for location processing
const locationQueue = new Bull('location processing', {
    redis: {
        host: 'redis-15696.c330.asia-south1-1.gce.redns.redis-cloud.com',
        port: 15696,
        username: 'default',
        password: 'DpPWHkIXy07EG2uTadRFYv13NeVk8Bco'
    },
    defaultJobOptions: {
        removeOnComplete: 100, // Keep only last 100 completed jobs
        removeOnFail: 50, // Keep only last 50 failed jobs
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
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

// Add location event to queue
const addLocationEvent = async (locationData) => {
    try {
        const jobData = {
            userId: locationData.userId,
            lat: locationData.lat,
            lng: locationData.lng,
            speed: locationData.speed || 0,
            accuracy: locationData.accuracy || null,
            timestamp: locationData.timestamp || new Date(),
            batteryLevel: locationData.batteryLevel || null,
            networkType: locationData.networkType || 'unknown'
        };

        const job = await locationQueue.add('process-location', jobData, {
            priority: 1, // Higher priority for real-time data
            delay: 0,
            jobId: `${locationData.userId}-${Date.now()}` // Unique job ID
        });

        // Added location job for user
        return job;
    } catch (error) {
        // Error adding location event to queue
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

// Clean old jobs
const cleanQueue = async () => {
    try {
        await locationQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
        await locationQueue.clean(24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 24 hours
        // Queue cleaned successfully
    } catch (error) {
        console.error('Error cleaning queue:', error);
    }
};

// Pause/Resume queue
const pauseQueue = async () => {
    await locationQueue.pause();
    console.log('Location queue paused');
};

const resumeQueue = async () => {
    await locationQueue.resume();
    console.log('Location queue resumed');
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
    closeQueue
};