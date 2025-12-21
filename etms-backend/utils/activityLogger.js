const Activity = require('../models/Activity');

/**
 * Log an activity to the database
 * @param {Object} params - Activity parameters
 * @param {string} params.type - Activity type
 * @param {string} params.description - Activity description
 * @param {Object} params.user - User object with _id, user_name, role
 * @param {string} params.relatedId - Related document ID (optional)
 * @param {string} params.relatedModel - Related model name (optional)
 * @param {Object} params.metadata - Additional metadata (optional)
 */
const logActivity = async ({ type, description, user, relatedId, relatedModel, metadata }) => {
  try {
    const activity = new Activity({
      type,
      description,
      userId: user.id || user._id, // Support both req.user.id and direct user._id
      userName: user.user_name || user.name,
      userRole: user.role,
      relatedId,
      relatedModel,
      metadata
    });
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break main functionality
    return null;
  }
};

module.exports = { logActivity };
