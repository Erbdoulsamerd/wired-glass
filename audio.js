// Lofi + rain, generated live with the Web Audio API.
// Every track here is original: chord loops, drums, bass and a sparse melody
// are synthesised in the browser, so there are no files and no music licences.

const TRACKS = [
  {
    title: 'Wire & Window', bpm: 72, swing: 0.32, melody: 0.2,
    // [bass note, chord voicing] per bar (MIDI numbers)
    bars: [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 69]], [36, [52, 55, 59, 62]], [45, [55, 61, 65, 69]]],
    scale: [62, 65, 67, 69, 72, 74, 77],
    kick: [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
    hat:  [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,0],
  },
  {
    title: 'Pebbled Light', bpm: 78, swing: 0.28, melody: 0.16,
    bars: [[39, [51, 55, 58, 62]], [36, [51, 55, 58, 62]], [41, [56, 60, 63, 67]], [46, [56, 62, 67, 72]]],
    scale: [63, 65, 67, 70, 72, 75, 77],
    kick: [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,1,1,0],
  },
  {
    title: 'Drizzle at 4pm', bpm: 84, swing: 0.3, melody: 0.24,
    bars: [[41, [53, 57, 60, 64]], [40, [52, 55, 59, 62]], [38, [53, 57, 60, 62]], [36, [52, 55, 59, 64]]],
    scale: [65, 67, 69, 72, 74, 76, 79],
    kick: [1,0,0,1, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
  },
  {
    title: 'Last Bus, Wet Street', bpm: 68, swing: 0.34, melody: 0.14,
    bars: [[45, [55, 59, 60, 64]], [38, [53, 57, 60, 64]], [43, [55, 59, 62, 66]], [40, [56, 62, 65, 68]]],
    scale: [64, 67, 69, 71, 72, 76, 79],
    kick: [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0],
    hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  },
];
const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
const BARS_PER_TRACK = 24;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function createLofi({ onChange } = {}) {
  let ctx = null;
  let master, music, keys, melodyBus, rainGain, rainTone, crackle;
  let noise, brown, crackleBuf;
  let playing = false, timer = null;
  let trackIndex = 0, step = 0, bar = 0, nextTime = 0, lastNote = 3;
  let volume = 0.7, rainOn = true, rainSpeed = 1;
  let nextDrop = 0;

  const track = () => TRACKS[trackIndex];
  const emit = () => onChange && onChange({ playing, title: track().title, index: trackIndex, count: TRACKS.length });

  function buffer(seconds, fill) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    fill(d);
    return b;
  }
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain(); master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);

    // music runs through a dull, slightly wobbly "tape" filter
    music = ctx.createGain(); music.gain.value = 0.9;
    const tape = ctx.createBiquadFilter(); tape.type = 'lowpass'; tape.frequency.value = 2600; tape.Q.value = 0.4;
    const wobble = ctx.createOscillator(); wobble.frequency.value = 0.35;
    const wobbleAmt = ctx.createGain(); wobbleAmt.gain.value = 260;
    wobble.connect(wobbleAmt).connect(tape.frequency); wobble.start();
    music.connect(tape).connect(master);

    keys = ctx.createGain(); keys.gain.value = 0.5; keys.connect(music);

    // melody gets a soft echo
    melodyBus = ctx.createGain(); melodyBus.gain.value = 0.35;
    const echo = ctx.createDelay(1.5); const fb = ctx.createGain(); const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass'; echoTone.frequency.value = 1800; fb.gain.value = 0.32;
    melodyBus.connect(music);
    melodyBus.connect(echo); echo.connect(echoTone).connect(fb).connect(echo); echoTone.connect(music);
    melodyBus.echo = echo;

    noise = buffer(2, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    brown = buffer(4, d => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.2; } });
    crackleBuf = buffer(5, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * (0.3 + Math.random() * 0.7) : 0; });

    // vinyl crackle + hiss
    crackle = ctx.createGain(); crackle.gain.value = 0.16;
    const cr = loop(crackleBuf); const crTone = ctx.createBiquadFilter(); crTone.type = 'bandpass'; crTone.frequency.value = 2500; crTone.Q.value = 0.6;
    cr.connect(crTone).connect(crackle).connect(master); cr.start();
    const hiss = loop(noise); const hissTone = ctx.createBiquadFilter(); hissTone.type = 'highpass'; hissTone.frequency.value = 5000;
    const hissGain = ctx.createGain(); hissGain.gain.value = 0.008;
    hiss.connect(hissTone).connect(hissGain).connect(master); hiss.start();

    // rain: a hiss of droplets on glass plus a low patter
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    const r1 = loop(noise); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    rainTone = ctx.createBiquadFilter(); rainTone.type = 'lowpass'; rainTone.frequency.value = 5200;
    const r1g = ctx.createGain(); r1g.gain.value = 0.32;
    r1.connect(hp).connect(rainTone).connect(r1g).connect(rainGain); r1.start();
    const r2 = loop(brown); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const r2g = ctx.createGain(); r2g.gain.value = 0.5;
    r2.connect(lp).connect(r2g).connect(rainGain); r2.start(0, 1.3);
    rainGain.connect(master);
    applyRain(0);
  }

  /* ---------- instruments ---------- */
  function env(g, t, peak, attack, decay, sustain, release, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(peak * sustain, 0.0001), t + attack + decay);
    const hold = Math.max(dur, attack + decay);
    g.gain.setValueAtTime(Math.max(peak * sustain, 0.0001), t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + hold + release);
  }

  function epiano(t, midi, dur, vel) {
    const f = mtof(midi), g = ctx.createGain(), tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 1400 + vel * 900;
    const a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator();
    a.type = 'sine'; b.type = 'triangle'; c.type = 'sine';
    a.frequency.value = f; b.frequency.value = f; c.frequency.value = f * 2;
    b.detune.value = 6 + Math.random() * 4; a.detune.value = -4 + Math.random() * 3;
    const cg = ctx.createGain(); cg.gain.value = 0.18;
    const bg = ctx.createGain(); bg.gain.value = 0.35;
    a.connect(g); b.connect(bg).connect(g); c.connect(cg).connect(g);
    g.connect(tone).connect(keys);
    env(g, t, 0.16 * vel, 0.012, 1.1, 0.35, 0.9, dur);
    for (const o of [a, b, c]) { o.start(t); o.stop(t + dur + 1); }
  }

  function bass(t, midi, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), tone = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = mtof(midi);
    tone.type = 'lowpass'; tone.frequency.value = 420;
    o.connect(tone).connect(g).connect(music);
    env(g, t, 0.5, 0.02, 0.4, 0.55, 0.25, dur);
    o.start(t); o.stop(t + dur + 0.4);
  }

  function pluck(t, midi, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(midi);
    o.detune.setValueAtTime(-12, t); o.detune.linearRampToValueAtTime(0, t + 0.08);
    o.connect(g).connect(melodyBus);
    env(g, t, 0.22 * vel, 0.006, 0.35, 0.2, 0.5, 0.25);
    o.start(t); o.stop(t + 1.2);
  }

  function kick(t, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(music); o.start(t); o.stop(t + 0.4);
  }

  function snare(t, vel) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    s.connect(bp).connect(g).connect(music); s.start(t, Math.random()); s.stop(t + 0.22);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    og.gain.setValueAtTime(0.18 * vel, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og).connect(music); o.start(t); o.stop(t + 0.14);
  }

  function hat(t, vel) {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07 * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(hp).connect(g).connect(music); s.start(t, Math.random()); s.stop(t + 0.06);
  }

  // single drops tapping the glass
  function drip(t) {
    const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    const f = 1800 + Math.random() * 2600;
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.05);
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3;
    g.gain.setValueAtTime(0.025 + Math.random() * 0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(bp).connect(g).connect(rainGain); o.start(t); o.stop(t + 0.08);
  }

  /* ---------- sequencer ---------- */
  function scheduleStep(t) {
    const tr = track();
    const sixteenth = 60 / tr.bpm / 4;
    const human = () => (Math.random() - 0.5) * 0.012;
    const swingT = step % 2 === 1 ? tr.swing * sixteenth : 0;
    const at = t + swingT;
    const [root, chord] = tr.bars[bar % tr.bars.length];
    const barLen = sixteenth * 16;

    if (step === 0) {
      // strum the chord a little, lowest note first
      chord.forEach((n, i) => epiano(t + i * 0.018 + human(), n, barLen * 0.92, 0.75 + Math.random() * 0.2));
      bass(t + human(), root, sixteenth * 6);
    }
    if (step === 10 && Math.random() < 0.6) bass(at + human(), root + (Math.random() < 0.5 ? 7 : 12), sixteenth * 3);
    if (step === 8 && Math.random() < 0.35) chord.slice(1).forEach((n, i) => epiano(at + i * 0.02, n, sixteenth * 6, 0.45));

    // drums sit out the first bar of each track
    if (bar > 0) {
      if (tr.kick[step]) kick(at + human(), 0.85 + Math.random() * 0.15);
      if (SNARE[step]) snare(at + 0.012 + human(), 0.8 + Math.random() * 0.2);
      if (tr.hat[step]) hat(at + human(), step % 4 === 0 ? 1 : 0.55 + Math.random() * 0.3);
    }

    if (bar > 1 && step % 2 === 0 && Math.random() < tr.melody) {
      lastNote = Math.max(0, Math.min(tr.scale.length - 1, lastNote + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      pluck(at + human(), tr.scale[lastNote], 0.6 + Math.random() * 0.4);
    }
  }

  function tick() {
    const now = ctx.currentTime;
    while (nextTime < now + 0.15) {
      scheduleStep(nextTime);
      nextTime += 60 / track().bpm / 4;
      step = (step + 1) % 16;
      if (step === 0) {
        bar++;
        if (bar >= BARS_PER_TRACK) { trackIndex = (trackIndex + 1) % TRACKS.length; startTrack(nextTime + 0.6); emit(); }
      }
    }
    // rain taps follow the rain speed
    if (rainOn) {
      while (nextDrop < now + 0.15) {
        drip(Math.max(nextDrop, now));
        nextDrop += -Math.log(1 - Math.random()) / (1.5 + 5 * rainSpeed);
      }
    }
  }

  function startTrack(at) {
    step = 0; bar = 0; lastNote = 3;
    nextTime = at;
    melodyBus.echo.delayTime.setValueAtTime(60 / track().bpm * 0.75, at);
  }

  function applyRain(ramp = 0.6) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const level = rainOn ? 0.22 + 0.16 * Math.min(rainSpeed, 3) / 3 : 0.0001;
    rainGain.gain.cancelScheduledValues(t);
    rainGain.gain.setTargetAtTime(level, t, ramp / 3);
    rainTone.frequency.setTargetAtTime(3800 + 1200 * rainSpeed, t, 0.3);
    nextDrop = t;
  }

  return {
    async play() {
      if (!ctx) init();
      if (ctx.state !== 'running') await ctx.resume();
      if (playing) return;
      playing = true;
      startTrack(ctx.currentTime + 0.1);
      master.gain.setTargetAtTime(volume, ctx.currentTime, 0.15);
      timer = setInterval(tick, 25);
      emit();
    },
    pause() {
      if (!ctx || !playing) return;
      playing = false;
      clearInterval(timer); timer = null;
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
      setTimeout(() => { if (!playing) ctx.suspend(); }, 600);
      emit();
    },
    next() {
      trackIndex = (trackIndex + 1) % TRACKS.length;
      if (ctx && playing) startTrack(ctx.currentTime + 0.25);
      emit();
    },
    setVolume(v) {
      volume = v;
      if (ctx && playing) master.gain.setTargetAtTime(Math.max(v, 0.0001), ctx.currentTime, 0.05);
    },
    setRain(on, speed) { rainOn = on; rainSpeed = speed; applyRain(); },
    get state() { return { playing, title: track().title, index: trackIndex, count: TRACKS.length }; },
  };
}
