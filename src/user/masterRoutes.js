// routes/masterRoutes.js
const express = require('express');
const router = express.Router();
const {
  // Branch controllers
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,

  // Department controllers
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Employment Type controllers
  getAllEmploymentTypes,
  createEmploymentType,
  updateEmploymentType,
  deleteEmploymentType,

  // Note: Head Office and State controllers removed - using separate routes
} = require('./masterController');

// Import user-specific controllers
const { getUserHistory } = require('./controller');

// ============ BRANCH ROUTES ============
router.get('/branches', getAllBranches);
router.get('/branches/:id', getBranchById);
router.post('/branches', createBranch);
router.put('/branches/:id', updateBranch);
router.delete('/branches/:id', deleteBranch);

// ============ DEPARTMENT ROUTES ============
router.get('/departments', getAllDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// ============ EMPLOYMENT TYPE ROUTES ============
router.get('/employment-types', getAllEmploymentTypes);
router.post('/employment-types', createEmploymentType);
router.put('/employment-types/:id', updateEmploymentType);
router.delete('/employment-types/:id', deleteEmploymentType);

// Note: Head Office and State routes are handled by separate route files:
// - Head Office routes: /api/headoffices (Backend/src/headoffice/Route.js)
// - State routes: /api/states (Backend/src/state/Route.js)

router.get('/users/:userId/history', getUserHistory);

module.exports = router;