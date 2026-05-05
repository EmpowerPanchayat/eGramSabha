const { google } = require("googleapis");

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.readonly",
];

function getServiceAccountConfig() {
  const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (credentialsJson) {
    try {
      return JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
    }
  }

  if (credentialsPath) {
    return require(credentialsPath);
  }

  throw new Error(
    "Google service account credentials are missing (set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_JSON)"
  );
}

function getAuthClient() {
  const credentials = getServiceAccountConfig();
  const client = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    keyId: credentials.private_key_id,
    scopes: CALENDAR_SCOPES,
    subject: process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT || undefined  // Will work after domain-wide delegation
  });
  return client;
}

async function getClients() {
  const auth = getAuthClient();
  await auth.authorize();
  return {
    calendar: google.calendar({ version: "v3", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

function resolveCalendarId(metadata = {}) {
  return (
    metadata.googleCalendarId ||
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT ||
    "primary"
  );
}

async function createMeeting({ title, startTime, endTime, metadata = {} }) {
  const { calendar } = await getClients();
  const calendarId = resolveCalendarId(metadata);
  const requestId = `gs-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  const event = response.data;
  const entryPoints = event?.conferenceData?.entryPoints || [];
  const videoEntry = entryPoints.find((entry) => entry.entryPointType === "video");
  const meetLink = event.hangoutLink || videoEntry?.uri || null;

  return {
    meetingLink: meetLink,
    meetingId: event.id,
    providerData: {
      eventId: event.id,
      iCalUID: event.iCalUID,
      calendarId,
      conferenceData: event.conferenceData || null,
      hangoutLink: event.hangoutLink || null,
    },
    platform: "google",
  };
}

async function updateMeeting({ externalMeetingId, title, startTime, endTime, metadata = {} }) {
  if (!externalMeetingId) {
    return createMeeting({ title, startTime, endTime, metadata });
  }

  const { calendar } = await getClients();
  const calendarId = resolveCalendarId(metadata);

  const response = await calendar.events.patch({
    calendarId,
    eventId: externalMeetingId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });

  const event = response.data;
  const entryPoints = event?.conferenceData?.entryPoints || [];
  const videoEntry = entryPoints.find((entry) => entry.entryPointType === "video");

  return {
    meetingLink: event.hangoutLink || videoEntry?.uri || null,
    meetingId: event.id,
    providerData: {
      eventId: event.id,
      iCalUID: event.iCalUID,
      calendarId,
      conferenceData: event.conferenceData || null,
      hangoutLink: event.hangoutLink || null,
    },
    platform: "google",
  };
}

async function startRecording() {
  return {
    recordingStatus: "managed_by_google_meet",
    message:
      "Google Meet recording is controlled by Google Workspace host permissions and cannot be started via public API.",
  };
}

async function listRecordings({ providerData = {}, historyId }) {
  const { drive } = await getClients();
  const calendarId = providerData.calendarId || process.env.GOOGLE_CALENDAR_ID || "primary";
  const eventId = providerData.eventId || historyId;
  const meetingCode = providerData?.conferenceData?.conferenceId || "";

  const searchTerms = [];
  if (meetingCode) searchTerms.push(`name contains '${meetingCode}'`);
  if (eventId) searchTerms.push(`name contains '${eventId}'`);
  searchTerms.push(`name contains 'Meet Recording'`);

  const query = `mimeType contains 'video/' and trashed = false and (${searchTerms.join(
    " or "
  )})`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id,name,mimeType,createdTime,webViewLink,size)",
    orderBy: "createdTime desc",
    pageSize: 20,
  });

  const recordings = (response.data.files || []).map((file) => ({
    id: file.id,
    customName: file.name,
    createdAt: file.createdTime,
    size: file.size,
    url: file.id,
    mimeType: file.mimeType,
    webViewLink: file.webViewLink,
  }));

  return {
    callRecordings: recordings,
    calendarId,
    eventId,
  };
}

async function downloadRecordingStream(fileId) {
  const { drive } = await getClients();
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    { responseType: "stream" }
  );
  return response.data;
}

module.exports = {
  platform: "google",
  createMeeting,
  updateMeeting,
  startRecording,
  listRecordings,
  downloadRecordingStream,
  isConfigured: () =>
    Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH    ),
};
