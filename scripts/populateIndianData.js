// Backend/scripts/populateIndianData.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const State = require('../src/state/State');
const HeadOffice = require('../src/headoffice/Model');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/glucksCareERP');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};


const uttarPradeshState = { name: 'Uttar Pradesh', code: 'UP', country: 'India', isActive: true };


const uttarPradeshCities = [
    { name: 'Agra', pincode: '282001' },
    { name: 'Aligarh', pincode: '202001' },
    { name: 'Allahabad', pincode: '211001' },
    { name: 'Ambedkar Nagar', pincode: '224122' },
    { name: 'Amethi', pincode: '227405' },
    { name: 'Amroha', pincode: '244221' },
    { name: 'Auraiya', pincode: '206122' },
    { name: 'Azamgarh', pincode: '276001' },
    { name: 'Baghpat', pincode: '250601' },
    { name: 'Bahraich', pincode: '271801' },
    { name: 'Ballia', pincode: '277001' },
    { name: 'Balrampur', pincode: '271201' },
    { name: 'Banda', pincode: '210001' },
    { name: 'Barabanki', pincode: '225001' },
    { name: 'Bareilly', pincode: '243001' },
    { name: 'Basti', pincode: '272001' },
    { name: 'Bhadohi', pincode: '221401' },
    { name: 'Bijnor', pincode: '246701' },
    { name: 'Budaun', pincode: '243601' },
    { name: 'Bulandshahr', pincode: '203001' },
    { name: 'Chandauli', pincode: '232101' },
    { name: 'Chitrakoot', pincode: '210204' },
    { name: 'Deoria', pincode: '274001' },
    { name: 'Etah', pincode: '207001' },
    { name: 'Etawah', pincode: '206001' },
    { name: 'Faizabad', pincode: '224001' },
    { name: 'Farrukhabad', pincode: '209625' },
    { name: 'Fatehpur', pincode: '212601' },
    { name: 'Firozabad', pincode: '283203' },
    { name: 'Gautam Buddha Nagar', pincode: '201301' },
    { name: 'Ghaziabad', pincode: '201001' },
    { name: 'Ghazipur', pincode: '233001' },
    { name: 'Gonda', pincode: '271001' },
    { name: 'Gorakhpur', pincode: '273001' },
    { name: 'Hamirpur', pincode: '210301' },
    { name: 'Hapur', pincode: '245101' },
    { name: 'Hardoi', pincode: '241001' },
    { name: 'Hathras', pincode: '204101' },
    { name: 'Jalaun', pincode: '285123' },
    { name: 'Jaunpur', pincode: '222001' },
    { name: 'Jhansi', pincode: '284001' },
    { name: 'Kannauj', pincode: '209725' },
    { name: 'Kanpur Dehat', pincode: '209301' },
    { name: 'Kanpur Nagar', pincode: '208001' },
    { name: 'Kasganj', pincode: '207123' },
    { name: 'Kaushambi', pincode: '212201' },
    { name: 'Kheri', pincode: '262701' },
    { name: 'Kushinagar', pincode: '274403' },
    { name: 'Lalitpur', pincode: '284403' },
    { name: 'Lucknow', pincode: '226001' },
    { name: 'Maharajganj', pincode: '273303' },
    { name: 'Mahoba', pincode: '210427' },
    { name: 'Mainpuri', pincode: '205001' },
    { name: 'Mathura', pincode: '281001' },
    { name: 'Mau', pincode: '275101' },
    { name: 'Meerut', pincode: '250001' },
    { name: 'Mirzapur', pincode: '231001' },
    { name: 'Moradabad', pincode: '244001' },
    { name: 'Muzaffarnagar', pincode: '251001' },
    { name: 'Pilibhit', pincode: '262001' },
    { name: 'Pratapgarh', pincode: '230001' },
    { name: 'Raebareli', pincode: '229001' },
    { name: 'Rampur', pincode: '244901' },
    { name: 'Saharanpur', pincode: '247001' },
    { name: 'Sambhal', pincode: '244302' },
    { name: 'Sant Kabir Nagar', pincode: '272175' },
    { name: 'Shahjahanpur', pincode: '242001' },
    { name: 'Shamli', pincode: '247776' },
    { name: 'Shravasti', pincode: '271845' },
    { name: 'Siddharthnagar', pincode: '272207' },
    { name: 'Sitapur', pincode: '261001' },
    { name: 'Sonbhadra', pincode: '231216' },
    { name: 'Sultanpur', pincode: '228001' },
    { name: 'Unnao', pincode: '209801' },
    { name: 'Varanasi', pincode: '221001' },
    { name: 'Noida', pincode: '201301' },
    { name: 'Greater Noida', pincode: '201310' },
    { name: 'Ghaziabad', pincode: '201001' },
    { name: 'Faridabad', pincode: '121001' },
    { name: 'Muzzafarnagar', pincode: '251001' },
    { name: 'Aligarh Muslim University', pincode: '202002' },
    { name: 'Banaras Hindu University', pincode: '221005' },
    { name: 'Deoband', pincode: '247554' },
    { name: 'Vrindavan', pincode: '281121' },
    { name: 'Ayodhya', pincode: '224123' },
    { name: 'Chitrakoot Dham', pincode: '210204' },
    { name: 'Haridwar', pincode: '249401' },
    { name: 'Rishikesh', pincode: '249201' }
];

// Main population function
const populateData = async () => {
    try {
        console.log('🚀 Adding Uttar Pradesh state and head offices...');

        // Add Uttar Pradesh state if it doesn't exist
        let upStateDoc = await State.findOne({ code: 'UP' });
        if (!upStateDoc) {
            upStateDoc = await State.create(uttarPradeshState);
            console.log('✅ Created Uttar Pradesh state');
        } else {
            console.log('⚠️ Uttar Pradesh state already exists');
        }

        // Create UP head offices
        const upHeadOffices = uttarPradeshCities.map(city => ({
            name: city.name,
            state: upStateDoc._id,
            pincode: city.pincode,
            isActive: true
        }));

        // Check for existing head offices and only add new ones
        let addedCount = 0;
        let existingCount = 0;
        
        for (const office of upHeadOffices) {
            const existingOffice = await HeadOffice.findOne({ 
                name: office.name,
                state: office.state 
            });
            
            if (!existingOffice) {
                await HeadOffice.create(office);
                addedCount++;
                console.log(`✅ Added head office: ${office.name} (${office.pincode})`);
            } else {
                existingCount++;
                console.log(`⚠️ Head office already exists: ${office.name}`);
            }
        }

        // Summary
        console.log('\n📊 DATABASE SUMMARY:');
        console.log(`🗺️ Uttar Pradesh State: ${upStateDoc ? 'Available' : 'Created'}`);
        console.log(`🏢 New Head Offices Added: ${addedCount}`);
        console.log(`🏢 Existing Head Offices: ${existingCount}`);
        console.log(`🏢 Total UP Cities Available: ${uttarPradeshCities.length}`);
        
        console.log('\n📝 Uttar Pradesh Head Offices Summary:');
        console.log(`   • Total Cities: ${uttarPradeshCities.length}`);
        console.log(`   • Newly Added: ${addedCount}`);
        console.log(`   • Already Existed: ${existingCount}`);

        if (addedCount > 0) {
            console.log('\n🆕 Newly Added Cities:');
            let newCityCount = 0;
            for (const office of upHeadOffices) {
                const existingOffice = await HeadOffice.findOne({ 
                    name: office.name,
                    state: office.state 
                });
                if (existingOffice && newCityCount < addedCount) {
                    console.log(`   • ${office.name} (${office.pincode})`);
                    newCityCount++;
                }
            }
        }

        console.log('\n🎉 Uttar Pradesh data populated successfully!');
        console.log('💡 Note: All major UP cities, districts, and important locations have been added.');

    } catch (error) {
        console.error('❌ Error populating UP data:', error);
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