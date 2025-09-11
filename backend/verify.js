// A simple Node.js script to check if your private key and public certificate
// form a valid, matching cryptographic pair by reading from environment variables.

const crypto = require("crypto");
const fs = require("fs");
// ---------------------------------------------------------------------------
// ENV VARIABLES
// ---------------------------------------------------------------------------
// Directly reference process.env to ensure it's not being prematurely destructured

JIOSIGN_PRIVATE_KEY = fs.readFileSync("./keys/key.pem", "utf8");
JIOSIGN_PUBLIC_CERT = fs.readFileSync("./keys/public_cert.pem", "utf8");
/**
 * Normalizes PEM string format to ensure proper line breaks.
 * This is crucial for crypto functions to work correctly.
 * @param {string} pem The PEM string from an env variable.
 * @param {string} type The type of PEM (e.g., "PRIVATE KEY", "CERTIFICATE").
 * @returns {string} The normalized PEM string.
 */
const normalizePem = (pem, type) => {
  if (!pem) return pem;
  if (pem.includes("\\n")) return pem.replace(/\\n/g, "\n");
  if (pem.includes(`BEGIN ${type}`)) {
    const regex = new RegExp(
      `(-----BEGIN ${type}-----)(.*)(-----END ${type}-----)`
    );
    return pem.replace(regex, (match, begin, body, end) => {
      body = body.replace(/\s+/g, "");
      const wrapped = body.match(/.{1,64}/g).join("\n");
      return `${begin}\n${wrapped}\n${end}`;
    });
  }
  return pem;
};

try {
  // Check if environment variables are set
  if (!JIOSIGN_PRIVATE_KEY) {
    throw new Error("Missing environment variable: JIOSIGN_PRIVATE_KEY");
  }
  if (!JIOSIGN_PUBLIC_CERT) {
    throw new Error("Missing environment variable: JIOSIGN_PUBLIC_CERT");
  }

  // Normalize the PEM strings from the environment variables
  const normalizedPrivateKey = normalizePem(JIOSIGN_PRIVATE_KEY, "PRIVATE KEY");
  const normalizedPublicCert = normalizePem(JIOSIGN_PUBLIC_CERT, "CERTIFICATE");

  // Create a dummy message to sign and verify
  const message = "This is a test message to verify the SSL key pair.";

  // Create a signature using the private key
  const signer = crypto.createSign("sha256");
  signer.update(message);
  const signature = signer.sign(normalizedPrivateKey, "base64");

  // Verify the signature using the public certificate
  const verifier = crypto.createVerify("sha256");
  verifier.update(message);
  const result = verifier.verify(normalizedPublicCert, signature, "base64");

  if (result) {
    console.log("✅ SUCCESS: The private key and public certificate match!");
    console.log("Your issue is likely not a key pair mismatch.");
    console.log(
      "You should next check if the certificate is expired or not trusted by the JioSign server."
    );
  } else {
    console.error(
      "❌ FAILURE: The private key and public certificate DO NOT match."
    );
    console.error(
      "Please ensure you are using the correct key pair from the JioSign portal."
    );
  }
} catch (error) {
  console.error("An error occurred during verification:");
  console.error(error);
  console.error("\nPossible causes:");
  console.error(
    "1. The environment variables are not set or contain incorrect values."
  );
  console.error(
    "2. The PEM strings are corrupted or not in the correct format."
  );
}
