const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const { JIOMEET_APP_ID, JIOMEET_API, PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } =
  process.env;

let privateKey = null;
let publicKey = null;

try {
  if (PRIVATE_KEY_PATH) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
  }
  if (PUBLIC_KEY_PATH) {
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
  }
} catch (error) {
  console.warn(
    "[JioMeetingProvider] Could not load RSA keys from file paths",
    error.message
  );
}

function getToken() {
  if (!JIOMEET_APP_ID || !JIOMEET_API || !privateKey) {
    throw new Error("JioMeet configuration is incomplete");
  }
  const payload = { app: JIOMEET_APP_ID, timestamp: Date.now() };
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
  });
}

async function createMeeting({ title, startTime, endTime }) {
  const token = getToken();
  const requestBody = {
    topic: title,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    isAutoRecordingEnabled: true,
  };
  const response = await axios.post(`${JIOMEET_API}/schedule/meeting`, requestBody, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    meetingLink: response.data.hostUrl || null,
    meetingId: response.data.meetingId || null,
    providerData: response.data,
    platform: "jio",
  };
}

async function updateMeeting({ title, startTime, endTime }) {
  return createMeeting({ title, startTime, endTime });
}

async function startRecording({ jiomeetId, roomPIN }) {
  const token = getToken();
  const response = await axios.post(
    `${JIOMEET_API}/recordings/start`,
    { jiomeetId, roomPIN },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

async function listRecordings({ jiomeetId, roomPIN, historyId }) {
  const token = getToken();
  const response = await axios.post(
    `${JIOMEET_API}/recordings/list`,
    { jiomeetId, roomPIN, historyId },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

async function downloadRecordingStream(videoUrl) {
  const token = getToken();
  const response = await axios.get(videoUrl, {
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

module.exports = {
  platform: "jio",
  createMeeting,
  updateMeeting,
  startRecording,
  listRecordings,
  downloadRecordingStream,
  isConfigured: () => Boolean(JIOMEET_APP_ID && JIOMEET_API && privateKey),
};
