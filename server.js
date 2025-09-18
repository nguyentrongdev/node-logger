const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const archiver = require('archiver');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Thư mục lưu trữ logs
const LOGS_DIR = path.join(__dirname, 'logs');

// Tạo thư mục logs nếu chưa tồn tại
fs.ensureDirSync(LOGS_DIR);

// Utility function để tạo tên file theo ngày
const getLogFileName = (date) => {
  const dateStr = moment(date).format('YYYY-MM-DD');
  return `log-${dateStr}.txt`;
};

// Utility function để tạo đường dẫn file log đầy đủ
const getLogFilePath = (date) => {
  const fileName = getLogFileName(date);
  return path.join(LOGS_DIR, fileName);
};

// Utility function để tạo timestamp theo format mới
const getFormattedTimestamp = () => {
  return moment().format('DD/MM/YYYY hh:mm:ss A');
};

// Utility function để tạo log entry theo format mới
const createLogEntry = (message, level = 'INFO', component = 'Application', platform = 'Nodejs') => {
  const timestamp = getFormattedTimestamp();
  return `[${platform}] - ${timestamp}    [${level}]  [${component}] ${message}\n`;
};

// Utility function để cleanup logs cũ hơn 2 tuần
const cleanupOldLogs = async () => {
  try {
    console.log('🧹 Starting log cleanup process...');
    
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(file => file.startsWith('log-') && file.endsWith('.txt'));
    
    if (logFiles.length === 0) {
      console.log('📝 No log files found to cleanup');
      return { deleted: 0, kept: 0, errors: [] };
    }
    
    const twoWeeksAgo = moment().subtract(14, 'days');
    const results = {
      deleted: 0,
      kept: 0,
      errors: [],
      deletedFiles: [],
      keptFiles: []
    };
    
    for (const file of logFiles) {
      try {
        const dateMatch = file.match(/log-(\d{4}-\d{2}-\d{2})\.txt/);
        if (!dateMatch) {
          results.errors.push({ file, error: 'Invalid file format' });
          continue;
        }
        
        const fileDate = moment(dateMatch[1], 'YYYY-MM-DD');
        const filePath = path.join(LOGS_DIR, file);
        
        if (fileDate.isBefore(twoWeeksAgo)) {
          // Xóa file cũ hơn 2 tuần
          await fs.unlink(filePath);
          results.deleted++;
          results.deletedFiles.push(file);
          console.log(`🗑️  Deleted old log file: ${file} (${fileDate.format('YYYY-MM-DD')})`);
        } else {
          // Giữ lại file trong vòng 2 tuần
          results.kept++;
          results.keptFiles.push(file);
        }
      } catch (error) {
        console.error(`❌ Error processing file ${file}:`, error.message);
        results.errors.push({ file, error: error.message });
      }
    }
    
    console.log(`✅ Cleanup completed: ${results.deleted} deleted, ${results.kept} kept, ${results.errors.length} errors`);
    
    // Log cleanup action
    const cleanupLogEntry = createLogEntry(
      `Log cleanup completed: ${results.deleted} files deleted, ${results.kept} files kept`,
      'INFO',
      'LogCleanup',
      'NodeLogger'
    );
    
    const today = moment().format('YYYY-MM-DD');
    const todayLogPath = getLogFilePath(today);
    await fs.appendFile(todayLogPath, cleanupLogEntry);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during log cleanup:', error);
    
    // Log error
    try {
      const errorLogEntry = createLogEntry(
        `Log cleanup failed: ${error.message}`,
        'ERROR',
        'LogCleanup',
        'NodeLogger'
      );
      
      const today = moment().format('YYYY-MM-DD');
      const todayLogPath = getLogFilePath(today);
      await fs.appendFile(todayLogPath, errorLogEntry);
    } catch (logError) {
      console.error('❌ Failed to log cleanup error:', logError);
    }
    
    throw error;
  }
};

// API 1: Ghi logger theo ngày
app.post('/api/log', async (req, res) => {
  try {
    const { message, date, level, component, platform } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Validate log level nếu được cung cấp
    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const logLevel = level && validLevels.includes(level.toUpperCase()) 
      ? level.toUpperCase() 
      : 'INFO';

    // Sử dụng ngày hiện tại nếu không có ngày được cung cấp
    const logDate = date || new Date();
    const logFilePath = getLogFilePath(logDate);
    
    // Tạo nội dung log với format mới
    const timestamp = getFormattedTimestamp();
    const logEntry = createLogEntry(message, logLevel, component, platform);
    
    // Ghi vào file (append mode)
    await fs.appendFile(logFilePath, logEntry);
    
    res.json({
      success: true,
      message: 'Log đã được ghi thành công',
      file: getLogFileName(logDate),
      timestamp: timestamp,
      level: logLevel,
      component: component || 'Application',
      platform: platform || 'Nodejs'
    });
    
  } catch (error) {
    console.error('Error writing log:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi ghi log'
    });
  }
});

// API 2: Ghi nhiều logs cùng một lúc (batch)
app.post('/api/logs/batch', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'Logs must be an array'
      });
    }

    if (logs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Logs array cannot be empty'
      });
    }

    if (logs.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 logs per batch allowed'
      });
    }

    const results = {
      total: logs.length,
      successful: 0,
      failed: 0,
      errors: [],
      files_written: new Set()
    };

    const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

    // Group logs by date để optimize file writes
    const logsByDate = new Map();

    // Validate và group logs
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      if (!log.message) {
        results.failed++;
        results.errors.push({
          index: i,
          error: 'Message is required',
          log: log
        });
        continue;
      }

      // Validate và set defaults
      const logLevel = log.level && validLevels.includes(log.level.toUpperCase()) 
        ? log.level.toUpperCase() 
        : 'INFO';
      
      const logDate = log.date || new Date();
      const component = log.component || 'Application';
      const platform = log.platform || 'Nodejs';
      
      const logEntry = createLogEntry(log.message, logLevel, component, platform);
      const dateKey = moment(logDate).format('YYYY-MM-DD');
      
      if (!logsByDate.has(dateKey)) {
        logsByDate.set(dateKey, []);
      }
      
      logsByDate.get(dateKey).push({
        index: i,
        entry: logEntry,
        level: logLevel,
        component: component,
        platform: platform
      });
    }

    // Ghi logs theo từng ngày
    for (const [dateKey, dayLogs] of logsByDate) {
      try {
        const logFilePath = getLogFilePath(dateKey);
        const logContent = dayLogs.map(log => log.entry).join('');
        
        await fs.appendFile(logFilePath, logContent);
        
        results.successful += dayLogs.length;
        results.files_written.add(getLogFileName(dateKey));
        
      } catch (error) {
        // Nếu ghi file thất bại, mark tất cả logs của ngày đó là failed
        dayLogs.forEach(log => {
          results.failed++;
          results.errors.push({
            index: log.index,
            error: `Failed to write to file: ${error.message}`,
            date: dateKey
          });
        });
      }
    }

    // Adjust successful count if there were file write errors
    results.successful = results.total - results.failed;

    const response = {
      success: results.failed === 0,
      message: `Batch log completed: ${results.successful}/${results.total} logs written successfully`,
      results: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        files_written: Array.from(results.files_written),
        timestamp: getFormattedTimestamp()
      }
    };

    // Include errors if any failed
    if (results.failed > 0) {
      response.results.errors = results.errors;
    }

    res.status(results.failed === 0 ? 200 : 207).json(response); // 207 = Multi-Status
    
  } catch (error) {
    console.error('Error in batch log:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi ghi batch logs'
    });
  }
});

// API 3: Tải file logger theo ngày
app.get('/api/log/download/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const logFilePath = getLogFilePath(date);
    
    // Kiểm tra file có tồn tại không
    if (!await fs.pathExists(logFilePath)) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy file log cho ngày ${date}`
      });
    }
    
    const fileName = getLogFileName(date);
    
    // Thiết lập headers để tải file
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'text/plain');
    
    // Gửi file
    res.sendFile(logFilePath);
    
  } catch (error) {
    console.error('Error downloading log:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi tải file log'
    });
  }
});

// API 4: Xem nội dung file logger theo ngày (optional)
app.get('/api/log/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const logFilePath = getLogFilePath(date);
    
    // Kiểm tra file có tồn tại không
    if (!await fs.pathExists(logFilePath)) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy file log cho ngày ${date}`
      });
    }
    
    // Đọc nội dung file
    const fileContent = await fs.readFile(logFilePath, 'utf8');
    
    // Chuyển content thành array, loại bỏ dòng trống
    const contentArray = fileContent
      .split('\n')
      .filter(line => line.trim() !== '');
    
    res.json({
      success: true,
      date: date,
      file: getLogFileName(date),
      content: contentArray,
      total_lines: contentArray.length
    });
    
  } catch (error) {
    console.error('Error reading log:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi đọc file log'
    });
  }
});

// API 5: Lấy danh sách các file log có sẵn
app.get('/api/logs', async (req, res) => {
  try {
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files
      .filter(file => file.startsWith('log-') && file.endsWith('.txt'))
      .map(file => {
        const dateMatch = file.match(/log-(\d{4}-\d{2}-\d{2})\.txt/);
        return {
          filename: file,
          date: dateMatch ? dateMatch[1] : null,
          path: `/api/log/${dateMatch ? dateMatch[1] : ''}`
        };
      })
      .filter(item => item.date)
      .sort((a, b) => b.date.localeCompare(a.date)); // Sắp xếp theo ngày giảm dần
    
    res.json({
      success: true,
      logs: logFiles
    });
    
  } catch (error) {
    console.error('Error listing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy danh sách log'
    });
  }
});

// API 6: Tải tất cả file logs dưới dạng ZIP
app.get('/api/logs/download-all', async (req, res) => {
  try {
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(file => file.startsWith('log-') && file.endsWith('.txt'));
    
    if (logFiles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không có file log nào để tải'
      });
    }
    
    // Tạo tên file zip với timestamp
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const zipFileName = `all-logs_${timestamp}.zip`;
    
    // Thiết lập headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    // Tạo archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });
    
    // Pipe archive data to response
    archive.pipe(res);
    
    // Xử lý lỗi
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Lỗi khi tạo file ZIP'
        });
      }
    });
    
    // Thêm các file log vào archive
    for (const file of logFiles) {
      const filePath = path.join(LOGS_DIR, file);
      if (await fs.pathExists(filePath)) {
        archive.file(filePath, { name: file });
      }
    }
    
    // Thêm file thông tin tổng hợp
    const summary = {
      generated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      total_files: logFiles.length,
      files: logFiles.map(file => {
        const dateMatch = file.match(/log-(\d{4}-\d{2}-\d{2})\.txt/);
        return {
          filename: file,
          date: dateMatch ? dateMatch[1] : null
        };
      }).filter(item => item.date).sort((a, b) => a.date.localeCompare(b.date))
    };
    
    archive.append(JSON.stringify(summary, null, 2), { name: 'logs-summary.json' });
    
    // Finalize archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Error downloading all logs:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Lỗi khi tải tất cả file log'
      });
    }
  }
});

// API 7: Manual cleanup logs cũ hơn 2 tuần
app.post('/api/logs/cleanup', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup triggered via API');
    
    const results = await cleanupOldLogs();
    
    res.json({
      success: true,
      message: 'Log cleanup completed successfully',
      results: {
        deleted: results.deleted,
        kept: results.kept,
        errors: results.errors.length,
        deleted_files: results.deletedFiles,
        kept_files: results.keptFiles,
        timestamp: getFormattedTimestamp()
      }
    });
    
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi thực hiện cleanup logs',
      message: error.message
    });
  }
});

// API 8: Xóa file log theo ngày
app.delete('/api/log/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const logFilePath = getLogFilePath(date);
    const fileName = getLogFileName(date);
    
    // Kiểm tra file có tồn tại không
    if (!await fs.pathExists(logFilePath)) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy file log cho ngày ${date}`
      });
    }
    
    // Xóa file log
    await fs.unlink(logFilePath);
    
    console.log(`🗑️ Log file deleted: ${fileName} for date ${date}`);
    
    // Log action vào file hôm nay (nếu không phải file hôm nay bị xóa)
    const today = moment().format('YYYY-MM-DD');
    if (date !== today) {
      try {
        const deleteLogEntry = createLogEntry(
          `Log file deleted: ${fileName} (${date})`,
          'INFO',
          'LogDelete',
          'NodeLogger'
        );
        
        const todayLogPath = getLogFilePath(today);
        await fs.appendFile(todayLogPath, deleteLogEntry);
      } catch (logError) {
        console.error('❌ Failed to log delete action:', logError);
        // Không throw error vì việc xóa file đã thành công
      }
    }
    
    res.json({
      success: true,
      message: `File log cho ngày ${date} đã được xóa thành công`,
      deleted_file: fileName,
      date: date,
      timestamp: getFormattedTimestamp()
    });
    
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi xóa file log',
      message: error.message
    });
  }
});

// Route gốc
app.get('/', (req, res) => {
  res.json({
    message: 'Node Logger Server',
    apis: [
      {
        method: 'POST',
        path: '/api/log',
        description: 'Ghi log mới',
        body: {
          message: 'string (required)',
          date: 'string (optional, YYYY-MM-DD format)',
          level: 'string (optional, DEBUG|INFO|WARN|ERROR|FATAL, default: INFO)',
          component: 'string (optional, default: Application)',
          platform: 'string (optional, default: Nodejs)'
        }
      },
      {
        method: 'POST',
        path: '/api/logs/batch',
        description: 'Ghi nhiều logs cùng một lúc (tối đa 1000 logs)',
        body: {
          logs: 'array (required) - Mảng các log objects với cùng structure như /api/log (bao gồm platform)'
        }
      },
      {
        method: 'GET',
        path: '/api/log/download/:date',
        description: 'Tải file log theo ngày',
        params: {
          date: 'string (YYYY-MM-DD format)'
        }
      },
      {
        method: 'GET',
        path: '/api/log/:date',
        description: 'Xem nội dung log theo ngày',
        params: {
          date: 'string (YYYY-MM-DD format)'
        }
      },
      {
        method: 'GET',
        path: '/api/logs',
        description: 'Lấy danh sách tất cả các file log'
      },
      {
        method: 'GET',
        path: '/api/logs/download-all',
        description: 'Tải tất cả file logs dưới dạng ZIP'
      },
      {
        method: 'POST',
        path: '/api/logs/cleanup',
        description: 'Manual cleanup logs cũ hơn 2 tuần'
      },
      {
        method: 'DELETE',
        path: '/api/log/:date',
        description: 'Xóa file log theo ngày',
        params: {
          date: 'string (YYYY-MM-DD format)'
        }
      }
    ]
  });
});

// Cron job: Cleanup logs cũ hơn 2 tuần mỗi ngày lúc 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Scheduled log cleanup started at', new Date().toISOString());
  try {
    await cleanupOldLogs();
    console.log('✅ Scheduled log cleanup completed successfully');
  } catch (error) {
    console.error('❌ Scheduled log cleanup failed:', error.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('📅 Cron job scheduled: Daily log cleanup at 2:00 AM (Asia/Ho_Chi_Minh)');

// Run initial cleanup on server start (optional)
setTimeout(async () => {
  console.log('🚀 Running initial log cleanup on server start...');
  try {
    await cleanupOldLogs();
    console.log('✅ Initial log cleanup completed');
  } catch (error) {
    console.error('❌ Initial log cleanup failed:', error.message);
  }
}, 5000); // Delay 5 seconds after server start

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📁 Thư mục logs: ${LOGS_DIR}`);
});

module.exports = app;
