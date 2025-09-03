// Backend/src/version/versionNotificationController.js
const Version = require('./Version');
const Notification = require('../notification/Notification');
const User = require('../user/User');

// Send version update notification to specific users
const sendVersionUpdateNotification = async (req, res) => {
    try {
        const { 
            userIds, 
            message, 
            title,
            updateType = 'recommended',
            isBroadcast = false,
            forceUpdate = false
        } = req.body;
        const adminId = req.user.id;

        // Validation
        if (!isBroadcast && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required for targeted notifications'
            });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Notification message is required'
            });
        }

        let targetUserIds = userIds;
        let recipients = [];

        // Handle broadcast notifications
        if (isBroadcast) {
            const activeUsers = await User.find({ isActive: true }).select('_id');
            targetUserIds = activeUsers.map(user => user._id.toString());
            recipients = activeUsers.map(user => ({
                user: user._id,
                isRead: false
            }));
        } else {
            recipients = userIds.map(userId => ({
                user: userId,
                isRead: false
            }));
        }

        // Update version records to mark notification sent
        if (targetUserIds.length > 0) {
            await Version.updateMany(
                { userId: { $in: targetUserIds } },
                {
                    lastUpdatePromptDate: new Date(),
                    updatedBy: adminId,
                    ...(forceUpdate && { forceUpdate: true })
                }
            );
        }

        // Create notification title
        const notificationTitle = title || `App Update Available - ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}`;
        
        // Create notification
        const notification = new Notification({
            title: notificationTitle,
            body: message.trim(),
            sender: adminId,
            recipients: recipients,
            isBroadcast: isBroadcast
        });

        await notification.save();

        // Emit real-time notification via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const notificationData = {
                id: notification._id,
                title: notificationTitle,
                body: message.trim(),
                type: 'version-update',
                updateType: updateType,
                forceUpdate: forceUpdate,
                createdAt: notification.createdAt
            };

            if (isBroadcast) {
                io.emit('new-notification', notificationData);
            } else {
                targetUserIds.forEach(userId => {
                    io.to(`user-${userId}`).emit('new-notification', notificationData);
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                notificationId: notification._id,
                notificationsSent: targetUserIds.length,
                title: notificationTitle,
                message: message.trim(),
                updateType: updateType,
                isBroadcast: isBroadcast,
                forceUpdate: forceUpdate,
                sentAt: new Date()
            },
            message: `Update notification sent to ${targetUserIds.length} users`
        });

    } catch (error) {
        console.error('Send version update notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send version update notification',
            error: error.message
        });
    }
};

// Get users who need version updates
const getUsersNeedingUpdate = async (req, res) => {
    try {
        const { updateType, platform } = req.query;

        // Build filter for users needing updates
        const filter = { updateRequired: true };
        
        if (updateType && updateType !== 'all') {
            filter.updateType = updateType;
        }

        if (platform && platform !== 'all') {
            filter['deviceInfo.platform'] = platform;
        }

        // Get users with version data who need updates
        const usersNeedingUpdate = await Version.find(filter)
            .populate('userId', 'name email employeeCode department role')
            .sort({ versionCheckDate: -1 });

        // Group by update type for statistics
        const statistics = {
            total: usersNeedingUpdate.length,
            critical: usersNeedingUpdate.filter(v => v.updateType === 'critical').length,
            recommended: usersNeedingUpdate.filter(v => v.updateType === 'recommended').length,
            optional: usersNeedingUpdate.filter(v => v.updateType === 'optional').length
        };

        res.status(200).json({
            success: true,
            data: {
                users: usersNeedingUpdate,
                statistics
            }
        });

    } catch (error) {
        console.error('Get users needing update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users needing update',
            error: error.message
        });
    }
};

// Send notification to all users with outdated versions
const notifyOutdatedUsers = async (req, res) => {
    try {
        const { message, title, updateType = 'recommended' } = req.body;
        const adminId = req.user.id;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Notification message is required'
            });
        }

        // Get all users with outdated versions
        const outdatedVersions = await Version.find({ updateRequired: true });
        const userIds = outdatedVersions.map(v => v.userId.toString());

        if (userIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    notificationsSent: 0
                },
                message: 'No users with outdated versions found'
            });
        }

        // Use the existing sendVersionUpdateNotification logic
        req.body = {
            userIds,
            message,
            title,
            updateType,
            isBroadcast: false
        };

        return sendVersionUpdateNotification(req, res);

    } catch (error) {
        console.error('Notify outdated users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to notify outdated users',
            error: error.message
        });
    }
};

// Get notification history for version updates
const getVersionNotificationHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Find notifications related to version updates
        const notifications = await Notification.find({
            $or: [
                { title: { $regex: 'update', $options: 'i' } },
                { body: { $regex: 'version|update', $options: 'i' } }
            ]
        })
        .populate('sender', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Notification.countDocuments({
            $or: [
                { title: { $regex: 'update', $options: 'i' } },
                { body: { $regex: 'version|update', $options: 'i' } }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                notifications,
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
        console.error('Get version notification history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get version notification history',
            error: error.message
        });
    }
};

module.exports = {
    sendVersionUpdateNotification,
    getUsersNeedingUpdate,
    notifyOutdatedUsers,
    getVersionNotificationHistory
};