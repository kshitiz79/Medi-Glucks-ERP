#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const mongoOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true
};

async function monitorLocationQueries() {
    console.log('🔄 Starting location query performance monitoring...');
    
    try {
        await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        console.log('✅ Connected to MongoDB');

        const Location = mongoose.model('Location', new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            timestamp: { type: Date, default: Date.now },
            latitude: Number,
            longitude: Number,
            isSuspicious: Boolean
        }));

        // Test different query patterns
        const tests = [
            {
                name: 'Count all locations',
                query: () => Location.countDocuments({})
            },
            {
                name: 'Count locations from last 24 hours',
                query: () => Location.countDocuments({
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
            },
            {
                name: 'Find recent locations (limit 10)',
                query: () => Location.find({
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }).sort({ timestamp: -1 }).limit(10).lean()
            },
            {
                name: 'Find locations with user filter',
                query: async () => {
                    // Get a sample user ID first
                    const sampleLocation = await Location.findOne({}).lean();
                    if (!sampleLocation || !sampleLocation.userId) {
                        return { message: 'No sample user found' };
                    }
                    return Location.find({
                        userId: sampleLocation.userId,
                        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                    }).sort({ timestamp: -1 }).limit(5).lean();
                }
            }
        ];

        console.log('\n📊 Running performance tests...\n');

        for (const test of tests) {
            const startTime = Date.now();
            try {
                const result = await test.query();
                const duration = Date.now() - startTime;
                const resultCount = Array.isArray(result) ? result.length : (result.message || 'N/A');
                
                console.log(`✅ ${test.name}`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Results: ${resultCount}`);
                console.log('');
            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`❌ ${test.name}`);
                console.log(`   Duration: ${duration}ms`);
                console.log(`   Error: ${error.message}`);
                console.log('');
            }
        }

        // Check indexes
        console.log('🔍 Checking indexes...');
        const indexes = await Location.collection.getIndexes();
        console.log('Available indexes:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`   - ${indexName}: ${JSON.stringify(indexes[indexName])}`);
        });

    } catch (error) {
        console.error('❌ Monitoring failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed');
    }
}

monitorLocationQueries();