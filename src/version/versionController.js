// Backend/src/version/versionController.js
const Version = require('./Version');

// Check app version and compare with Play Store version (UPSERT - Single record per user)
const checkAppVersion = async (req, res) => {
    try {
        const { currentVersion, playStoreVersion, deviceInfo, buildNumber } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!currentVersion || !playStoreVersion) {
            return res.status(400).json({
                success: false,
                message: 'Current version and Play Store version are required'
            });
        }

        // Validate version format
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(currentVersion) || !versionRegex.test(playStoreVersion)) {
            return res.status(400).json({
                success: false,
                message: 'Version format must be X.Y.Z (e.g., 1.2.3)'
            });
        }

        // Find existing version record for this user or create new one
        let versionCheck = await Version.findOne({ userId });

        if (versionCheck) {
            // Update existing record
            versionCheck.currentVersion = currentVersion;
            versionCheck.playStoreVersion = playStoreVersion;
            versionCheck.deviceInfo = { ...versionCheck.deviceInfo, ...deviceInfo };
            versionCheck.buildNumber = buildNumber;
            versionCheck.versionCheckDate = new Date();
            versionCheck.lastCheckDate = new Date();
            versionCheck.updatedBy = userId;

            // Increment check count
            versionCheck.checkCount = (versionCheck.checkCount || 0) + 1;
        } else {
            // Create new record
            versionCheck = new Version({
                userId,
                currentVersion,
                playStoreVersion,
                deviceInfo: deviceInfo || {},
                buildNumber,
                createdBy: userId,
                checkCount: 1,
                lastCheckDate: new Date()
            });
        }

        await versionCheck.save();

        // Get additional version metadata (if available)
        const latestVersionInfo = await getLatestVersionInfo();

        const response = {
            success: true,
            data: {
                versionCheckId: versionCheck._id,
                currentVersion: versionCheck.currentVersion,
                playStoreVersion: versionCheck.playStoreVersion,
                updateRequired: versionCheck.updateRequired,
                updateType: versionCheck.updateType,
                forceUpdate: versionCheck.forceUpdate,
                versionComparison: versionCheck.compareVersions(),
                checkCount: versionCheck.checkCount,
                lastCheckDate: versionCheck.lastCheckDate,
                ...latestVersionInfo
            },
            message: versionCheck.updateRequired ?
                `Update available: ${versionCheck.updateType}` :
                'App is up to date'
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Version check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check app version',
            error: error.message
        });
    }
};

// Get user's version history
const getVersionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const versions = await Version.find({ userId })
            .populate('userId', 'name email employeeCode')
            .sort({ versionCheckDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Version.countDocuments({ userId });

        res.status(200).json({
            success: true,
            data: {
                versions,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get version history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get version history',
            error: error.message
        });
    }
};

// Get latest version check for user
const getLatestVersionCheck = async (req, res) => {
    try {
        const userId = req.user.id;

        const latestVersion = await Version.getLatestVersionCheck(userId);

        if (!latestVersion) {
            return res.status(404).json({
                success: false,
                message: 'No version check found for this user'
            });
        }

        res.status(200).json({
            success: true,
            data: latestVersion
        });

    } catch (error) {
        console.error('Get latest version check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get latest version check',
            error: error.message
        });
    }
};

// Update version check (mark as updated, skipped, etc.)
const updateVersionCheck = async (req, res) => {
    try {
        const { id } = req.params;
        const { updateSkipped, lastUpdatePromptDate } = req.body;
        const userId = req.user.id;

        const versionCheck = await Version.findOne({ _id: id, userId });

        if (!versionCheck) {
            return res.status(404).json({
                success: false,
                message: 'Version check not found'
            });
        }

        // Update fields
        if (updateSkipped !== undefined) {
            versionCheck.updateSkipped = updateSkipped;
        }

        if (lastUpdatePromptDate) {
            versionCheck.lastUpdatePromptDate = new Date(lastUpdatePromptDate);
        }

        versionCheck.updatedBy = userId;
        await versionCheck.save();

        res.status(200).json({
            success: true,
            data: versionCheck,
            message: 'Version check updated successfully'
        });

    } catch (error) {
        console.error('Update version check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update version check',
            error: error.message
        });
    }
};

// Admin: Get all users with their latest version status (One record per user)
const getAllVersionChecks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            updateRequired,
            updateType,
            platform,
            search,
            startDate,
            endDate
        } = req.query;

        // Build filter query
        const filter = {};

        if (updateRequired !== undefined) {
            filter.updateRequired = updateRequired === 'true';
        }

        if (updateType && updateType !== 'all') {
            filter.updateType = updateType;
        }

        if (platform && platform !== 'all') {
            filter['deviceInfo.platform'] = platform;
        }

        if (startDate || endDate) {
            filter.versionCheckDate = {};
            if (startDate) filter.versionCheckDate.$gte = new Date(startDate);
            if (endDate) filter.versionCheckDate.$lte = new Date(endDate);
        }

        // Build user search filter
        let userFilter = {};
        if (search) {
            userFilter = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { employeeCode: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get users with version data (one record per user)
        const pipeline = [
            // Match version records with filters
            { $match: filter },

            // Lookup user data
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },

            // Unwind user array
            { $unwind: '$user' },

            // Apply user search filter
            ...(search ? [{ $match: { 'user': userFilter.$or ? { $or: userFilter.$or } : userFilter } }] : []),

            // Sort by latest check date
            { $sort: { versionCheckDate: -1 } },

            // Group by user to get latest record per user
            {
                $group: {
                    _id: '$userId',
                    latestVersion: { $first: '$$ROOT' },
                    user: { $first: '$user' }
                }
            },

            // Project final structure
            {
                $project: {
                    _id: '$latestVersion._id',
                    userId: '$latestVersion.userId',
                    user: {
                        _id: '$user._id',
                        name: '$user.name',
                        email: '$user.email',
                        employeeCode: '$user.employeeCode',
                        department: '$user.department',
                        role: '$user.role'
                    },
                    currentVersion: '$latestVersion.currentVersion',
                    playStoreVersion: '$latestVersion.playStoreVersion',
                    latestVersion: '$latestVersion.playStoreVersion',
                    updateRequired: '$latestVersion.updateRequired',
                    updateType: '$latestVersion.updateType',
                    forceUpdate: '$latestVersion.forceUpdate',
                    deviceInfo: '$latestVersion.deviceInfo',
                    buildNumber: '$latestVersion.buildNumber',
                    checkCount: '$latestVersion.checkCount',
                    versionCheckDate: '$latestVersion.versionCheckDate',
                    lastCheckDate: '$latestVersion.lastCheckDate',
                    releaseNotes: '$latestVersion.releaseNotes',
                    createdAt: '$latestVersion.createdAt',
                    updatedAt: '$latestVersion.updatedAt'
                }
            },

            // Sort by update priority and last check date
            {
                $sort: {
                    updateRequired: -1,
                    versionCheckDate: -1
                }
            }
        ];

        // Execute aggregation with pagination
        const versions = await Version.aggregate([
            ...pipeline,
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ]);

        // Get total count
        const totalPipeline = [
            ...pipeline,
            { $count: 'total' }
        ];
        const totalResult = await Version.aggregate(totalPipeline);
        const total = totalResult[0]?.total || 0;

        // Get statistics
        const statsPipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            ...(search ? [{ $match: { 'user': userFilter.$or ? { $or: userFilter.$or } : userFilter } }] : []),
            {
                $group: {
                    _id: '$userId',
                    latestVersion: { $first: '$$ROOT' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    updateRequired: {
                        $sum: { $cond: ['$latestVersion.updateRequired', 1, 0] }
                    },
                    criticalUpdates: {
                        $sum: { $cond: [{ $eq: ['$latestVersion.updateType', 'critical'] }, 1, 0] }
                    },
                    recommendedUpdates: {
                        $sum: { $cond: [{ $eq: ['$latestVersion.updateType', 'recommended'] }, 1, 0] }
                    },
                    optionalUpdates: {
                        $sum: { $cond: [{ $eq: ['$latestVersion.updateType', 'optional'] }, 1, 0] }
                    },
                    upToDate: {
                        $sum: { $cond: [{ $eq: ['$latestVersion.updateType', 'none'] }, 1, 0] }
                    }
                }
            }
        ];

        const statsResult = await Version.aggregate(statsPipeline);
        const statistics = statsResult[0] || {
            totalUsers: 0,
            updateRequired: 0,
            criticalUpdates: 0,
            recommendedUpdates: 0,
            optionalUpdates: 0,
            upToDate: 0
        };

        res.status(200).json({
            success: true,
            data: {
                versions,
                statistics,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get all version checks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get version checks',
            error: error.message
        });
    }
};

// Admin: Set app configuration (minimum version, release notes, etc.)
const setAppConfiguration = async (req, res) => {
    try {
        const {
            minimumRequiredVersion,
            latestVersion,
            releaseNotes,
            forceUpdate
        } = req.body;

        // Validate version formats
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (minimumRequiredVersion && !versionRegex.test(minimumRequiredVersion)) {
            return res.status(400).json({
                success: false,
                message: 'Minimum required version format must be X.Y.Z'
            });
        }

        if (latestVersion && !versionRegex.test(latestVersion)) {
            return res.status(400).json({
                success: false,
                message: 'Latest version format must be X.Y.Z'
            });
        }

        // Store configuration (you might want to create a separate AppConfig model)
        // For now, we'll return the configuration
        const configuration = {
            minimumRequiredVersion,
            latestVersion,
            releaseNotes,
            forceUpdate: forceUpdate || false,
            updatedBy: req.user.id,
            updatedAt: new Date()
        };

        res.status(200).json({
            success: true,
            data: configuration,
            message: 'App configuration updated successfully'
        });

    } catch (error) {
        console.error('Set app configuration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set app configuration',
            error: error.message
        });
    }
};

// Helper function to get latest version info
const getLatestVersionInfo = async () => {
    // This could be fetched from a configuration collection or external API
    // For now, return default values
    return {
        releaseNotes: 'Bug fixes and performance improvements',
        minimumRequiredVersion: '1.0.0',
        downloadUrl: 'https://play.google.com/store/apps/details?id=com.gluckscare.erp'
    };
};

// Admin: Send update notification to users
const sendUpdateNotification = async (req, res) => {
    try {
        const { userIds, message, updateType = 'recommended', title } = req.body;
        const adminId = req.user.id;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Notification message is required'
            });
        }

        // Update version records to mark notification sent
        await Version.updateMany(
            { userId: { $in: userIds } },
            {
                lastUpdatePromptDate: new Date(),
                updatedBy: adminId
            }
        );

        // Integrate with existing notification system
        const Notification = require('../notification/Notification');
        
        // Create notification title based on update type
        const notificationTitle = title || `App Update Available - ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}`;
        
        // Prepare recipients array for notification
        const recipients = userIds.map(userId => ({
            user: userId,
            isRead: false
        }));

        // Create notification using existing notification system
        const notification = new Notification({
            title: notificationTitle,
            body: message.trim(),
            sender: adminId,
            recipients: recipients,
            isBroadcast: false
        });

        await notification.save();

        // Emit real-time notification via Socket.IO if available
        const io = req.app.get('io');
        if (io) {
            userIds.forEach(userId => {
                io.to(`user-${userId}`).emit('new-notification', {
                    id: notification._id,
                    title: notificationTitle,
                    body: message.trim(),
                    type: 'version-update',
                    updateType: updateType,
                    createdAt: notification.createdAt
                });
            });
        }

        res.status(200).json({
            success: true,
            data: {
                notificationId: notification._id,
                notificationsSent: userIds.length,
                title: notificationTitle,
                message: message.trim(),
                updateType: updateType,
                sentAt: new Date()
            },
            message: `Update notification sent to ${userIds.length} users`
        });

    } catch (error) {
        console.error('Send update notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send update notification',
            error: error.message
        });
    }
};

// Get user's version status (for individual user lookup)
const getUserVersionStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const versionStatus = await Version.findOne({ userId })
            .populate('userId', 'name email employeeCode department role')
            .sort({ versionCheckDate: -1 });

        if (!versionStatus) {
            return res.status(404).json({
                success: false,
                message: 'No version data found for this user'
            });
        }

        res.status(200).json({
            success: true,
            data: versionStatus
        });

    } catch (error) {
        console.error('Get user version status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user version status',
            error: error.message
        });
    }
};

module.exports = {
    checkAppVersion,
    getVersionHistory,
    getLatestVersionCheck,
    updateVersionCheck,
    getAllVersionChecks,
    setAppConfiguration,
    sendUpdateNotification,
    getUserVersionStatus
};