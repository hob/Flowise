# Session Secret Migration Strategy

This document explains the implementation of secure session secret management and migration strategy for Flowise.

## Overview

The previous implementation used a predictable default session secret (`"flowise"`), which is a security vulnerability. This migration strategy ensures:

1. **Secure Session Secrets**: All session secrets are cryptographically secure (32+ bytes)
2. **Seamless Migration**: Existing user sessions are not lost during secret rotation
3. **Multiple Storage Options**: Support for environment variables, file system, and AWS Secrets Manager
4. **Fail-Safe Validation**: Server fails to start if no secure session secret is available

## Implementation Details

### 1. Session Secret Management (`packages/server/src/utils/sessionSecretManager.ts`)

The `sessionSecretManager` provides secure session secret generation and retrieval:

- **Generation**: Uses `crypto.randomBytes(32)` for cryptographically secure secrets
- **Storage Priority**:
  1. Environment variable `EXPRESS_SESSION_SECRET`
  2. AWS Secrets Manager (if configured)
  3. File system (`~/.flowise/session.secret`)
- **Auto-Generation**: Creates secure secrets if none exist
- **Validation**: Ensures secrets are secure (not default "flowise", minimum 32 characters)

### 2. Session Migration Middleware (`packages/server/src/enterprise/middleware/passport/sessionMigration.ts`)

The migration middleware handles seamless session migration:

- **Detection**: Identifies sessions encrypted with old secrets
- **Regeneration**: Automatically regenerates sessions with new secret
- **Store Wrapper**: Provides migration capabilities for all session stores (Redis, MySQL, PostgreSQL, SQLite)
- **Error Handling**: Graceful fallback if migration fails

### 3. Updated Passport Middleware (`packages/server/src/enterprise/middleware/passport/index.ts`)

The main passport middleware now:

- **Validates Secrets**: Fails to start if no secure session secret is available
- **Uses Migration**: Wraps session stores with migration capabilities
- **Stores Previous**: Maintains previous secret for migration purposes

## Migration Strategy

### Phase 1: Preparation
1. Deploy the new code with migration support
2. The system will automatically generate a secure session secret if none exists
3. Existing sessions continue to work with the old secret

### Phase 2: Migration
1. When users make requests, the migration middleware detects old sessions
2. Sessions are automatically regenerated with the new secret
3. Users experience no interruption in service

### Phase 3: Cleanup
1. After a reasonable period (e.g., 30 days), old session files can be cleaned up
2. The migration middleware can be removed in future versions

## Configuration Options

### Environment Variables

```bash
# Option 1: Direct secret (recommended for development)
EXPRESS_SESSION_SECRET=your_secure_64_character_hex_string

# Option 2: AWS Secrets Manager (recommended for production)
SECRETKEY_STORAGE_TYPE=aws
SECRETKEY_AWS_REGION=us-east-1
SECRETKEY_AWS_ACCESS_KEY=your_access_key
SECRETKEY_AWS_SECRET_KEY=your_secret_key
SECRETKEY_AWS_NAME=FlowiseSessionSecret  # Optional, defaults to this
SECRETKEY_AWS_SESSION_SECRET=FlowiseSessionSecret # Optional, defaults to this
```

### File System Storage

If neither environment variable nor AWS Secrets Manager is configured, the system will:
1. Generate a secure session secret
2. Store it in `~/.flowise/session.secret`
3. Use this secret for all sessions

## Security Considerations

1. **Secret Rotation**: The system supports easy secret rotation by updating the stored secret
2. **Migration Safety**: Old sessions are gracefully migrated without data loss
3. **Validation**: Server refuses to start with insecure secrets
4. **Storage Security**: Secrets are stored securely based on your chosen method

## Deployment Recommendations

### Development
```bash
# Generate a secure secret
node packages/server/scripts/generateSecretValue.js

# Set as environment variable
export EXPRESS_SESSION_SECRET=generated_secret_here
```

### Production
1. **Use AWS Secrets Manager** for centralized secret management
2. **Rotate secrets regularly** (e.g., every 90 days)
3. **Monitor migration logs** to ensure smooth transitions
4. **Test in staging** before production deployment

## Troubleshooting

### Server Won't Start
```
Error: EXPRESS_SESSION_SECRET must be set to a secure value...
```
**Solution**: Set a secure session secret using one of the configuration methods above.

### Sessions Not Migrating
- Check logs for migration errors
- Ensure previous secret is stored correctly
- Verify session store configuration

### AWS Secrets Manager Issues
- Verify AWS credentials and permissions
- Check region configuration
- Ensure secret exists or can be created

## Rollback Strategy

If issues occur during migration:

1. **Immediate**: Revert to previous code version
2. **Sessions**: Existing sessions will continue to work with old secret
3. **Cleanup**: Remove any new secret files if needed
4. **Investigation**: Debug issues before re-attempting migration

## Future Enhancements

1. **Automatic Secret Rotation**: Implement scheduled secret rotation
2. **Migration Metrics**: Add monitoring for migration success rates
3. **Multiple Secret Support**: Support for multiple previous secrets during extended migration periods
4. **Health Checks**: Add health check endpoints for secret validation

## Testing

The migration strategy has been designed to be safe and non-disruptive:

- **Backward Compatibility**: Old sessions continue to work
- **Forward Compatibility**: New sessions use secure secrets
- **Graceful Degradation**: System continues to function even if migration fails
- **No Data Loss**: User sessions are preserved throughout migration
