// Backend/scripts/populateIndianData.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import models using your exact structure
const State = require('../src/state/State');
const HeadOffice = require('../src/headoffice/Model');
const User = require('../src/user/User');

// Connect to MongoDB
const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/glucksCareERP');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Indian States Data - matching your State model
const indianStates = [
    { name: 'Andhra Pradesh', code: 'AP', country: 'India', isActive: true },
    { name: 'Arunachal Pradesh', code: 'AR', country: 'India', isActive: true },
    { name: 'Assam', code: 'AS', country: 'India', isActive: true },
    { name: 'Bihar', code: 'BR', country: 'India', isActive: true },
    { name: 'Chhattisgarh', code: 'CG', country: 'India', isActive: true },
    { name: 'Goa', code: 'GA', country: 'India', isActive: true },
    { name: 'Gujarat', code: 'GJ', country: 'India', isActive: true },
    { name: 'Haryana', code: 'HR', country: 'India', isActive: true },
    { name: 'Himachal Pradesh', code: 'HP', country: 'India', isActive: true },
    { name: 'Jharkhand', code: 'JH', country: 'India', isActive: true },
    { name: 'Karnataka', code: 'KA', country: 'India', isActive: true },
    { name: 'Kerala', code: 'KL', country: 'India', isActive: true },
    { name: 'Madhya Pradesh', code: 'MP', country: 'India', isActive: true },
    { name: 'Maharashtra', code: 'MH', country: 'India', isActive: true },
    { name: 'Manipur', code: 'MN', country: 'India', isActive: true },
    { name: 'Meghalaya', code: 'ML', country: 'India', isActive: true },
    { name: 'Mizoram', code: 'MZ', country: 'India', isActive: true },
    { name: 'Nagaland', code: 'NL', country: 'India', isActive: true },
    { name: 'Odisha', code: 'OR', country: 'India', isActive: true },
    { name: 'Punjab', code: 'PB', country: 'India', isActive: true },
    { name: 'Rajasthan', code: 'RJ', country: 'India', isActive: true },
    { name: 'Sikkim', code: 'SK', country: 'India', isActive: true },
    { name: 'Tamil Nadu', code: 'TN', country: 'India', isActive: true },
    { name: 'Telangana', code: 'TS', country: 'India', isActive: true },
    { name: 'Tripura', code: 'TR', country: 'India', isActive: true },
    { name: 'Uttar Pradesh', code: 'UP', country: 'India', isActive: true },
    { name: 'Uttarakhand', code: 'UK', country: 'India', isActive: true },
    { name: 'West Bengal', code: 'WB', country: 'India', isActive: true },
    { name: 'Delhi', code: 'DL', country: 'India', isActive: true },
    { name: 'Jammu and Kashmir', code: 'JK', country: 'India', isActive: true },
    { name: 'Ladakh', code: 'LA', country: 'India', isActive: true },
    { name: 'Puducherry', code: 'PY', country: 'India', isActive: true },
    { name: 'Chandigarh', code: 'CH', country: 'India', isActive: true },
    { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN', country: 'India', isActive: true },
    { name: 'Lakshadweep', code: 'LD', country: 'India', isActive: true },
    { name: 'Andaman and Nicobar Islands', code: 'AN', country: 'India', isActive: true }
];

// Head Office Data Generator - matching your HeadOffice model
const generateHeadOffices = (states) => {
    const headOffices = [];
    const cities = [
        'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat',
        'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
        'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana',
        'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar',
        'Varanasi', 'Srinagar', 'Dhanbad', 'Jodhpur', 'Amritsar', 'Raipur', 'Allahabad',
        'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Madurai', 'Guwahati', 'Chandigarh',
        'Hubli-Dharwad', 'Mysore', 'Tiruchirappalli', 'Bareilly', 'Aligarh', 'Moradabad',
        'Jalandhar', 'Bhubaneswar', 'Salem', 'Mira-Bhayandar', 'Warangal', 'Guntur',
        'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida', 'Jamshedpur',
        'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun'
    ];

    for (let i = 0; i < 70; i++) {
        const randomState = states[Math.floor(Math.random() * states.length)];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];

        headOffices.push({
            name: `${randomCity} Head Office ${i + 1}`,
            state: randomState._id, // Optional field in your model
            pincode: String(Math.floor(Math.random() * 900000) + 100000),
            isActive: true
        });
    }

    return headOffices;
};

// User Data Generator - matching your User model exactly
const generateUsers = (headOffices, states) => {
    const users = [];
    const firstNames = [
        'Amit', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Arjun', 'Kavya', 'Rohan', 'Nisha',
        'Suresh', 'Meera', 'Karan', 'Riya', 'Anil', 'Deepika', 'Rajesh', 'Sita', 'Manoj', 'Geeta',
        'Sanjay', 'Lakshmi', 'Ravi', 'Sunita', 'Ashok', 'Rekha', 'Naresh', 'Usha', 'Dinesh', 'Shanti',
        'Ramesh', 'Kamala', 'Mahesh', 'Seema', 'Prakash', 'Lata', 'Santosh', 'Anita', 'Vinod', 'Gita',
        'Yogesh', 'Asha', 'Ajay', 'Sunita', 'Sunil', 'Radha', 'Nitin', 'Sushma', 'Rajiv', 'Veena'
    ];

    const lastNames = [
        'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Prasad', 'Yadav', 'Mishra', 'Pandey', 'Tiwari',
        'Agarwal', 'Jain', 'Bansal', 'Mittal', 'Shah', 'Patel', 'Reddy', 'Nair', 'Pillai', 'Menon',
        'Iyer', 'Rao', 'Raman', 'Krishnan', 'Bhat', 'Shetty', 'Hegde', 'Kamat', 'Desai', 'Mehta',
        'Thakur', 'Chawla', 'Malhotra', 'Kapoor', 'Khurana', 'Bhatia', 'Sethi', 'Arora', 'Chopra', 'Goel'
    ];

    let userCounter = 1;

    // Helper function to generate user with ONLY required fields as per your model
    const createUser = (role, count) => {
        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const fullName = `${firstName} ${lastName}`;
            const randomHeadOffice = headOffices[Math.floor(Math.random() * headOffices.length)];

            users.push({
                // REQUIRED FIELDS ONLY as per your User model
                employeeCode: `EMP${String(userCounter).padStart(4, '0')}`,
                name: fullName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${userCounter}@gluckscare.com`,
                password: 'Password@123', // Will be hashed by your pre-save middleware
                mobileNumber: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                gender: Math.random() > 0.5 ? 'Male' : 'Female',
                role: role,

                // OPTIONAL FIELDS - keeping minimal as per your requirement
                headOffice: randomHeadOffice._id,
                isActive: true
            });

            userCounter++;
        }
    };

    // Generate users according to your hierarchy requirements
    createUser('State Head', 5);
    createUser('Zonal Manager', 10);
    createUser('Area Manager', 25);
    createUser('Manager', 40);
    createUser('User', 70); // MRs

    return users;
};

// Main population function
const populateData = async() => {
    try {
        console.log('🚀 Adding specific admin users to existing data...');

        // Don't clear existing data - just add new admin users
        console.log('📋 Adding specific admin users...');

        // Get existing head offices to assign to admin users
        const existingHeadOffices = await HeadOffice.find({ isActive: true }).limit(2);

        if (existingHeadOffices.length === 0) {
            console.log('❌ No head offices found. Please run the full data population first.');
            return;
        }

        // Create specific admin users
        const adminUsers = [{
                employeeCode: 'ADMIN001',
                name: 'System Administrator',
                email: 'admin@gmail.com',
                password: '123456', // Will be hashed by your pre-save middleware
                mobileNumber: '9999999999',
                gender: 'Male',
                role: 'Admin',
                headOffice: existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'KSHITIZ001',
                name: 'Kshitiz Maurya',
                email: 'kshitizmaurya6@gmail.com',
                password: '123456', // Will be hashed by your pre-save middleware
                mobileNumber: '9876543210',
                gender: 'Male',
                role: 'Admin',
                headOffice: existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'NH001',
                name: 'Rajesh National Head',
                email: 'nationalhead1@gluckscare.com',
                password: '123456',
                mobileNumber: '9555666777',
                gender: 'Male',
                role: 'National Head',
                headOffice: existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'NH002',
                name: 'Priya National Head',
                email: 'nationalhead2@gluckscare.com',
                password: '123456',
                mobileNumber: '9444555666',
                gender: 'Female',
                role: 'National Head',
                headOffice: existingHeadOffices[1] ? existingHeadOffices[1]._id : existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'OPS001',
                name: 'Vikram Operations',
                email: 'opsteam1@gluckscare.com',
                password: '123456',
                mobileNumber: '9333444555',
                gender: 'Male',
                role: 'Opps Team',
                headOffice: existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'OPS002',
                name: 'Sneha Operations',
                email: 'opsteam2@gluckscare.com',
                password: '123456',
                mobileNumber: '9222333444',
                gender: 'Female',
                role: 'Opps Team',
                headOffice: existingHeadOffices[1] ? existingHeadOffices[1]._id : existingHeadOffices[0]._id,
                isActive: true
            },
            {
                employeeCode: 'OPS003',
                name: 'Amit Operations',
                email: 'opsteam3@gluckscare.com',
                password: '123456',
                mobileNumber: '9111222333',
                gender: 'Male',
                role: 'Opps Team',
                headOffice: existingHeadOffices[0]._id,
                isActive: true
            }
        ];

        // Check if these users already exist
        for (const userData of adminUsers) {
            const existingUser = await User.findOne({
                $or: [
                    { email: userData.email },
                    { employeeCode: userData.employeeCode }
                ]
            });

            if (existingUser) {
                console.log(`⚠️ User ${userData.email} already exists, skipping...`);
            } else {
                const newUser = await User.create(userData);
                console.log(`✅ Created admin user: ${newUser.email}`);
            }
        }

        // Get current counts
        const totalUsers = await User.countDocuments();
        const totalStates = await State.countDocuments();
        const totalHeadOffices = await HeadOffice.countDocuments();
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Summary
        console.log('\n📊 CURRENT DATABASE SUMMARY:');
        console.log(`🗺️ Total States: ${totalStates}`);
        console.log(`🏢 Total Head Offices: ${totalHeadOffices}`);
        console.log(`👥 Total Users: ${totalUsers}`);
        console.log('👥 Users by Role:');
        usersByRole.forEach(role => {
            console.log(`   • ${role._id}: ${role.count}`);
        });

        console.log('\n🎉 Admin users added successfully!');
        console.log('\n📝 Admin Login Credentials:');
        console.log('1. Email: admin@gmail.com | Password: 123456');
        console.log('2. Email: kshitizmaurya6@gmail.com | Password: 123456');
        console.log('\n💡 Note: Existing user data has been preserved.');

    } catch (error) {
        console.error('❌ Error adding admin users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Database connection closed');
    }
};

// Run the script
if (require.main === module) {
    connectDB().then(() => {
        populateData();
    });
}

module.exports = { populateData, connectDB };