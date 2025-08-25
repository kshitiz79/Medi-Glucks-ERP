// Backend/src/shift/shiftController.js
const Shift = require('./Shift');
const User = require('../user/User');

// Create a new shift
const createShift = async(req, res) => {
    try {
        const {
            name,
            startTime,
            endTime,
            workDays,
            breakDuration,
            gracePeriod,
            location,
            isLocationRequired,
            description
        } = req.body;

        // Validate required fields
        if (!name || !startTime || !endTime || !workDays || workDays.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name, start time, end time, and work days are required'
            });
        }

        const shift = new Shift({
            name,
            startTime, // Keep as string, e.g., "09:00"
            endTime,   // Keep as string, e.g., "17:00"
            workDays,
            breakDuration: breakDuration || 30,
            gracePeriod: gracePeriod || 15,
            location: location || null,
            isLocationRequired: isLocationRequired || false,
            description: description || '',
            createdBy: req.user && req.user.id,
            isActive: true
        });

        await shift.save();

        res.status(201).json({
            success: true,
            message: 'Shift created successfully',
            data: shift
        });

    } catch (error) {
        console.error('Create shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create shift',
            error: error.message
        });
    }
};

// Get all shifts
const getAllShifts = async(req, res) => {
    try {
        const { isActive } = req.query;

        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const shifts = await Shift.find(filter)
            .populate('createdBy', 'name email')
            .populate('assignedUsers', 'name employeeCode email role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: shifts
        });

    } catch (error) {
        console.error('Get all shifts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shifts',
            error: error.message
        });
    }
};

// Get shift by ID
const getShiftById = async(req, res) => {
    try {
        const { id } = req.params;

        const shift = await Shift.findById(id)
            .populate('createdBy', 'name email')
            .populate('assignedUsers', 'name employeeCode email role department');

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        res.status(200).json({
            success: true,
            data: shift
        });

    } catch (error) {
        console.error('Get shift by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shift',
            error: error.message
        });
    }
};

// Update shift
const updateShift = async(req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Keep time values as strings to match the schema
        // No conversion needed - startTime and endTime should remain as "HH:MM" format

        updateData.updatedBy = req.user && req.user.id;

        const shift = await Shift.findByIdAndUpdate(
            id,
            updateData, { new: true, runValidators: true }
        ).populate('assignedUsers', 'name employeeCode email role');

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Shift updated successfully',
            data: shift
        });

    } catch (error) {
        console.error('Update shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update shift',
            error: error.message
        });
    }
};

// Delete shift
const deleteShift = async(req, res) => {
    try {
        const { id } = req.params;

        const shift = await Shift.findById(id);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        // Soft delete - just mark as inactive
        shift.isActive = false;
        shift.updatedBy = req.user && req.user.id;
        await shift.save();

        res.status(200).json({
            success: true,
            message: 'Shift deleted successfully'
        });

    } catch (error) {
        console.error('Delete shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete shift',
            error: error.message
        });
    }
};

// Assign users to shift
const assignUsersToShift = async(req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        const shift = await Shift.findById(id);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        // Verify all users exist
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Some users not found'
            });
        }

        // Add users to shift (avoiding duplicates)
        const existingUserIds = shift.assignedUsers.map(id => id.toString());
        const newUserIds = userIds.filter(id => !existingUserIds.includes(id.toString()));

        shift.assignedUsers.push(...newUserIds);
        shift.updatedBy = req.user && req.user.id;

        await shift.save();

        // Populate the updated shift
        await shift.populate('assignedUsers', 'name employeeCode email role');

        res.status(200).json({
            success: true,
            message: 'Users assigned to shift successfully',
            data: shift
        });

    } catch (error) {
        console.error('Assign users to shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign users to shift',
            error: error.message
        });
    }
};

// Remove users from shift
const removeUsersFromShift = async(req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        const shift = await Shift.findById(id);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        // Remove users from shift
        shift.assignedUsers = shift.assignedUsers.filter(
            userId => !userIds.includes(userId.toString())
        );
        shift.updatedBy = req.user && req.user.id;

        await shift.save();

        // Populate the updated shift
        await shift.populate('assignedUsers', 'name employeeCode email role');

        res.status(200).json({
            success: true,
            message: 'Users removed from shift successfully',
            data: shift
        });

    } catch (error) {
        console.error('Remove users from shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove users from shift',
            error: error.message
        });
    }
};

// Get user's assigned shift
const getUserShift = async(req, res) => {
    try {
        const { userId } = req.params;

        const userShiftId = userId || (req.user && req.user.id);

        if (!userShiftId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const shift = await Shift.findOne({
            assignedUsers: userShiftId,
            isActive: true
        }).populate('createdBy', 'name email');

        if (!shift) {
            return res.status(200).json({
                success: true,
                message: 'No shift assigned',
                data: null
            });
        }

        res.status(200).json({
            success: true,
            data: shift
        });

    } catch (error) {
        console.error('Get user shift error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user shift',
            error: error.message
        });
    }
};

// Get shift statistics
const getShiftStats = async(req, res) => {
    try {
        const totalShifts = await Shift.countDocuments({ isActive: true });
        const totalAssignedUsers = await Shift.aggregate([
            { $match: { isActive: true } },
            { $unwind: '$assignedUsers' },
            { $group: { _id: '$assignedUsers' } },
            { $count: 'total' }
        ]);

        const shiftDistribution = await Shift.aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    name: 1,
                    assignedCount: { $size: '$assignedUsers' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalShifts,
                totalAssignedUsers: totalAssignedUsers[0]?.total || 0,
                shiftDistribution
            }
        });

    } catch (error) {
        console.error('Get shift stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get shift statistics',
            error: error.message
        });
    }
};

module.exports = {
    createShift,
    getAllShifts,
    getShiftById,
    updateShift,
    deleteShift,
    assignUsersToShift,
    removeUsersFromShift,
    getUserShift,
    getShiftStats
};