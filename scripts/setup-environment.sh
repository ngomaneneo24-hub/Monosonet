#!/bin/bash

# Sonet Monorepo Environment Setup Script
# This script sets up the complete environment configuration system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_commands=()
    
    if ! command_exists node; then
        missing_commands+=("node")
    fi
    
    if ! command_exists npm; then
        missing_commands+=("npm")
    fi
    
    if ! command_exists docker; then
        missing_commands+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_commands+=("docker-compose")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Missing required commands: ${missing_commands[*]}"
        print_error "Please install the missing commands and try again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install client dependencies
    if [ -d "sonet-client" ]; then
        print_status "Installing sonet-client dependencies..."
        cd sonet-client && npm install && cd ..
    fi
    
    # Install gateway dependencies
    if [ -d "gateway" ]; then
        print_status "Installing gateway dependencies..."
        cd gateway && npm install && cd ..
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to setup environment files
setup_environment_files() {
    print_status "Setting up environment files..."
    
    # Create root .env if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created root .env file"
        else
            print_warning "Root .env.example not found, skipping"
        fi
    else
        print_warning "Root .env already exists, skipping"
    fi
    
    # Setup client environment
    if [ -d "sonet-client" ]; then
        if [ ! -f "sonet-client/.env" ]; then
            if [ -f "sonet-client/.env.example" ]; then
                cp sonet-client/.env.example sonet-client/.env
                print_success "Created sonet-client .env file"
            else
                print_warning "sonet-client .env.example not found, skipping"
            fi
        else
            print_warning "sonet-client .env already exists, skipping"
        fi
    fi
    
    # Setup gateway environment
    if [ -d "gateway" ]; then
        if [ ! -f "gateway/.env" ]; then
            if [ -f "gateway/.env.example" ]; then
                cp gateway/.env.example gateway/.env
                print_success "Created gateway .env file"
            else
                print_warning "gateway .env.example not found, skipping"
            fi
        else
            print_warning "gateway .env already exists, skipping"
        fi
    fi
    
    # Setup sonet environment
    if [ -d "sonet" ]; then
        if [ ! -f "sonet/.env" ]; then
            if [ -f "sonet/.env.example" ]; then
                cp sonet/.env.example sonet/.env
                print_success "Created sonet .env file"
            else
                print_warning "sonet .env.example not found, skipping"
            fi
        else
            print_warning "sonet .env already exists, skipping"
        fi
    fi
    
    print_success "Environment files setup completed"
}

# Function to run environment manager
run_environment_manager() {
    print_status "Running environment manager..."
    
    if [ -f "scripts/env-manager.js" ]; then
        node scripts/env-manager.js setup
        print_success "Environment manager completed"
    else
        print_warning "Environment manager script not found, skipping"
    fi
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment configuration..."
    
    # Check if .env files exist
    local env_files=(".env" "sonet-client/.env" "gateway/.env" "sonet/.env")
    local missing_files=()
    
    for file in "${env_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_warning "Missing environment files: ${missing_files[*]}"
        print_warning "You may need to manually create these files"
    else
        print_success "All environment files are present"
    fi
    
    # Check if required environment variables are set
    if [ -f ".env" ]; then
        print_status "Checking required environment variables..."
        
        # Source the .env file to check variables
        set -a
        source .env
        set +a
        
        local required_vars=("POSTGRES_PASSWORD" "JWT_SECRET")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if [ -z "${!var}" ]; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -ne 0 ]; then
            print_warning "Missing required environment variables: ${missing_vars[*]}"
            print_warning "Please update your .env files with these values"
        else
            print_success "Required environment variables are set"
        fi
    fi
}

# Function to setup Docker
setup_docker() {
    print_status "Setting up Docker services..."
    
    if [ -d "sonet" ] && [ -f "sonet/docker-compose.yml" ]; then
        cd sonet
        
        # Check if Docker is running
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker is not running. Please start Docker and try again."
            cd ..
            return 1
        fi
        
        # Pull images
        print_status "Pulling Docker images..."
        docker-compose pull
        
        # Start services
        print_status "Starting Docker services..."
        docker-compose up -d
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        # Check service health
        print_status "Checking service health..."
        if docker-compose ps | grep -q "Up"; then
            print_success "Docker services are running"
        else
            print_warning "Some Docker services may not be running properly"
        fi
        
        cd ..
    else
        print_warning "Docker Compose configuration not found, skipping Docker setup"
    fi
}

# Function to show next steps
show_next_steps() {
    echo
    print_success "Environment setup completed successfully!"
    echo
    echo "📝 Next steps:"
    echo "==============="
    echo
    echo "1. 🔧 Configure your environment variables:"
    echo "   - Edit .env files with your specific values"
    echo "   - Update database passwords and JWT secrets"
    echo "   - Configure external service credentials"
    echo
    echo "2. 🚀 Start the development environment:"
    echo "   npm run dev"
    echo
    echo "3. 🧪 Run tests:"
    echo "   npm test"
    echo
    echo "4. 🐳 Manage Docker services:"
    echo "   npm run docker:up      # Start services"
    echo "   npm run docker:down    # Stop services"
    echo "   npm run docker:logs    # View logs"
    echo
    echo "5. 🔍 Check environment status:"
    echo "   npm run env:status"
    echo
    echo "6. 📚 Read the documentation:"
    echo "   docs/ENVIRONMENT_CONFIGURATION.md"
    echo
    echo "⚠️  Important:"
    echo "=============="
    echo "- Change default passwords in production"
    echo "- Update JWT secrets for security"
    echo "- Configure monitoring and logging"
    echo "- Set up SSL/TLS for production"
    echo
}

# Main setup function
main() {
    echo "🚀 Sonet Monorepo Environment Setup"
    echo "=================================="
    echo
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "sonet-client" ]; then
        print_error "This script must be run from the root of the Sonet monorepo"
        exit 1
    fi
    
    # Run setup steps
    check_prerequisites
    install_dependencies
    setup_environment_files
    run_environment_manager
    validate_environment
    setup_docker
    show_next_steps
}

# Run main function
main "$@"