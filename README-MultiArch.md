# Excel处理工具 - 多架构Docker部署指南

## 概述

本项目是一个基于Web的Excel文件处理工具，支持文件上传、解析和按指定列拆分数据。现已支持多架构Docker镜像构建，可在不同CPU架构的设备上运行。

## 支持的架构

- **linux/amd64** - 适用于Intel/AMD x64处理器
- **linux/arm64** - 适用于ARM64处理器（如Apple M1/M2、AWS Graviton等）

## 功能特性

- 📁 Excel文件上传和解析
- 🔄 多工作表选择和处理
- ✂️ 按指定列拆分数据
- 📊 支持多种输出格式
- 💻 纯前端处理，无需后端服务
- 🌐 响应式设计，支持移动设备
- 🐳 多架构Docker支持

## 快速开始

### 方式一：使用预构建镜像（推荐）

```bash
# 拉取并运行多架构镜像
docker run -d -p 80:80 --name excel-processor excel-processor:latest

# 访问应用
open http://localhost
```

### 方式二：本地构建

```bash
# 克隆项目
git clone <repository-url>
cd excel-processor

# 构建本地镜像（当前架构）
./build-multiarch.sh --local

# 运行容器
docker run -d -p 80:80 --name excel-processor excel-processor:latest
```

### 方式三：使用Docker Compose

```bash
# 使用docker-compose启动
docker-compose -f docker-compose.multiarch.yml up -d

# 查看服务状态
docker-compose -f docker-compose.multiarch.yml ps

# 停止服务
docker-compose -f docker-compose.multiarch.yml down
```

## 多架构构建

### 构建脚本使用

项目提供了 `build-multiarch.sh` 脚本来简化多架构构建过程：

```bash
# 查看帮助
./build-multiarch.sh --help

# 构建本地镜像（当前架构）
./build-multiarch.sh --local

# 构建并推送多架构镜像
./build-multiarch.sh --push

# 指定标签构建
./build-multiarch.sh --push --tag v1.0.0

# 推送到私有仓库
./build-multiarch.sh --push --registry myregistry.com/myuser

# 自定义支持的架构
./build-multiarch.sh --push --platforms linux/amd64,linux/arm64,linux/arm/v7
```

### 手动构建

如果你想手动进行多架构构建：

```bash
# 1. 创建并使用buildx构建器
docker buildx create --name multiarch-builder --driver docker-container --bootstrap
docker buildx use multiarch-builder

# 2. 构建多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file Dockerfile.nginx \
  --tag excel-processor:latest \
  --push \
  .

# 3. 验证镜像
docker buildx imagetools inspect excel-processor:latest
```

## CI/CD 自动化

项目包含GitHub Actions工作流，可自动构建和推送多架构镜像：

### 设置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

- `DOCKER_USERNAME` - Docker Hub用户名
- `DOCKER_PASSWORD` - Docker Hub密码或访问令牌

### 触发构建

- **自动触发**：推送到 `main` 或 `master` 分支
- **标签触发**：创建以 `v` 开头的标签（如 `v1.0.0`）
- **手动触发**：在GitHub Actions页面手动运行工作流

### 工作流功能

- ✅ 多架构构建（amd64, arm64）
- ✅ 自动推送到Docker Hub
- ✅ 安全漏洞扫描
- ✅ 多架构测试验证
- ✅ 构建缓存优化

## 部署选项

### 1. 本地开发

```bash
# 启动开发服务器
python3 -m http.server 8000

# 或使用Docker
docker run -p 8000:80 excel-processor:latest
```

### 2. 生产环境

```bash
# 使用docker-compose（推荐）
docker-compose -f docker-compose.multiarch.yml up -d

# 或直接运行容器
docker run -d \
  --name excel-processor \
  --restart unless-stopped \
  -p 80:80 \
  excel-processor:latest
```

### 3. Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: excel-processor
spec:
  replicas: 2
  selector:
    matchLabels:
      app: excel-processor
  template:
    metadata:
      labels:
        app: excel-processor
    spec:
      containers:
      - name: excel-processor
        image: excel-processor:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: excel-processor-service
spec:
  selector:
    app: excel-processor
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## 性能优化

### Nginx配置优化

- ✅ Gzip压缩启用
- ✅ 静态文件缓存
- ✅ 安全头设置
- ✅ 错误页面配置

### Docker镜像优化

- ✅ 基于Alpine Linux（轻量级）
- ✅ 多阶段构建
- ✅ 最小化镜像层
- ✅ 安全最佳实践

## 监控和日志

### 健康检查

```bash
# 检查容器健康状态
docker ps

# 查看健康检查日志
docker inspect excel-processor | grep Health -A 10
```

### 日志查看

```bash
# 查看容器日志
docker logs excel-processor

# 实时跟踪日志
docker logs -f excel-processor

# 查看nginx访问日志
docker exec excel-processor tail -f /var/log/nginx/access.log
```

## 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 检查Docker buildx是否可用
   docker buildx version
   
   # 重新创建构建器
   docker buildx rm multiarch-builder
   docker buildx create --name multiarch-builder --driver docker-container --bootstrap
   ```

2. **镜像拉取失败**
   ```bash
   # 检查网络连接
   docker pull nginx:alpine
   
   # 使用代理（如果需要）
   docker build --build-arg HTTP_PROXY=http://proxy:8080 .
   ```

3. **容器启动失败**
   ```bash
   # 检查端口占用
   lsof -i :80
   
   # 使用其他端口
   docker run -p 8080:80 excel-processor:latest
   ```

### 调试模式

```bash
# 进入容器调试
docker exec -it excel-processor sh

# 检查nginx配置
docker exec excel-processor nginx -t

# 查看进程状态
docker exec excel-processor ps aux
```

## 安全考虑

- 🔒 使用非root用户运行
- 🔒 最小化攻击面
- 🔒 定期更新基础镜像
- 🔒 安全头配置
- 🔒 漏洞扫描集成

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到问题或有建议，请：

- 创建 [Issue](../../issues)
- 查看 [Wiki](../../wiki)
- 联系维护者

---

**注意**：确保您的Docker版本支持buildx功能（Docker 19.03+）以进行多架构构建。