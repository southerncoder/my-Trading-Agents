# Authentication Architecture Plan

## Current State: No Authentication (MVP)

The TradingAgents web interface currently operates without authentication for local development and single-user scenarios. This approach prioritizes rapid development and ease of use for individual traders.

### Current Security Model
- **Local Access Only**: Designed for `localhost` deployment
- **CORS Protection**: Restricts origins to prevent unauthorized access
- **Rate Limiting**: Prevents API abuse from allowed origins
- **Input Validation**: Protects against injection attacks
- **Security Headers**: Comprehensive browser security protections

## Future Authentication Phases

### Phase 1: Simple File-Based Authentication (3-6 months)

**Target Users**: Small teams, family offices, individual power users

#### Implementation Strategy
```typescript
interface SimpleAuthConfig {
  users: {
    username: string;
    passwordHash: string; // bcrypt
    role: 'admin' | 'trader' | 'viewer';
    permissions: string[];
  }[];
  sessions: {
    secret: string;
    maxAge: number; // 24 hours
    secure: boolean; // true for HTTPS
  };
}
```

#### Features
- **File-based user store**: `config/users.json` (git-ignored)
- **Session-based auth**: HTTP-only cookies with CSRF protection
- **Role-based access**: Admin, Trader, Viewer roles
- **Password requirements**: Minimum 12 characters, complexity rules
- **Session management**: Automatic logout, concurrent session limits

#### Security Measures
- **Password hashing**: bcrypt with salt rounds 12+
- **CSRF protection**: Double-submit cookie pattern
- **Session security**: HTTP-only, Secure, SameSite cookies
- **Brute force protection**: Account lockout after failed attempts
- **Audit logging**: Authentication events and access logs

#### API Changes
```typescript
// New authentication endpoints
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
POST /api/auth/change-password

// Protected endpoints require authentication
GET  /api/analysis/* (requires 'trader' or 'admin' role)
POST /api/analysis/* (requires 'trader' or 'admin' role)
GET  /api/admin/* (requires 'admin' role)
```

#### Migration Strategy
- **Backward compatibility**: Environment flag `AUTH_ENABLED=false` for no-auth mode
- **Gradual rollout**: Optional authentication with fallback to no-auth
- **User creation**: Admin CLI tool for initial user setup

### Phase 2: Database-Based Authentication (6-12 months)

**Target Users**: Medium teams, trading firms, multi-tenant scenarios

#### Implementation Strategy
```typescript
interface DatabaseAuthConfig {
  database: {
    type: 'postgresql' | 'sqlite';
    connection: string;
  };
  jwt: {
    secret: string;
    expiresIn: string; // '24h'
    refreshExpiresIn: string; // '7d'
  };
  oauth: {
    providers: ('google' | 'github' | 'microsoft')[];
    clientIds: Record<string, string>;
  };
}
```

#### Features
- **PostgreSQL integration**: User data in existing database
- **JWT tokens**: Stateless authentication with refresh tokens
- **OAuth integration**: Google, GitHub, Microsoft SSO
- **Multi-tenant support**: Organization-based user isolation
- **Advanced permissions**: Granular resource-based permissions
- **API key support**: Programmatic access for automation

#### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth-only users
  role VARCHAR(50) NOT NULL DEFAULT 'trader',
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Organizations table (multi-tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  created_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);

-- API keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  expires_at TIMESTAMP,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (for refresh tokens)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
```

#### Security Enhancements
- **JWT security**: Short-lived access tokens (15 min) with refresh tokens
- **OAuth security**: PKCE flow, state validation, secure redirects
- **API key security**: Scoped permissions, expiration, usage tracking
- **Multi-factor auth**: TOTP support for high-privilege accounts
- **Advanced audit**: Detailed access logs, suspicious activity detection

### Phase 3: Enterprise Authentication (12+ months)

**Target Users**: Large trading firms, institutional clients, compliance-heavy environments

#### Implementation Strategy
- **SAML/OIDC integration**: Enterprise SSO providers
- **LDAP/Active Directory**: Corporate directory integration
- **Advanced MFA**: Hardware tokens, biometric authentication
- **Compliance features**: SOX, PCI DSS, regulatory audit trails
- **Zero-trust architecture**: Continuous authentication, device trust

## Implementation Guidelines

### Security Best Practices

#### Password Security
```typescript
import bcrypt from 'bcrypt';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12); // High salt rounds for security
};
```

#### Session Security
```typescript
import session from 'express-session';
import { randomBytes } from 'crypto';

const sessionConfig = {
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  name: 'trading-session', // Don't use default 'connect.sid'
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.HTTPS_ENABLED === 'true', // HTTPS only
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
};
```

#### JWT Security
```typescript
import jwt from 'jsonwebtoken';

const createTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // Short-lived
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' } // Longer-lived
  );
  
  return { accessToken, refreshToken };
};
```

### Migration Considerations

#### Backward Compatibility
- **Environment flags**: `AUTH_ENABLED`, `AUTH_TYPE` for gradual migration
- **API versioning**: `/api/v1` (no auth) vs `/api/v2` (with auth)
- **Feature flags**: Progressive rollout of authentication features

#### Data Migration
- **User data import**: CSV/JSON import tools for existing user bases
- **Permission mapping**: Automatic role assignment based on usage patterns
- **Session migration**: Graceful handling of existing sessions during upgrades

#### Performance Considerations
- **Authentication caching**: Redis for session storage and user data
- **Database optimization**: Proper indexing for user queries
- **Token validation**: Efficient JWT verification with caching

## Security Threat Model

### Current Threats (No Auth)
- **Physical access**: Anyone with localhost access can use the system
- **Network exposure**: Risk if accidentally exposed beyond localhost
- **Data persistence**: All data stored locally without user isolation

### Phase 1 Threats (File-based Auth)
- **File system access**: Users file could be compromised if server is breached
- **Session hijacking**: Cookie theft in insecure environments
- **Brute force attacks**: Password guessing attempts

### Phase 2+ Threats (Database Auth)
- **Database compromise**: User credentials and session data at risk
- **Token theft**: JWT tokens could be stolen and replayed
- **OAuth vulnerabilities**: Third-party authentication risks

### Mitigation Strategies
- **Defense in depth**: Multiple security layers
- **Regular security audits**: Automated vulnerability scanning
- **Incident response**: Procedures for security breaches
- **User education**: Security best practices for end users

## Recommended Timeline

### Immediate (Current)
- ✅ **No authentication** for MVP and local development
- ✅ **Security headers** and input validation
- ✅ **HTTPS support** for secure local development

### Short Term (3-6 months)
- 🔄 **Simple file-based authentication** for small teams
- 🔄 **Session management** with secure cookies
- 🔄 **Basic role-based access control**

### Medium Term (6-12 months)
- 📋 **Database-based authentication** for scalability
- 📋 **JWT tokens** for stateless authentication
- 📋 **OAuth integration** for enterprise SSO

### Long Term (12+ months)
- 📋 **Enterprise authentication** features
- 📋 **Advanced compliance** and audit capabilities
- 📋 **Zero-trust architecture** implementation

## Configuration Examples

### Development (.env.local)
```bash
# Authentication disabled for local development
AUTH_ENABLED=false
HTTPS_ENABLED=true

# Security settings
SESSION_SECRET=your-development-secret-here
CORS_ORIGIN=https://localhost:3000
```

### Production with Simple Auth
```bash
# File-based authentication
AUTH_ENABLED=true
AUTH_TYPE=file
USERS_FILE=/app/config/users.json

# Security settings
SESSION_SECRET=your-production-secret-here
HTTPS_ENABLED=true
CORS_ORIGIN=https://your-domain.com
```

### Production with Database Auth
```bash
# Database authentication
AUTH_ENABLED=true
AUTH_TYPE=database
DATABASE_URL=postgresql://user:pass@localhost/tradingagents

# JWT settings
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# OAuth settings
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

This architecture provides a clear path from the current no-auth MVP to enterprise-grade authentication while maintaining security best practices at each phase.