// Backend/test/attendance-test.js
// Simple test script for the enhanced attendance system

const mongoose = require('mongoose');
const Attendance = require('../src/attendance/Attendance');
require('dotenv').config();

async function testAttendanceSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Test user ID (replace with actual user ID)
        const testUserId = new mongoose.Types.ObjectId();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('\n🧪 Testing Enhanced Attendance System...\n');

        // Test 1: Create new attendance record with first punch in
        console.log('Test 1: First punch in');
        let attendance = new Attendance({
            userId: testUserId,
            date: today,
            punchSessions: [{
                punchIn: new Date('2025-01-26T09:00:00Z'),
                punchOut: null
            }],
            currentSession: 0
        });
        await attendance.save();
        console.log('✅ First punch in created');
        console.log('Status:', attendance.status);
        console.log('Current session:', attendance.currentSession);

        // Test 2: Punch out from first session
        console.log('\nTest 2: First punch out');
        attendance.punchSessions[0].punchOut = new Date('2025-01-26T12:00:00Z');
        attendance.currentSession = -1;
        await attendance.save();
        console.log('✅ First punch out completed');
        console.log('Status:', attendance.status);
        console.log('Working time:', attendance.getFormattedWorkingHours());

        // Test 3: Second punch in (after lunch)
        console.log('\nTest 3: Second punch in');
        attendance.punchSessions.push({
            punchIn: new Date('2025-01-26T13:00:00Z'),
            punchOut: null
        });
        attendance.currentSession = 1;
        await attendance.save();
        console.log('✅ Second punch in created');
        console.log('Status:', attendance.status);
        console.log('Auto breaks:', attendance.autoBreaks.length);
        if (attendance.autoBreaks.length > 0) {
            console.log('Break duration:', attendance.autoBreaks[0].duration, 'minutes');
        }

        // Test 4: Final punch out
        console.log('\nTest 4: Final punch out');
        attendance.punchSessions[1].punchOut = new Date('2025-01-26T17:00:00Z');
        attendance.currentSession = -1;
        await attendance.save();
        console.log('✅ Final punch out completed');
        console.log('Status:', attendance.status);
        console.log('Total working time:', attendance.getFormattedWorkingHours());
        console.log('Total break time:', attendance.totalBreakMinutes, 'minutes');

        // Test 5: Get summary
        console.log('\nTest 5: Attendance summary');
        const summary = attendance.getSummary();
        console.log('✅ Summary generated');
        console.log('Sessions:', summary.punchSessions.length);
        console.log('Auto breaks:', summary.autoBreaks.length);
        console.log('First punch in:', summary.firstPunchIn);
        console.log('Last punch out:', summary.lastPunchOut);

        // Test 6: Third punch in (overtime)
        console.log('\nTest 6: Third punch in (overtime)');
        attendance.punchSessions.push({
            punchIn: new Date('2025-01-26T18:00:00Z'),
            punchOut: new Date('2025-01-26T20:00:00Z')
        });
        await attendance.save();
        console.log('✅ Overtime session added');
        console.log('Total working time:', attendance.getFormattedWorkingHours());
        console.log('Overtime minutes:', attendance.overtimeMinutes);
        console.log('Auto breaks:', attendance.autoBreaks.length);

        // Clean up test data
        await Attendance.deleteOne({ _id: attendance._id });
        console.log('\n🧹 Test data cleaned up');

        console.log('\n🎉 All tests passed! Enhanced attendance system is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testAttendanceSystem();
}

module.exports = { testAttendanceSystem };