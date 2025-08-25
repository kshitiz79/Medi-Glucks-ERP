// Backend/src/version/versionController.js
const Version = require('./Version');
const User = require('../user/User');

// Check app version and compare with Play Store version
const checkAppVersion = async (req, res) => {
    try {
        const { currentVersion, playStoreVersion, deviceInfo } = req.body;
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

        // Create version check record
        const versionCheck = new Version({
            userId,
            currentVersion,
            playStoreVersion,
            deviceInfo: deviceInfo || {},
            createdBy: userId
        });

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

// Admin: Get all version checks with filtering
const getAllVersionChecks = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            updateRequired, 
            updateType, 
            platform,
            startDate,
            endDate
        } = req.query;

        // Build filter query
        const filter = {};
        
        if (updateRequired !== undefined) {
            filter.updateRequired = updateRequired === 'true';
        }
        
        if (updateType) {
            filter.updateType = updateType;
        }
        
        if (platform) {
            filter['deviceInfo.platform'] = platform;
        }
        
        if (startDate || endDate) {
            filter.versionCheckDate = {};
            if (startDate) filter.versionCheckDate.$gte = new Date(startDate);
            if (endDate) filter.versionCheckDate.$lte = new Date(endDate);
        }

        const versions = await Version.find(filter)
            .populate('userId', 'name email employeeCode department')
            .sort({ versionCheckDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Version.countDocuments(filter);

        // Get statistics
        const stats = await Version.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalChecks: { $sum: 1 },
                    updateRequired: {
                        $sum: { $cond: ['$updateRequired', 1, 0] }
                    },
                    criticalUpdates: {
                        $sum: { $cond: [{ $eq: ['$updateType', 'critical'] }, 1, 0] }
                    },
                    recommendedUpdates: {
                        $sum: { $cond: [{ $eq: ['$updateType', 'recommended'] }, 1, 0] }
                    },
                    optionalUpdates: {
                        $sum: { $cond: [{ $eq: ['$updateType', 'optional'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                versions,
                statistics: stats[0] || {
                    totalChecks: 0,
                    updateRequired: 0,
                    criticalUpdates: 0,
                    recommendedUpdates: 0,
                    optionalUpdates: 0
                },
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

module.exports = {
    checkAppVersion,
    getVersionHistory,
    getLatestVersionCheck,
    updateVersionCheck,
    getAllVersionChecks,
    setAppConfiguration
};