export class MasterTrack {

    // Master track constructor
    constructor(audioContext, destination = null) {
        
        // Audio context
        this.ctx = audioContext;
        
        // Setup the audio routing destination
        const targetDestination = destination || this.ctx.destination;
        this.input = new GainNode(this.ctx);

        // Setup master audio low pass (Fully open by default at 20,000 Hz)
        this.low = new BiquadFilterNode(this.ctx, {
            type: "lowpass", 
            frequency: 20000,
            Q: 0.707 
        });

        // Setup master audio limiter (True peak compressor style)
        this.limiter = new DynamicsCompressorNode(this.ctx, {
            threshold: -0.5,
            ratio: 20,
            attack: 0.003,
            release: 0.1,
            knee: 0
        });

        // Setup master audio gain node
        this.gain = new GainNode(this.ctx, {
            gain: 1.0
        });

        // Connect Master audio nodes in chain
        this.input.connect(this.low)
            .connect(this.limiter)
            .connect(this.gain)
            .connect(targetDestination);
    }

    // Master low pass audio (Expects 0-100 slider scale)
    setLowPass(val) {
        let Freq = null;
        const minFreqLowPass = 20;
        const maxFreqLowPass = 20000;
        if (val === 100) {
            Freq = maxFreqLowPass; 
        } else {
            Freq = minFreqLowPass * Math.pow(maxFreqLowPass / minFreqLowPass, val / 100);
        }
        this.low.frequency.setTargetAtTime(Freq, this.ctx.currentTime, 0.02);
        return Freq;
    }

    // Master limiter audio (Clamped to safe dB limits)
    setLimiter(val) {
        const clampedVal = Math.max(-100, Math.min(0, parseFloat(val)));
        this.limiter.threshold.setValueAtTime(clampedVal, this.ctx.currentTime);
    }

    // Master volume audio
    setVolume(rawValue) {
        const gainValue = Math.pow(parseFloat(rawValue) / 100, 2);
        this.gain.gain.setTargetAtTime(gainValue, this.ctx.currentTime, 0.01);
    }

    // Master randomize limiter audio
    randomizeMasterLimiter() {
        const rawRandom = -0.5 - (Math.random() * 23.5);
        const randomLimiterVal = parseFloat(rawRandom.toFixed(1)); 
        this.setLimiter(randomLimiterVal);
        return { randomLimiterVal };
    }

    // Master randomize low pass audio
    randomizeMasterLowPass() {
        const minSliderVal = 40.0;
        const maxSliderVal = 100.0;
        const rawRandom = Math.random() * (maxSliderVal - minSliderVal) + minSliderVal;
        const randomLowPassVal = parseFloat(rawRandom.toFixed(1)); 
        const actualHz = this.setLowPass(randomLowPassVal);
        return { 
            randomLowPassVal, 
            actualHz          
        };
    }

    // Master randomize fade out audio
    randomizeMasterFadeOut() {
        const options = [0, 5, 10];
        const randomIndex = Math.floor(Math.random() * options.length);
        const randomFadeValout = options[randomIndex];
        return { randomFadeValout };
    }

    // Master randomize fade in audio
    randomizeMasterFade() {
        const options = [0, 5, 10];
        const randomIndex = Math.floor(Math.random() * options.length);
        const randomFadeVal = options[randomIndex];
        return { randomFadeVal };
    }

    // Master reset master fade in audio
    resetMasterFade() {
        return { resetFadeVal: 0 };
    }

    // Master reset master fade out audio
    resetMasterFadeOut() {
        return { resetFadeValout: 0 };
    }

    // Master reset low pass audio
    resetMasterLowPass() {
        const resetLowPassVal = 100.0;
        const actualHz = this.setLowPass(resetLowPassVal);
        return { resetLowPassVal, actualHz };
    }

    // Master reset limiter audio
    resetMasterLimiter() {
        const resetLimiterVal = -0.5;
        this.setLimiter(resetLimiterVal);
        return { resetLimiterVal };
    }

    // Master reset volume audio
    resetMasterVolume() {
        this.setVolume(100);
        return { resetVol: 100 };
    }
}
