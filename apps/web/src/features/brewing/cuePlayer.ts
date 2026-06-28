import type { BrewCue } from "@pourover/domain/session";
import { CUE_TONES, VIBRATE_PATTERNS, type ToneSpec } from "./cueTones";
import { vibrate } from "./haptics";

export type CuePlayer = {
  readonly unlock: () => void;
  readonly play: (kind: BrewCue["kind"], muted: boolean) => void;
};

function getAudioCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function createCuePlayer(): CuePlayer {
  const Ctor = getAudioCtor();
  let ctx: AudioContext | null = null;

  const ensureCtx = (): AudioContext | null => {
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const playTone = (spec: ToneSpec): void => {
    const ac = ensureCtx();
    if (!ac) return;
    if (spec.toneMs <= 0) return; // 비양수 길이 → Web Audio ramp 미정의 동작 방지
    let t = ac.currentTime;
    const dur = spec.toneMs / 1000;
    for (const freq of spec.freqHz) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(spec.peakGain, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur + spec.gapMs / 1000;
    }
  };

  return {
    unlock: () => {
      const ac = ensureCtx();
      if (!ac) return;
      // 무음 blip 으로 iOS 제스처 잠금 해제
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.01);
    },
    play: (kind, muted) => {
      if (!muted) playTone(CUE_TONES[kind]);
      vibrate(VIBRATE_PATTERNS[kind]);
    },
  };
}
