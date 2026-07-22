export class AudioTrack {

    // Audio track constructor
    constructor(ctx, options, destination) {
        
        // Settings
        this.ctx = ctx;
        this.options = options;
        this.externalDestination = destination;
        this.currentIntensity = 1.0;
        this.activeSource = null;
        this.timerId = null;
        this.isFadingOut = false; // State flag for active fade-outs

        // Node Architecture Setup
        this.fadeNode = new GainNode(this.ctx, { gain: 1.0 });
        this.trimNode = new GainNode(this.ctx, { gain: 1.0 });
        this.highPass = new BiquadFilterNode(this.ctx, { type: "highpass", frequency: 20, Q: 1 });
        this.lowNode = new BiquadFilterNode(this.ctx, { type: "lowpass", frequency: 20000, Q: 0.707 });
        this.pannerNode = new StereoPannerNode(this.ctx, { pan: 0.0 });
        this.gainNode = new GainNode(this.ctx, { gain: 1.0 });
       
        // Mute State Flags
        this.isMuted = false;
        this.preMuteVol = 1.0;

        // Routing Chain
        this.fadeNode.connect(this.trimNode);
        this.trimNode.connect(this.highPass);
        this.highPass.connect(this.lowNode);
        this.lowNode.connect(this.pannerNode);
        this.pannerNode.connect(this.gainNode);
        this.gainNode.connect(this.externalDestination);

        // Track Audio Defaults (Cached values)
        this.userSettings = {
            VOL: 1.0,
            PAN: 0.0,
            LOW_PASS: 100,  // Stored as slider Pct (0-100)
            HIGH_PASS: 0,   // Stored as slider Pct (0-100)
            TRIM: 1.0
        };
    }

    toggleTrack(key, mode, fadeInTime, fadeOutTime) {
        // If it's playing normally (and NOT in the middle of fading out), start the fade-out
        if (this.activeSource && !this.isFadingOut) {
            this.stopTrack(fadeOutTime);
        } else {
            // If it's stopped OR currently fading out: cancel the fade and start fresh!
            if (this.isFadingOut) {
                this.cancelAndStopImmediately();
            }
            this.playTrack(key, mode, fadeInTime);
        }
    }

    cancelAndStopImmediately() {
        // 1. Clear any pending setTimeout triggers
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        // 2. Cancel scheduled Web Audio gain ramps on fadeNode
        if (this.fadeNode) {
            this.fadeNode.gain.cancelScheduledValues(this.ctx.currentTime);
        }

        // 3. Stop and cleanup the active audio source
        if (this.activeSource) {
            try {
                this.activeSource.stop();
                this.activeSource.disconnect();
            } catch (e) {
                // Source might have already stopped naturally
            }
            this.activeSource = null;
        }

        this.isFadingOut = false;
    }

    // Play the track audio track
    playTrack(key, mode, fadeInTime) {
        this.cancelAndStopImmediately(); // Clear any outstanding sources instantly
        const item = this.options[key];
        if (!item || !item.buffer) return;

        const source = this.ctx.createBufferSource();
        source.buffer = item.buffer;
        source.loop = (mode === "loop");
        
        source.connect(this.fadeNode);
        source.start(0);
        
        this.activeSource = source;
        this.fadeIn(fadeInTime);
    }

    // Track audio fade in
    fadeIn(fadeInTime) {
        const now = this.ctx.currentTime;
        this.fadeNode.gain.cancelScheduledValues(now);
        if (fadeInTime <= 0) {
            this.fadeNode.gain.setValueAtTime(1.0, now);
        } else {
            this.fadeNode.gain.setValueAtTime(0, now);
            this.fadeNode.gain.linearRampToValueAtTime(1.0, now + fadeInTime);
        }
    }

    stopTrack(fadeOutTime) {
        this.isFadingOut = true;
        
        // Ramp volume down to 0 on fadeNode
        const now = this.ctx.currentTime;
        this.fadeNode.gain.cancelScheduledValues(now);
        this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value, now);
        this.fadeNode.gain.linearRampToValueAtTime(0, now + fadeOutTime);

        // Schedule actual source cleanup when fade completes
        this.timerId = setTimeout(() => {
            this.cancelAndStopImmediately(); // Cleans up source & resets flags
        }, fadeOutTime * 1000);
    }

    // Track set audio volume (Expects 0-100 raw slider val)
    setVolume(rawValue) {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        const gainValue = Math.pow(parseFloat(rawValue) / 100, 2); // Logarithmic volume curve
        this.userSettings.VOL = gainValue; 
        
        if (!this.isMuted) {
            this.gainNode.gain.setTargetAtTime(gainValue, now, 0.01);
        }
    }

    // Track set audio pan
    setPan(panValue) {
        const now = this.ctx.currentTime;
        this.userSettings.PAN = panValue;
        this.pannerNode.pan.cancelScheduledValues(now);
        this.pannerNode.pan.setTargetAtTime(panValue, now, 0.02); 
        return panValue; 
    }

    // Track set audio low pass (Expects 0-100 slider value)
    setLowPass(val) {
        const minFreq = 20;
        const maxFreq = 20000;
        const freq = (val === 100) ? maxFreq : minFreq * Math.pow(maxFreq / minFreq, val / 100);
        this.userSettings.LOW_PASS = val;
        this.lowNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
        return freq;
    }

    // Track set audio high pass (Expects 0-100 slider value)
    setHighPass(val) {
        const minFreq = 20;
        const maxFreq = 2000;
        const freq = (val === 0) ? minFreq : minFreq * Math.pow(maxFreq / minFreq, val / 100);
        this.userSettings.HIGH_PASS = val;
        this.highPass.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);    
        return freq;
    }

    // Track set audio boost value
    setTrim(boostValue) {
        const cleanValue = Math.min(2.0, parseFloat(boostValue));
        this.userSettings.TRIM = cleanValue;
        const now = this.ctx.currentTime;
        this.trimNode.gain.cancelScheduledValues(now);
        this.trimNode.gain.setTargetAtTime(cleanValue, now, 0.05);
    }

    // Resets
    resetTrackVolume() {
        this.setVolume(100);
        return { resetVol: 100 };
    }

    resetTrackPan() {
        this.setPan(0);
        return { resetPan: 0 };
    }

    resetTrackLowPass() {
        const resetLowPassVal = 100.0;
        const actualHz = this.setLowPass(resetLowPassVal);
        return { resetLowPassVal, actualHz };
    }

    resetTrackHighPass() {
        const resetHighPassVal = 0; 
        const actualHz = this.setHighPass(resetHighPassVal);
        return { resetHighPassVal, actualHz };
    }

    // Randomizers
    randomizeTrackLowPass() {
        const minSliderVal = 40.0;
        const maxSliderVal = 100.0;
        const randomLowPassVal = parseFloat((Math.random() * (maxSliderVal - minSliderVal) + minSliderVal).toFixed(1));
        const actualHz = this.setLowPass(randomLowPassVal);
        return { randomLowPassVal, actualHz };
    }

    randomizeTrackHighPass() {
        const minSliderPct = 0.0;  
        const maxSliderPct = 60.0; // Avoid cutting out all bass/mids completely on random
        const randomPct = parseFloat((Math.random() * (maxSliderPct - minSliderPct) + minSliderPct).toFixed(1));
        const actualHz = this.setHighPass(randomPct);
        return { randomHighPassVal: randomPct, actualHz };
    }

    randomizeTrackPan() {
        const randomPan = parseFloat((Math.random() * 2 - 1).toFixed(2)); // Directly generates -1.00 to 1.00
        this.setPan(randomPan);
        return { randomPanVal: randomPan };
    }

    // Mute control
    muteTrackVolume() {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        if (this.isMuted) {
            this.gainNode.gain.setTargetAtTime(this.userSettings.VOL, now, 0.01);
            this.isMuted = false;
        } else {
            this.gainNode.gain.setTargetAtTime(0, now, 0.01);
            this.isMuted = true;
        }
        return { isMuted: this.isMuted };
    }
}