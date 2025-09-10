// Import the built-in 'crypto' module for generating
// cryptographically secure random bytes.
const crypto = require('crypto');

// The main function to generate the key.
function generateKey() {
    try {
        // Generate 32 cryptographically secure random bytes.
        // The 'randomBytes' method returns a Buffer object.
        const key = crypto.randomBytes(32);

        // Convert the Buffer object to a hexadecimal string representation
        // for easy viewing and logging.
        const hexKey = key.toString('hex');

        // Log the generated key.
        console.log(`Generated 32-byte secret: ${hexKey}`);

    } catch (err) {
        // If an error occurs during the generation process,
        // print an error message and exit.
        console.error('Error generating secret:', err);
        process.exit(1);
    }
}

// Call the function to run the script.
generateKey();