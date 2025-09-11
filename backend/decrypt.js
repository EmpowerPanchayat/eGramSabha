const fs = require("fs");
const crypto = require("crypto");

const privateKey = fs.readFileSync("./keys/key.pem", "utf8");
const response = JSON.parse(fs.readFileSync("./keys/response.json", "utf8"));

function decryptAESKey(encryptedKeyBase64) {
  const onceDecoded = Buffer.from(encryptedKeyBase64, "base64");

  let encryptedKey = onceDecoded;
  if (![256, 512].includes(onceDecoded.length)) {
    encryptedKey = Buffer.from(onceDecoded.toString("utf8"), "base64");
  }

  console.log("Encrypted key length after adjustment:", encryptedKey.length);

  const decryptedKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    encryptedKey
  );

  const aesKeyBase64 = decryptedKey.toString("utf8").trim();
  console.log("AES key (base64 string):", aesKeyBase64);

  const aesKey = Buffer.from(aesKeyBase64, "base64");
  console.log("AES key length:", aesKey.length);
  console.log("AES key (hex):", aesKey.toString("hex"));

  return aesKey;
}

function decryptPayload(encryptedDataBase64, aesKey) {
  // First base64 decode
  let encryptedData = Buffer.from(encryptedDataBase64, "base64");

  // If the length is not a multiple of 16 (AES block size), try decoding again
  if (encryptedData.length % 16 !== 0) {
    encryptedData = Buffer.from(encryptedData.toString("utf8"), "base64");
  }

  console.log("Encrypted data length:", encryptedData.length);

  let algorithm;
  if (aesKey.length === 16) algorithm = "aes-128-ecb";
  else if (aesKey.length === 24) algorithm = "aes-192-ecb";
  else if (aesKey.length === 32) algorithm = "aes-256-ecb";
  else throw new Error("Unsupported AES key length: " + aesKey.length);

  const decipher = crypto.createDecipheriv(algorithm, aesKey, null);
  decipher.setAutoPadding(true); // PKCS5

  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted); // should contain token + rtoken
}

const aesKey = decryptAESKey(response.key);
const decryptedPayload = decryptPayload(response.data, aesKey);

console.log("✅ Decrypted Payload:", decryptedPayload);
