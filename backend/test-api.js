const axios = require('axios');

async function testAPI() {
  try {
    // Step 1: Get auth token
    console.log('🔐 Step 1: Getting auth token...');
    const authResponse = await axios.post('http://localhost:3000/api/auth/telegram/admin', {
      initData: 'dev'
    });
    
    const token = authResponse.data.access_token;
    console.log('✅ Token received:', token.substring(0, 20) + '...');
    console.log('✅ Admin:', JSON.stringify(authResponse.data.admin, null, 2));
    
    // Step 2: Test admins endpoint
    console.log('\n📋 Step 2: Testing /api/admin/admins...');
    const adminsResponse = await axios.get('http://localhost:3000/api/admin/admins', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Admins response:', JSON.stringify(adminsResponse.data, null, 2));
    
    // Step 3: Test stats endpoint
    console.log('\n📊 Step 3: Testing /api/admin/stats...');
    const statsResponse = await axios.get('http://localhost:3000/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Stats response keys:', Object.keys(statsResponse.data));
    
    // Step 4: Test users endpoint
    console.log('\n👥 Step 4: Testing /api/admin/users...');
    const usersResponse = await axios.get('http://localhost:3000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: { page: 1 }
    });
    console.log('✅ Users response:', {
      total: usersResponse.data.total,
      dataLength: Array.isArray(usersResponse.data) ? usersResponse.data.length : usersResponse.data.data?.length || 0
    });
    
    console.log('\n✅ All API endpoints working!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    process.exit(1);
  }
}

testAPI();

