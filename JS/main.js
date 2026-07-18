// ImportImport
import { TrackLoader } from './trackLoader.js';
import { TrackGenerator } from './trackGenerator.js';

// Audio context
const audioContext = new AudioContext();
const generator = new TrackGenerator();
const totalTracks = 10;

// Resume audio context
async function resume_audio_context() {
    if (audioContext.state === "suspended" || audioContext.state === "interrupted") {
        return await audioContext.resume();
    }
    return Promise.resolve();
}

// Turn on the web audio context
let loader;
async function handleAppStart() {
    // 1. Await the audio context resumption before instantiating the loader
    await resume_audio_context();
    
    // Pass the generator instance to the loader so it can wire up listeners later
    loader = new TrackLoader(audioContext, generator); 

    // 2. Generate the 10 UI elements visually right away
    for (let i = 1; i <= totalTracks; i++) {
        // Initially build the HTML strips with null audio tracks
        generator.createAudioTrack(i, null); 
    }
}

// Setup the start power button
const startButton = document.getElementById("startButton");
const mixerContainer = document.getElementById("MixerContainer");
startButton?.addEventListener("click", () => {
    mixerContainer?.classList.remove("hidden");
    startButton?.classList.add("hidden");
    mixerContainer?.focus();
    handleAppStart(); 
});

// Master track fade in
const fadeSlider = document.getElementById("fade-slider");
const fadeLabel = document.getElementById("fade-label");
fadeSlider.oninput = (e) => {
    fadeLabel.textContent = `${e.target.value} SEC`;
};

// Master track fade out
document.getElementById("fadeout-slider").addEventListener('input', (e) => {
    const seconds = parseInt(e.target.value, 10);
    document.getElementById('fadeout-label').textContent = `${seconds} SEC`;
});

// Master track volume
document.getElementById("MasterVolumeSlider").addEventListener('input', (e) => {
    const rawValue = e.target.value;
    document.getElementById("MasterVolumeLabel").textContent = `${rawValue}%`;
    loader.mastertrack?.setVolume(rawValue);
});

// Master track low pass
document.getElementById("MasterLowpassSlider").addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const freq = loader.mastertrack?.setLowPass(val);
    if (freq !== undefined) {
        document.getElementById('MasterLowpassSliderLabel').textContent = `${Math.round(freq)} Hz`;
    }
});

// Master track limiter
document.getElementById("masterLimiterNodeSlider").addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("masterLimiterNodeSliderLabel").textContent = `${val.toFixed(1)} dB`;
    loader.mastertrack?.setLimiter(val);
});

// Master track play / stop button (toggle)
document.getElementById("MasterPlayButton").addEventListener("click", async (e) => {
    if (typeof resume_audio_context === 'function') await resume_audio_context();
    
    const fadeElement = document.getElementById("fade-slider");
    const fadeTime = fadeElement ? parseInt(fadeElement.value, 10) : 2;
    const fadeoutElement = document.getElementById("fadeout-slider");
    const fadeoutTime = fadeoutElement ? parseInt(fadeoutElement.value, 10) : 2;
    
    let activePlayingFound = false;

    // Loop through all 10 tracks to toggle playback and check states
    for (let i = 1; i <= totalTracks; i++) {
        const track = loader[`track${i}`];
        if (track) {
            const selectBox = document.getElementById(`file-list-${i}`);
            const selectedFile = selectBox ? selectBox.value : "NO_FILES";

            track.toggleTrack(selectedFile, "loop", fadeTime, fadeoutTime);

            // Check if this specific track is playing music right now
            if (track.activeSource || track.timerId) {
                activePlayingFound = true;
            }
        }
    }

    // Toggle styling on the master button based on overall playing status
    const masterPlayButton = e.currentTarget;
    if (activePlayingFound) {
        masterPlayButton.classList.add("active-playing");
    } else {
        masterPlayButton.classList.remove("active-playing");
    }
});

// Master track random mix button
document.getElementById("MasterRandomButton").addEventListener("click", () => {
    if (!loader) {
        console.warn("Mixer engine not started yet. Load files first!");
        return;
    }
    
    // Master track randomize the low pass slider
    const LowPassData = loader.mastertrack?.randomizeMasterLowPass();
    if (LowPassData) {
        document.getElementById("MasterVolumeSlider").value = LowPassData.randomLowPassVal; // Fixed target parameter assignment
        document.getElementById("MasterLowpassSlider").value = LowPassData.randomLowPassVal;
        const displayHz = Math.round(LowPassData.actualHz); 
        document.getElementById("MasterLowpassSliderLabel").textContent = `${displayHz} Hz`; 
    }

    // Master track randomize the fade in slider
    const FadeData = loader.mastertrack?.randomizeMasterFade();
    if (FadeData) {
        document.getElementById("fade-slider").value = FadeData.randomFadeVal;
        document.getElementById("fade-label").textContent = `${FadeData.randomFadeVal} SEC`; 
    }

    // Master track randomize the fade out slider
    const FadeOutData = loader.mastertrack?.randomizeMasterFadeOut();
    if (FadeOutData) {
        document.getElementById("fadeout-slider").value = FadeOutData.randomFadeValout;
        document.getElementById("fadeout-label").textContent = `${FadeOutData.randomFadeValout} SEC`; 
    }
});

// Master track reset mix button
document.getElementById("MasterResetButton").addEventListener("click", () => {
    if (!loader) {
        console.warn("Mixer engine not started yet. Load files first!");
        return;
    }

    // Master track reset the fade in slider
    const ResetFadeData = loader.mastertrack?.resetMasterFade();
    if (ResetFadeData) {
        document.getElementById("fade-slider").value = ResetFadeData.resetFadeVal;
        document.getElementById("fade-label").textContent = `${ResetFadeData.resetFadeVal} SEC`; 
    }

    // Master track reset the fade out slider
    const resetFadeOutData = loader.mastertrack?.resetMasterFadeOut();
    if (resetFadeOutData) {
        document.getElementById("fadeout-slider").value = resetFadeOutData.resetFadeValout;
        document.getElementById("fadeout-label").textContent = `${resetFadeOutData.resetFadeValout} SEC`; 
    }

    // Master track reset the low pass slider
    const resetLowPassData = loader.mastertrack?.resetMasterLowPass();
    if (resetLowPassData) {
        document.getElementById("MasterLowpassSlider").value = resetLowPassData.resetLowPassVal;
        const displayHz = Math.round(resetLowPassData.actualHz); 
        document.getElementById("MasterLowpassSliderLabel").textContent = `${displayHz} Hz`; 
    }
});
