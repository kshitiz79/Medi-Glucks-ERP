// Script to fix comma-separated headOffice values in the database
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Import models
const User = require('../src/user/User');
const Doctor = require('../src/doctor/Doctor');
const Chemist = require('../src/chemist/Chemist');
const Stockist = require('../src/stockist/Stockist');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-database');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function fixUserHeadOffices() {
    console.log('🔧 Fixing User headOffice data...');

    const users = await User.find({});
    let fixedCount = 0;

    for (const user of users) {
        let needsUpdate = false;

        // Check if headOffice contains comma (indicating multiple IDs)
        if (user.headOffice && typeof user.headOffice === 'string' && user.headOffice.includes(',')) {
            const headOfficeIds = user.headOffice.split(',').map(id => id.trim());

            // Set the first ID as the primary headOffice
            if (mongoose.Types.ObjectId.isValid(headOfficeIds[0])) {
                user.headOffice = headOfficeIds[0];
                needsUpdate = true;
            }

            // Add all IDs to headOffices array if not already there
            const validIds = headOfficeIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length > 0) {
                user.headOffices = [...new Set([...(user.headOffices || []), ...validIds])];
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await user.save();
            fixedCount++;
            console.log(`✅ Fixed user: ${user.name} (${user.email})`);
        }
    }

    console.log(`🎉 Fixed ${fixedCount} users`);
}

async function fixDoctorHeadOffices() {
    console.log('🔧 Fixing Doctor headOffice data...');

    const doctors = await Doctor.find({});
    let fixedCount = 0;

    for (const doctor of doctors) {
        if (doctor.headOffice && typeof doctor.headOffice === 'string' && doctor.headOffice.includes(',')) {
            const headOfficeIds = doctor.headOffice.split(',').map(id => id.trim());

            // Set the first valid ID as the headOffice
            const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
            if (firstValidId) {
                doctor.headOffice = firstValidId;
                await doctor.save();
                fixedCount++;
                console.log(`✅ Fixed doctor: ${doctor.name}`);
            }
        }
    }

    console.log(`🎉 Fixed ${fixedCount} doctors`);
}

async function fixChemistHeadOffices() {
    console.log('🔧 Fixing Chemist headOffice data...');

    const chemists = await Chemist.find({});
    let fixedCount = 0;

    for (const chemist of chemists) {
        if (chemist.headOffice && typeof chemist.headOffice === 'string' && chemist.headOffice.includes(',')) {
            const headOfficeIds = chemist.headOffice.split(',').map(id => id.trim());

            // Set the first valid ID as the headOffice
            const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
            if (firstValidId) {
                chemist.headOffice = firstValidId;
                await chemist.save();
                fixedCount++;
                console.log(`✅ Fixed chemist: ${chemist.firmName}`);
            }
        }
    }

    console.log(`🎉 Fixed ${fixedCount} chemists`);
}

async function fixStockistHeadOffices() {
    console.log('🔧 Fixing Stockist headOffice data...');

    const stockists = await Stockist.find({});
    let fixedCount = 0;

    for (const stockist of stockists) {
        if (stockist.headOffice && typeof stockist.headOffice === 'string' && stockist.headOffice.includes(',')) {
            const headOfficeIds = stockist.headOffice.split(',').map(id => id.trim());

            // Set the first valid ID as the headOffice
            const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
            if (firstValidId) {
                stockist.headOffice = firstValidId;
                await stockist.save();
                fixedCount++;
                console.log(`✅ Fixed stockist: ${stockist.firmName}`);
            }
        }
    }

    console.log(`🎉 Fixed ${fixedCount} stockists`);
}

async function main() {
    try {
        await connectDB();

        console.log('🚀 Starting headOffice data cleanup...');

        await fixUserHeadOffices();
        await fixDoctorHeadOffices();
        await fixChemistHeadOffices();
        await fixStockistHeadOffices();

        console.log('✅ All headOffice data has been cleaned up!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };