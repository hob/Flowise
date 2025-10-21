const crypto = require('crypto')
const { generateSessionSecret } = require('../src/utils/sessionSecretManager')

// The main function to generate the key.
function generateKey() {
    try {
        const secret = generateSessionSecret()
        // Log the generated key with usage instructions.
        console.log('='.repeat(60))
        console.log('FLOWISE SESSION SECRET GENERATOR')
        console.log('='.repeat(60))
        console.log(`Generated 32-byte session secret: ${secret}`)
        console.log('')
        console.log('USAGE:')
        console.log('1. Set as environment variable:')
        console.log(`   export EXPRESS_SESSION_SECRET=${secret}`)
        console.log('')
        console.log('2. Or add to your .env file:')
        console.log(`   EXPRESS_SESSION_SECRET=${secret}`)
        console.log('')
        console.log('3. Or use with Docker:')
        console.log(`   docker run -e EXPRESS_SESSION_SECRET=${secret} flowiseai/flowise`)
        console.log('')
        console.log('SECURITY NOTES:')
        console.log('- Keep this secret secure and never commit it to version control')
        console.log('- Use different secrets for different environments')
        console.log('- Rotate secrets regularly (every 90 days recommended)')
        console.log('='.repeat(60))
    } catch (err) {
        // If an error occurs during the generation process,
        // print an error message and exit.
        console.error('Error generating secret:', err)
        process.exit(1)
    }
}

// Call the function to run the script.
generateKey()
