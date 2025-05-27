import { HMSPrebuilt } from "@100mslive/roomkit-react";
import { useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { selectPeers } from "@100mslive/hms-video-store";

const HMSMeetingPage = () => {
  const { roomId } = useParams();
  const prebuiltRef = useRef(null);

  // Mute all other peers if the current user is host
  useEffect(() => {
    if (!prebuiltRef.current) return;

    const { hmsStore, hmsActions } = prebuiltRef.current;

    const unsubscribe = hmsStore.subscribe(async (peers) => {
      const localPeer = peers.find((p) => p.isLocal);
      if (localPeer?.roleName === "host") {
        const others = peers.filter((p) => !p.isLocal);
        for (const peer of others) {
          if (peer.audioTrack) {
            await hmsActions.setRemoteTrackEnabled(peer.audioTrack, false);
          }
          if (peer.videoTrack) {
            await hmsActions.setRemoteTrackEnabled(peer.videoTrack, false);
          }
        }
      }
    }, selectPeers);

    return unsubscribe;
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <HMSPrebuilt roomCode={roomId} ref={prebuiltRef} />
    </div>
  );
};

export default HMSMeetingPage;
