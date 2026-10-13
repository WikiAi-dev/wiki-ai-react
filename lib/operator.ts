import { apiText, telephonyApi } from "./telephony"

// An operator's side of a call: the browser's microphone and the caller's
// voice over WebRTC to voice-engine, which takes the call over from the
// assistant (telephony-service internal/bridge).

/** A call the operator answered. */
export interface OperatorCall {
  callId: string
  pc: RTCPeerConnection
  /** The caller's voice, for an <audio> element. */
  remote: MediaStream
  setMuted: (muted: boolean) => void
  /** Ends the call for everyone. */
  hangup: () => Promise<void>
}

/** Why answering failed, for the toast. */
export class AnswerError extends Error {
  constructor(
    public kind: "microphone" | "taken" | "gone" | "failed",
    message = "",
  ) {
    super(message || kind)
  }
}

// gatherWait bounds collecting the browser's candidates: the offer carries
// them all (the engine doesn't trickle).
const gatherWait = 2000

function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", done)
        resolve()
      }
    }
    pc.addEventListener("icegatheringstatechange", done)
    setTimeout(resolve, gatherWait)
  })
}

/** Answers a call in progress: the assistant stops and the operator talks. */
export async function answerCall(token: string, callId: string, locale: string): Promise<OperatorCall> {
  let mic: MediaStream
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  } catch {
    throw new AnswerError("microphone")
  }
  const ice = await telephonyApi.liveIce(token)
  const pc = new RTCPeerConnection({ iceServers: ice.status === "success" && ice.response ? ice.response.ice_servers : [] })
  const remote = new MediaStream()
  pc.ontrack = (e) => remote.addTrack(e.track)
  for (const track of mic.getTracks()) pc.addTrack(track, mic)
  const stop = () => {
    for (const track of mic.getTracks()) track.stop()
    pc.close()
  }
  try {
    await pc.setLocalDescription(await pc.createOffer())
    await gathered(pc)
    const res = await telephonyApi.answerCall(token, callId, pc.localDescription?.sdp ?? "")
    if (res.status !== "success" || !res.response) {
      const kind = res.message?.includes("already answers") ? "taken" : res.message?.includes("isn't in progress") ? "gone" : "failed"
      throw new AnswerError(kind, apiText(res.message, locale))
    }
    await pc.setRemoteDescription({ type: "answer", sdp: res.response.sdp })
  } catch (e) {
    stop()
    throw e instanceof AnswerError ? e : new AnswerError("failed", String(e))
  }
  return {
    callId,
    pc,
    remote,
    setMuted: (muted) => {
      for (const track of mic.getAudioTracks()) track.enabled = !muted
    },
    hangup: async () => {
      try {
        await telephonyApi.hangupCall(token, callId)
      } finally {
        stop()
      }
    },
  }
}
