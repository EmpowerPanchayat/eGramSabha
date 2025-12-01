const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const FormData = require("form-data");

/**
 * JioSign API (v1.1, Spec v2.3) – Node.js service with auto-refreshing session tokens
 */

// ======== CONFIG ========
const JIOSIGN_BASE_URL =
  process.env.JIOSIGN_BASE_URL || "https://rpapi-sit.jiosign.jio.com:8443";
const JIOSIGN_CLIENT_ID = process.env.JIOSIGN_CLIENT_ID || "YOUR_CLIENT_ID";
const JIOSIGN_CLIENT_SECRET =
  process.env.JIOSIGN_CLIENT_SECRET || "YOUR_CLIENT_SECRET";

const CERT_PATH =
  process.env.JIOSIGN_CERT_PATH ||
  path.join(__dirname, "..", "keys", "public_cert.pem");
const KEY_PATH =
  process.env.JIOSIGN_KEY_PATH || path.join(__dirname, "..", "keys", "key.pem");
const KEY_PASSPHRASE = process.env.JIOSIGN_KEY_PASSPHRASE || undefined;

// bootstrap JSON provided once via integrations tab
const BOOTSTRAP_TOKEN_PATH =
  process.env.JIOSIGN_BOOTSTRAP_TOKEN_PATH ||
  path.join(__dirname, "..", "keys", "jiosign_session_bootstrap.json");

const DEFAULT_IP = process.env.JIOSIGN_IP || "183.83.154.4";

// ======== HTTPS Agent + Axios ========
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert: fs.readFileSync(CERT_PATH),
  key: fs.readFileSync(KEY_PATH),
  passphrase: KEY_PASSPHRASE,
});

const api = axios.create({
  baseURL: JIOSIGN_BASE_URL,
  timeout: 60_000,
  httpsAgent,
});

// ======== In-memory tokens ========
let gatewayToken = null;
let sessionToken = null;
let refreshToken = null;
let lastRefresh = 0;

// ======== Helpers ========
function makeTxn() {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferIdType(identifier) {
  return /@/.test(identifier) ? 1 : 2;
}

function inferAuthType(identifier) {
  return /@/.test(identifier) ? 2 : 3;
}

// ======== Crypto (bootstrap decryption) ========
function decryptAESKey(encryptedKeyBase64, privateKeyPem) {
  const onceDecoded = Buffer.from(encryptedKeyBase64, "base64");
  let encryptedKey = onceDecoded;
  if (![256, 512].includes(onceDecoded.length)) {
    encryptedKey = Buffer.from(onceDecoded.toString("utf8"), "base64");
  }
  const decrypted = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    encryptedKey
  );
  const aesKeyBase64 = decrypted.toString("utf8").trim();
  return Buffer.from(aesKeyBase64, "base64");
}

function decryptPayload(encryptedDataBase64, aesKey) {
  let encryptedData = Buffer.from(encryptedDataBase64, "base64");
  if (encryptedData.length % 16 !== 0) {
    encryptedData = Buffer.from(encryptedData.toString("utf8"), "base64");
  }
  let algorithm;
  if (aesKey.length === 16) algorithm = "aes-128-ecb";
  else if (aesKey.length === 24) algorithm = "aes-192-ecb";
  else if (aesKey.length === 32) algorithm = "aes-256-ecb";
  else throw new Error(`Unsupported AES key length: ${aesKey.length}`);
  const decipher = crypto.createDecipheriv(algorithm, aesKey, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

async function loadSessionFromBootstrap() {
  const privateKeyPem = fs.readFileSync(KEY_PATH, "utf8");
  const bootstrap = JSON.parse(fs.readFileSync(BOOTSTRAP_TOKEN_PATH, "utf8"));
  const aesKey = decryptAESKey(bootstrap.key, privateKeyPem);
  const payload = decryptPayload(bootstrap.data, aesKey);
  const inner = payload.data ? payload.data : payload;
  if (!inner[0].token || !inner[1].rtoken) {
    console.error("Bootstrap decrypted payload:", payload);
    throw new Error("Bootstrap payload missing token/rtoken");
  }
  sessionToken = inner[0].token;
  refreshToken = inner[1].rtoken;
  lastRefresh = Date.now();
  console.log("✅ Session tokens loaded from bootstrap");
  console.log(inner);
  return { sessionToken, refreshToken };
}

// ======== Gateway Token ========
async function getGatewayToken(force = false) {
  if (gatewayToken && !force) return gatewayToken;
  const authString = `${JIOSIGN_CLIENT_ID}`;
  const encoded = Buffer.from(authString).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const { data } = await api.post("/token", body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authString}`,
    },
  });
  gatewayToken = data.access_token;
  console.log("✅ Gateway token refreshed", gatewayToken);
  return gatewayToken;
}

// ======== Session Refresh ========
async function refreshSessionIfPossible() {
  const g = await getGatewayToken();
  if (!sessionToken || !refreshToken) return null;
  const { data } = await api.get("/session/v1.1/token", {
    headers: {
      Authorization: `Bearer ${g}`,
      Token: sessionToken,
      Rtoken: refreshToken,
      Txn: makeTxn(),
      "Ip-Address": DEFAULT_IP,
      "Content-Type": "application/json",
    },
  });
  if (data && data.token && data.rtoken) {
    sessionToken = data.token;
    refreshToken = data.rtoken;
    lastRefresh = Date.now();
    console.log("🔄 Session token refreshed");
    return { sessionToken, refreshToken };
  }
  return null;
}

async function ensureSession() {
  // Refresh if older than 5 minutes or missing
  const MAX_AGE = 5 * 60 * 1000;
  if (!sessionToken || !refreshToken) {
    await loadSessionFromBootstrap();
  } else if (Date.now() - lastRefresh > MAX_AGE) {
    try {
      await refreshSessionIfPossible();
    } catch (e) {
      console.warn("Session refresh failed, reloading bootstrap");
      await loadSessionFromBootstrap();
    }
  }
  return { sessionToken, refreshToken };
}

function baseHeaders(contentType, extra = {}) {
  const headers = {
    Authorization: `Bearer ${gatewayToken}`,
    Token: sessionToken,
    Txn: makeTxn(),
    "Ip-Address": DEFAULT_IP,
    ...extra,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

// ======== Core APIs ========
async function createDocumentEnvelope(documentName, docOwner = null) {
  await ensureSession();
  await getGatewayToken();
  const payload = { name: documentName };
  if (docOwner) payload["doc-owner"] = String(docOwner);
  console.log("envelop", payload);
  const { data } = await api.post("/docmgmt/v1.1/document", payload, {
    headers: baseHeaders("application/json"),
  });
  if (!data.groupId) throw new Error("JioSign: groupId missing");
  return data.groupId;
}

function buildNotifications(isMobile, isCreator) {
  if (isCreator) {
    return [
      { frequency: 1, freq_unit: 3, notification_type: 1, enable: 0 }, // Info
      { frequency: 1, freq_unit: 3, notification_type: 2, enable: 0 }, // Completed
      { frequency: 1, freq_unit: 3, notification_type: 6, enable: 0 }, // Reminder
      { frequency: 1, freq_unit: 3, notification_type: 13, enable: 1 }, // Document Upload (mandatory for creator)
    ];
  }

  if (isMobile) {
    return [
      { frequency: 1, freq_unit: 3, notification_type: 1, enable: 1 },
      { frequency: 1, freq_unit: 3, notification_type: 6, enable: 0 },
      { frequency: 1, freq_unit: 3, notification_type: 7, enable: 1 }, // Decline
    ];
  }

  return [
    { frequency: 1, freq_unit: 3, notification_type: 1, enable: 1 }, // Info / OTP
    { frequency: 1, freq_unit: 3, notification_type: 6, enable: 1 }, // Reminder
    { frequency: 1, freq_unit: 3, notification_type: 7, enable: 1 }, // Decline (mandatory)
  ];
}

async function saveDocumentData(groupId, pdfBuffer, signatures, opts = {}) {
  await ensureSession();
  await getGatewayToken();

  const fileName = opts.fileName || "document.pdf";

  // Build participants (auto placement)
  const participants = signatures.map((signature, index) => {
    const isMobile = inferIdType(signature.identifier) === 2;
    return {
      idValue: signature.identifier.trim(),
      idType: inferIdType(signature.identifier),
      access: 1, // signer
      participantTag: index + 1,
      assuranceLevel: "4", // e-Signature
      notifications: buildNotifications(isMobile, false),
      cards: [
        {
          cardW: 250,
          cardH: 80,
          cardType: 2, // Signature card
          cardPageNo: 1, // Not used when cTag=1
          cardColor: "#f2d130",
          cTag: 1, // Enable auto-location
        },
      ],
    };
  });

  // Add document owner as viewer
  participants.push({
    idValue: "product@empowerpanchayat.org",
    idType: 1,
    access: 2, // viewer
    participantTag: signatures.length + 1,
    assuranceLevel: "-1", // view only
    notifications: buildNotifications(false, true),
    // No cards for viewer
  });

  const form = new FormData();
  form.append("groupId", groupId);
  form.append("message", "Please sign the agenda");
  form.append("file", pdfBuffer, { filename: fileName });
  form.append("participants", JSON.stringify(participants));
  form.append("autoLocateCards", "1"); // Enable auto card placement

  const participantsJson = JSON.stringify(participants);
  console.log("Raw JSON string being sent:", participantsJson);
  console.log("JSON length:", participantsJson.length);
  console.log("First 100 chars:", participantsJson.substring(0, 100));
  console.log(
    "Last 100 chars:",
    participantsJson.substring(participantsJson.length - 100)
  );

  const headers = {
    ...baseHeaders(),
    ...form.getHeaders(),
  };
  delete headers["Content-Type"]; // Let FormData set the content-type

  console.log(
    "Final participants JSON:",
    JSON.stringify(participants, null, 2)
  );

  const { data } = await api.post("/docmgmt/v1.1/document/data", form, {
    headers,
  });
  return data;
}

//to be used later in JioSign Prod env. after domain whitelisting
async function registerCallbackUrlForGroup(groupId, callbackUrl) {
  await ensureSession();
  await getGatewayToken();

  const body = {
    url: callbackUrl,
    type: 1,
    id: groupId,
  };

  console.log("REQ BODY", JSON.stringify(body, null, 2));

  const { data } = await api.put("/docmgmt/v1.1/callback", body, {
    headers: {
      ...baseHeaders("application/json"), // explicitly JSON
    },
    transformRequest: [(data) => JSON.stringify(data)], // force raw JSON
  });

  console.log("DATAA", data);
  return data;
}

async function handleWebhookEvent(eventBody) {
  try {
    const { eventType, groupId } = eventBody;

    // eventType depends on JioSign docs (e.g., "SIGNED", "DECLINED", "COMPLETED")
    if (eventType === "SIGNED" || eventType === "COMPLETED") {
      console.log(`📩 Webhook received: ${eventType} for groupId ${groupId}`);
      await downloadSignedDocument(groupId, `./signed-${groupId}.pdf`);
    } else {
      console.log(`ℹ️ Webhook event ignored: ${eventType}`);
    }
  } catch (err) {
    console.error("❌ Error handling webhook event:", err);
  }
}

async function checkStatus(groupId, outputPath = `./signed-${groupId}.pdf`) {
  try {
    await ensureSession();
    await getGatewayToken();

    console.log("IDDDDDDDDDDDDD", groupId);

    const { data } = await api.get("/docmgmt/v1.1/document/status", {
      headers: baseHeaders("application/json"),
      params: { groupId }, // ✅ send query param
    });

    console.log("📊 Document status response:", data);
    return data.status;
  } catch (err) {
    console.error(
      "❌ Error checking status:",
      err.response?.data || err.message
    );
    throw err;
  }
}

async function downloadSignedDocument(groupId) {
  try {
    await ensureSession();
    await getGatewayToken();

    const response = await api.get("/docmgmt/v1.1/signed/file", {
      headers: baseHeaders(), // don't force application/json
      params: { groupId },
      responseType: "arraybuffer", // 🔑 force binary data
    });

    return Buffer.from(response.data); // ✅ return proper Buffer
  } catch (err) {
    console.error(
      " Error downloading signed document:",
      err.response?.data || err.message
    );
    throw err;
  }
}

module.exports = {
  ensureSession,
  getGatewayToken,
  createDocumentEnvelope,
  saveDocumentData,
  registerCallbackUrlForGroup,
  checkStatus,
  downloadSignedDocument,
  inferAuthType,
  inferIdType,
  buildNotifications,
};
