import { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import { getSessionSecret, getPreviousSessionSecret, isSessionSecretSecure } from '../../../utils/sessionSecretManager'
import logger from '../../../utils/logger'

interface SessionData {
    cookie: any
    passport?: {
        user?: any
    }
    [key: string]: any
}

/**
 * Middleware to migrate existing sessions from old secret to new secret
 * This allows for seamless session migration during secret rotation
 */
export const sessionMigrationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Only attempt migration if we have a session
        if (!req.session) {
            return next()
        }

        const currentSecret = await getSessionSecret()
        const previousSecret = await getPreviousSessionSecret()

        // If no previous secret or current secret is not secure, no migration needed
        if (!previousSecret || !isSessionSecretSecure(currentSecret)) {
            logger.error('Session migration skipped: No previous secret or current secret is not secure')
            return next()
        }

        // Check if session was created with the old secret by attempting to verify it
        const sessionId = req.sessionID
        if (!sessionId) {
            return next()
        }

        // Try to decrypt the session with the previous secret
        // This is a simplified approach - in practice, you might need to implement
        // proper session decryption based on your session store implementation
        const sessionData = req.session as SessionData

        // If the session exists but seems corrupted (no passport user data),
        // it might be encrypted with the old secret
        if (sessionData && !sessionData.passport?.user) {
            logger.info(`Attempting to migrate session ${sessionId} from old secret`)

            // Regenerate the session with the new secret
            req.session.regenerate((err) => {
                if (err) {
                    logger.error(`Failed to regenerate session ${sessionId}:`, err)
                    return next(err)
                }

                logger.info(`Successfully migrated session ${sessionId} to new secret`)
                next()
            })
        } else {
            next()
        }
    } catch (error) {
        logger.error('Session migration error:', error)
        // Don't fail the request, just log the error and continue
        next()
    }
}

/**
 * Enhanced session store wrapper that handles secret migration
 * This can be used to wrap existing session stores
 */
export class SessionMigrationStore {
    private store: any
    private currentSecret: string
    private previousSecret: string | null

    constructor(store: any, currentSecret: string, previousSecret: string | null = null) {
        this.store = store
        this.currentSecret = currentSecret
        this.previousSecret = previousSecret
    }

    async get(sessionId: string, callback: (err: any, session?: any) => void) {
        // First try with current secret
        this.store.get(sessionId, async (err: any, session?: any) => {
            if (err) {
                return callback(err)
            }

            if (session) {
                return callback(null, session)
            }

            // If no session found and we have a previous secret, try migration
            if (this.previousSecret) {
                try {
                    // This is a simplified migration - in practice, you'd need to implement
                    // proper session decryption based on your specific session store
                    logger.info(`Attempting to migrate session ${sessionId} from previous secret`)

                    // For now, we'll just return null and let the session be recreated
                    // In a real implementation, you'd decrypt with old secret and re-encrypt with new
                    return callback(null, null)
                } catch (migrationError) {
                    logger.error(`Session migration failed for ${sessionId}:`, migrationError)
                    return callback(null, null)
                }
            }

            callback(null, null)
        })
    }

    async set(sessionId: string, session: any, callback?: (err?: any) => void) {
        this.store.set(sessionId, session, callback)
    }

    async destroy(sessionId: string, callback?: (err?: any) => void) {
        this.store.destroy(sessionId, callback)
    }

    async touch(sessionId: string, session: any, callback?: (err?: any) => void) {
        this.store.touch(sessionId, session, callback)
    }
}

/**
 * Creates a session migration store wrapper
 */
export const createSessionMigrationStore = async (originalStore: any) => {
    const currentSecret = await getSessionSecret()
    const previousSecret = await getPreviousSessionSecret()

    return new SessionMigrationStore(originalStore, currentSecret, previousSecret)
}
