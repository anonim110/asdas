import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCall } from '../store/call';
import { useDevices } from '../store/devices';
import { Avatar } from './Avatar';

export function CallOverlay() {
  const {
    status,
    peer,
    callType,
    localStream,
    remoteStream,
    micEnabled,
    camEnabled,
    error,
    init,
    accept,
    reject,
    hangup,
    toggleMic,
    toggleCam,
    switchMic,
  } = useCall();

  const { mics, micId, refresh } = useDevices();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

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

  // Bind media streams to the <video> elements.
  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream;
  }, [localStream, status, callType]);
  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream, status]);

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
  const showVideoStage = isVideo && (status === 'active' || status === 'connecting');
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const statusLabel =
    status === 'incoming'
      ? `Incoming ${callType} call`
      : status === 'outgoing'
        ? 'Ringing…'
        : status === 'connecting'
          ? 'Connecting…'
          : mmss;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 p-4 text-white backdrop-blur-xl">
      {/* Remote video (also carries remote audio for voice calls; kept mounted
          but hidden when there's no video so audio still plays). */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={showVideoStage ? 'absolute inset-0 h-full w-full bg-black object-contain' : 'hidden'}
      />

      {/* Local preview (video calls only) */}
      {isVideo && (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className={`absolute right-4 top-4 h-40 w-28 rounded-2xl border border-white/20 bg-black object-cover shadow-lift sm:h-48 sm:w-36 ${
            camEnabled ? '' : 'opacity-0'
          }`}
        />
      )}

      {/* Caller identity — front and centre for audio, or overlaid for video */}
      <div className={`relative z-10 flex flex-col items-center text-center ${showVideoStage ? 'mt-6' : ''}`}>
        {!showVideoStage && (
          <div className="mb-4">
            <Avatar user={peer} size="xl" linkable={false} />
          </div>
        )}
        <h2 className="text-2xl font-extrabold drop-shadow">{peer.displayName || 'Caller'}</h2>
        {peer.username && <p className="text-sm text-white/70">@{peer.username}</p>}
        <p className="mt-2 text-sm font-medium text-white/80">{statusLabel}</p>
        {error && <p className="mt-2 text-sm font-semibold text-rose-300">{error}</p>}
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-auto flex w-full flex-col items-center gap-4 pb-4">
        {status === 'incoming' ? (
          <div className="flex items-center gap-10">
            <button
              onClick={reject}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 shadow-lift transition hover:bg-rose-500 active:scale-95"
              aria-label="Decline call"
            >
              <PhoneOff size={26} />
            </button>
            <button
              onClick={accept}
              className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-green-600 shadow-lift transition hover:bg-green-500 active:scale-95"
              aria-label="Accept call"
            >
              <Phone size={26} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-5">
              <button
                onClick={toggleMic}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 ${
                  micEnabled ? 'bg-white/15 hover:bg-white/25' : 'bg-white text-slate-900'
                }`}
                aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              {isVideo && (
                <button
                  onClick={toggleCam}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95 ${
                    camEnabled ? 'bg-white/15 hover:bg-white/25' : 'bg-white text-slate-900'
                  }`}
                  aria-label={camEnabled ? 'Turn camera off' : 'Turn camera on'}
                  title={camEnabled ? 'Turn camera off' : 'Turn camera on'}
                >
                  {camEnabled ? <Video size={22} /> : <VideoOff size={22} />}
                </button>
              )}

              <button
                onClick={hangup}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 shadow-lift transition hover:bg-rose-500 active:scale-95"
                aria-label="End call"
              >
                <PhoneOff size={26} />
              </button>
            </div>

            {/* Microphone picker — reflects what's detected on this PC */}
            {mics.length > 0 && (status === 'active' || status === 'connecting') && (
              <label className="flex items-center gap-2 text-xs text-white/70">
                <Mic size={14} />
                <select
                  value={micId ?? ''}
                  onChange={(e) => switchMic(e.target.value)}
                  className="max-w-[220px] truncate rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white outline-none"
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
