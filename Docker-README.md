# Excel处理工具 - Docker部署指南

本项目已成功容器化，使用nginx作为Web服务器来提供静态文件服务。

## 文件说明

- `Dockerfile.nginx` - 基于nginx的Docker镜像构建文件
- `nginx.conf` - nginx配置文件，包含gzip压缩和缓存优化
- `.dockerignore` - Docker构建时排除的文件列表

## 构建Docker镜像

```bash
docker build -f Dockerfile.nginx -t excel-processor-nginx .
```

## 运行Docker容器

```bash
# 运行容器，映射到8081端口
docker run -d -p 8081:80 --name excel-processor-nginx-container excel-processor-nginx
```

## 访问应用

容器启动后，可以通过以下地址访问应用：
- http://localhost:8081

## 容器管理命令

```bash
# 查看运行中的容器
docker ps

# 停止容器
docker stop excel-processor-nginx-container

# 启动容器
docker start excel-processor-nginx-container

# 删除容器
docker rm excel-processor-nginx-container

# 删除镜像
docker rmi excel-processor-nginx

# 查看容器日志
docker logs excel-processor-nginx-container
```

## 功能特性

✅ **静态文件服务** - 使用nginx高效服务HTML、CSS、JS文件
✅ **Gzip压缩** - 自动压缩文本文件，减少传输大小
✅ **缓存优化** - 静态资源缓存1年，HTML文件缓存1小时
✅ **安全头部** - 添加安全相关的HTTP头部
✅ **错误处理** - 404和5xx错误自动重定向到主页
✅ **响应式设计** - 支持各种设备访问

## 技术栈

- **Web服务器**: nginx:alpine
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **Excel处理**: SheetJS库
- **容器化**: Docker

## 镜像大小优化

- 使用alpine基础镜像，减少镜像大小
- 通过.dockerignore排除不必要的文件
- 仅包含必要的静态文件

## 生产环境建议

1. **端口配置**: 生产环境建议使用80或443端口
2. **SSL证书**: 配置HTTPS证书提高安全性
3. **反向代理**: 可以配置在负载均衡器后面
4. **监控**: 添加健康检查和日志监控
5. **备份**: 定期备份重要数据