#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

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

async function testConnection() {
    console.log('🔄 Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI environment variable is not set');
        process.exit(1);
    }

    try {
        // Test connection
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        console.log('✅ Successfully connected to MongoDB');

        // Test a simple query
        console.log('⏳ Testing database query...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`✅ Database query successful. Found ${collections.length} collections`);

        // Test connection pool
        console.log('⏳ Testing connection pool...');
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(mongoose.connection.db.admin().ping());
        }
        await Promise.all(promises);
        console.log('✅ Connection pool test successful');

        // Connection info
        console.log('\n📊 Connection Information:');
        console.log('- Database Name:', mongoose.connection.db.databaseName);
        console.log('- Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
        console.log('- Host:', mongoose.connection.host);
        console.log('- Port:', mongoose.connection.port);

    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        
        if (error.name === 'MongoServerSelectionError') {
            console.error('\n🔍 Troubleshooting tips:');
            console.error('1. Check if your IP address is whitelisted in MongoDB Atlas');
            console.error('2. Verify your MongoDB credentials');
            console.error('3. Check your internet connection');
            console.error('4. Ensure the MongoDB cluster is running');
        }
        
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Connection closed');
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n⚠️ Received SIGINT, closing connection...');
    await mongoose.connection.close();
    process.exit(0);
});

testConnection();