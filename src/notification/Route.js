const express = require('express');
const router = express.Router();
const Notification = require('./Notification');

// Send notification
router.post('/', async (req, res) => {
  const { title, body, recipientIds, isBroadcast, senderId } = req.body;

  if (!senderId) {
    return res.status(400).json({ error: 'Sender ID is required' });
  }

  try {
    let recipients = [];

    if (isBroadcast) {
      // For broadcast, get all users and add them as recipients
      const User = require('../user/User');
      const allUsers = await User.find({ isActive: true }).select('_id');
      recipients = allUsers.map(user => ({
        user: user._id,
        isRead: false
      }));
    } else {
      // For specific users
      recipients = recipientIds.map(id => ({
        user: id,
        isRead: false
      }));
    }

    const notification = new Notification({
      title,
      body,
      sender: senderId,
      recipients,
      isBroadcast,
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get all notifications for the current user
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get all notifications where user should see them
    const notifications = await Notification.find({
      $or: [
        // Direct notifications where user is recipient and not permanently dismissed
        {
          'recipients': {
            $elemMatch: {
              user: userId,
              permanentlyDismissed: { $ne: true }
            }
          }
        },
        // Broadcast notifications where user hasn't permanently dismissed
        {
          isBroadcast: true,
          $or: [
            // User not in recipients (hasn't interacted yet)
            { 'recipients.user': { $ne: userId } },
            // User in recipients but not permanently dismissed
            {
              'recipients': {
                $elemMatch: {
                  user: userId,
                  permanentlyDismissed: { $ne: true }
                }
              }
            }
          ]
        }
      ]
    })
      .populate('sender', 'name email')
      .sort('-createdAt');

    // Add read status for each notification
    const notificationsWithStatus = notifications.map(notification => {
      const userRecipient = notification.recipients.find(r => r.user.toString() === userId);
      return {
        ...notification.toObject(),
        isRead: userRecipient ? userRecipient.isRead : false,
        readAt: userRecipient ? userRecipient.readAt : null
      };
    });

    res.json(notificationsWithStatus);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get only unread notifications for popup
router.get('/unread', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Find all notifications that the user hasn't read and hasn't permanently dismissed
    const notifications = await Notification.find({
      $or: [
        // Direct notifications to the user that are unread and not permanently dismissed
        {
          'recipients.user': userId,
          'recipients.isRead': false,
          'recipients.permanentlyDismissed': { $ne: true }
        },
        // Broadcast notifications that user hasn't interacted with
        {
          isBroadcast: true,
          recipients: {
            $not: {
              $elemMatch: {
                user: userId,
                $or: [
                  { isRead: true },
                  { permanentlyDismissed: true }
                ]
              }
            }
          }
        }
      ],
    })
      .populate('sender', 'name email')
      .sort('-createdAt');

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching unread notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread notification count for the current user
router.get('/count', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const count = await Notification.countDocuments({
      $or: [
        // Direct notifications that are unread and not permanently dismissed
        {
          'recipients': {
            $elemMatch: {
              user: userId,
              isRead: false,
              permanentlyDismissed: { $ne: true }
            }
          }
        },
        // Broadcast notifications user hasn't interacted with
        {
          isBroadcast: true,
          'recipients.user': { $ne: userId }
        }
      ]
    });

    res.json({ count });
  } catch (err) {
    console.error('Error getting notification count:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    let notification = await Notification.findOne({
      _id: req.params.id,
      $or: [{ 'recipients.user': userId }, { isBroadcast: true }],
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // If broadcast and user not in recipients, add them
    if (notification.isBroadcast && !notification.recipients.some(r => r.user.toString() === userId)) {
      notification.recipients.push({
        user: userId,
        isRead: true,
        readAt: new Date(),
        permanentlyDismissed: false
      });
    } else {
      // Update existing recipient
      notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          'recipients.user': userId,
        },
        {
          $set: {
            'recipients.$.isRead': true,
            'recipients.$.readAt': new Date(),
          },
        },
        { new: true }
      );
    }

    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Permanently dismiss notification (don't show again)
router.patch('/:id/dismiss', async (req, res) => {
  const { userId, permanentlyDismissed = true } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    let notification = await Notification.findOne({
      _id: req.params.id,
      $or: [{ 'recipients.user': userId }, { isBroadcast: true }],
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // If broadcast and user not in recipients, add them with permanentlyDismissed flag
    if (notification.isBroadcast && !notification.recipients.some(r => r.user.toString() === userId)) {
      notification.recipients.push({
        user: userId,
        isRead: true,
        readAt: new Date(),
        permanentlyDismissed: permanentlyDismissed
      });
    } else {
      // Update existing recipient
      notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          'recipients.user': userId,
        },
        {
          $set: {
            'recipients.$.isRead': true,
            'recipients.$.readAt': new Date(),
            'recipients.$.permanentlyDismissed': permanentlyDismissed
          },
        },
        { new: true }
      );
    }

    await notification.save();
    res.json(notification);
  } catch (err) {
    console.error('Error dismissing notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete single notification
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [{ sender: userId }, { 'recipients.user': userId }, { isBroadcast: true }],
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // If user is the sender, delete the entire notification
    if (notification.sender.toString() === userId) {
      await Notification.deleteOne({ _id: req.params.id });
    }
    // If user is a recipient or it's a broadcast notification
    else {
      // Check if user is already in recipients
      const existingRecipientIndex = notification.recipients.findIndex(r => r.user.toString() === userId);

      if (existingRecipientIndex !== -1) {
        // Update existing recipient to mark as permanently dismissed
        notification.recipients[existingRecipientIndex].permanentlyDismissed = true;
        notification.recipients[existingRecipientIndex].isRead = true;
        notification.recipients[existingRecipientIndex].readAt = new Date();
      } else {
        // Add user to recipients with permanently dismissed flag
        notification.recipients.push({
          user: userId,
          isRead: true,
          readAt: new Date(),
          permanentlyDismissed: true
        });
      }

      await notification.save();
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read for a user
router.patch('/mark-all-read', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Mark all existing recipient records as read
    await Notification.updateMany(
      { 'recipients.user': userId },
      {
        $set: {
          'recipients.$.isRead': true,
          'recipients.$.readAt': new Date()
        }
      }
    );

    // For broadcast notifications where user is not yet a recipient, add them as read
    const broadcastNotifications = await Notification.find({
      isBroadcast: true,
      'recipients.user': { $ne: userId }
    });

    for (const notification of broadcastNotifications) {
      notification.recipients.push({
        user: userId,
        isRead: true,
        readAt: new Date(),
        permanentlyDismissed: false
      });
      await notification.save();
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete all notifications for a user
router.delete('/', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Mark all notifications as permanently dismissed for this user
    // For notifications where user is already a recipient
    await Notification.updateMany(
      { 'recipients.user': userId },
      {
        $set: {
          'recipients.$.permanentlyDismissed': true,
          'recipients.$.isRead': true,
          'recipients.$.readAt': new Date()
        }
      }
    );

    // For broadcast notifications where user is not yet a recipient
    const broadcastNotifications = await Notification.find({
      isBroadcast: true,
      'recipients.user': { $ne: userId }
    });

    for (const notification of broadcastNotifications) {
      notification.recipients.push({
        user: userId,
        isRead: true,
        readAt: new Date(),
        permanentlyDismissed: true
      });
      await notification.save();
    }

    // Delete notifications where user is the sender (optional - admin sent notifications)
    await Notification.deleteMany({ sender: userId });

    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    console.error('Error deleting all notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;