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

// Function to normalize and save all users' headOffices data
const normalizeAllUsersHeadOffices = async () => {
  try {
    console.log('Normalizing all users headOffices data...\n');
    
    // Find all users
    const allUsers = await User.find({}).select('_id name email headOffice headOffices isActive');
    
    console.log(`Found ${allUsers.length} total users\n`);
    
    let updatedCount = 0;
    
    for (const user of allUsers) {
      console.log(`Processing: ${user.name} (${user.email})`);
      
      // Check if user has headOffices array
      if (user.headOffices && Array.isArray(user.headOffices)) {
        console.log(`  Has ${user.headOffices.length} head offices`);
        
        // Normalize each head office entry
        let normalizedHeadOffices = [];
        let hasChanges = false;
        
        for (const office of user.headOffices) {
          if (office) {
            // Handle different data formats
            if (typeof office === 'string') {
              // String ObjectId - convert to ObjectId
              try {
                normalizedHeadOffices.push(new mongoose.Types.ObjectId(office));
                hasChanges = true;
                console.log(`    Converted string to ObjectId: ${office}`);
              } catch (err) {
                console.log(`    Failed to convert string: ${office}`);
              }
            } else if (office._id) {
              // Object with _id field - extract the ObjectId
              try {
                normalizedHeadOffices.push(new mongoose.Types.ObjectId(office._id));
                hasChanges = true;
                console.log(`    Extracted ObjectId from object: ${office._id}`);
              } catch (err) {
                console.log(`    Failed to extract ObjectId: ${office._id}`);
              }
            } else if (office instanceof mongoose.Types.ObjectId) {
              // Already an ObjectId - keep as is
              normalizedHeadOffices.push(office);
            } else {
              // Unknown format - try to convert
              try {
                normalizedHeadOffices.push(new mongoose.Types.ObjectId(office.toString()));
                hasChanges = true;
                console.log(`    Converted unknown format: ${office}`);
              } catch (err) {
                console.log(`    Failed to convert unknown format: ${office}`);
              }
            }
          }
        }
        
        // Update user if there were changes
        if (hasChanges) {
          user.headOffices = normalizedHeadOffices;
          // Remove single headOffice field to avoid confusion
          user.headOffice = undefined;
          
          try {
            await user.save();
            console.log(`  ✓ Updated user successfully`);
            updatedCount++;
          } catch (saveErr) {
            console.log(`  ✗ Failed to save user:`, saveErr.message);
          }
        } else {
          console.log(`  No changes needed`);
        }
      } else {
        console.log(`  No headOffices array found`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log(`=== SUMMARY ===`);
    console.log(`Updated ${updatedCount} users`);
    console.log(`Normalization completed!\n`);
    
    // Final verification
    console.log('=== FINAL VERIFICATION ===');
    
    // Test the Bihar query
    const biharHeadOfficeIds = [
      new mongoose.Types.ObjectId('68a2f6f9c2507f6549b12547'), // Madhubani
      new mongoose.Types.ObjectId('68a42d720fd473dd1c3074d3'), // Darbhanga
      new mongoose.Types.ObjectId('68aef669aad40b6e2db0b415'), // Samastipur
      new mongoose.Types.ObjectId('68aef792aad40b6e2db0b559'), // Katihar
      new mongoose.Types.ObjectId('68a2f6a7c2507f6549b1253a'),  // Gaya
    ];
    
    const biharUsers = await User.find({ 
      isActive: true, 
      headOffices: { $in: biharHeadOfficeIds } 
    }).select('name email headOffices');
    
    console.log(`Found ${biharUsers.length} users in Bihar state:`);
    biharUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    
  } catch (error) {
    console.error('Error normalizing user headOffices data:', error);
  }
};

// Run the normalization
const run = async () => {
  await connectDB();
  await normalizeAllUsersHeadOffices();
  process.exit(0);
};

run();