const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Visit = require('./Visit');
const User = require('../user/User');
const auth = require('../middleware/authMiddleware');

// CREATE a new visit
router.post('/', auth, async (req, res) => {
    try {
        // Fetch user details to get the name
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const visitData = {
            ...req.body,
            representativeId: req.user.id,
            representativeName: user.name,
        };

        // Convert date strings to Date objects
        if (visitData.dateOfVisit) {
            visitData.dateOfVisit = new Date(visitData.dateOfVisit);
        }
        if (visitData.followUpDate) {
            visitData.followUpDate = new Date(visitData.followUpDate);
        }

        // Ensure product arrays are properly formatted and contain valid ObjectIds
        const validateProductArray = (arr, fieldName) => {
            if (!arr || !Array.isArray(arr)) return [];
            return arr.filter(id => {
                if (!id || typeof id !== 'string') return false;
                return mongoose.Types.ObjectId.isValid(id);
            });
        };

        if (visitData.productsPromoted) {
            visitData.productsPromoted = validateProductArray(visitData.productsPromoted, 'productsPromoted');
        }
        if (visitData.productsAgreedToPrescribe) {
            visitData.productsAgreedToPrescribe = validateProductArray(visitData.productsAgreedToPrescribe, 'productsAgreedToPrescribe');
        }
        if (visitData.productsNotAgreedToPrescribe) {
            visitData.productsNotAgreedToPrescribe = validateProductArray(visitData.productsNotAgreedToPrescribe, 'productsNotAgreedToPrescribe');
        }

        console.log('Processed visit data:', visitData);

        const visit = new Visit(visitData);
        await visit.save();

        res.status(201).json({
            success: true,
            message: 'Visit report submitted successfully',
            visit
        });
    } catch (error) {
        console.error('Visit creation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create visit report'
        });
    }
});

// GET all visits (Admin only)
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, representative, startDate, endDate } = req.query;

        // Build filter object
        const filter = {};

        if (status) filter.status = status;
        if (representative) filter.representativeId = representative;
        if (startDate || endDate) {
            filter.dateOfVisit = {};
            if (startDate) filter.dateOfVisit.$gte = new Date(startDate);
            if (endDate) filter.dateOfVisit.$lte = new Date(endDate);
        }

        const visits = await Visit.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Visit.countDocuments(filter);

        res.json({
            success: true,
            visits,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get visits error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch visits'
        });
    }
});

// GET visits by current user
router.get('/my-visits', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, startDate, endDate } = req.query;

        const filter = { representativeId: req.user.id };

        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.dateOfVisit = {};
            if (startDate) filter.dateOfVisit.$gte = new Date(startDate);
            if (endDate) filter.dateOfVisit.$lte = new Date(endDate);
        }

        const visits = await Visit.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Visit.countDocuments(filter);

        res.json({
            success: true,
            visits,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get my visits error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch your visits'
        });
    }
});

// GET single visit by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);

        if (!visit) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
            });
        }

        // Check if user can access this visit
        if (visit.representativeId.toString() !== req.user.id && !['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            visit
        });
    } catch (error) {
        console.error('Get visit error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch visit'
        });
    }
});

// UPDATE visit status (Admin only)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { status } = req.body;

        if (!['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const visit = await Visit.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!visit) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
            });
        }

        res.json({
            success: true,
            message: 'Visit status updated successfully',
            visit
        });
    } catch (error) {
        console.error('Update visit status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update visit status'
        });
    }
});

// DELETE visit (Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const visit = await Visit.findByIdAndDelete(req.params.id);

        if (!visit) {
            return res.status(404).json({
                success: false,
                message: 'Visit not found'
            });
        }

        res.json({
            success: true,
            message: 'Visit deleted successfully'
        });
    } catch (error) {
        console.error('Delete visit error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete visit'
        });
    }
});

// GET visit statistics (Admin only)
router.get('/stats/overview', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (!['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const totalVisits = await Visit.countDocuments();
        const submittedVisits = await Visit.countDocuments({ status: 'submitted' });
        const approvedVisits = await Visit.countDocuments({ status: 'approved' });
        const rejectedVisits = await Visit.countDocuments({ status: 'rejected' });

        // Get visits by month for the current year
        const currentYear = new Date().getFullYear();
        const monthlyVisits = await Visit.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ]);

        res.json({
            success: true,
            stats: {
                totalVisits,
                submittedVisits,
                approvedVisits,
                rejectedVisits,
                monthlyVisits
            }
        });
    } catch (error) {
        console.error('Get visit stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch visit statistics'
        });
    }
});

module.exports = router;