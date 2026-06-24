import { create } from 'zustand';
import { getSocket } from '../lib/socket';
import { useDevices } from './devices';
import { startRingtone, stopRingtone } from '../lib/ringtone';

export type CallType = 'audio' | 'video';
type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallPeer {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified?: boolean;
}

interface CallState {
  status: CallStatus;
  peer: CallPeer | null;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  camEnabled: boolean;
  error: string | null;
  initialized: boolean;

  init: () => void;
  startCall: (peer: CallPeer, callType: CallType) => Promise<void>;
  accept: () => Promise<void>;
  reject: () => void;
  hangup: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  switchMic: (deviceId: string) => Promise<void>;
}

// Public STUN keeps things working across most home networks. A production
// deployment behind symmetric NATs would also configure a TURN relay here.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

// ── Module-scoped, non-reactive call internals ──
let pc: RTCPeerConnection | null = null;
let peerId: string | null = null; // the other user's id, for signalling
let pendingCandidates: RTCIceCandidateInit[] = [];
let boundSocket: ReturnType<typeof getSocket> = null;
let callTimeout: ReturnType<typeof setTimeout> | null = null;
// Grace timer for transient ICE "disconnected" blips before we give up.
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

function socket() {
  return getSocket();
}

function signal(data: unknown) {
  if (peerId) socket()?.emit('call:signal', { toUserId: peerId, data });
}

async function getLocalMedia(type: CallType): Promise<MediaStream> {
  const { micId, camId } = useDevices.getState();
  return navigator.mediaDevices.getUserMedia({
    audio: micId ? { deviceId: { exact: micId } } : true,
    video:
      type === 'video' ? (camId ? { deviceId: { exact: camId } } : true) : false,
  });
}

export const useCall = create<CallState>((set, get) => {
  function clearCallTimeout() {
    if (callTimeout) {
      clearTimeout(callTimeout);
      callTimeout = null;
    }
  }

  function clearDisconnectTimer() {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  }

  // Tears down the peer connection + media and resets to idle.
  function cleanup(message: string | null = null) {
    clearCallTimeout();
    clearDisconnectTimer();
    stopRingtone();
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {
        /* already closed */
      }
      pc = null;
    }
    get().localStream?.getTracks().forEach((t) => t.stop());
    get().remoteStream?.getTracks().forEach((t) => t.stop());
    peerId = null;
    pendingCandidates = [];

    const peer = get().peer;
    if (message && peer) {
      set({
        status: 'ended',
        peer,
        localStream: null,
        remoteStream: null,
        micEnabled: true,
        camEnabled: true,
        error: message,
      });
      setTimeout(() => {
        if (get().status === 'ended') {
          set({ status: 'idle', peer: null, error: null });
        }
      }, 2200);
      return;
    }

    set({
      status: 'idle',
      peer: null,
      localStream: null,
      remoteStream: null,
      micEnabled: true,
      camEnabled: true,
      error: null,
    });
  }

  // Builds the RTCPeerConnection, wiring ICE relay + remote track handling.
  function createPeer(localStream: MediaStream) {
    const conn = new RTCPeerConnection(RTC_CONFIG);
    localStream.getTracks().forEach((track) => conn.addTrack(track, localStream));

    conn.onicecandidate = (e) => {
      if (e.candidate) signal({ candidate: e.candidate.toJSON() });
    };
    conn.ontrack = (e) => {
      const [stream] = e.streams;
      if (!stream) return;
      const patch: Partial<CallState> = { remoteStream: stream, status: 'active' };
      // If the other side turns their camera on mid-call, switch to video UI.
      if (e.track.kind === 'video') patch.callType = 'video';
      set(patch);
    };
    conn.onconnectionstatechange = () => {
      if (!pc) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        clearDisconnectTimer();
        set({ status: 'active' });
      } else if (state === 'failed') {
        cleanup('Connection lost');
      } else if (state === 'disconnected') {
        // A brief "disconnected" is usually a transient network blip that ICE
        // recovers from on its own. Only end the call if it doesn't come back.
        if (!disconnectTimer) {
          disconnectTimer = setTimeout(() => {
            disconnectTimer = null;
            if (pc && (pc.connectionState === 'disconnected' || pc.connectionState === 'failed')) {
              cleanup('Connection lost');
            }
          }, 8000);
        }
      }
    };
    return conn;
  }

  async function drainCandidates() {
    if (!pc || !pc.remoteDescription) return;
    for (const c of pendingCandidates) {
      await pc.addIceCandidate(c).catch(() => {});
    }
    pendingCandidates = [];
  }

  return {
    status: 'idle',
    peer: null,
    callType: 'audio',
    localStream: null,
    remoteStream: null,
    micEnabled: true,
    camEnabled: true,
    error: null,
    initialized: false,

    init: () => {
      const s = socket();
      if (!s) return; // socket connects after auth; CallOverlay retries on mount
      if (s === boundSocket) return;
      boundSocket = s;
      set({ initialized: true });

      s.on('call:incoming', ({ fromUserId, caller, callType }: any) => {
        // Busy: already in a call → tell the caller.
        if (get().status !== 'idle') {
          s.emit('call:busy', { toUserId: fromUserId });
          return;
        }
        peerId = fromUserId;
        set({
          status: 'incoming',
          peer: caller ?? { id: fromUserId, username: '', displayName: 'Caller', avatarUrl: null },
          callType: callType === 'video' ? 'video' : 'audio',
          camEnabled: callType === 'video',
        });
        startRingtone('incoming');
        clearCallTimeout();
        callTimeout = setTimeout(() => {
          s.emit('call:reject', { toUserId: fromUserId, reason: 'timeout' });
          cleanup();
        }, 45_000);
      });

      // Callee accepted → caller creates and sends the offer.
      s.on('call:accepted', async ({ fromUserId }: { fromUserId: string }) => {
        if (fromUserId !== peerId || !pc || get().status !== 'outgoing') return;
        clearCallTimeout();
        stopRingtone();
        set({ status: 'connecting' });
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal(pc.localDescription);
        } catch {
          cleanup();
        }
      });

      s.on('call:signal', async ({ fromUserId, data }: any) => {
        if (fromUserId !== peerId || !pc || !data) return;
        try {
          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            await drainCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signal(pc.localDescription);
          } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            await drainCandidates();
          } else if (data.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
            else pendingCandidates.push(data.candidate);
          }
        } catch {
          /* ignore malformed signalling */
        }
      });

      const endHandlers = ['call:ended', 'call:canceled'];
      endHandlers.forEach((evt) =>
        s.on(evt, ({ fromUserId }: { fromUserId: string }) => {
          if (fromUserId === peerId) cleanup();
        }),
      );
      s.on('call:rejected', ({ fromUserId, reason }: { fromUserId: string; reason?: string }) => {
        if (fromUserId !== peerId) return;
        cleanup(reason === 'unavailable' ? 'Call unavailable' : 'Call declined');
      });
      s.on('call:busy', ({ fromUserId }: { fromUserId: string }) => {
        if (fromUserId !== peerId) return;
        cleanup('User is busy');
      });
    },

    startCall: async (peer, callType) => {
      if (get().status !== 'idle') return;
      set({ status: 'connecting', peer, callType, error: null });
      try {
        const localStream = await getLocalMedia(callType);
        peerId = peer.id;
        pc = createPeer(localStream);
        set({
          status: 'outgoing',
          peer,
          callType,
          localStream,
          micEnabled: true,
          camEnabled: callType === 'video',
        });
        socket()?.emit('call:invite', { toUserId: peer.id, callType });
        startRingtone('outgoing');
        clearCallTimeout();
        callTimeout = setTimeout(() => {
          socket()?.emit('call:cancel', { toUserId: peer.id });
          cleanup('No answer');
        }, 45_000);
      } catch {
        cleanup('Could not access your microphone/camera');
      }
    },

    accept: async () => {
      const { status, callType } = get();
      if (status !== 'incoming') return;
      // Cancel the 45s auto-reject armed while ringing — otherwise it fires
      // mid-conversation and drops the answered call after ~45 seconds.
      clearCallTimeout();
      stopRingtone();
      try {
        const localStream = await getLocalMedia(callType);
        pc = createPeer(localStream);
        set({ status: 'connecting', localStream, micEnabled: true, camEnabled: callType === 'video' });
        socket()?.emit('call:accept', { toUserId: peerId });
      } catch {
        socket()?.emit('call:reject', { toUserId: peerId });
        cleanup('Could not access your microphone/camera');
      }
    },

    reject: () => {
      socket()?.emit('call:reject', { toUserId: peerId });
      cleanup();
    },

    hangup: () => {
      const { status } = get();
      // An un-answered outgoing call is a cancel; otherwise it's an end.
      socket()?.emit(status === 'outgoing' ? 'call:cancel' : 'call:end', { toUserId: peerId });
      cleanup();
    },

    toggleMic: () => {
      const stream = get().localStream;
      if (!stream) return;
      const next = !get().micEnabled;
      stream.getAudioTracks().forEach((t) => (t.enabled = next));
      set({ micEnabled: next });
    },

    toggleCam: async () => {
      const stream = get().localStream;
      if (!stream) return;

      // If we already have a camera track (video call), just flip it on/off.
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const next = !get().camEnabled;
        videoTracks.forEach((t) => (t.enabled = next));
        set({ camEnabled: next });
        return;
      }

      // Otherwise this is a voice call: acquire the camera, add it to the
      // connection and renegotiate so the other side starts receiving video.
      if (!pc || get().status !== 'active') return;
      try {
        const { camId } = useDevices.getState();
        const cam = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { exact: camId } } : true,
        });
        const track = cam.getVideoTracks()[0];
        if (!track) return;
        stream.addTrack(track);
        pc.addTrack(track, stream);
        set({ localStream: stream, callType: 'video', camEnabled: true });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signal(pc.localDescription);
      } catch {
        set({ error: 'Could not access your camera' });
        setTimeout(() => {
          if (get().error === 'Could not access your camera') set({ error: null });
        }, 2500);
      }
    },

    // Live-switch the microphone mid-call (and remember the choice).
    switchMic: async (deviceId) => {
      useDevices.getState().setMic(deviceId);
      const { localStream, status } = get();
      if (!pc || !localStream || status === 'idle') return;
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });
        const newTrack = fresh.getAudioTracks()[0];
        if (!newTrack) return;
        newTrack.enabled = get().micEnabled;
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        await sender?.replaceTrack(newTrack);
        // Swap the track inside the local stream too.
        localStream.getAudioTracks().forEach((t) => {
          localStream.removeTrack(t);
          t.stop();
        });
        localStream.addTrack(newTrack);
        set({ localStream });
      } catch {
        /* keep the existing track on failure */
      }
    },
  };
});
