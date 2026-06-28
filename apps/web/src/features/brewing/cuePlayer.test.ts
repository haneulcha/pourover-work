import { afterEach, describe, expect, it, vi } from "vitest";
import { createCuePlayer } from "./cuePlayer";
import * as haptics from "./haptics";

describe("createCuePlayer (jsdom: AudioContext 없음)", () => {
  it("play 는 throw 없이 동작하고 진동을 울린다 (오디오는 no-op)", () => {
    const spy = vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const player = createCuePlayer();
    expect(() => player.play("pour", false)).not.toThrow();
    expect(spy).toHaveBeenCalledWith([60, 50, 60]);
    spy.mockRestore();
  });

  it("muted=true 여도 진동은 울린다 (소리만 끔)", () => {
    const spy = vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const player = createCuePlayer();
    player.play("lead-in", true);
    expect(spy).toHaveBeenCalledWith([40]);
    spy.mockRestore();
  });

  it("unlock 은 throw 하지 않는다", () => {
    const player = createCuePlayer();
    expect(() => player.unlock()).not.toThrow();
  });
});

// 가짜 AudioContext 를 주입해 *오디오 경로 자체* 가 올바로 배선되는지 검증.
// (위 jsdom 테스트는 "안 터진다"만 보장 — 실제 음 생성은 이 블록에서.)
describe("createCuePlayer (오디오 경로 주입 검증)", () => {
  function installFakeAudio() {
    const oscillators: { freq: number; started: boolean; stopped: boolean }[] = [];
    class FakeParam {
      value = 0;
      setValueAtTime() {}
      linearRampToValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class FakeAudioContext {
      currentTime = 0;
      state = "running";
      destination = {};
      resume() { return Promise.resolve(); }
      createGain() {
        return { gain: new FakeParam(), connect: () => ({ connect: () => {} }) };
      }
      createOscillator() {
        const rec = { freq: 0, started: false, stopped: false };
        oscillators.push(rec);
        return {
          type: "sine",
          frequency: { set value(v: number) { rec.freq = v; }, get value() { return rec.freq; } },
          connect: () => ({ connect: () => {} }),
          start: () => { rec.started = true; },
          stop: () => { rec.stopped = true; },
        };
      }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    return oscillators;
  }

  afterEach(() => {
    delete (window as { AudioContext?: unknown }).AudioContext;
    vi.restoreAllMocks();
  });

  it("pour 큐는 freqHz 길이만큼 oscillator 를 만들고 start/stop 한다", () => {
    vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const oscillators = installFakeAudio();
    const player = createCuePlayer();
    player.play("pour", false); // freqHz [660, 880]
    expect(oscillators.map((o) => o.freq)).toEqual([660, 880]);
    expect(oscillators.every((o) => o.started && o.stopped)).toBe(true);
  });

  it("muted=true 면 oscillator 를 만들지 않는다 (소리 없음)", () => {
    vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const oscillators = installFakeAudio();
    const player = createCuePlayer();
    player.play("pour", true);
    expect(oscillators).toHaveLength(0);
  });
});
