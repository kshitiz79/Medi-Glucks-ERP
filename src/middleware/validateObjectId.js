const mongoose = require('mongoose');

/**
 * Middleware to validate ObjectId parameters
 * @param {string} paramName - The parameter name to validate (e.g., 'id', 'headOfficeId')
 * @returns {Function} Express middleware function
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate ObjectId in request body
 * @param {string} fieldName - The field name to validate (e.g., 'headOffice', 'userId')
 * @returns {Function} Express middleware function
 */
const validateObjectIdInBody = (fieldName) => {
  return (req, res, next) => {
    const id = req.body[fieldName];
    
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${fieldName} format`
      });
    }
    
    next();
  };
};

/**
 * Utility function to validate ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid ObjectId, false otherwise
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Utility function to safely convert string to ObjectId
 * @param {string} id - The ID to convert
 * @returns {ObjectId|null} ObjectId if valid, null otherwise
 */
const toObjectId = (id) => {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

module.exports = {
  validateObjectId,
  validateObjectIdInBody,
  isValidObjectId,
  toObjectId
};