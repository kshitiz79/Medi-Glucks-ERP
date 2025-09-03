// Backend/src/version/Version.js
const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
    // App version information
    currentVersion: {
        type: String,
        required: true,
        trim: true,
        match: /^\d+\.\d+\.\d+$/, // Matches version format like 1.0.0
        description: 'Current app version on user device'
    },
    playStoreVersion: {
        type: String,
        required: true,
        trim: true,
        match: /^\d+\.\d+\.\d+$/, // Matches version format like 1.0.0
        description: 'Latest version available on Google Play Store'
    },
    
    // User information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deviceInfo: {
        deviceId: {
            type: String,
            trim: true
        },
        platform: {
            type: String,
            enum: ['android', 'ios', 'web'],
            default: 'android'
        },
        osVersion: {
            type: String,
            trim: true
        },
        model: {
            type: String,
            trim: true
        },
        manufacturer: {
            type: String,
            trim: true
        }
    },
    
    // Build information
    buildNumber: {
        type: String,
        trim: true,
        description: 'App build number'
    },
    
    // Version comparison result
    updateRequired: {
        type: Boolean,
        default: false,
        description: 'Whether update is required based on version comparison'
    },
    updateType: {
        type: String,
        enum: ['none', 'optional', 'recommended', 'critical'],
        default: 'none',
        description: 'Type of update required'
    },
    
    // Version check details
    versionCheckDate: {
        type: Date,
        default: Date.now
    },
    lastCheckDate: {
        type: Date,
        default: Date.now
    },
    checkCount: {
        type: Number,
        default: 1,
        description: 'Number of times user has checked version'
    },
    lastUpdatePromptDate: {
        type: Date
    },
    updateSkipped: {
        type: Boolean,
        default: false
    },
    
    // Additional metadata
    releaseNotes: {
        type: String,
        trim: true,
        description: 'Release notes for the new version'
    },
    minimumRequiredVersion: {
        type: String,
        trim: true,
        match: /^\d+\.\d+\.\d+$/,
        description: 'Minimum version required to use the app'
    },
    forceUpdate: {
        type: Boolean,
        default: false,
        description: 'Whether to force user to update'
    },
    
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
versionSchema.index({ userId: 1 }, { unique: true }); // Ensure one record per user
versionSchema.index({ versionCheckDate: -1 });
versionSchema.index({ currentVersion: 1, playStoreVersion: 1 });
versionSchema.index({ updateRequired: 1 });
versionSchema.index({ 'deviceInfo.platform': 1 });

// Instance method to compare versions
versionSchema.methods.compareVersions = function() {
    const current = this.currentVersion.split('.').map(Number);
    const playStore = this.playStoreVersion.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
        if (current[i] < playStore[i]) {
            return -1; // Current version is older
        }
        if (current[i] > playStore[i]) {
            return 1; // Current version is newer
        }
    }
    return 0; // Versions are equal
};

// Instance method to determine update type
versionSchema.methods.determineUpdateType = function() {
    const comparison = this.compareVersions();
    
    if (comparison === 0) {
        return 'none'; // Up to date
    }
    
    if (comparison === -1) {
        const current = this.currentVersion.split('.').map(Number);
        const playStore = this.playStoreVersion.split('.').map(Number);
        
        // Critical update if major version is different
        if (current[0] < playStore[0]) {
            return 'critical';
        }
        
        // Recommended update if minor version is different
        if (current[1] < playStore[1]) {
            return 'recommended';
        }
        
        // Optional update if patch version is different
        return 'optional';
    }
    
    return 'none'; // Current version is newer than play store
};

// Pre-save middleware to automatically set update fields
versionSchema.pre('save', function(next) {
    const comparison = this.compareVersions();
    this.updateRequired = comparison === -1;
    this.updateType = this.determineUpdateType();
    
    // Check if force update is required based on minimum version
    if (this.minimumRequiredVersion) {
        const current = this.currentVersion.split('.').map(Number);
        const minimum = this.minimumRequiredVersion.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (current[i] < minimum[i]) {
                this.forceUpdate = true;
                this.updateType = 'critical';
                break;
            }
            if (current[i] > minimum[i]) {
                break;
            }
        }
    }
    
    next();
});

// Static method to get latest version check for user
versionSchema.statics.getLatestVersionCheck = function(userId) {
    return this.findOne({ userId })
        .populate('userId', 'name email employeeCode')
        .sort({ versionCheckDate: -1 });
};

// Static method to check if user needs update
versionSchema.statics.checkUpdateRequired = function(userId, currentVersion, playStoreVersion) {
    const versionCheck = new this({
        userId,
        currentVersion,
        playStoreVersion
    });
    
    return {
        updateRequired: versionCheck.updateRequired,
        updateType: versionCheck.updateType,
        comparison: versionCheck.compareVersions()
    };
};

module.exports = mongoose.model('Version', versionSchema);