# 🚀 Quick Start: Sonet Environment Configuration

## **⚡ 5-Minute Setup**

Get your Sonet monorepo environment up and running in just 5 minutes!

### **1. 🎯 One-Command Setup**

```bash
# Run the environment setup
npm run env:setup
```

This will:
- ✅ Generate all service `.env.example` files
- ✅ Create environment templates for client, gateway, and services
- ✅ Show you the current status

### **2. 🔧 Configure Your Environment**

```bash
# Copy environment templates to actual .env files
cp .env.example .env
cp sonet-client/.env.example sonet-client/.env
cp gateway/.env.example gateway/.env
cp sonet/.env.example sonet/.env
```

### **3. ⚙️ Update Key Variables**

Edit your `.env` files and update these **required** values:

```bash
# Root .env
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secret_jwt_key_here

# sonet-client/.env
EXPO_PUBLIC_SONET_API_BASE=http://localhost:8080/api
EXPO_PUBLIC_SONET_WS_BASE=ws://localhost:8080

# gateway/.env
JWT_SECRET=your_super_secret_jwt_key_here
GATEWAY_PORT=8080

# sonet/.env
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_super_secret_jwt_key_here
```

### **4. 🚀 Start Development**

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:client      # React Native client
npm run dev:gateway     # API Gateway
npm run dev:services    # C++ microservices
```

## **🔍 Check Status**

```bash
# View environment configuration status
npm run env:status

# Regenerate environment files
npm run env:generate
```

## **🐳 Docker Services**

```bash
# Start microservices
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## **📱 What You Get**

- **Client**: React Native app with Sonet API integration
- **Gateway**: Express.js API gateway with JWT auth
- **Services**: C++ microservices (users, notes, messaging, etc.)
- **Database**: PostgreSQL with Redis caching
- **Real-time**: WebSocket support for live updates

## **⚠️ Important Notes**

- **Change default passwords** before going to production
- **Update JWT secrets** for security
- **Configure external services** (Sentry, Firebase, etc.)
- **Set up SSL/TLS** for production deployments

## **🆘 Need Help?**

- 📚 Full documentation: `docs/ENVIRONMENT_CONFIGURATION.md`
- 🔧 Environment manager: `scripts/env-manager-simple.js`
- 🐳 Docker setup: `sonet/docker-compose.yml`

## **🎉 You're Ready!**

Your Sonet monorepo is now configured and ready for development. The environment system provides:

- **Unified configuration** across all services
- **Environment-specific settings** (dev/staging/prod)
- **Security best practices** with validation
- **Easy management** with npm scripts
- **Production-ready** deployment templates

Happy coding! 🚀