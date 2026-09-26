// Client-only. Every UI sound is synthesised at runtime with the Web Audio API — no audio
// files, no licensing to worry about, and a short procedural blip is genuinely the authentic
// early-web/AIM/Nokia sound this reskin is going for, not a compromise for one.
//
// The AudioContext is created lazily, on the first real call — browsers block audio started
// outside a user gesture, and the sound toggle's own click is that gesture.

export type SoundKind = "click" | "toggle" | "notify";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function tone(context: AudioContext, { freq, start, duration, type, gain }: { freq: number; start: number; duration: number; type: OscillatorType; gain: number }) {
  const osc = context.createOscillator();
  const vol = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  // Quick fade in/out avoids an audible click/pop at the edges of the blip.
  vol.gain.setValueAtTime(0, start);
  vol.gain.linearRampToValueAtTime(gain, start + 0.008);
  vol.gain.linearRampToValueAtTime(0, start + duration);
  osc.connect(vol);
  vol.connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Plays a short synthesised blip. Never throws — a sound failure must never block a click. */
export function playSound(kind: SoundKind): void {
  try {
    const context = getContext();
    if (!context) return;
    // Browsers suspend a freshly-created context until it's resumed inside a user gesture.
    void context.resume();
    const now = context.currentTime;

    if (kind === "click") {
      tone(context, { freq: 880, start: now, duration: 0.05, type: "square", gain: 0.05 });
    } else if (kind === "toggle") {
      tone(context, { freq: 660, start: now, duration: 0.07, type: "sine", gain: 0.05 });
    } else {
      // "notify": a quick two-note rising chime.
      tone(context, { freq: 660, start: now, duration: 0.09, type: "sine", gain: 0.06 });
      tone(context, { freq: 990, start: now + 0.09, duration: 0.12, type: "sine", gain: 0.06 });
    }
  } catch {
    // Unsupported/locked-down environment: silently do nothing.
  }
}

/** Pure logic, unit-tested: should a notification ping play for this unread-count change? */
export function shouldPlayNotifySound(previousUnread: number | null, nextUnread: number): boolean {
  // No baseline yet (first load): never ping for whatever was already unread.
  if (previousUnread === null) return false;
  return nextUnread > previousUnread;
}
