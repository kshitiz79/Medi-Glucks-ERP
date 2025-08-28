const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/authMiddleware');

// Import models
const User = require('../user/User');
const Doctor = require('../doctor/Doctor');
const Chemist = require('../chemist/Chemist');
const Stockist = require('../stockist/Stockist');

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
    if (!req.user || !['Super Admin', 'Admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Clean up comma-separated headOffice values
router.post('/fix-head-office-data', auth, adminOnly, async (req, res) => {
    try {
        let totalFixed = 0;
        const results = {
            users: 0,
            doctors: 0,
            chemists: 0,
            stockists: 0
        };

        // Fix Users
        const users = await User.find({});
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
                results.users++;
            }
        }

        // Fix Doctors
        const doctors = await Doctor.find({});
        for (const doctor of doctors) {
            if (doctor.headOffice && typeof doctor.headOffice === 'string' && doctor.headOffice.includes(',')) {
                const headOfficeIds = doctor.headOffice.split(',').map(id => id.trim());

                // Set the first valid ID as the headOffice
                const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
                if (firstValidId) {
                    doctor.headOffice = firstValidId;
                    await doctor.save();
                    results.doctors++;
                }
            }
        }

        // Fix Chemists
        const chemists = await Chemist.find({});
        for (const chemist of chemists) {
            if (chemist.headOffice && typeof chemist.headOffice === 'string' && chemist.headOffice.includes(',')) {
                const headOfficeIds = chemist.headOffice.split(',').map(id => id.trim());

                // Set the first valid ID as the headOffice
                const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
                if (firstValidId) {
                    chemist.headOffice = firstValidId;
                    await chemist.save();
                    results.chemists++;
                }
            }
        }

        // Fix Stockists
        const stockists = await Stockist.find({});
        for (const stockist of stockists) {
            if (stockist.headOffice && typeof stockist.headOffice === 'string' && stockist.headOffice.includes(',')) {
                const headOfficeIds = stockist.headOffice.split(',').map(id => id.trim());

                // Set the first valid ID as the headOffice
                const firstValidId = headOfficeIds.find(id => mongoose.Types.ObjectId.isValid(id));
                if (firstValidId) {
                    stockist.headOffice = firstValidId;
                    await stockist.save();
                    results.stockists++;
                }
            }
        }

        totalFixed = results.users + results.doctors + results.chemists + results.stockists;

        res.json({
            success: true,
            message: 'Head office data cleanup completed successfully',
            results: {
                totalFixed,
                breakdown: results
            }
        });

    } catch (error) {
        console.error('Error during cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Error during cleanup',
            error: error.message
        });
    }
});

// Check for problematic data
router.get('/check-head-office-issues', auth, adminOnly, async (req, res) => {
    try {
        const issues = {
            users: [],
            doctors: [],
            chemists: [],
            stockists: []
        };

        // Check Users
        const users = await User.find({});
        for (const user of users) {
            if (user.headOffice && typeof user.headOffice === 'string' && user.headOffice.includes(',')) {
                issues.users.push({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    headOffice: user.headOffice
                });
            }
        }

        // Check Doctors
        const doctors = await Doctor.find({});
        for (const doctor of doctors) {
            if (doctor.headOffice && typeof doctor.headOffice === 'string' && doctor.headOffice.includes(',')) {
                issues.doctors.push({
                    id: doctor._id,
                    name: doctor.name,
                    headOffice: doctor.headOffice
                });
            }
        }

        // Check Chemists
        const chemists = await Chemist.find({});
        for (const chemist of chemists) {
            if (chemist.headOffice && typeof chemist.headOffice === 'string' && chemist.headOffice.includes(',')) {
                issues.chemists.push({
                    id: chemist._id,
                    firmName: chemist.firmName,
                    headOffice: chemist.headOffice
                });
            }
        }

        // Check Stockists
        const stockists = await Stockist.find({});
        for (const stockist of stockists) {
            if (stockist.headOffice && typeof stockist.headOffice === 'string' && stockist.headOffice.includes(',')) {
                issues.stockists.push({
                    id: stockist._id,
                    firmName: stockist.firmName,
                    headOffice: stockist.headOffice
                });
            }
        }

        const totalIssues = issues.users.length + issues.doctors.length + issues.chemists.length + issues.stockists.length;

        res.json({
            success: true,
            totalIssues,
            issues
        });

    } catch (error) {
        console.error('Error checking issues:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking for issues',
            error: error.message
        });
    }
});

module.exports = router;