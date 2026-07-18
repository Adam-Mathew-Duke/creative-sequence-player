// Import
import { MasterTrack } from '../JS/masterTrack.js';
import { AudioTrack } from './audioTrack.js';

// Load audio files from disk
export class TrackLoader {

    // Audio context
    constructor(audioContext, generator, totalTracks = 10) {
        this.audioContext = audioContext;
        this.generator = generator; // Save the generator reference passed from main.js
        this.availableAudioOptions = {};
        this.allSelectedFiles = [];
        this.masterTrack = null;
        this.fileInput = document.getElementById('loadFiles');
        // Dynamically assigned (defaults to 10 if you don't pass anything)
        this.totalTracks = totalTracks;
        this.initListeners();
    }

    // File select
    initListeners() {
        this.fileInput.addEventListener('change', (event) => {
            const fileList = event.target.files;
            if (fileList.length > 0) {
                this.allSelectedFiles = [...fileList];
                this.availableAudioOptions = {}; 
                this.decodeAudioFiles(this.allSelectedFiles); 
            }
        });
    }

    // Decode audio files
    decodeAudioFiles(filesArray) {
        const totalFiles = filesArray.length;
        let decodedCount = 0; 

        filesArray.forEach((file, index) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                this.audioContext.decodeAudioData(e.target.result)            
                    .then(originalBuffer => {
                        const originalKey = `${index}_original`;

                        this.availableAudioOptions[originalKey] = {
                            name: file.name,
                            buffer: originalBuffer
                        };            

                        decodedCount++;

                        // ONCE ALL FILES ARE DECODED AND READY:
                        if (decodedCount === totalFiles) {
                            // 1. Initialize the master track
                            this.mastertrack = new MasterTrack(this.audioContext);
                            
                            // 2. Dynamically instantiate all 10 audio track instances
                            for (let i = 1; i <= this.totalTracks; i++) {
                                this[`track${i}`] = new AudioTrack(this.audioContext, this.availableAudioOptions, this.mastertrack.input);
                            }
                            
                            // 3. Populate all 10 dropdown menus in the HTML UI
                            this.populateListBoxWithOptions();

                            // 4. Bind the sliders and buttons to the newly created audio tracks
                            if (this.generator) {
                                for (let i = 1; i <= this.totalTracks; i++) {
                                    this.generator.setupTrackListeners(i, this[`track${i}`]);
                                }
                            }
                            
                            console.log("All 10 tracks successfully loaded and instantiated!", this);
                        }
                    })
                    .catch(err => {
                        console.log(`Error decoding audio file ${file.name}:`, err);
                    });
            };

            reader.readAsArrayBuffer(file);
        });
    }

    // Populate the file list boxes for the audio tracks
    populateListBoxWithOptions() {
        for (let i = 1; i <= this.totalTracks; i++) {
            const selectBox = document.getElementById(`file-list-${i}`);
            
            if (!selectBox) continue;

            selectBox.innerHTML = ''; 

            Object.keys(this.availableAudioOptions).forEach(key => {
                let optionData = this.availableAudioOptions[key];
                let option = document.createElement("option");
                option.text = optionData.name;
                option.value = key; 
                selectBox.appendChild(option);
            });
        }
    }
}