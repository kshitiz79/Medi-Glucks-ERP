// Simple script to test the API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testStateAPI() {
  try {
    console.log('Testing State API...');
    
    // Test GET all states
    const response = await fetch(`${BASE_URL}/api/states`);
    const states = await response.json();
    console.log('✓ GET /api/states:', states.length, 'states found');
    
    // Test POST new state
    const newState = {
      name: 'Test State',
      code: 'TS',
      country: 'India'
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newState)
    });
    
    if (createResponse.ok) {
      const createdState = await createResponse.json();
      console.log('✓ POST /api/states: State created with ID', createdState._id);
      
      // Test DELETE
      const deleteResponse = await fetch(`${BASE_URL}/api/states/${createdState._id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('✓ DELETE /api/states: State deleted successfully');
      }
    }
    
  } catch (error) {
    console.error('✗ Error testing State API:', error.message);
  }
}

async function testHeadOfficeAPI() {
  try {
    console.log('\nTesting Head Office API...');
    
    // Test GET all head offices
    const response = await fetch(`${BASE_URL}/api/headoffices`);
    const headOffices = await response.json();
    console.log('✓ GET /api/headoffices:', headOffices.length, 'head offices found');
    
  } catch (error) {
    console.error('✗ Error testing Head Office API:', error.message);
  }
}

async function runTests() {
  await testStateAPI();
  await testHeadOfficeAPI();
  console.log('\nAPI tests completed!');
}

runTests();