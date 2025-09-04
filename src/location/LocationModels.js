const mongoose = require('mongoose');

// Location History Schema - stores optimized location points
const LocationHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coordinates: [{
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        timestamp: {
            type: Date,
            required: true
        },
        speed: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: null
        },
        altitude: {
            type: Number,
            default: null
        }
    }],
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    distance: {
        type: Number,
        default: 0 // Total distance in meters
    },
    duration: {
        type: Number,
        default: 0 // Duration in minutes
    },
    polyline: {
        type: String, // Encoded polyline for efficient storage
        default: null
    },
    metadata: {
        totalPoints: {
            type: Number,
            default: 0
        },
        averageSpeed: {
            type: Number,
            default: 0
        },
        maxSpeed: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Stop Events Schema - stores significant stops
const StopEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        address: {
            type: String,
            default: null
        }
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        default: null // null means still ongoing
    },
    duration: {
        type: Number,
        default: 0 // Duration in minutes
    },
    stopType: {
        type: String,
        enum: ['break', 'visit', 'meeting', 'lunch', 'other'],
        default: 'other'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    metadata: {
        accuracy: {
            type: Number,
            default: null
        },
        confidence: {
            type: Number,
            default: 0.8 // Confidence level of stop detection
        }
    }
}, {
    timestamps: true
});

// Real-time Location Schema - for current/latest location (backup to Redis)
const RealTimeLocationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    location: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        }
    },
    speed: {
        type: Number,
        default: 0
    },
    accuracy: {
        type: Number,
        default: null
    },
    altitude: {
        type: Number,
        default: null
    },
    heading: {
        type: Number,
        default: null
    },
    timestamp: {
        type: Date,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    batteryLevel: {
        type: Number,
        default: null
    },
    networkType: {
        type: String,
        enum: ['wifi', '4g', '3g', '2g', 'unknown'],
        default: 'unknown'
    }
}, {
    timestamps: true
});

// Location Event Schema - for message queue processing
const LocationEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rawData: {
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        speed: {
            type: Number,
            default: 0
        },
        accuracy: {
            type: Number,
            default: null
        },
        timestamp: {
            type: Date,
            required: true
        }
    },
    processed: {
        type: Boolean,
        default: false
    },
    processingResult: {
        action: {
            type: String,
            enum: ['stored', 'filtered_distance', 'filtered_accuracy', 'stop_detected', 'movement_detected'],
            default: null
        },
        reason: {
            type: String,
            default: null
        },
        distance: {
            type: Number,
            default: null
        }
    },
    processingTime: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});



const HighFrequencyTrackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionStart: {
        type: Date,
        required: true
    },
    sessionEnd: {
        type: Date,
        required: true
    },
    points: [{
        lat: Number,
        lng: Number,
        rawLat: Number, // Original GPS reading
        rawLng: Number,
        timestamp: Date,
        speed: Number,
        accuracy: Number,
        altitude: Number,
        heading: Number // Direction in degrees
    }],
    waypoints: [{
        lat: Number,
        lng: Number,
        timestamp: Date,
        type: {
            type: String,
            enum: ['start', 'end', 'stop', 'turn', 'significant_movement']
        }
    }],
    compressedPath: {
        type: String, // Encoded polyline for efficient storage
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    metadata: {
        totalDistance: Number,
        averageSpeed: Number,
        maxSpeed: Number,
        totalPoints: Number,
        compressionRatio: Number
    }
}, {
    timestamps: true
});












// Indexes for performance
LocationHistorySchema.index({ userId: 1, startTime: -1 });
LocationHistorySchema.index({ userId: 1, endTime: -1 });
LocationHistorySchema.index({ startTime: 1, endTime: 1 });

StopEventSchema.index({ userId: 1, startTime: -1 });
StopEventSchema.index({ userId: 1, isActive: 1 });
StopEventSchema.index({ startTime: 1, endTime: 1 });

// RealTimeLocationSchema.index({ userId: 1 }, { unique: true }); // Removed: field-level unique: true already creates this index
RealTimeLocationSchema.index({ lastUpdated: -1 });

LocationEventSchema.index({ userId: 1, createdAt: -1 });
LocationEventSchema.index({ processed: 1, createdAt: 1 });


HighFrequencyTrackSchema.index({ userId: 1, sessionStart: -1 });
HighFrequencyTrackSchema.index({ userId: 1, isActive: 1 });


const LocationHistory = mongoose.model('LocationHistory', LocationHistorySchema);
const StopEvent = mongoose.model('StopEvent', StopEventSchema);
const RealTimeLocation = mongoose.model('RealTimeLocation', RealTimeLocationSchema);
const LocationEvent = mongoose.model('LocationEvent', LocationEventSchema);
const HighFrequencyTrack = mongoose.model('HighFrequencyTrack', HighFrequencyTrackSchema);

module.exports = {
    LocationHistory,
    StopEvent,
    RealTimeLocation,
    LocationEvent,
        HighFrequencyTrack
};