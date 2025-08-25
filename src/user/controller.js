// controllers/userController.js
const User = require('./User');
const bcrypt = require('bcryptjs');

/**
 * Get all users
 * GET /api/users
 */
exports.getAllUsers = async(req, res) => {
    try {
        const { role, branch, department } = req.query;
        let query = {};

        if (role) {
            query.role = role;
        }

        if (branch) {
            query.branch = branch;
        }

        if (department) {
            query.department = department;
        }

        const users = await User.find(query)
            .populate('branch', 'name code')
            .populate('department', 'name code')
            .populate('employmentType', 'name code')
            .populate('headOffice', 'name code')
            .populate('manager', 'name email role')
            .populate('managers', 'name email role')
            .populate('areaManagers', 'name email role')
            .populate('state', 'name code')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name')
            .select('-password -legalDocuments'); // Exclude sensitive data

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        console.error('Get all users error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Get users by role
 * GET /api/users/role/:role
 */
exports.getUsersByRole = async(req, res) => {
    try {
        const { role } = req.params;
        const users = await User.find({ role })
            .populate('branch', 'name code')
            .populate('department', 'name code')
            .populate('employmentType', 'name code')
            .populate('headOffice', 'name code')
            .populate('manager', 'name email role')
            .populate('managers', 'name email role')
            .populate('areaManagers', 'name email role')
            .populate('state', 'name code')
            .select('-password -legalDocuments'); // Exclude sensitive data

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        console.error('Get users by role error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
exports.getUserById = async(req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('branch', 'name code')
            .populate('department', 'name code')
            .populate('employmentType', 'name code')
            .populate('headOffice', 'name code')
            .populate('manager', 'name email role')
            .populate('managers', 'name email role')
            .populate('areaManagers', 'name email role')
            .populate('state', 'name code')
            .select('-password'); // Exclude password

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('Get user by ID error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Create new user
 * POST /api/users
 */
exports.createUser = async(req, res) => {
    try {
        const cloudinary = require('../config/cloudinary');

        // Check if user with same email or employeeCode exists
        const existingUser = await User.findOne({
            $or: [
                { email: req.body.email },
                { employeeCode: req.body.employeeCode }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or employee code already exists'
            });
        }

        // Handle file uploads to Cloudinary
        const legalDocuments = {};

        if (req.files) {
            // Upload each document to Cloudinary
            for (const [fieldName, file] of Object.entries(req.files)) {
                if (['aadharCard', 'panCard', 'drivingLicense', 'passportPhoto'].includes(fieldName)) {
                    try {
                        const result = await cloudinary.uploader.upload(file[0].path, {
                            folder: `users/${req.body.employeeCode}/documents`,
                            resource_type: 'auto'
                        });
                        legalDocuments[fieldName] = result.secure_url;
                    } catch (uploadError) {
                        console.error(`Error uploading ${fieldName}:`, uploadError);
                    }
                }
            }
        }

        // Parse nested objects if they come as strings
        const userData = {...req.body };

        if (typeof userData.bankDetails === 'string') {
            userData.bankDetails = JSON.parse(userData.bankDetails);
        }
        if (typeof userData.emergencyContact === 'string') {
            userData.emergencyContact = JSON.parse(userData.emergencyContact);
        }
        if (typeof userData.reference === 'string') {
            userData.reference = JSON.parse(userData.reference);
        }

        // Add legal documents URLs
        if (Object.keys(legalDocuments).length > 0) {
            userData.legalDocuments = legalDocuments;
        }

        // Add audit info
        if (req.user) {
            userData.createdBy = req.user.id;
        }

        const newUser = new User(userData);
        const savedUser = await newUser.save();

        // Remove password from response
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse
        });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Update user by ID
 * PUT /api/users/:id
 */
exports.updateUser = async(req, res) => {
    try {
        const cloudinary = require('../config/cloudinary');

        // Check permissions - only admins or the user themselves can update
        if (!req.user ||
            (req.user.id !== req.params.id &&
                !['Admin', 'Super Admin'].includes(req.user.role))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Handle file uploads to Cloudinary
        const updateData = {...req.body };

        // Convert empty strings to undefined for ObjectId fields
        const objectIdFields = [
            'branch',
            'department',
            'employmentType',
            'headOffice',
            'state',
            'manager',
            'createdBy',
            'updatedBy'
        ];

        objectIdFields.forEach(field => {
            if (updateData[field] === '') {
                updateData[field] = undefined;
            }
        });

        // Handle array ObjectId fields
        const arrayObjectIdFields = ['headOffices', 'managers', 'areaManagers'];
        arrayObjectIdFields.forEach(field => {
            if (updateData[field]) {
                if (Array.isArray(updateData[field])) {
                    updateData[field] = updateData[field].filter(id => id && id !== '');
                } else if (updateData[field] === '') {
                    updateData[field] = undefined;
                }
            }
        });

        if (req.files) {
            const currentUser = await User.findById(req.params.id);
            if (!updateData.legalDocuments) {
                updateData.legalDocuments = currentUser.legalDocuments || {};
            }

            // Upload each new document to Cloudinary
            for (const [fieldName, file] of Object.entries(req.files)) {
                if (['aadharCard', 'panCard', 'drivingLicense', 'passportPhoto'].includes(fieldName)) {
                    try {
                        const result = await cloudinary.uploader.upload(file[0].path, {
                            folder: `users/${currentUser.employeeCode}/documents`,
                            resource_type: 'auto'
                        });
                        updateData.legalDocuments[fieldName] = result.secure_url;
                    } catch (uploadError) {
                        console.error(`Error uploading ${fieldName}:`, uploadError);
                    }
                }
            }
        }

        // Parse nested objects if they come as strings
        if (typeof updateData.bankDetails === 'string') {
            updateData.bankDetails = JSON.parse(updateData.bankDetails);
        }
        if (typeof updateData.emergencyContact === 'string') {
            updateData.emergencyContact = JSON.parse(updateData.emergencyContact);
        }
        if (typeof updateData.reference === 'string') {
            updateData.reference = JSON.parse(updateData.reference);
        }

        // Add audit info
        updateData.updatedBy = req.user.id;

        // Remove password field if present (use specific endpoint for password updates)
        if (updateData.password) {
            delete updateData.password;
        }

        const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                updateData, { new: true, runValidators: true }
            )
            .populate('branch', 'name code')
            .populate('department', 'name code')
            .populate('employmentType', 'name code')
            .populate('headOffice', 'name code')
            .populate('manager', 'name email role')
            .populate('managers', 'name email role')
            .populate('areaManagers', 'name email role')
            .populate('state', 'name code')
            .select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Update user profile (authenticated user can update their own profile)
 * PATCH /api/users/profile
 */
exports.updateProfile = async(req, res) => {
    try {
        // Only allow updating specific fields
        const allowedFields = ['name', 'email', 'mobileNumber', 'address', 'emergencyContact'];

        const updateData = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                updateData[key] = req.body[key];
            }
        });

        // Add audit info
        updateData.updatedBy = req.user.id;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData, { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Change own password (authenticated user)
 * PATCH /api/users/change-password
 */
exports.changePassword = async(req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash and update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.updatedBy = req.user.id;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Admin: Update a user's password
 * PUT /api/users/:id/password
 */
exports.updateUserPassword = async(req, res) => {
    try {
        // Only Admins or Super Admins can update others' passwords
        if (!req.user || !['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { password } = req.body;
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const hashed = await bcrypt.hash(password, 10);
        const updated = await User.findByIdAndUpdate(
            req.params.id, {
                password: hashed,
                updatedBy: req.user.id
            }, { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (err) {
        console.error('Update user password error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Change user status (active/inactive)
 * PATCH /api/users/:id/status
 */
exports.changeUserStatus = async(req, res) => {
    try {
        // Only Admins or Super Admins can change user status
        if (!req.user || !['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, {
                isActive,
                updatedBy: req.user.id
            }, { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedUser
        });
    } catch (err) {
        console.error('Change user status error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Get user history/activity log
 * GET /api/users/:userId/history
 */
exports.getUserHistory = async(req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await User.findById(userId).select('name email employeeCode');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // For now, return basic user info and creation/update history
        // This can be expanded to include actual activity logs if you have an audit log system
        const history = {
            user: user,
            activities: [{
                action: 'User Created',
                timestamp: user.createdAt || new Date(),
                details: 'User account was created'
            }]
        };

        // If user has been updated, add update activity
        if (user.updatedAt && user.updatedAt !== user.createdAt) {
            history.activities.push({
                action: 'Profile Updated',
                timestamp: user.updatedAt,
                details: 'User profile was updated'
            });
        }

        res.json({
            success: true,
            data: history
        });
    } catch (err) {
        console.error('Get user history error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Delete user by ID
 * DELETE /api/users/:id
 */
exports.deleteUser = async(req, res) => {
    try {
        // Both Admin and Super Admin can delete users
        if (!req.user || !['Admin', 'Super Admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only Admin or Super Admin can delete users'
            });
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Get users by state for State Head
 * GET /api/users/by-state
 */
exports.getUsersByState = async(req, res) => {
    try {
        const { search, department, role, page = 1, limit = 50 } = req.query;
        const currentUser = req.user;

        // Check if the current user is a State Head
        if (!currentUser || currentUser.role !== 'State Head') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only State Heads can access this endpoint.'
            });
        }

        // Get the current user's state
        const stateHeadUser = await User.findById(currentUser.id).populate('state');
        
        if (!stateHeadUser || !stateHeadUser.state) {
            return res.status(400).json({
                success: false,
                message: 'State Head must be assigned to a state to view users.'
            });
        }

        const stateId = stateHeadUser.state._id;

        // First, find all head offices in the State Head's state
        const HeadOffice = require('../headoffice/Model');
        const headOfficesInState = await HeadOffice.find({ 
            state: stateId, 
            isActive: true 
        }).select('_id');

        const headOfficeIds = headOfficesInState.map(ho => ho._id);

        // Build query to find users assigned to head offices in this state
        let query = {
            isActive: true,
            $or: [
                { headOffice: { $in: headOfficeIds } },
                { headOffices: { $in: headOfficeIds } }
            ]
        };

        // Add search filter if provided
        if (search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { employeeCode: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Add department filter if provided
        if (department) {
            query.department = department;
        }

        // Add role filter if provided
        if (role) {
            query.role = role;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute queries in parallel for better performance
        const [users, totalCount] = await Promise.all([
            User.find(query)
                .populate('department', 'name')
                .populate('headOffice', 'name state')
                .populate('headOffices', 'name state')
                .populate('state', 'name')
                .populate('branch', 'name')
                .populate('employmentType', 'name')
                .select('employeeCode name email role department headOffice headOffices state branch employmentType mobileNumber dateOfJoining salaryAmount isActive createdAt')
                .sort({ name: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        // Format the response for frontend consumption
        const formattedUsers = users.map(user => ({
            id: user._id,
            employeeCode: user.employeeCode,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department?.name || 'Not Assigned',
            headOffice: user.headOffice?.name || 'Not Assigned',
            headOffices: user.headOffices?.map(ho => ho.name).join(', ') || 'Not Assigned',
            state: user.state?.name || stateHeadUser.state.name,
            branch: user.branch?.name || 'Not Assigned',
            employmentType: user.employmentType?.name || 'Not Assigned',
            mobileNumber: user.mobileNumber,
            dateOfJoining: user.dateOfJoining,
            salaryAmount: user.salaryAmount,
            isActive: user.isActive,
            createdAt: user.createdAt
        }));

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        res.json({
            success: true,
            data: {
                users: formattedUsers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit),
                    hasNext,
                    hasPrev
                },
                state: {
                    id: stateId,
                    name: stateHeadUser.state.name
                },
                headOfficesCount: headOfficeIds.length
            },
            message: `Found ${formattedUsers.length} users in ${stateHeadUser.state.name} state`
        });
    } catch (err) {
        console.error('Get users by state error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};

/**
 * Get active users for shift assignment
 * GET /api/users/for-shift-assignment
 */
exports.getUsersForShiftAssignment = async(req, res) => {
    try {
        const { search, department, role } = req.query;
        
        // Build query for active users only
        let query = { 
            isActive: true,
            // Exclude admin roles from shift assignment
            role: { $nin: ['Super Admin', 'Admin'] }
        };

        // Add search filter if provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { employeeCode: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Add department filter if provided
        if (department) {
            query.department = department;
        }

        // Add role filter if provided
        if (role) {
            query.role = role;
        }

        const users = await User.find(query)
            .populate('department', 'name')
            .populate('headOffice', 'name')
            .populate('state', 'name')
            .select('employeeCode name email role department headOffice state mobileNumber dateOfJoining isActive')
            .sort({ name: 1 }); // Sort by name alphabetically

        // Format the response for frontend consumption
        const formattedUsers = users.map(user => ({
            id: user._id,
            employeeCode: user.employeeCode,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department?.name || 'Not Assigned',
            headOffice: user.headOffice?.name || 'Not Assigned',
            state: user.state?.name || 'Not Assigned',
            mobileNumber: user.mobileNumber,
            dateOfJoining: user.dateOfJoining,
            isActive: user.isActive
        }));

        res.json({
            success: true,
            count: formattedUsers.length,
            data: formattedUsers
        });
    } catch (err) {
        console.error('Get users for shift assignment error:', err);
        res.status(500).json({
            success: false,
            message: err.message || 'Server error'
        });
    }
};