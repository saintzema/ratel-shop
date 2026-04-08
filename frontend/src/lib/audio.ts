/**
 * Premium Apple-like glass chime notification sound 
 * Calming, rich, ~2.5s duration.
 * Generated via Web Audio API for zero latency and high fidelity.
 */
let lastPlayedTime = 0;
const DING_THROTTLE_MS = 3000; // 3 seconds

export const playDingSound = () => {
    if (typeof window === 'undefined') return;
    
    // Throttle frequency to prevent multiple rapid ringings
    const nowTime = Date.now();
    if (nowTime - lastPlayedTime < DING_THROTTLE_MS) return;
    lastPlayedTime = nowTime;
    try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const now = audioCtx.currentTime;
        
        // Premium glass chime: C6 base with warm harmonics, higher gain, longer sustain
        const layers = [
            { freq: 1047,    gain: 0.22, decay: 2.2 },  // C6 — warm fundamental
            { freq: 1319,    gain: 0.16, decay: 1.8 },  // E6 — major third brightness
            { freq: 1568,    gain: 0.12, decay: 1.5 },  // G6 — perfect fifth fullness
            { freq: 2093,    gain: 0.07, decay: 1.2 },  // C7 — octave shimmer
            { freq: 2637,    gain: 0.04, decay: 0.9 },  // E7 — sparkle top
        ];
        
        layers.forEach(({ freq, gain: peakGain, decay }) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.995, now + decay);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.02);
            gainNode.gain.setValueAtTime(peakGain * 0.85, now + 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + decay + 0.1);
        });

        // Second strike echo — subtle repeat at 180ms for depth
        setTimeout(() => {
            try {
                const echoNow = audioCtx.currentTime;
                [1047, 1568].forEach(freq => {
                    const osc = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, echoNow);
                    g.gain.setValueAtTime(0, echoNow);
                    g.gain.linearRampToValueAtTime(0.06, echoNow + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, echoNow + 1.2);
                    osc.connect(g);
                    g.connect(audioCtx.destination);
                    osc.start(echoNow);
                    osc.stop(echoNow + 1.3);
                });
            } catch { /* ignore */ }
        }, 180);
    } catch (e) {
        console.log("Audio play blocked:", e);
    }
};
