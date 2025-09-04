const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/user/User');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/glcukscare');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Function to remove headOffices from Admin users
const removeAdminHeadOffices = async () => {
  try {
    console.log('Removing headOffices from Admin users...\n');
    
    // Find all Admin users with headOffices
    const adminUsers = await User.find({ 
      role: 'Admin',
      headOffices: { $exists: true, $ne: [] }
    }).select('_id name email headOffices');
    
    console.log(`Found ${adminUsers.length} Admin users with headOffices:\n`);
    
    let updatedCount = 0;
    
    for (const user of adminUsers) {
      console.log(`Processing: ${user.name} (${user.email})`);
      console.log(`  Current headOffices:`, user.headOffices);
      
      // Remove headOffices field
      user.headOffices = [];
      
      try {
        await user.save();
        console.log(`  ✓ Updated user successfully`);
        updatedCount++;
      } catch (saveErr) {
        console.log(`  ✗ Failed to save user:`, saveErr.message);
      }
      
      console.log('');
    }
    
    console.log(`=== SUMMARY ===`);
    console.log(`Updated ${updatedCount} Admin users`);
    console.log(`Removal of headOffices from Admin users completed!\n`);
    
  } catch (error) {
    console.error('Error removing headOffices from Admin users:', error);
  }
};

// Run the removal
const run = async () => {
  await connectDB();
  await removeAdminHeadOffices();
  process.exit(0);
};

run();