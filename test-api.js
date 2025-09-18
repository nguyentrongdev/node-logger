const axios = require('axios');
const moment = require('moment');

const BASE_URL = 'http://localhost:4005';

// Test function để gửi log
async function testWriteLog() {
  try {
    console.log('📝 Testing write log API...');
    
    const response = await axios.post(`${BASE_URL}/api/log`, {
      message: 'Starting Nest application...',
      level: 'INFO',
      component: 'NestFactory',
      platform: 'NestJS'
      // date: '2024-01-15' // optional
    });
    
    console.log('✅ Write log response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error writing log:', error.response?.data || error.message);
  }
}

// Test function để gửi nhiều loại logs
async function testMultipleLogs() {
  try {
    console.log('📝 Testing multiple log types...');
    
    const logs = [
      {
        message: 'Application starting up',
        level: 'INFO',
        component: 'Bootstrap',
        platform: 'Express'
      },
      {
        message: 'Database connection established',
        level: 'DEBUG',
        component: 'DatabaseModule',
        platform: 'Nodejs'
      },
      {
        message: 'User authentication failed',
        level: 'WARN',
        component: 'AuthService',
        platform: 'NestJS'
      },
      {
        message: 'Critical system error occurred',
        level: 'ERROR',
        component: 'SystemCore',
        platform: 'Docker'
      },
      {
        message: 'Simple log without level, component and platform'
      }
    ];
    
    for (const log of logs) {
      const response = await axios.post(`${BASE_URL}/api/log`, log);
      console.log(`✅ ${log.level || 'INFO'} log written:`, response.data.timestamp);
    }
    
    console.log('✅ Multiple logs test completed');
    
  } catch (error) {
    console.error('❌ Error writing multiple logs:', error.response?.data || error.message);
  }
}

// Test function để gửi batch logs
async function testBatchLogs() {
  try {
    console.log('📦 Testing batch logs API...');
    
    const batchLogs = [
      {
        message: 'Application bootstrap started',
        level: 'INFO',
        component: 'Bootstrap',
        platform: 'NestJS'
      },
      {
        message: 'Loading configuration files',
        level: 'DEBUG',
        component: 'ConfigService',
        platform: 'Nodejs'
      },
      {
        message: 'Database connection pool initialized',
        level: 'INFO',
        component: 'DatabaseModule',
        platform: 'PostgreSQL'
      },
      {
        message: 'Redis cache connection established',
        level: 'DEBUG',
        component: 'CacheService',
        platform: 'Redis'
      },
      {
        message: 'Authentication middleware loaded',
        level: 'INFO',
        component: 'AuthMiddleware',
        platform: 'Express'
      },
      {
        message: 'Rate limiting configured',
        level: 'WARN',
        component: 'RateLimiter',
        platform: 'Nodejs'
      },
      {
        message: 'Application ready to serve requests',
        level: 'INFO',
        component: 'Application',
        platform: 'NestJS'
      },
      {
        // Test log without level, component and platform
        message: 'Simple log entry without metadata'
      },
      {
        message: 'Log for yesterday',
        level: 'INFO',
        component: 'TestService',
        platform: 'TestPlatform',
        date: '2024-01-14'
      }
    ];
    
    const response = await axios.post(`${BASE_URL}/api/logs/batch`, {
      logs: batchLogs
    });
    
    console.log('✅ Batch logs response:', response.data);
    
    if (response.data.results.failed > 0) {
      console.log('⚠️ Some logs failed:', response.data.results.errors);
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error sending batch logs:', error.response?.data || error.message);
  }
}

// Test function để test batch logs với lỗi
async function testBatchLogsWithErrors() {
  try {
    console.log('🔍 Testing batch logs with errors...');
    
    const batchWithErrors = [
      {
        message: 'Valid log entry',
        level: 'INFO',
        component: 'TestService',
        platform: 'TestPlatform'
      },
      {
        // Missing message - should fail
        level: 'ERROR',
        component: 'TestService',
        platform: 'TestPlatform'
      },
      {
        message: 'Another valid log',
        level: 'WARN',
        component: 'TestService',
        platform: 'NestJS'
      },
      {
        message: 'Log with invalid level',
        level: 'INVALID_LEVEL', // Should default to INFO
        component: 'TestService',
        platform: 'Express'
      }
    ];
    
    const response = await axios.post(`${BASE_URL}/api/logs/batch`, {
      logs: batchWithErrors
    });
    
    console.log('✅ Batch logs with errors response:', response.data);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error sending batch logs with errors:', error.response?.data || error.message);
  }
}

// Test function để test batch logs với quá nhiều logs
async function testBatchLogsLimit() {
  try {
    console.log('🚫 Testing batch logs limit (should fail)...');
    
    // Create 1001 logs to exceed limit
    const tooManyLogs = Array.from({ length: 1001 }, (_, i) => ({
      message: `Log entry ${i + 1}`,
      level: 'INFO',
      component: 'TestService',
      platform: 'LoadTest'
    }));
    
    const response = await axios.post(`${BASE_URL}/api/logs/batch`, {
      logs: tooManyLogs
    });
    
    console.log('❌ Should have failed but got:', response.data);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.error.includes('Maximum 1000')) {
      console.log('✅ Batch limit test passed - correctly rejected too many logs');
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Test function để test platform parameter
async function testPlatformParameter() {
  try {
    console.log('🏷️ Testing platform parameter...');
    
    const platformTests = [
      {
        message: 'Default platform test',
        level: 'INFO',
        component: 'TestService'
        // No platform - should default to 'Nodejs'
      },
      {
        message: 'Custom platform test',
        level: 'INFO', 
        component: 'TestService',
        platform: 'CustomApp'
      },
      {
        message: 'Another custom platform',
        level: 'WARN',
        component: 'TestService', 
        platform: 'MyMicroservice'
      }
    ];
    
    for (const test of platformTests) {
      const response = await axios.post(`${BASE_URL}/api/log`, test);
      console.log(`✅ Platform "${response.data.platform}" log written:`, response.data.timestamp);
    }
    
    console.log('✅ Platform parameter test completed');
    
  } catch (error) {
    console.error('❌ Error testing platform parameter:', error.response?.data || error.message);
  }
}

// Test function để xem log
async function testReadLog(date) {
  try {
    console.log(`📖 Testing read log API for date: ${date}...`);
    
    const response = await axios.get(`${BASE_URL}/api/log/${date}`);
    
    console.log('✅ Read log response:');
    console.log(`   File: ${response.data.file}`);
    console.log(`   Total lines: ${response.data.total_lines}`);
    console.log(`   Content type: ${Array.isArray(response.data.content) ? 'Array' : typeof response.data.content}`);
    
    if (Array.isArray(response.data.content)) {
      console.log('   Content preview:');
      response.data.content.slice(0, 3).forEach((line, index) => {
        console.log(`     [${index + 1}] ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
      });
      if (response.data.content.length > 3) {
        console.log(`     ... and ${response.data.content.length - 3} more lines`);
      }
    } else {
      console.log('   Content:', response.data.content);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Error reading log:', error.response?.data || error.message);
  }
}

// Test function để validate array content format
async function testLogContentArrayFormat() {
  try {
    console.log('🔍 Testing log content array format validation...');
    
    // Ghi một số logs trước
    const testLogs = [
      { message: 'Test array format log 1', level: 'INFO', component: 'TestService', platform: 'TestPlatform' },
      { message: 'Test array format log 2', level: 'DEBUG', component: 'TestService', platform: 'TestPlatform' },
      { message: 'Test array format log 3', level: 'WARN', component: 'TestService', platform: 'TestPlatform' }
    ];
    
    for (const log of testLogs) {
      await axios.post(`${BASE_URL}/api/log`, log);
    }
    
    console.log('✅ Test logs written, now reading back...');
    
    // Đọc logs
    const today = new Date().toISOString().split('T')[0];
    const response = await axios.get(`${BASE_URL}/api/log/${today}`);
    
    // Validate response format
    const data = response.data;
    console.log('✅ Validation results:');
    console.log(`   ✓ Success: ${data.success}`);
    console.log(`   ✓ Content is array: ${Array.isArray(data.content)}`);
    console.log(`   ✓ Total lines field exists: ${typeof data.total_lines === 'number'}`);
    console.log(`   ✓ Total lines matches array length: ${data.total_lines === data.content.length}`);
    
    if (Array.isArray(data.content) && data.content.length > 0) {
      console.log(`   ✓ Each line is string: ${data.content.every(line => typeof line === 'string')}`);
      console.log(`   ✓ No empty lines: ${data.content.every(line => line.trim() !== '')}`);
      
      // Check log format
      const sampleLine = data.content[data.content.length - 1]; // Last line (latest)
      const logPattern = /^\[.+\] - \d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2}:\d{2} (AM|PM)\s+\[.+\]\s+\[.+\] .+$/;
      console.log(`   ✓ Log format valid: ${logPattern.test(sampleLine)}`);
      console.log(`   ✓ Sample line: ${sampleLine.substring(0, 60)}...`);
    }
    
    console.log('✅ Array format validation completed');
    return data;
    
  } catch (error) {
    console.error('❌ Error validating array format:', error.response?.data || error.message);
  }
}

// Test function để test manual cleanup
async function testManualCleanup() {
  try {
    console.log('🧹 Testing manual cleanup API...');
    
    const response = await axios.post(`${BASE_URL}/api/logs/cleanup`);
    
    console.log('✅ Manual cleanup response:');
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Message: ${response.data.message}`);
    console.log(`   Files deleted: ${response.data.results.deleted}`);
    console.log(`   Files kept: ${response.data.results.kept}`);
    console.log(`   Errors: ${response.data.results.errors}`);
    
    if (response.data.results.deleted_files.length > 0) {
      console.log('   Deleted files:', response.data.results.deleted_files);
    }
    
    if (response.data.results.kept_files.length > 0) {
      console.log(`   Kept files (first 3): ${response.data.results.kept_files.slice(0, 3).join(', ')}`);
      if (response.data.results.kept_files.length > 3) {
        console.log(`   ... and ${response.data.results.kept_files.length - 3} more`);
      }
    }
    
    console.log('✅ Manual cleanup test completed');
    return response.data;
    
  } catch (error) {
    console.error('❌ Error testing manual cleanup:', error.response?.data || error.message);
  }
}

// Test function để tạo old logs cho test cleanup
async function createOldLogsForTesting() {
  try {
    console.log('📅 Creating old logs for cleanup testing...');
    
    // Tạo một vài logs với ngày cũ để test cleanup
    const oldDates = [
      moment().subtract(20, 'days').format('YYYY-MM-DD'),
      moment().subtract(16, 'days').format('YYYY-MM-DD'),
      moment().subtract(15, 'days').format('YYYY-MM-DD')
    ];
    
    for (const oldDate of oldDates) {
      const response = await axios.post(`${BASE_URL}/api/log`, {
        message: `Test log for cleanup testing created on ${oldDate}`,
        level: 'INFO',
        component: 'TestCleanup',
        platform: 'TestPlatform',
        date: oldDate
      });
      
      if (response.data.success) {
        console.log(`   ✓ Created old log for ${oldDate}`);
      }
    }
    
    console.log('✅ Old logs created for testing');
    
  } catch (error) {
    console.error('❌ Error creating old logs for testing:', error.response?.data || error.message);
  }
}

// Test function để lấy danh sách logs
async function testListLogs() {
  try {
    console.log('📋 Testing list logs API...');
    
    const response = await axios.get(`${BASE_URL}/api/logs`);
    
    console.log('✅ List logs response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error listing logs:', error.response?.data || error.message);
  }
}

// Test function để tải file log
async function testDownloadLog(date) {
  try {
    console.log(`📥 Testing download log API for date: ${date}...`);
    
    // Chỉ test response headers, không tải file thật
    const response = await axios.head(`${BASE_URL}/api/log/download/${date}`);
    
    console.log('✅ Download log headers:', {
      status: response.status,
      headers: response.headers
    });
    
    console.log(`💡 To download the file, visit: ${BASE_URL}/api/log/download/${date}`);
    
    return response;
  } catch (error) {
    console.error('❌ Error checking download:', error.response?.data || error.message);
  }
}

// Test function để tải tất cả logs
async function testDownloadAllLogs() {
  try {
    console.log('📦 Testing download all logs API...');
    
    // Chỉ test response headers, không tải file thật
    const response = await axios.head(`${BASE_URL}/api/logs/download-all`);
    
    console.log('✅ Download all logs headers:', {
      status: response.status,
      headers: response.headers
    });
    
    console.log(`💡 To download all logs zip file, visit: ${BASE_URL}/api/logs/download-all`);
    
    return response;
  } catch (error) {
    console.error('❌ Error checking download all logs:', error.response?.data || error.message);
  }
}

// Chạy tất cả tests
async function runAllTests() {
  console.log('🚀 Starting API tests...\n');
  
  // Test 1: Ghi log đơn
  const writeResult = await testWriteLog();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 1.5: Ghi nhiều loại logs
  await testMultipleLogs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 1.6: Batch logs
  await testBatchLogs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 1.7: Batch logs với errors
  await testBatchLogsWithErrors();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 1.8: Batch logs limit
  await testBatchLogsLimit();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 1.9: Platform parameter
  await testPlatformParameter();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: List logs
  const listResult = await testListLogs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Read log (sử dụng ngày hiện tại)
  const today = new Date().toISOString().split('T')[0];
  await testReadLog(today);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3.5: Validate array format
  await testLogContentArrayFormat();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 4: Download log
  await testDownloadLog(today);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 5: Download all logs
  await testDownloadAllLogs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 6: Create old logs for cleanup testing
  await createOldLogsForTesting();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 7: Manual cleanup
  await testManualCleanup();
  
  console.log('\n🎉 All tests completed!');
}

// Kiểm tra server có chạy không
async function checkServer() {
  try {
    const response = await axios.get(BASE_URL);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm start');
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    return;
  }
  
  await runAllTests();
}

// Chạy tests nếu file được chạy trực tiếp
if (require.main === module) {
  main();
}

module.exports = {
  testWriteLog,
  testMultipleLogs,
  testBatchLogs,
  testBatchLogsWithErrors,
  testBatchLogsLimit,
  testPlatformParameter,
  testReadLog,
  testLogContentArrayFormat,
  testManualCleanup,
  createOldLogsForTesting,
  testListLogs,
  testDownloadLog,
  testDownloadAllLogs,
  runAllTests
};
