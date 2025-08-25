const mongoose = require('mongoose');
const Location = require('../src/location/Location');
require('dotenv').config();

async function cleanupSuspiciousLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all locations that might be suspicious
    const allLocations = await Location.find({});
    console.log(`Found ${allLocations.length} total locations`);

    let suspiciousCount = 0;
    let updatedCount = 0;

    for (const location of allLocations) {
      const lat = location.latitude;
      const lon = location.longitude;
      let isSuspicious = false;
      let country = 'India';

      // Check for null island (0, 0) or other suspicious coordinates
      if ((lat === 0 && lon === 0) || 
          (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001)) {
        isSuspicious = true;
        suspiciousCount++;
      }

      // Add India geofencing (approximate bounds)
      // India bounds: lat 8.4 to 37.6, lon 68.7 to 97.25
      const isInIndia = lat >= 8.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0;

      if (!isInIndia) {
        isSuspicious = true;
        country = 'Unknown';
        suspiciousCount++;
      }

      // Update the location if it needs to be flagged
      if (isSuspicious || !location.country) {
        await Location.updateOne(
          { _id: location._id },
          { 
            isSuspicious: isSuspicious,
            country: country
          }
        );
        updatedCount++;
        
        if (isSuspicious) {
          console.log(`Flagged suspicious location: ${lat}, ${lon} for user ${location.userName}`);
        }
      }
    }

    console.log(`\n=== Cleanup Summary ===`);
    console.log(`Total locations processed: ${allLocations.length}`);
    console.log(`Suspicious locations found: ${suspiciousCount}`);
    console.log(`Records updated: ${updatedCount}`);

    // Get summary of suspicious locations by country
    const suspiciousLocations = await Location.aggregate([
      { $match: { isSuspicious: true } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n=== Suspicious Locations by Country ===');
    suspiciousLocations.forEach(item => {
      console.log(`${item._id || 'Unknown'}: ${item.count} locations`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupSuspiciousLocations();