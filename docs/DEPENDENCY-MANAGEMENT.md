# Dependency Management

## Update Commands

```bash
# Check for updates
npm run deps:check

# Update minor versions
npm run deps:update

# Security patches only
npm run deps:update:security

# Check for vulnerabilities
npm audit
```

## Security

- Security updates applied immediately
- Regular vulnerability scanning with `npm audit`
- Automated GitHub Actions security checks