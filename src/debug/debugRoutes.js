// Backend/src/debug/debugRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Debug endpoint to test token validation
router.post('/test-token', (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required in request body'
            });
        }

        // Test JWT verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        res.json({
            success: true,
            message: 'Token is valid',
            decoded: decoded,
            tokenInfo: {
                hasId: !!decoded.id,
                hasUserId: !!decoded.userId,
                normalizedId: decoded.id || decoded.userId,
                exp: decoded.exp ? new Date(decoded.exp * 1000) : null,
                iat: decoded.iat ? new Date(decoded.iat * 1000) : null
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token validation failed',
            error: error.message,
            errorType: error.name
        });
    }
});

// Debug endpoint to test auth middleware
router.get('/test-auth', require('../middleware/authMiddleware'), (req, res) => {
    res.json({
        success: true,
        message: 'Auth middleware passed',
        user: req.user
    });
});

// Debug endpoint to check environment
router.get('/test-env', (req, res) => {
    res.json({
        success: true,
        environment: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT
        }
    });
});

module.exports = router;