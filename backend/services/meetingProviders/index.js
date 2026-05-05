const jioMeetingProvider = require("./jioMeetingProvider");
const googleMeetingProvider = require("./googleMeetingProvider");

function resolveMeetingPlatform() {
  const configured = (process.env.MEETING_PLATFORM || "jio").toLowerCase();
  if (configured === "google") {
    return "google";
  }
  return "jio";
}

function getMeetingProvider(platform = resolveMeetingPlatform()) {
  if (platform === "google") {
    return googleMeetingProvider;
  }
  return jioMeetingProvider;
}

module.exports = {
  getMeetingProvider,
  resolveMeetingPlatform,
};
