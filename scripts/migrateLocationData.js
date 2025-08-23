// scripts/migrateLocationData.js
const mongoose = require('mongoose');
const Location = require('../src/location/Location');
const User = require('../src/user/User');
require('dotenv').config();

async function migrateLocationData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find locations without userId but with userName
    const locationsToMigrate = await Location.find({
      userId: { $exists: false },
      userName: { $exists: true, $ne: null }
    });

    console.log(`Found ${locationsToMigrate.length} locations to migrate`);

    let migratedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const location of locationsToMigrate) {
      try {
        // Try to find user by name
        const user = await User.findOne({ name: location.userName });
        
        if (user) {
          await Location.updateOne(
            { _id: location._id },
            { 
              $set: { 
                userId: user._id,
                isActive: true // Set default for old records
              }
            }
          );
          migratedCount++;
          
          if (migratedCount % 100 === 0) {
            console.log(`Migrated ${migratedCount} locations...`);
          }
        } else {
          notFoundCount++;
          console.log(`User not found for location with userName: ${location.userName}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error migrating location ${location._id}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total locations found: ${locationsToMigrate.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Users not found: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);

    // Update locations without isActive field
    const locationsWithoutIsActive = await Location.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    console.log(`Updated ${locationsWithoutIsActive.modifiedCount} locations with isActive field`);

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateLocationData();
}

module.exports = migrateLocationData;