/**
 * Migration Script: Create 2025-2026 Academic Year in Production
 * 
 * This script creates the 2025-2026 academic year in the production database via API.
 * 
 * Run with: node migrations/createAcademicYearProd.js
 */

const https = require('https');

const API_URL = 'https://hu-sims-backend.onrender.com';
const API_KEY = process.env.API_KEY || ''; // Add your API key if needed

function createAcademicYear() {
  const data = JSON.stringify({
    year: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-07-31',
    isActive: false,
    status: 'Active',
    semesters: [
      {
        name: 'Semester 1',
        startDate: '2025-09-01',
        endDate: '2026-01-31',
        examPeriodStart: '2026-01-15',
        examPeriodEnd: '2026-01-31',
        resultDate: '2026-02-15'
      },
      {
        name: 'Semester 2',
        startDate: '2026-02-01',
        endDate: '2026-07-31',
        examPeriodStart: '2026-07-01',
        examPeriodEnd: '2026-07-15',
        resultDate: '2026-07-31'
      }
    ]
  });

  const options = {
    hostname: 'hu-sims-backend.onrender.com',
    port: 443,
    path: '/api/academic-years',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
    }
  };

  console.log('Creating 2025-2026 academic year in production...');

  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(body);
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✓ Academic year created successfully!');
          console.log('Response:', response);
          console.log('You can now activate it from the School Settings page.');
          process.exit(0);
        } else {
          console.error('✗ Failed to create academic year');
          console.error('Status:', res.statusCode);
          console.error('Response:', body);
          process.exit(1);
        }
      } catch (error) {
        console.error('✗ Failed to parse response:', error);
        console.error('Response body:', body);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('✗ Request failed:', error);
    process.exit(1);
  });

  req.write(data);
  req.end();
}

createAcademicYear();
