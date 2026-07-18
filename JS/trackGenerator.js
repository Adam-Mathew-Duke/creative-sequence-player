// Import
import { MasterTrack } from './masterTrack.js';
import { AudioTrack } from './audioTrack.js';

export class TrackGenerator {
    constructor() {
        this.container = document.querySelector('.TrackContainer');
        
        // A vibrant palette of 10 distinct colors for your channel strips
        this.trackColors = [
            '#ff4a4a', // 1: Vibrant Red
            '#3b82f6', // 2: Electric Blue
            '#10b981', // 3: Emerald Green
            '#f59e0b', // 4: Amber/Orange
            '#8b5cf6', // 5: Purple
            '#ec4899', // 6: Deep Pink
            '#06b6d4', // 7: Cyan
            '#f43f5e', // 8: Rose
            '#84cc16', // 9: Lime Green
            '#a855f7'  // 10: Violet
        ];
    }

    createAudioTrack(trackNumber, audioTrackInstance) {
        if (!this.container) return;

        // Automatically select the color based on the track number (using modulo just in case you expand past 10 tracks later!)
        const colorIndex = (trackNumber - 1) % this.trackColors.length;
        const assignedColor = this.trackColors[colorIndex];

        const trackStrip = document.createElement('div');
        trackStrip.classList.add('audio-track-channel');

        trackStrip.innerHTML = `
            <div class="flex-header">
                <label class="mixer-labels">TRACK ${trackNumber}</label>
            </div>
            <!-- Dynamic border color injected right here via template literals! -->
            <div class="flex-container" style="border-top: 6px solid ${assignedColor};">
                <div class="flex-item">      
                    <label class="mixer-labels">PLAYBACK</label>
                    <select class="select-box" name="files" id="file-list-${trackNumber}" size="1">
                        <option value="NO_FILES" selected>NO FILES</option>
                    </select>
                    <button id="MuteButton-${trackNumber}" class="mixerButton">MUTE TRACK</button>
                    <button id="RandomButton-${trackNumber}" class="mixerButton">RANDOM MIX</button>
                    <button id="ResetButton-${trackNumber}" class="mixerButton">RESET MIX</button>
                </div>
                <div class="flex-item">
                    <label class="mixer-labels">PREAMP</label>
                    <input type="range" id="trim-slider-${trackNumber}" min="0" max="2" step="0.01" value="1" class="SliderVertical">
                    <label id="trim-label-${trackNumber}">0.0 dB</label>
                </div>
                <div class="flex-item">
                    <label class="mixer-labels">HIGH PASS</label>
                    <input type="range" id="highpass-slider-${trackNumber}" min="0" max="100" step="1" value="0" class="SliderVertical">
                    <label id="highpass-slider-label-${trackNumber}">20 Hz</label>
                </div>
                <div class="flex-item">
                    <label class="mixer-labels">LOW PASS</label>
                    <input type="range" id="lowpass-slider-${trackNumber}" min="0" max="100" step="1" value="100" class="SliderVertical">
                    <label id="lowpass-slider-label-${trackNumber}">Off</label>
                </div>
                <div class="flex-item">
                    <label class="mixer-labels">PAN</label>
                    <input type="range" min="-1" max="1" value="0" step="0.01" class="SliderVertical" id="pan-slider-${trackNumber}">
                    <label id="pan-label-${trackNumber}">0.00</label>
                </div>
                <div class="flex-item">
                    <label class="mixer-labels">VOLUME</label>
                    <input type="range" min="0" max="100" value="100" step="1" class="SliderVertical" id="volume-slider-${trackNumber}">
                    <label id="volume-label-${trackNumber}">100%</label>
                </div>
            </div>
        `;

        this.container.appendChild(trackStrip);
    }

    setupTrackListeners(trackNumber, track) {
        if (!track) return; 

        // ---- VOLUME ----
        const volSlider = document.getElementById(`volume-slider-${trackNumber}`);
        const volLabel = document.getElementById(`volume-label-${trackNumber}`);
        volSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            volLabel.textContent = `${val}%`;
            track.setVolume(val);
        });

        // ---- PAN ----
        const panSlider = document.getElementById(`pan-slider-${trackNumber}`);
        const panLabel = document.getElementById(`pan-label-${trackNumber}`);
        panSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            panLabel.textContent = val.toFixed(2);
            track.setPan(val);
        });

        // ---- LOW PASS ----
        const lpSlider = document.getElementById(`lowpass-slider-${trackNumber}`);
        const lpLabel = document.getElementById(`lowpass-slider-label-${trackNumber}`);
        lpSlider?.addEventListener('input', (e) => {
            const sliderVal = parseFloat(e.target.value);
            const freq = track.setLowPass(sliderVal);
            lpLabel.textContent = freq ? `${Math.round(freq)} Hz` : `Off`;
        });

        // ---- HIGH PASS ----
        const hpSlider = document.getElementById(`highpass-slider-${trackNumber}`);
        const hpLabel = document.getElementById(`highpass-slider-label-${trackNumber}`);
        hpSlider?.addEventListener('input', (e) => {
            const calculatedHz = 20 * Math.pow(2000 / 20, parseFloat(e.target.value) / 100);
            track.setHighPass(calculatedHz);    
            hpLabel.textContent = `${Math.round(calculatedHz)} Hz`;
        });

        // ---- PREAMP (TRIM) ----
        const trimSlider = document.getElementById(`trim-slider-${trackNumber}`);
        const trimLabel = document.getElementById(`trim-label-${trackNumber}`);
        trimSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            track.setTrim(val);
            let db = (val === 0) ? "-∞" : (20 * Math.log10(val)).toFixed(1);
            trimLabel.textContent = `${db} dB`;
        });

        // ---- MUTE ----
        const muteBtn = document.getElementById(`MuteButton-${trackNumber}`);
        muteBtn?.addEventListener('click', () => {
            const status = track.muteTrackVolume();
            if (status?.isMuted) {
                muteBtn.classList.add("active-mute");
            } else {
                muteBtn.classList.remove("active-mute");
            }
        });

        // ---- RESET ----
        const resetBtn = document.getElementById(`ResetButton-${trackNumber}`);
        resetBtn?.addEventListener('click', () => {
            const hpData = track.resetTrackHighPass();
            if (hpData && hpSlider && hpLabel) {
                hpSlider.value = hpData.resetHighPassVal;
                hpLabel.textContent = `${hpData.resetHighPassVal === 0 ? 20 : Math.round(hpData.actualHz)} Hz`;
            }
            const lpData = track.resetTrackLowPass();
            if (lpData && lpSlider && lpLabel) {
                lpSlider.value = lpData.resetLowPassVal;
                lpLabel.textContent = lpData.actualHz ? `${Math.round(lpData.actualHz)} Hz` : `Off`;
            }
            const panData = track.resetTrackPan();
            if (panData && panSlider && panLabel) {
                panSlider.value = panData.resetPan;
                panLabel.textContent = `${parseFloat(panData.resetPan).toFixed(2)}`;
            }
        });

        // ---- RANDOM ----
        const randomBtn = document.getElementById(`RandomButton-${trackNumber}`);
        randomBtn?.addEventListener('click', () => {
            const lpData = track.randomizeTrackLowPass();
            if (lpData && lpSlider && lpLabel) {
                lpSlider.value = lpData.randomLowPassVal;
                lpLabel.textContent = `${Math.round(lpData.actualHz)} Hz`;
            }
            const hpData = track.randomizeTrackHighPass();
            if (hpData && hpSlider && hpLabel) {
                hpSlider.value = hpData.randomHighPassVal;
                hpLabel.textContent = `${Math.round(hpData.actualHz)} Hz`;
            }
            const panData = track.randomizeTrackPan();
            if (panData && panSlider && panLabel) {
                panSlider.value = panData.randomPanVal;
                panLabel.textContent = `${parseFloat(panData.randomPanVal).toFixed(2)}`;
            }
        });
    }
}
