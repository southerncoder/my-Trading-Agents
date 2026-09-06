# Library Research & Selection Guidelines

## Research-First Development Philosophy

**NEVER build utilities from scratch without exhaustive research.** The JavaScript/TypeScript ecosystem is vast and mature - there's almost always a well-maintained, secure library that solves your problem better than a custom implementation.

## Mandatory Research Process

### 1. Context7 Library Research
```typescript
// Before implementing ANY utility function, use Context7 tools:
// 1. Identify the functionality you need
// 2. Search for existing libraries using Context7
// 3. Evaluate multiple options
// 4. Select the most appropriate solution
```

### 2. Web Search for Best Practices
- Search for "[functionality] best practices typescript"
- Look for security considerations and common pitfalls
- Check Stack Overflow and GitHub discussions
- Review official documentation and examples

### 3. Security & Maintenance Assessment
- Check npm audit results
- Verify recent updates (within last 6 months)
- Review GitHub issues and security advisories
- Assess community support and contributor activity

## Library Categories & Recommendations

### Core Utilities
```typescript
// Date/Time manipulation
import { format, parseISO, addDays } from 'date-fns'; // ✅ Preferred
// NOT moment.js (deprecated, large bundle)

// Validation & Schema
import { z } from 'zod'; // ✅ Type-safe validation
import Joi from 'joi'; // ✅ Alternative option

// HTTP Requests
import axios from 'axios'; // ✅ Feature-rich
import fetch from 'node-fetch'; // ✅ Minimal, standards-based
```

### Async & Control Flow
```typescript
// Retry logic
import pRetry from 'p-retry'; // ✅ Promise-based retry
import { retry } from 'async-retry'; // ✅ Alternative

// Rate limiting
import pLimit from 'p-limit'; // ✅ Concurrency control
import Bottleneck from 'bottleneck'; // ✅ Advanced rate limiting

// Timeout handling
import pTimeout from 'p-timeout'; // ✅ Promise timeout wrapper
```

### Data Processing
```typescript
// Array/Object utilities
import _ from 'lodash'; // ✅ Comprehensive utilities
import { groupBy, sortBy } from 'lodash-es'; // ✅ Tree-shakeable

// Math & Statistics
import { mean, median, standardDeviation } from 'simple-statistics';
import * as math from 'mathjs'; // ✅ Advanced math operations
```

### Security Libraries
```typescript
// Input validation
import validator from 'validator'; // ✅ String validation
import DOMPurify from 'dompurify'; // ✅ HTML sanitization

// Cryptography
import bcrypt from 'bcrypt'; // ✅ Password hashing
import { randomBytes, createHash } from 'crypto'; // ✅ Built-in crypto

// JWT handling
import jwt from 'jsonwebtoken'; // ✅ JWT operations
import { SignJWT, jwtVerify } from 'jose'; // ✅ Modern alternative
```

### Financial & Trading Specific
```typescript
// Technical indicators
import { SMA, EMA, RSI, MACD } from 'technicalindicators'; // ✅ Comprehensive TA

// Market data
import yahooFinance from 'yahoo-finance2'; // ✅ Yahoo Finance API
import { AlphaVantageAPI } from 'alphavantage-ts'; // ✅ Alpha Vantage

// Number formatting
import { formatCurrency } from '@formatjs/intl'; // ✅ Internationalization
import numeral from 'numeral'; // ✅ Number formatting
```

## Research Workflow

### Step 1: Define Requirements
```markdown
## Utility Requirements
- **Functionality**: What exactly do you need?
- **Performance**: Speed and memory requirements
- **Security**: Any security considerations?
- **TypeScript**: Must have TypeScript support
- **Bundle Size**: Impact on application size
- **Dependencies**: Prefer minimal dependencies
```

### Step 2: Context7 Research
```typescript
// Use Context7 tools to research libraries:
// 1. resolve-library-id for finding libraries
// 2. get-library-docs for documentation
// 3. Compare multiple options
```

### Step 3: Security Assessment
```bash
# Check for vulnerabilities
npm audit
npx snyk test

# Check library maintenance
npm view [library-name] time
npm view [library-name] maintainers
```

### Step 4: Compatibility Testing
```typescript
// Create small test to verify:
// 1. TypeScript compatibility
// 2. ES modules support
// 3. Expected functionality
// 4. Performance characteristics
```

## Decision Matrix Template

```markdown
## Library Comparison: [Functionality]

| Library | Stars | Last Update | Bundle Size | TypeScript | Security | Score |
|---------|-------|-------------|-------------|------------|----------|-------|
| option-1| 5.2k  | 2 weeks ago | 45kb       | ✅ Native  | ✅ Clean | 9/10  |
| option-2| 12k   | 6 months ago| 120kb      | ⚠️ @types  | ⚠️ 1 vuln| 6/10  |
| option-3| 800   | 1 week ago  | 12kb       | ✅ Native  | ✅ Clean | 8/10  |

**Selected**: option-1 (best balance of features, maintenance, and security)
**Reasoning**: Active maintenance, native TypeScript, reasonable bundle size
```

## Anti-Patterns to Avoid

### ❌ Building Custom Utilities
```typescript
// DON'T create custom implementations for common needs
class CustomDateFormatter {
  format(date: Date, pattern: string): string {
    // Custom date formatting logic - likely buggy
  }
}

// DON'T reinvent retry logic
async function customRetry(fn: Function, attempts: number) {
  // Custom retry implementation - missing edge cases
}
```

### ❌ Using Deprecated Libraries
```typescript
// DON'T use deprecated or unmaintained libraries
import moment from 'moment'; // Deprecated, use date-fns
import request from 'request'; // Deprecated, use axios/fetch
```

### ❌ Ignoring Security
```typescript
// DON'T ignore security vulnerabilities
// Always run npm audit and address issues
// Don't use libraries with known security problems
```

## Documentation Requirements

### Library Selection Record
```markdown
## Library: [library-name]

### Selection Criteria
- **Functionality**: Meets all requirements
- **Security**: No known vulnerabilities
- **Maintenance**: Active development
- **Performance**: Acceptable bundle size and speed
- **TypeScript**: Native or quality type definitions

### Alternatives Considered
- **[alternative-1]**: Rejected due to [reason]
- **[alternative-2]**: Rejected due to [reason]

### Integration Notes
- **Configuration**: [any special setup]
- **Gotchas**: [known issues or limitations]
- **Update Strategy**: [how to keep current]
```

## Continuous Improvement

### Regular Library Audits
- Monthly security scans with `npm audit`
- Quarterly dependency updates
- Annual library evaluation for better alternatives
- Monitor for deprecation notices

### Performance Monitoring
- Bundle size analysis with webpack-bundle-analyzer
- Runtime performance profiling
- Memory usage monitoring
- Load time impact assessment

### Community Engagement
- Follow library maintainers on GitHub
- Subscribe to security advisories
- Participate in community discussions
- Contribute back when possible

## Emergency Exceptions

### When Custom Implementation is Acceptable
1. **No existing solution** after thorough research
2. **Security requirements** that no library meets
3. **Performance critical** path where libraries are too slow
4. **Licensing conflicts** with available libraries

### Exception Documentation
```markdown
## Custom Implementation: [utility-name]

### Research Conducted
- **Libraries Evaluated**: [list of libraries researched]
- **Rejection Reasons**: [why each was unsuitable]
- **Context7 Search**: [search terms and results]
- **Web Research**: [additional research conducted]

### Implementation Justification
- **Unique Requirements**: [what makes this case special]
- **Security Considerations**: [how security is addressed]
- **Maintenance Plan**: [how this will be maintained]
- **Future Migration**: [plan for eventual library adoption]
```

Remember: **The best code is code you don't have to write.** Always research first, implement last.