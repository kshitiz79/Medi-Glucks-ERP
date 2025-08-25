// controllers/masterController.js
const { Branch, Department, EmploymentType, HeadOffice, State } = require('./masterModels');

// ============ BRANCH CONTROLLERS ============

// Get all branches
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (err) {
    console.error('Get branches error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Get branch by ID
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    
    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branch not found' 
      });
    }
    
    res.json({
      success: true,
      data: branch
    });
  } catch (err) {
    console.error('Get branch error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Create branch
exports.createBranch = async (req, res) => {
  try {
    // Add audit info
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const branch = new Branch(req.body);
    const savedBranch = await branch.save();
    
    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: savedBranch
    });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Update branch
exports.updateBranch = async (req, res) => {
  try {
    // Add audit info
    if (req.user) {
      req.body.updatedBy = req.user.id;
    }
    
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branch not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: branch
    });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Delete branch
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    
    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branch not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// ============ DEPARTMENT CONTROLLERS ============

// Get all departments
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Create department
exports.createDepartment = async (req, res) => {
  try {
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const department = new Department(req.body);
    const savedDepartment = await department.save();
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: savedDepartment
    });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    if (req.user) {
      req.body.updatedBy = req.user.id;
    }
    
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ 
        success: false, 
        message: 'Department not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    
    if (!department) {
      return res.status(404).json({ 
        success: false, 
        message: 'Department not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// ============ EMPLOYMENT TYPE CONTROLLERS ============

// Get all employment types
exports.getAllEmploymentTypes = async (req, res) => {
  try {
    const employmentTypes = await EmploymentType.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: employmentTypes.length,
      data: employmentTypes
    });
  } catch (err) {
    console.error('Get employment types error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Create employment type
exports.createEmploymentType = async (req, res) => {
  try {
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const employmentType = new EmploymentType(req.body);
    const savedEmploymentType = await employmentType.save();
    
    res.status(201).json({
      success: true,
      message: 'Employment type created successfully',
      data: savedEmploymentType
    });
  } catch (err) {
    console.error('Create employment type error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Update employment type
exports.updateEmploymentType = async (req, res) => {
  try {
    if (req.user) {
      req.body.updatedBy = req.user.id;
    }
    
    const employmentType = await EmploymentType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!employmentType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employment type not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Employment type updated successfully',
      data: employmentType
    });
  } catch (err) {
    console.error('Update employment type error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Delete employment type
exports.deleteEmploymentType = async (req, res) => {
  try {
    const employmentType = await EmploymentType.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    
    if (!employmentType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Employment type not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Employment type deleted successfully'
    });
  } catch (err) {
    console.error('Delete employment type error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// ============ HEAD OFFICE CONTROLLERS ============

// Get all head offices
exports.getAllHeadOffices = async (req, res) => {
  try {
    const headOffices = await HeadOffice.find({ isActive: true })
      .populate('state', 'name code')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: headOffices.length,
      data: headOffices
    });
  } catch (err) {
    console.error('Get head offices error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Create head office
exports.createHeadOffice = async (req, res) => {
  try {
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const headOffice = new HeadOffice(req.body);
    const savedHeadOffice = await headOffice.save();
    
    res.status(201).json({
      success: true,
      message: 'Head office created successfully',
      data: savedHeadOffice
    });
  } catch (err) {
    console.error('Create head office error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Update head office
exports.updateHeadOffice = async (req, res) => {
  try {
    if (req.user) {
      req.body.updatedBy = req.user.id;
    }
    
    const headOffice = await HeadOffice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!headOffice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Head office not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Head office updated successfully',
      data: headOffice
    });
  } catch (err) {
    console.error('Update head office error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Delete head office
exports.deleteHeadOffice = async (req, res) => {
  try {
    const headOffice = await HeadOffice.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    
    if (!headOffice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Head office not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Head office deleted successfully'
    });
  } catch (err) {
    console.error('Delete head office error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// ============ STATE CONTROLLERS ============

// Get all states
exports.getAllStates = async (req, res) => {
  try {
    const states = await State.find({ isActive: true })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: states.length,
      data: states
    });
  } catch (err) {
    console.error('Get states error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Create state
exports.createState = async (req, res) => {
  try {
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    const state = new State(req.body);
    const savedState = await state.save();
    
    res.status(201).json({
      success: true,
      message: 'State created successfully',
      data: savedState
    });
  } catch (err) {
    console.error('Create state error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Update state
exports.updateState = async (req, res) => {
  try {
    if (req.user) {
      req.body.updatedBy = req.user.id;
    }
    
    const state = await State.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!state) {
      return res.status(404).json({ 
        success: false, 
        message: 'State not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'State updated successfully',
      data: state
    });
  } catch (err) {
    console.error('Update state error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};

// Delete state
exports.deleteState = async (req, res) => {
  try {
    const state = await State.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    
    if (!state) {
      return res.status(404).json({ 
        success: false, 
        message: 'State not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'State deleted successfully'
    });
  } catch (err) {
    console.error('Delete state error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Server error' 
    });
  }
};