import { useCallback, useEffect, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  MonitorUp,
} from 'lucide-react';
import { useCall } from '../store/call';
import { useDevices } from '../store/devices';
import { Avatar } from './Avatar';

// A single circular call-control button with an optional "active/danger" look
// and a soft neon glow that fits the app's gamer-leaning theme.
function ControlButton({
  onClick,
  label,
  active = false,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  variant?: 'default' | 'danger' | 'end';
  children: React.ReactNode;
}) {
  const base =
    'flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70';
  const size = variant === 'end' ? 'h-16 w-16' : 'h-14 w-14';
  const look =
    variant === 'end'
      ? 'bg-rose-600 text-white shadow-[0_0_30px_-4px_rgba(244,63,94,0.8)] hover:bg-rose-500'
      : active
        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_26px_-2px_rgba(34,211,238,0.85)]'
        : 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20';
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`${base} ${size} ${look}`}>
      {children}
    </button>
  );
}

export function CallOverlay() {
  const {
    status,
    peer,
    callType,
    localStream,
    remoteStream,
    micEnabled,
    camEnabled,
    screenSharing,
    error,
    init,
    accept,
    reject,
    hangup,
    toggleMic,
    toggleCam,
    shareScreen,
    stopScreenShare,
    switchMic,
  } = useCall();

  const { mics, micId, refresh } = useDevices();
  const [elapsed, setElapsed] = useState(0);

  // Callback refs bind the stream (and start playback) whenever the <video>
  // mounts OR the stream changes. This is more robust than an effect: toggling
  // the camera can remount the element, and a ref callback always re-runs on
  // mount, so srcObject can never get "lost" and show a black preview.
  const setLocalVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) {
        el.srcObject = localStream;
        el.play().catch(() => {});
      }
    },
    [localStream],
  );
  const setRemoteVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) {
        el.srcObject = remoteStream;
        el.play().catch(() => {});
      }
    },
    [remoteStream],
  );

  // Attach the socket signalling listeners once the socket is ready.
  useEffect(() => {
    init();
    if (useCall.getState().initialized) return;
    const t = setInterval(() => {
      init();
      if (useCall.getState().initialized) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [init]);

  // Populate the device list (for the in-call mic picker) once connected.
  useEffect(() => {
    if (status === 'active' || status === 'connecting') refresh();
  }, [status, refresh]);

  // Call duration timer.
  useEffect(() => {
    if (status !== 'active') {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'idle' || !peer) return null;

  const isVideo = callType === 'video';
  const showVideoStage = (isVideo || screenSharing) && (status === 'active' || status === 'connecting');
  const showLocalPreview = (isVideo || screenSharing) && camEnabled;
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const connecting = status === 'connecting' || status === 'outgoing';

  const statusLabel =
    status === 'incoming'
      ? `Incoming ${callType} call`
      : status === 'outgoing'
        ? 'Ringing…'
        : status === 'connecting'
          ? 'Connecting…'
          : status === 'ended'
            ? error || 'Call ended'
            : screenSharing
              ? `Sharing screen · ${mmss}`
              : mmss;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#070a14] p-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${callType === 'video' ? 'Video' : 'Voice'} call with ${peer.displayName || peer.username}`}
    >
      {/* Ambient gamer backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      {/* Remote video (also carries remote audio for voice calls; kept mounted
          but hidden when there's no video so audio still plays). */}
      <video
        ref={setRemoteVideo}
        autoPlay
        playsInline
        className={showVideoStage ? 'absolute inset-0 h-full w-full bg-black object-contain' : 'hidden'}
      />

      {/* Local preview (video / screen share). Kept mounted for the whole
          video call and hidden via opacity when the camera is off, so the
          element (and its bound stream) is never torn down mid-call. */}
      {(isVideo || screenSharing) && (
        <video
          ref={setLocalVideo}
          autoPlay
          playsInline
          muted
          className={`absolute right-4 top-4 z-20 h-40 w-28 rounded-2xl border border-cyan-300/40 bg-black object-cover shadow-[0_0_30px_-6px_rgba(34,211,238,0.6)] transition-opacity sm:h-48 sm:w-36 ${
            showLocalPreview ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Caller identity — front and centre for audio, or overlaid for video */}
      <div className={`relative z-10 flex flex-col items-center text-center ${showVideoStage ? 'mt-6' : ''}`}>
        {!showVideoStage && (
          <div className="relative mb-5">
            {connecting && (
              <span className="absolute inset-0 -m-2 animate-ping rounded-full border-2 border-cyan-400/50" />
            )}
            <div className="rounded-full p-1 shadow-[0_0_40px_-6px_rgba(34,211,238,0.65)] ring-2 ring-cyan-300/50">
              <Avatar user={peer} size="xl" linkable={false} />
            </div>
          </div>
        )}
        <h2 className="text-2xl font-extrabold drop-shadow">{peer.displayName || 'Caller'}</h2>
        {peer.username && <p className="text-sm text-white/70">@{peer.username}</p>}
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums text-white/90 ring-1 ring-white/10 backdrop-blur">
          {screenSharing && <MonitorUp size={14} className="text-cyan-300" />}
          {statusLabel}
        </p>
        {error && status !== 'ended' && (
          <p className="mt-2 text-sm font-semibold text-rose-300">{error}</p>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-auto flex w-full flex-col items-center gap-4 pb-4">
        {status === 'ended' ? null : status === 'incoming' ? (
          <div className="flex items-center gap-12">
            <ControlButton onClick={reject} label="Decline call" variant="end">
              <PhoneOff size={26} />
            </ControlButton>
            <button
              onClick={accept}
              className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-green-500 text-white shadow-[0_0_34px_-4px_rgba(34,197,94,0.9)] transition hover:bg-green-400 active:scale-95"
              aria-label="Accept call"
            >
              <Phone size={26} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-full bg-black/30 p-2.5 ring-1 ring-white/10 backdrop-blur-xl">
              <ControlButton onClick={toggleMic} label={micEnabled ? 'Mute microphone' : 'Unmute microphone'} active={!micEnabled}>
                {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
              </ControlButton>

              {(isVideo || status === 'active') && (
                <ControlButton onClick={toggleCam} label={camEnabled ? 'Turn camera off' : 'Turn camera on'} active={camEnabled && !screenSharing}>
                  {camEnabled && !screenSharing ? <Video size={22} /> : <VideoOff size={22} />}
                </ControlButton>
              )}

              {status === 'active' && (
                <ControlButton
                  onClick={() => (screenSharing ? stopScreenShare() : shareScreen())}
                  label={screenSharing ? 'Stop sharing screen' : 'Share screen'}
                  active={screenSharing}
                >
                  {screenSharing ? <ScreenShareOff size={22} /> : <ScreenShare size={22} />}
                </ControlButton>
              )}

              <ControlButton onClick={hangup} label="End call" variant="end">
                <PhoneOff size={26} />
              </ControlButton>
            </div>

            {/* Microphone picker — reflects what's detected on this PC */}
            {mics.length > 0 && (status === 'active' || status === 'connecting') && (
              <label className="flex items-center gap-2 text-xs text-white/70">
                <Mic size={14} />
                <select
                  value={micId ?? ''}
                  onChange={(e) => switchMic(e.target.value)}
                  className="max-w-[220px] truncate rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white outline-none backdrop-blur"
                >
                  {mics.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId} className="text-slate-900">
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}
