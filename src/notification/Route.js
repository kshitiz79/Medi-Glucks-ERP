const express = require('express');
const router = express.Router();
const Notification = require('./Notification');

// Send notification
router.post('/', async (req, res) => {
  const { title, body, recipientIds, isBroadcast, senderId } = req.body;

  if (!senderId) {
    return res.status(400).json({ error: 'Sender ID is required' });
  }

  const notification = new Notification({
    title,
    body,
    sender: senderId,
    recipients: isBroadcast ? [] : recipientIds.map(id => ({ user: id })), 
    isBroadcast,
  });

  try {
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get notifications for the current user
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Fetch notifications for the user, regardless of whether they are read or unread
    const notifications = await Notification.find({
      $or: [
        { 'recipients.user': userId },  // All notifications where the user is a recipient
        { isBroadcast: true },           // Include broadcast notifications that aren't tied to a specific user
      ],
    })
      .populate('sender', 'name email')  // Populate the sender's information (e.g., name, email)
      .sort('-createdAt');               // Sort by creation time in descending order

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
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

    const notifications = await Notification.find({
      $or: [
        { 'recipients.user': userId, 'recipients.isRead': false },
        { isBroadcast: true, 'recipients.user': { $ne: userId } },
      ],
    });

    const count = notifications.reduce((acc, notif) => {
      if (notif.isBroadcast && !notif.recipients.some(r => r.user.toString() === userId && r.isRead)) {
        return acc + 1;
      }
      if (!notif.isBroadcast && notif.recipients.some(r => r.user.toString() === userId && !r.isRead)) {
        return acc + 1;
      }
      return acc;
    }, 0);

    res.json({ count });
  } catch (err) {
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

    // If user is a recipient, remove them from recipients
    if (notification.recipients.some(r => r.user.toString() === userId)) {
      notification.recipients = notification.recipients.filter(r => r.user.toString() !== userId);
      if (notification.recipients.length === 0 && !notification.isBroadcast) {
        await Notification.deleteOne({ _id: req.params.id });
      } else {
        await notification.save();
      }
    } else if (notification.sender.toString() === userId) {
      // If user is the sender, delete the entire notification
      await Notification.deleteOne({ _id: req.params.id });
    } else if (notification.isBroadcast) {
      // For broadcast, add user to recipients with isRead: true to "hide" it
      notification.recipients.push({
        user: userId,
        isRead: true,
        readAt: new Date(),
      });
      await notification.save();
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
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

    // Remove user from recipients of all notifications
    await Notification.updateMany(
      { 'recipients.user': userId },
      { $pull: { recipients: { user: userId } } }
    );

    // For broadcast notifications, mark as read instead of removing
    await Notification.updateMany(
      { isBroadcast: true, 'recipients.user': { $ne: userId } },
      { $push: { recipients: { user: userId, isRead: true, readAt: new Date() } } }
    );

    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;