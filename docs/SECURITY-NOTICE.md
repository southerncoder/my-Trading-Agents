# Security Notice: LM Studio Network Configuration

## ⚠️ Important Security Considerations

### Network Configuration Security

When using network-accessible LM Studio instances, be aware of the following security considerations:

#### 1. Server IP Addresses are Sensitive
- **Never commit actual server IPs** to source control
- Use `.env.local` files (ignored by git) for actual configurations
- Use environment variables for runtime configuration
- Document examples with placeholder values only

#### 2. Network Exposure
- LM Studio network mode exposes the inference API on your network
- Ensure your network is properly secured
- Consider using VPN for remote access
- Monitor for unauthorized usage

#### 3. Configuration Files

**✅ Safe to commit:**
- `.env.example` (with placeholder values)
- Documentation with `your-server-ip` examples
- Code that reads from environment variables

**❌ NEVER commit:**
- `.env.local` files with actual IPs
- Hardcoded IP addresses in source code
- Production server configurations
- API keys or authentication tokens

#### 4. Best Practices

```powershell
# ✅ Good: Use environment variables
$env:LM_STUDIO_HOST = "your-actual-ip"
$env:LLM_BACKEND_URL = "http://your-actual-ip:1234/v1"

# ❌ Bad: Hardcoded in scripts
$backendUrl = "http://your-server-ip:1234/v1"  # Don't do this!
```

```typescript
// ✅ Good: Environment-based configuration
const host = process.env.LM_STUDIO_HOST || 'localhost';
const baseURL = `http://${host}:1234/v1`;

// ❌ Bad: Hardcoded server IP
const baseURL = 'http://your-server-ip:1234/v1';  // Don't do this!
```

#### 5. Local Development Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your actual server configuration
3. Verify `.env.local` is in `.gitignore`
4. Use `.env.local` for all local development

#### 6. Network Security Recommendations

- **Firewall**: Restrict LM Studio port (1234) to trusted networks only
- **VPN**: Use VPN for remote access to inference servers
- **Monitoring**: Monitor access logs for unauthorized usage
- **Authentication**: Consider adding authentication layer if available
- **Encryption**: Use HTTPS if supported by your LM Studio setup

#### 7. Team Collaboration

When working in teams:
- Share configuration templates, not actual configurations
- Document setup process without revealing server details
- Use placeholder values in all shared documentation
- Each developer maintains their own `.env.local`

## Files Ignored by Git

The following files are automatically ignored and safe for sensitive configuration:

```
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## Quick Security Check

Before committing, verify:
- [ ] No actual IP addresses in committed files
- [ ] No hardcoded server URLs in source code
- [ ] `.env.local` is ignored by git
- [ ] Documentation uses placeholder examples only
- [ ] Environment variables are used for all server configuration