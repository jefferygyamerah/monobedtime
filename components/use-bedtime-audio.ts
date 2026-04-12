"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOUNDSCAPE_STORAGE_KEY = "monobedtime-soundscape";

export type Soundscape = "forest" | "sea" | "city" | "fire";

type BedtimeAudioState = {
  activeSoundscape: Soundscape | null;
  selectSoundscape: (soundscape: Soundscape) => void;
};

type SoundscapeCleanup = () => void;

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };

  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function createNoiseBuffer(context: AudioContext, durationSeconds = 2.5) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createNoiseSource(context: AudioContext, durationSeconds?: number) {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, durationSeconds);
  source.loop = true;
  return source;
}

function stopNode(node: AudioScheduledSourceNode | null) {
  if (!node) {
    return;
  }

  try {
    node.stop();
  } catch {
    // The node may have already finished by the time cleanup runs.
  }

  node.disconnect();
}

function maybeCreatePanner(context: AudioContext) {
  if (typeof context.createStereoPanner !== "function") {
    return null;
  }

  return context.createStereoPanner();
}

function startForestSoundscape(context: AudioContext, destination: GainNode): SoundscapeCleanup {
  const wind = createNoiseSource(context, 5);
  const windLowpass = context.createBiquadFilter();
  const windHighpass = context.createBiquadFilter();
  const windGain = context.createGain();
  const windLfo = context.createOscillator();
  const windDepth = context.createGain();

  wind.playbackRate.value = 0.2;
  windLowpass.type = "lowpass";
  windLowpass.frequency.value = 850;
  windHighpass.type = "highpass";
  windHighpass.frequency.value = 140;
  windGain.gain.value = 0.032;
  windLfo.type = "sine";
  windLfo.frequency.value = 0.07;
  windDepth.gain.value = 0.018;

  wind.connect(windLowpass);
  windLowpass.connect(windHighpass);
  windHighpass.connect(windGain);
  windGain.connect(destination);
  windLfo.connect(windDepth);
  windDepth.connect(windGain.gain);

  const insects = createNoiseSource(context, 3);
  const insectsHighpass = context.createBiquadFilter();
  const insectsLowpass = context.createBiquadFilter();
  const insectsGain = context.createGain();

  insects.playbackRate.value = 1.25;
  insectsHighpass.type = "highpass";
  insectsHighpass.frequency.value = 2600;
  insectsLowpass.type = "lowpass";
  insectsLowpass.frequency.value = 5400;
  insectsGain.gain.value = 0.008;

  insects.connect(insectsHighpass);
  insectsHighpass.connect(insectsLowpass);
  insectsLowpass.connect(insectsGain);
  insectsGain.connect(destination);

  wind.start();
  insects.start();
  windLfo.start();

  let disposed = false;
  let chirpTimeout: number | null = null;

  const scheduleChirp = () => {
    chirpTimeout = window.setTimeout(
      () => {
        if (disposed) {
          return;
        }

        const now = context.currentTime;
        const chirp = context.createOscillator();
        const chirpGain = context.createGain();
        chirp.type = "triangle";
        chirp.frequency.setValueAtTime(1200 + Math.random() * 500, now);
        chirp.frequency.exponentialRampToValueAtTime(2200 + Math.random() * 800, now + 0.16);
        chirpGain.gain.setValueAtTime(0.0001, now);
        chirpGain.gain.exponentialRampToValueAtTime(0.006, now + 0.03);
        chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        chirp.connect(chirpGain);
        chirpGain.connect(destination);
        chirp.start(now);
        chirp.stop(now + 0.28);

        scheduleChirp();
      },
      4500 + Math.random() * 4200,
    );
  };

  scheduleChirp();

  return () => {
    disposed = true;

    if (chirpTimeout !== null) {
      window.clearTimeout(chirpTimeout);
    }

    stopNode(wind);
    stopNode(insects);
    stopNode(windLfo);
  };
}

function startSeaSoundscape(context: AudioContext, destination: GainNode): SoundscapeCleanup {
  const swell = createNoiseSource(context, 6);
  const swellLowpass = context.createBiquadFilter();
  const swellHighpass = context.createBiquadFilter();
  const swellGain = context.createGain();
  const swellLfo = context.createOscillator();
  const swellDepth = context.createGain();

  swell.playbackRate.value = 0.18;
  swellLowpass.type = "lowpass";
  swellLowpass.frequency.value = 720;
  swellHighpass.type = "highpass";
  swellHighpass.frequency.value = 70;
  swellGain.gain.value = 0.038;
  swellLfo.type = "sine";
  swellLfo.frequency.value = 0.12;
  swellDepth.gain.value = 0.03;

  swell.connect(swellLowpass);
  swellLowpass.connect(swellHighpass);
  swellHighpass.connect(swellGain);
  swellGain.connect(destination);
  swellLfo.connect(swellDepth);
  swellDepth.connect(swellGain.gain);

  const foam = createNoiseSource(context, 3);
  const foamHighpass = context.createBiquadFilter();
  const foamLowpass = context.createBiquadFilter();
  const foamGain = context.createGain();
  const foamLfo = context.createOscillator();
  const foamDepth = context.createGain();

  foam.playbackRate.value = 0.72;
  foamHighpass.type = "highpass";
  foamHighpass.frequency.value = 1100;
  foamLowpass.type = "lowpass";
  foamLowpass.frequency.value = 3200;
  foamGain.gain.value = 0.01;
  foamLfo.type = "triangle";
  foamLfo.frequency.value = 0.18;
  foamDepth.gain.value = 0.012;

  foam.connect(foamHighpass);
  foamHighpass.connect(foamLowpass);
  foamLowpass.connect(foamGain);
  foamGain.connect(destination);
  foamLfo.connect(foamDepth);
  foamDepth.connect(foamGain.gain);

  swell.start();
  foam.start();
  swellLfo.start();
  foamLfo.start();

  return () => {
    stopNode(swell);
    stopNode(foam);
    stopNode(swellLfo);
    stopNode(foamLfo);
  };
}

function startCitySoundscape(context: AudioContext, destination: GainNode): SoundscapeCleanup {
  const rumble = createNoiseSource(context, 5);
  const rumbleLowpass = context.createBiquadFilter();
  const rumbleHighpass = context.createBiquadFilter();
  const rumbleGain = context.createGain();

  rumble.playbackRate.value = 0.14;
  rumbleLowpass.type = "lowpass";
  rumbleLowpass.frequency.value = 240;
  rumbleHighpass.type = "highpass";
  rumbleHighpass.frequency.value = 40;
  rumbleGain.gain.value = 0.03;

  rumble.connect(rumbleLowpass);
  rumbleLowpass.connect(rumbleHighpass);
  rumbleHighpass.connect(rumbleGain);
  rumbleGain.connect(destination);

  const air = createNoiseSource(context, 4);
  const airHighpass = context.createBiquadFilter();
  const airLowpass = context.createBiquadFilter();
  const airGain = context.createGain();

  air.playbackRate.value = 0.42;
  airHighpass.type = "highpass";
  airHighpass.frequency.value = 900;
  airLowpass.type = "lowpass";
  airLowpass.frequency.value = 2600;
  airGain.gain.value = 0.006;

  air.connect(airHighpass);
  airHighpass.connect(airLowpass);
  airLowpass.connect(airGain);
  airGain.connect(destination);

  rumble.start();
  air.start();

  let disposed = false;
  let trafficTimeout: number | null = null;

  const scheduleTraffic = () => {
    trafficTimeout = window.setTimeout(
      () => {
        if (disposed) {
          return;
        }

        const pass = context.createBufferSource();
        pass.buffer = createNoiseBuffer(context, 1.4);
        const passFilter = context.createBiquadFilter();
        const passGain = context.createGain();
        const panner = maybeCreatePanner(context);
        const now = context.currentTime;
        const startPan = Math.random() > 0.5 ? -0.7 : 0.7;
        const endPan = -startPan * 0.45;

        pass.playbackRate.value = 0.34 + Math.random() * 0.18;
        passFilter.type = "bandpass";
        passFilter.frequency.value = 420;
        passFilter.Q.value = 0.4;

        passGain.gain.setValueAtTime(0.0001, now);
        passGain.gain.exponentialRampToValueAtTime(0.02, now + 0.35);
        passGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        pass.connect(passFilter);
        passFilter.connect(passGain);

        if (panner) {
          panner.pan.setValueAtTime(startPan, now);
          panner.pan.linearRampToValueAtTime(endPan, now + 1.2);
          passGain.connect(panner);
          panner.connect(destination);
        } else {
          passGain.connect(destination);
        }

        pass.start(now);
        pass.stop(now + 1.3);
        scheduleTraffic();
      },
      5200 + Math.random() * 4200,
    );
  };

  scheduleTraffic();

  return () => {
    disposed = true;

    if (trafficTimeout !== null) {
      window.clearTimeout(trafficTimeout);
    }

    stopNode(rumble);
    stopNode(air);
  };
}

function startFireSoundscape(context: AudioContext, destination: GainNode): SoundscapeCleanup {
  const bed = createNoiseSource(context, 4);
  const bedLowpass = context.createBiquadFilter();
  const bedHighpass = context.createBiquadFilter();
  const bedGain = context.createGain();
  const flutter = context.createOscillator();
  const flutterDepth = context.createGain();

  bed.playbackRate.value = 0.33;
  bedLowpass.type = "lowpass";
  bedLowpass.frequency.value = 920;
  bedHighpass.type = "highpass";
  bedHighpass.frequency.value = 120;
  bedGain.gain.value = 0.03;
  flutter.type = "sine";
  flutter.frequency.value = 0.4;
  flutterDepth.gain.value = 0.012;

  bed.connect(bedLowpass);
  bedLowpass.connect(bedHighpass);
  bedHighpass.connect(bedGain);
  bedGain.connect(destination);
  flutter.connect(flutterDepth);
  flutterDepth.connect(bedGain.gain);

  bed.start();
  flutter.start();

  let disposed = false;
  let crackleTimeout: number | null = null;

  const scheduleCrackle = () => {
    crackleTimeout = window.setTimeout(
      () => {
        if (disposed) {
          return;
        }

        const crackle = context.createBufferSource();
        crackle.buffer = createNoiseBuffer(context, 0.12);
        const crackleFilter = context.createBiquadFilter();
        const crackleGain = context.createGain();
        const now = context.currentTime;

        crackle.playbackRate.value = 1.2 + Math.random() * 1.1;
        crackleFilter.type = "bandpass";
        crackleFilter.frequency.value = 2200 + Math.random() * 1800;
        crackleFilter.Q.value = 1.3;

        crackleGain.gain.setValueAtTime(0.0001, now);
        crackleGain.gain.exponentialRampToValueAtTime(0.012 + Math.random() * 0.028, now + 0.01);
        crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        crackle.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(destination);
        crackle.start(now);
        crackle.stop(now + 0.11);

        scheduleCrackle();
      },
      140 + Math.random() * 320,
    );
  };

  scheduleCrackle();

  return () => {
    disposed = true;

    if (crackleTimeout !== null) {
      window.clearTimeout(crackleTimeout);
    }

    stopNode(bed);
    stopNode(flutter);
  };
}

const SOUNDSCAPE_FACTORIES: Record<
  Soundscape,
  (context: AudioContext, destination: GainNode) => SoundscapeCleanup
> = {
  forest: startForestSoundscape,
  sea: startSeaSoundscape,
  city: startCitySoundscape,
  fire: startFireSoundscape,
};

export function useBedtimeAudio(): BedtimeAudioState {
  const [activeSoundscape, setActiveSoundscape] = useState<Soundscape | null>(null);
  const readyRef = useRef(false);
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const cleanupRef = useRef<SoundscapeCleanup | null>(null);
  const startTokenRef = useRef(0);

  const ensureAudioContext = useCallback(() => {
    if (contextRef.current && masterGainRef.current) {
      return contextRef.current;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return null;
    }

    const context = new AudioContextConstructor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.42;
    masterGain.connect(context.destination);

    contextRef.current = context;
    masterGainRef.current = masterGain;
    return context;
  }, []);

  const resumeAudio = useCallback(async () => {
    const context = ensureAudioContext();

    if (!context) {
      return null;
    }

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return null;
      }
    }

    return context;
  }, [ensureAudioContext]);

  const stopSoundscape = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const startSoundscape = useCallback(
    async (soundscape: Soundscape) => {
      stopSoundscape();
      const token = startTokenRef.current + 1;
      startTokenRef.current = token;

      const context = await resumeAudio();
      const masterGain = masterGainRef.current;

      if (!context || !masterGain || startTokenRef.current !== token) {
        return;
      }

      cleanupRef.current = SOUNDSCAPE_FACTORIES[soundscape](context, masterGain);
    },
    [resumeAudio, stopSoundscape],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    readyRef.current = true;
    const saved = window.localStorage.getItem(SOUNDSCAPE_STORAGE_KEY);

    if (saved === "forest" || saved === "sea" || saved === "city" || saved === "fire") {
      setActiveSoundscape(saved);
    }
  }, []);

  useEffect(() => {
    if (!readyRef.current || typeof window === "undefined") {
      return;
    }

    if (activeSoundscape) {
      window.localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, activeSoundscape);
      void startSoundscape(activeSoundscape);
      return;
    }

    startTokenRef.current += 1;
    window.localStorage.removeItem(SOUNDSCAPE_STORAGE_KEY);
    stopSoundscape();
  }, [activeSoundscape, startSoundscape, stopSoundscape]);

  useEffect(() => {
    return () => {
      startTokenRef.current += 1;
      stopSoundscape();

      if (contextRef.current) {
        void contextRef.current.close();
        contextRef.current = null;
      }
    };
  }, [stopSoundscape]);

  const selectSoundscape = useCallback((soundscape: Soundscape) => {
    setActiveSoundscape((current) => (current === soundscape ? null : soundscape));
  }, []);

  return {
    activeSoundscape,
    selectSoundscape,
  };
}
