# Node Logger Server

Server Node.js đơn giản để ghi và tải file logger theo ngày.

## Cài đặt

### Cách 1: Chạy trực tiếp với Node.js

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy server:
```bash
npm start
# hoặc
npm run dev  # để chạy với nodemon
```

Server sẽ chạy tại `http://localhost:4005`

### Cách 2: Chạy với Docker 🐳

#### Sử dụng Docker Script (Khuyến nghị) 🚀

**docker-up.sh** - Script tự động với resource limits:

```bash
# Chạy container với resource limits
./docker-up.sh

# Hoặc các commands khác
./docker-up.sh stop        # Dừng container
./docker-up.sh logs        # Xem logs
./docker-up.sh stats       # Check resource usage
./docker-up.sh status      # Container status
./docker-up.sh remove      # Xóa container
./docker-up.sh rebuild     # Rebuild và restart
./docker-up.sh help        # Xem help
```

**Resource Limits:**
- **CPU**: 0.5 (50% của 1 core)
- **Memory**: 1GB (reserved: 128MB)
- **Auto-restart**: unless-stopped
- **Health checks**: Built-in health monitoring

#### Sử dụng Docker Compose

```bash
# Start basic service
docker compose up -d

# Xem logs
docker compose logs -f

# Stop
docker compose down
```

#### Sử dụng Makefile

```bash
# Xem tất cả commands có sẵn
make help

# Start với docker script (recommended)
make script

# Build và start với docker compose
make up

# Xem logs
make logs

# Stop
make down

# Restart
make restart

# Check resource usage
make stats

# Clean up
make clean
```

#### Sử dụng Docker trực tiếp

1. Build image:
```bash
docker build -t node-logger .
```

2. Chạy container với resource limits:
```bash
docker run -d \
  --name node-logger-app \
  --cpus="0.5" \
  --memory="1g" \
  --memory-reservation="128m" \
  -p 4005:4005 \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=4005 \
  --restart unless-stopped \
  --health-cmd="curl -f http://localhost:4005/ || exit 1" \
  --health-interval=30s \
  node-logger
```

3. Xem logs container:
```bash
docker logs -f node-logger-app
```

4. Check resource usage:
```bash
docker stats node-logger-app
```

5. Dừng container:
```bash
docker stop node-logger-app
docker rm node-logger-app
```

## API Endpoints

### 1. Ghi Logger
**POST** `/api/log`

Ghi một dòng log mới vào file theo ngày.

**Body:**
```json
{
  "message": "Starting Nest application...",
  "date": "2024-01-15",        // optional, mặc định là ngày hiện tại
  "level": "INFO",             // optional, DEBUG|INFO|WARN|ERROR|FATAL, mặc định INFO
  "component": "NestFactory",  // optional, mặc định Application
  "platform": "NestJS"        // optional, mặc định Nodejs
}
```

**Response:**
```json
{
  "success": true,
  "message": "Log đã được ghi thành công",
  "file": "log-2024-01-15.txt",
  "timestamp": "18/09/2025 11:15:41 AM",
  "level": "INFO",
  "component": "NestFactory",
  "platform": "NestJS"
}
```

### 2. Ghi Nhiều Logs Cùng Lúc (Batch)
**POST** `/api/logs/batch`

Ghi nhiều logs cùng một lúc để tối ưu performance.

**Body:**
```json
{
  "logs": [
    {
      "message": "Application bootstrap started",
      "level": "INFO",
      "component": "Bootstrap",
      "platform": "NestJS"
    },
    {
      "message": "Database connection established",
      "level": "DEBUG", 
      "component": "DatabaseModule",
      "platform": "PostgreSQL"
    },
    {
      "message": "User authentication failed",
      "level": "WARN",
      "component": "AuthService",
      "platform": "Express"
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Batch log completed: 3/3 logs written successfully",
  "results": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "files_written": ["log-2024-01-15.txt"],
    "timestamp": "18/09/2025 11:20:30 AM"
  }
}
```

**Response (Partial Success):**
```json
{
  "success": false,
  "message": "Batch log completed: 2/3 logs written successfully", 
  "results": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "files_written": ["log-2024-01-15.txt"],
    "timestamp": "18/09/2025 11:20:30 AM",
    "errors": [
      {
        "index": 1,
        "error": "Message is required",
        "log": {"level": "ERROR", "component": "TestService"}
      }
    ]
  }
}
```

**Giới hạn:**
- Tối đa 1000 logs per batch
- Mỗi log tuân theo cùng validation rules như `/api/log`
- Logs được group theo ngày để optimize file writes
- Return HTTP 207 (Multi-Status) nếu có logs failed

### 3. Tải File Logger
**GET** `/api/log/download/:date`

Tải file log theo ngày (format: YYYY-MM-DD).

**Ví dụ:**
```
GET http://localhost:4005/api/log/download/2024-01-15
```

### 4. Xem Nội Dung Logger
**GET** `/api/log/:date`

Xem nội dung file log theo ngày. Trả về content dưới dạng array cho dễ xử lý từng dòng log.

**Lợi ích của Array format:**
- Dễ dàng iterate qua từng dòng log
- Không cần split string manually
- Tự động loại bỏ dòng trống
- Có thêm `total_lines` để biết số dòng log

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15",
  "file": "log-2024-01-15.txt",
  "content": [
    "[NestJS] - 18/09/2025 11:15:41 AM    [INFO]  [NestFactory] Starting Nest application...",
    "[PostgreSQL] - 18/09/2025 11:16:02 AM    [DEBUG]  [DatabaseModule] Database connection established",
    "[Express] - 18/09/2025 11:16:15 AM    [WARN]  [AuthService] Invalid authentication attempt"
  ],
  "total_lines": 3
}
```

### 5. Danh Sách File Logs
**GET** `/api/logs`

Lấy danh sách tất cả các file log có sẵn.

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "filename": "log-2024-01-15.txt",
      "date": "2024-01-15",
      "path": "/api/log/2024-01-15"
    }
  ]
}
```

### 6. Tải Tất Cả File Logs
**GET** `/api/logs/download-all`

Tải tất cả file logs dưới dạng file ZIP.

**Tính năng:**
- Tự động tạo file ZIP chứa tất cả logs
- Bao gồm file `logs-summary.json` với thông tin tổng hợp
- Tên file ZIP có format: `all-logs_YYYY-MM-DD_HH-mm-ss.zip`

**Ví dụ:**
```
GET http://localhost:4005/api/logs/download-all
```

### 7. Manual Cleanup Logs Cũ
**POST** `/api/logs/cleanup`

Thực hiện cleanup manual để xóa logs cũ hơn 2 tuần.

**Response:**
```json
{
  "success": true,
  "message": "Log cleanup completed successfully",
  "results": {
    "deleted": 5,
    "kept": 14,
    "errors": 0,
    "deleted_files": [
      "log-2024-08-15.txt",
      "log-2024-08-16.txt"
    ],
    "kept_files": [
      "log-2024-09-01.txt",
      "log-2024-09-02.txt"
    ],
    "timestamp": "18/09/2025 11:30:15 AM"
  }
}
```

**Tính năng:**
- Xóa tự động logs cũ hơn 2 tuần (14 ngày)
- Trả về chi tiết files đã xóa và giữ lại
- Tự động log cleanup action vào file log hiện tại
- Safe operation với error handling cho từng file

### 8. Xóa File Log Theo Ngày
**DELETE** `/api/log/:date`

Xóa file log theo ngày cụ thể (format: YYYY-MM-DD).

**Tính năng:**
- Validate date format trước khi xóa
- Kiểm tra file có tồn tại không
- Tự động log action xóa vào file log hôm nay (nếu không phải xóa file hôm nay)
- Error handling an toàn

**Ví dụ:**
```
DELETE http://localhost:4005/api/log/2024-01-15
```

**Response (Success):**
```json
{
  "success": true,
  "message": "File log cho ngày 2024-01-15 đã được xóa thành công",
  "deleted_file": "log-2024-01-15.txt",
  "date": "2024-01-15",
  "timestamp": "18/09/2025 11:45:20 AM"
}
```

**Response (File không tồn tại):**
```json
{
  "success": false,
  "error": "Không tìm thấy file log cho ngày 2024-01-15"
}
```

**Response (Date format không hợp lệ):**
```json
{
  "success": false,
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

**⚠️ Lưu ý:**
- **Xóa vĩnh viễn**: File log sẽ bị xóa hoàn toàn, không thể khôi phục
- **Auto logging**: Action xóa sẽ được ghi vào log file hôm nay
- **Safe deletion**: Chỉ xóa nếu file tồn tại và format date hợp lệ
- **Immediate effect**: File sẽ bị xóa ngay lập tức

## Ví dụ sử dụng

### Ghi log mới:
```bash
# Log cơ bản
curl -X POST http://localhost:4005/api/log \
  -H "Content-Type: application/json" \
  -d '{"message": "Server started successfully"}'

# Log với level, component và platform
curl -X POST http://localhost:4005/api/log \
  -H "Content-Type: application/json" \
  -d '{"message": "Starting Nest application...", "level": "INFO", "component": "NestFactory", "platform": "NestJS"}'

# Log lỗi
curl -X POST http://localhost:4005/api/log \
  -H "Content-Type: application/json" \
  -d '{"message": "Database connection failed", "level": "ERROR", "component": "DatabaseModule"}'
```

### Ghi batch logs:
```bash
curl -X POST http://localhost:4005/api/logs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "message": "Application bootstrap started",
        "level": "INFO",
        "component": "Bootstrap",
        "platform": "NestJS"
      },
      {
        "message": "Database connection established", 
        "level": "DEBUG",
        "component": "DatabaseModule",
        "platform": "PostgreSQL"
      },
      {
        "message": "Authentication failed for user",
        "level": "WARN",
        "component": "AuthService",
        "platform": "Express"
      }
    ]
  }'
```

### Tải file log:
```bash
curl -O http://localhost:4005/api/log/download/2024-01-15
```

### Xem nội dung log:
```bash
curl http://localhost:4005/api/log/2024-01-15
```

### Tải tất cả logs dưới dạng ZIP:
```bash
curl -O http://localhost:4005/api/logs/download-all
```

### Manual cleanup logs cũ:
```bash
curl -X POST http://localhost:4005/api/logs/cleanup
```

### Xóa file log theo ngày:
```bash
# Xóa log ngày 15/01/2024
curl -X DELETE http://localhost:4005/api/log/2024-01-15

# Ví dụ với verbose để xem response chi tiết
curl -v -X DELETE http://localhost:4005/api/log/2024-01-15
```

## Cấu trúc thư mục

```
node-logger/
├── server.js              # Main server file
├── package.json           # Dependencies
├── README.md              # Documentation
├── test-api.js            # Test script
├── Dockerfile             # Docker image configuration
├── docker-compose.yml     # Docker Compose configuration
├── docker-up.sh           # Docker run script với resource limits
├── nginx.conf             # Nginx reverse proxy config (optional)
├── Makefile               # Docker commands shortcuts
├── .dockerignore          # Docker ignore rules
├── .gitignore             # Git ignore rules
└── logs/                  # Thư mục chứa các file log
    ├── log-2024-01-15.txt
    ├── log-2024-01-16.txt
    └── ...
```

## Ghi chú

### Ứng dụng
- File logs được lưu trong thư mục `logs/` với format tên file: `log-YYYY-MM-DD.txt`
- **Format log mới**: `[Platform] - DD/MM/YYYY HH:mm:ss AM/PM    [LEVEL]  [Component] message`
- **Platform**: Tùy chỉnh tên service/platform (mặc định: Nodejs)
- **Log levels hỗ trợ**: DEBUG, INFO, WARN, ERROR, FATAL (mặc định: INFO)
- **Components**: Tùy chỉnh theo module/service (mặc định: Application)
- **Batch logging**: Ghi tối đa 1000 logs cùng lúc với `/api/logs/batch`
- **Array content**: API `/api/log/:date` trả về content dưới dạng array với `total_lines`
- **Auto cleanup**: Cron job tự động xóa logs cũ hơn 2 tuần mỗi ngày lúc 2:00 AM
- **Manual cleanup**: API `/api/logs/cleanup` để cleanup manual bất kỳ lúc nào
- **Single log deletion**: API `DELETE /api/log/:date` để xóa file log theo ngày cụ thể
- **Performance**: Logs được group theo ngày để optimize file I/O
- Server tự động tạo thư mục `logs/` nếu chưa tồn tại
- Date format phải là YYYY-MM-DD

**Ví dụ format log:**
```
[NestJS] - 18/09/2025 11:15:41 AM    [INFO]  [NestFactory] Starting Nest application...
[PostgreSQL] - 18/09/2025 11:16:02 AM    [DEBUG]  [DatabaseModule] Database connection established
[Express] - 18/09/2025 11:16:15 AM    [WARN]  [AuthService] Invalid authentication attempt
[Docker] - 18/09/2025 11:16:30 AM    [ERROR]  [SystemCore] Critical system error occurred
[Nodejs] - 18/09/2025 11:17:00 AM    [INFO]  [Application] Default platform example
```

### Docker
- **Multi-stage build**: Optimized Docker image với Node.js Alpine
- **Volume mapping**: Logs được persist ra host qua volume mapping
- **Health checks**: Tự động kiểm tra tình trạng container
- **Security**: Chạy với non-root user (node)
- **Resource limits**: 0.5 CPU, 1GB RAM với memory reservation 128MB
- **Docker script**: `docker-up.sh` để easy deployment với resource limits
- **Auto-restart**: unless-stopped policy cho production stability
- **Production ready**: Environment variables và health monitoring

### Automatic Cleanup & Cron Jobs
- 🕐 **Scheduled cleanup**: Tự động xóa logs cũ hơn 2 tuần mỗi ngày lúc 2:00 AM
- 🌏 **Timezone**: Sử dụng Asia/Ho_Chi_Minh timezone
- 🚀 **Initial cleanup**: Chạy cleanup một lần khi server khởi động
- 📝 **Self-logging**: Cleanup actions được log vào file log hiện tại
- 🛡️ **Error handling**: Safe operation với xử lý lỗi từng file
- 📊 **Detailed reports**: API cleanup trả về chi tiết files xóa/giữ lại

### Tính năng Docker
- 🐳 **Containerized**: Dễ dàng deploy trên bất kỳ môi trường nào
- 📁 **Data persistence**: Logs được lưu trữ bền vững qua volume mapping
- 🔄 **Auto restart**: Tự động khởi động lại khi có lỗi (unless-stopped)
- 🏥 **Health monitoring**: Built-in health checks với curl
- 📊 **Resource control**: CPU và memory limits để prevent resource abuse
- ⚡ **Fast startup**: Alpine Linux cho size nhỏ và khởi động nhanh
- 🧹 **Auto cleanup**: Cron job chạy bên trong container để maintain logs
- 🚀 **Easy deployment**: docker-up.sh script cho one-command deployment
