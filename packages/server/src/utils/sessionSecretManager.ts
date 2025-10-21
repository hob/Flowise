import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand } from '@aws-sdk/client-secrets-manager'
import * as fs from 'fs'
import * as path from 'path'
import { getUserHome } from './index'
import crypto from 'crypto'
import { getSecretsManagerClient } from 'flowise-components'

const DEFAULT_SECRETKEY_AWS_SESSION_SECRET = 'FlowiseSessionSecret'
let secretsManagerClient: SecretsManagerClient | null = getSecretsManagerClient()

/**
 * Generates a cryptographically secure session secret
 * @returns {string} A 64-character hex string (32 bytes)
 */
export const generateSessionSecret = (): string => {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Gets the path where the session secret file should be stored
 * @returns {string} The file path
 */
export const getSessionSecretPath = (): string => {
    const defaultLocation = process.env.SECRETKEY_PATH
        ? path.join(process.env.SECRETKEY_PATH, 'session.secret')
        : path.join(getUserHome(), '.flowise', 'session.secret')
    return defaultLocation
}

/**
 * Retrieves the session secret from environment, AWS Secrets Manager, or file system
 * @returns {Promise<string>} The session secret
 */
export const getSessionSecret = async (): Promise<string> => {
    // First check if explicitly set in environment
    if (process.env.EXPRESS_SESSION_SECRET) {
        return process.env.EXPRESS_SESSION_SECRET
    }

    // secretsManagerClient will be null if AWS Secrets Manager is not configured
    if (!secretsManagerClient) {
        throw new Error(
            `The EXPRESS_SESSION_SECRET variable is not set, and AWS Secrets Manager is not configured.
            Flowise can generate and manage a secure session secret, but requires AWS Secrets Manager to do so.`
        )
    } else {
        const secretId = process.env.SECRETKEY_AWS_SESSION_SECRET || DEFAULT_SECRETKEY_AWS_SESSION_SECRET
        try {
            const command = new GetSecretValueCommand({ SecretId: secretId })
            const response = await secretsManagerClient.send(command)

            if (response.SecretString) {
                return response.SecretString
            }
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                // Secret doesn't exist, create it
                const newSecret = generateSessionSecret()
                const createCommand = new CreateSecretCommand({
                    Name: secretId,
                    SecretString: newSecret
                })
                await secretsManagerClient.send(createCommand)
                return newSecret
            }
            throw error
        }
    }

    // Try to read from file system
    try {
        return await fs.promises.readFile(getSessionSecretPath(), 'utf8')
    } catch (error) {
        // File doesn't exist, create it
        const newSecret = generateSessionSecret()
        const defaultLocation = getSessionSecretPath()

        // Ensure directory exists
        const dir = path.dirname(defaultLocation)
        await fs.promises.mkdir(dir, { recursive: true })

        await fs.promises.writeFile(defaultLocation, newSecret)
        return newSecret
    }
}

const SECRET_MIN_SECURE_BYTES = 32
/**
 * Validates that a session secret is long enough to be secure
 * @param secret The session secret to validate
 * @returns {boolean} True if the secret is secure
 */
export const isSessionSecretSecure = (secret: string): boolean => {
    return secret.length >= SECRET_MIN_SECURE_BYTES
}

/**
 * Gets the previous session secret for migration purposes
 * This would be used during a rolling deployment to migrate existing sessions
 * @returns {Promise<string | null>} The previous session secret or null if not available
 */
export const getPreviousSessionSecret = async (): Promise<string | null> => {
    // Check if there's a previous secret stored
    const previousSecretPath = getSessionSecretPath() + '.previous'
    try {
        const previousSecret = await fs.promises.readFile(previousSecretPath, 'utf8')
        return previousSecret
    } catch (error) {
        // No previous secret found
        return null
    }
}

/**
 * Stores the current session secret as the previous one for migration
 * @param currentSecret The current session secret to store as previous
 */
export const storePreviousSessionSecret = async (currentSecret: string): Promise<void> => {
    const previousSecretPath = getSessionSecretPath() + '.previous'
    await fs.promises.writeFile(previousSecretPath, currentSecret)
}
