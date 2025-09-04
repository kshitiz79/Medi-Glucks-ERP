#!/usr/bin/env node

/**
 * Redis Cleanup Script
 * Use this script to clean up Redis memory when OOM errors occur
 */

const Redis = require('ioredis');

const redis = new Redis({
    host: 'redis-15696.c330.asia-south1-1.gce.redns.redis-cloud.com',
    port: 15696,
    username: 'default',
    password: 'DpPWHkIXy07EG2uTadRFYv13NeVk8Bco',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
});

async function getMemoryInfo() {
    try {
        const info = await redis.info('memory');
        const maxMemory = await redis.config('get', 'maxmemory');
        const policy = await redis.config('get', 'maxmemory-policy');
        
        console.log('\n📊 Redis Memory Information:');
        console.log('================================');
        console.log(info);
        console.log('\n⚙️  Configuration:');
        console.log('Max Memory:', maxMemory[1] || 'Not set');
        console.log('Eviction Policy:', policy[1] || 'noeviction');
        console.log('================================\n');
    } catch (error) {
        console.error('❌ Error getting memory info:', error.message);
    }
}

async function cleanBullQueues() {
    try {
        console.log('🧹 Cleaning Bull queue keys...');
        
        const keys = await redis.keys('bull:location processing:*');
        console.log(`Found ${keys.length} Bull queue keys`);
        
        if (keys.length > 0) {
            const result = await redis.del(...keys);
            console.log(`✅ Deleted ${result} Bull queue keys`);
        } else {
            console.log('ℹ️  No Bull queue keys found');
        }
    } catch (error) {
        console.error('❌ Error cleaning Bull queues:', error.message);
    }
}

async function cleanUserLocations() {
    try {
        console.log('🧹 Cleaning user location cache...');
        
        const keys = await redis.keys('user:location:*');
        console.log(`Found ${keys.length} user location keys`);
        
        if (keys.length > 0) {
            const result = await redis.del(...keys);
            console.log(`✅ Deleted ${result} user location keys`);
        } else {
            console.log('ℹ️  No user location keys found');
        }
    } catch (error) {
        console.error('❌ Error cleaning user locations:', error.message);
    }
}

async function optimizeRedisConfig() {
    try {
        console.log('⚙️  Optimizing Redis configuration...');
        
        // Try to set eviction policy
        try {
            await redis.config('set', 'maxmemory-policy', 'allkeys-lru');
            console.log('✅ Set maxmemory-policy to allkeys-lru');
        } catch (error) {
            console.log('⚠️  Could not set eviction policy (may require Redis Cloud dashboard)');
        }
        
        // Try to set max memory (example: 256MB)
        try {
            await redis.config('set', 'maxmemory', '268435456'); // 256MB
            console.log('✅ Set maxmemory to 256MB');
        } catch (error) {
            console.log('⚠️  Could not set max memory (may require Redis Cloud dashboard)');
        }
        
    } catch (error) {
        console.error('❌ Error optimizing config:', error.message);
    }
}

async function emergencyFlush() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to FLUSH ALL Redis data? This cannot be undone! (yes/no): ', (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'yes') {
                redis.flushdb()
                    .then(() => {
                        console.log('🗑️  Database flushed successfully');
                        resolve();
                    })
                    .catch((error) => {
                        console.error('❌ Error flushing database:', error.message);
                        resolve();
                    });
            } else {
                console.log('ℹ️  Flush cancelled');
                resolve();
            }
        });
    });
}

async function showKeyPatterns() {
    try {
        console.log('🔍 Scanning key patterns...');
        
        const patterns = ['bull:*', 'user:location:*', 'location:*'];
        
        for (const pattern of patterns) {
            const keys = await redis.keys(pattern);
            console.log(`${pattern}: ${keys.length} keys`);
            
            if (keys.length > 0 && keys.length <= 5) {
                console.log(`  Sample keys: ${keys.slice(0, 3).join(', ')}`);
            }
        }
    } catch (error) {
        console.error('❌ Error scanning keys:', error.message);
    }
}

async function main() {
    console.log('🚀 Redis Cleanup Tool Started\n');
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'info':
            await getMemoryInfo();
            break;
            
        case 'clean-queues':
            await cleanBullQueues();
            break;
            
        case 'clean-locations':
            await cleanUserLocations();
            break;
            
        case 'clean-all':
            await cleanBullQueues();
            await cleanUserLocations();
            await getMemoryInfo();
            break;
            
        case 'optimize':
            await optimizeRedisConfig();
            break;
            
        case 'scan':
            await showKeyPatterns();
            break;
            
        case 'emergency-flush':
            await emergencyFlush();
            break;
            
        default:
            console.log('🛠️  Available commands:');
            console.log('  info           - Show memory information');
            console.log('  clean-queues   - Clean Bull queue keys');
            console.log('  clean-locations- Clean user location cache');
            console.log('  clean-all      - Clean everything');
            console.log('  optimize       - Optimize Redis configuration');
            console.log('  scan           - Scan key patterns');
            console.log('  emergency-flush- Flush all Redis data (DANGEROUS)');
            console.log('\nExample: node cleanup-redis.js clean-all');
    }
    
    redis.disconnect();
    console.log('\n🏁 Cleanup completed');
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    redis.disconnect();
    process.exit(1);
});

main().catch((error) => {
    console.error('❌ Script error:', error);
    redis.disconnect();
    process.exit(1);
});