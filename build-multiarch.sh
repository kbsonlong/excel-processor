#!/bin/bash

# Excel处理工具多架构Docker镜像构建脚本
# 支持架构: linux/amd64, linux/arm64

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
IMAGE_NAME="excel-processor"
TAG="latest"
REGISTRY="" # 留空表示使用Docker Hub，或设置为你的私有仓库
PLATFORMS="linux/amd64,linux/arm64"
DOCKERFILE="Dockerfile.nginx"

# 函数：打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查Docker buildx是否可用
check_buildx() {
    print_info "检查Docker buildx支持..."
    if ! docker buildx version >/dev/null 2>&1; then
        print_error "Docker buildx不可用，请确保Docker版本支持buildx"
        exit 1
    fi
    print_success "Docker buildx可用"
}

# 函数：创建并使用buildx构建器
setup_builder() {
    print_info "设置多架构构建器..."
    
    # 创建新的构建器实例
    BUILDER_NAME="multiarch-builder"
    
    # 检查构建器是否已存在
    if docker buildx ls | grep -q "$BUILDER_NAME"; then
        print_info "构建器 $BUILDER_NAME 已存在，使用现有构建器"
    else
        print_info "创建新的构建器 $BUILDER_NAME"
        docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
    fi
    
    # 使用构建器
    docker buildx use $BUILDER_NAME
    print_success "构建器设置完成"
}

# 函数：构建多架构镜像
build_multiarch() {
    print_info "开始构建多架构镜像..."
    print_info "支持的架构: $PLATFORMS"
    print_info "镜像名称: $IMAGE_NAME:$TAG"
    
    # 构建完整的镜像名称
    FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
    if [ -n "$REGISTRY" ]; then
        FULL_IMAGE_NAME="$REGISTRY/$FULL_IMAGE_NAME"
    fi
    
    # 执行多架构构建
    docker buildx build \
        --platform $PLATFORMS \
        --file $DOCKERFILE \
        --tag $FULL_IMAGE_NAME \
        --push \
        .
    
    print_success "多架构镜像构建完成: $FULL_IMAGE_NAME"
}

# 函数：构建并加载到本地（仅支持当前架构）
build_local() {
    print_info "构建本地镜像（当前架构）..."
    
    # 获取当前架构
    CURRENT_ARCH=$(docker version --format '{{.Server.Arch}}')
    CURRENT_PLATFORM="linux/$CURRENT_ARCH"
    
    print_info "当前架构: $CURRENT_PLATFORM"
    
    # 构建并加载到本地
    docker buildx build \
        --platform $CURRENT_PLATFORM \
        --file $DOCKERFILE \
        --tag $IMAGE_NAME:$TAG \
        --load \
        .
    
    print_success "本地镜像构建完成: $IMAGE_NAME:$TAG"
}

# 函数：显示帮助信息
show_help() {
    echo "Excel处理工具多架构Docker镜像构建脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -l, --local         仅构建本地镜像（当前架构）"
    echo "  -p, --push          构建并推送多架构镜像到仓库"
    echo "  -t, --tag TAG       指定镜像标签（默认: latest）"
    echo "  -r, --registry REG  指定镜像仓库（默认: Docker Hub）"
    echo "  --platforms PLAT    指定支持的平台（默认: linux/amd64,linux/arm64）"
    echo ""
    echo "示例:"
    echo "  $0 --local                    # 构建本地镜像"
    echo "  $0 --push                     # 构建并推送多架构镜像"
    echo "  $0 --push --tag v1.0.0        # 构建并推送指定标签的镜像"
    echo "  $0 --push --registry myregistry.com/myuser  # 推送到私有仓库"
}

# 主函数
main() {
    local BUILD_MODE="local"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--local)
                BUILD_MODE="local"
                shift
                ;;
            -p|--push)
                BUILD_MODE="push"
                shift
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            --platforms)
                PLATFORMS="$2"
                shift 2
                ;;
            *)
                print_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    print_info "=== Excel处理工具多架构Docker构建 ==="
    print_info "构建模式: $BUILD_MODE"
    print_info "镜像标签: $TAG"
    
    # 检查Docker buildx
    check_buildx
    
    if [ "$BUILD_MODE" = "push" ]; then
        # 检查是否已登录Docker仓库
        if [ -n "$REGISTRY" ]; then
            print_warning "请确保已登录到仓库: $REGISTRY"
        else
            print_warning "请确保已登录到Docker Hub"
        fi
        
        setup_builder
        build_multiarch
        
        print_success "多架构镜像已成功构建并推送！"
        print_info "可以在不同架构的机器上使用以下命令运行:"
        if [ -n "$REGISTRY" ]; then
            print_info "docker run -p 80:80 $REGISTRY/$IMAGE_NAME:$TAG"
        else
            print_info "docker run -p 80:80 $IMAGE_NAME:$TAG"
        fi
    else
        setup_builder
        build_local
        
        print_success "本地镜像构建完成！"
        print_info "使用以下命令运行:"
        print_info "docker run -p 80:80 $IMAGE_NAME:$TAG"
    fi
}

# 执行主函数
main "$@"