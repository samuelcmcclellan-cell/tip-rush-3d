/* ============================================
   audio.js — Web Audio API Sound Effects
   Oscillator-based, no external files needed
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.Audio = (function() {
    let audioCtx = null;
    const MASTER_VOLUME = 0.12;

    /**
     * Initialize AudioContext on first user interaction
     */
    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Play a tone with frequency sweep
     * @param {number} startFreq - Starting frequency in Hz
     * @param {number} endFreq - Ending frequency in Hz
     * @param {number} duration - Sweep duration in seconds
     * @param {number} fadeOut - Total sound duration before silence
     * @param {string} type - Oscillator type (sine, square, sawtooth, triangle)
     */
    function playTone(startFreq, endFreq, duration, fadeOut, type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(MASTER_VOLUME, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeOut);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + fadeOut + 0.01);
    }

    /**
     * Tip pickup — quick ascending tone
     */
    function collect() {
        playTone(500, 900, 0.1, 0.15, 'sine');
    }

    /**
     * Grab food from counter
     */
    function pickup() {
        playTone(300, 500, 0.08, 0.12, 'sine');
    }

    /**
     * Deliver food to table — rising three-note feel
     */
    function deliver() {
        if (!audioCtx) return;
        // Three rising tones in sequence
        const notes = [
            { start: 400, end: 500, delay: 0 },
            { start: 600, end: 700, delay: 0.07 },
            { start: 800, end: 900, delay: 0.14 }
        ];
        notes.forEach(function(n) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.start, audioCtx.currentTime + n.delay);
            osc.frequency.linearRampToValueAtTime(n.end, audioCtx.currentTime + n.delay + 0.06);
            gain.gain.setValueAtTime(MASTER_VOLUME, audioCtx.currentTime + n.delay);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + n.delay + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + n.delay);
            osc.stop(audioCtx.currentTime + n.delay + 0.12);
        });
    }

    /**
     * Milkshake collected — bright ascending
     */
    function powerup() {
        playTone(600, 1200, 0.15, 0.2, 'sine');
    }

    /**
     * Game over — descending sawtooth
     */
    function gameover() {
        playTone(600, 100, 0.5, 0.6, 'sawtooth');
    }

    return {
        init: init,
        collect: collect,
        pickup: pickup,
        deliver: deliver,
        powerup: powerup,
        gameover: gameover
    };
})();
