# Sử dụng Node.js 18 LTS làm base image
FROM node:18-alpine

# Thiết lập thông tin metadata
LABEL maintainer="Node Logger App"
LABEL description="Node.js server với API ghi logger theo ngày và tải file logger"

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production && npm cache clean --force

# Sao chép source code
COPY . .

# Tạo thư mục logs với quyền phù hợp
RUN mkdir -p logs && chown -R node:node logs

# Chuyển sang user node để tăng bảo mật
USER node

# Expose port
EXPOSE 4005

# Thiết lập health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4005/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Command để chạy ứng dụng
CMD ["npm", "start"]
