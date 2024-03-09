class SettingsUI {
    constructor(particleSystemManager) {
        this.system = particleSystemManager.system;
        this.manager = particleSystemManager;
        this.previousDistanceMethod = String(this.manager.distanceMethod);

        // Initialize the HTML structure
        this.initHTML();

        // Cache DOM elements
        this.cacheDOM();

        // Bind event listeners
        this.bindEvents();

        // Initialize form fields with initial values
        this.initializeFormFields({
            distanceMethod: this.system.distanceMethod,
            precomputeVelocities: this.system.precomputeVelocities,
            particleLinesDistance: this.system.distanceForLines,
            particlesNumber: this.manager.particleCount
        });
    }

    initHTML() {
        const optionsHtml = `
        <!-- dynamic settings UI -->
        <div id="modalOverlay">     
            <div id="settingsFormContainer">
                <form id="settings-form">
                    <h2 class="form-title">Distance Type</h2>
                    <div id="distance-method">                  
                        <label><input type="radio" name="distance" value="euclidean"> Euclidean</label>
                        <label><input type="radio" name="distance" value="squared" checked> Squared</label>
                        <label><input type="radio" name="distance" value="hybrid"> Hybrid</label>
                    </div>
                    <h2 class="form-title">Precompute Particle Velocities</h2>
                    <div id="precompute-velocity">
                        <label><input type="checkbox" id="precompute" checked> Enable</label>
                    </div>
                    <h2 class="form-title">Particle Lines Distance</h2>
                    <div id="particle-lines-distance">
                        <label>
                            <input type="range" id="distance-slider" min="0" max="200" value="">
                            <input type="number" id="distance-number" min="0" max="200" value="">
                        </label>
                    </div>
                    <h2 class="form-title">Particles Number</h2>
                    <div id="particles-number">
                        <label>
                            <input type="range" id="particles-slider" min="0" max="5000" value="1500">
                            <input type="number" id="particles-number-input" min="0" max="5000" value="1500">
                        </label>
                    </div>
                </form>
            </div>
        </div>

        <div id="settingsIcon">
            <span>&#9964;</span>
        </div>
        <!-- end of dynamic settings UI -->`;
        document.body.insertAdjacentHTML('afterbegin', optionsHtml);
    }

    cacheDOM() {
        this.distanceSlider = document.getElementById('distance-slider');
        this.distanceNumber = document.getElementById('distance-number');
        this.particlesSlider = document.getElementById('particles-slider');
        this.particlesNumberInput = document.getElementById('particles-number-input');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.settingsFormContainer = document.getElementById('settingsFormContainer');
        this.precomputeCheckbox = document.getElementById('precompute');
        this.settingsIcon = document.getElementById('settingsIcon');
    }

    bindEvents() {
        this.settingsIcon.addEventListener('click', () => this.modalOverlay.style.display = 'flex');
        this.modalOverlay.addEventListener('click', () => this.modalOverlay.style.display = 'none');
        this.settingsFormContainer.addEventListener('click', event => event.stopPropagation());

        this.distanceSlider.addEventListener('input', this.syncDistance.bind(this));
        this.distanceNumber.addEventListener('input', this.syncDistance.bind(this));
        
        document.querySelectorAll('input[name="distance"]').forEach(radio => {
            radio.addEventListener('change', this.handleDistanceMethodChange.bind(this));
        });

        this.precomputeCheckbox.addEventListener('change', this.togglePrecompute.bind(this));

        this.particlesSlider.addEventListener('input', this.syncParticleSettingsEvent.bind(this));
        this.particlesNumberInput.addEventListener('input', this.syncParticleSettingsEvent.bind(this));
    }

    initializeFormFields(initialValues) {
        if (initialValues.distanceMethod) {
            document.querySelector(`input[name="distance"][value="${initialValues.distanceMethod}"]`).checked = true;
        }
        if (initialValues.precomputeVelocities !== undefined) {
            document.getElementById('precompute').checked = initialValues.precomputeVelocities;
        }
        if (initialValues.particleLinesDistance !== undefined) {
            const linesDistance = (initialValues.distanceMethod === 'euclidean') ? initialValues.particleLinesDistance : Math.sqrt(initialValues.particleLinesDistance);
            this.distanceSlider.value = linesDistance;
            this.distanceNumber.value = linesDistance;
        }
        if (initialValues.particlesNumber !== undefined) {
            this.particlesSlider.value = initialValues.particlesNumber;
            this.particlesNumberInput.value = initialValues.particlesNumber;
        }
    }

    syncDistance() {
        // Synchronize slider and number input, adjust system properties accordingly.
        this.distanceNumber.value = this.distanceSlider.value;
        //console.log('Particle Lines Distance: ' + distanceSlider.value);
        const distanceValue = (this.system.distanceMethodType === 'euclidean') ? this.distanceSlider.value : this.distanceSlider.value * this.distanceSlider.value;
        this.manager.particlesLineDistance = distanceValue;
        //console.log("syncDistance");
        //console.log(this.system.distanceMethodType);
        //console.log(distanceValue);
        //console.log(this.system);
        this.system.setDistanceForLines(distanceValue); 
    }

    handleDistanceMethodChange(event) {
        // Handle changes in distance calculation method, adjust system properties accordingly.
        const value = event.target.value;
        //console.log('Distance Type Selected: ' + value);
        //console.log('Previous Distance Type Selected: ' + this.previousDistanceMethod);
        this.manager.distanceMethod = value;
        if( (this.previousDistanceMethod != 'euclidean') && (this.manager.distanceMethod === 'euclidean') ) {
            this.manager.particlesLineDistance = Math.sqrt(this.manager.particlesLineDistance);                
        }
        if( (this.previousDistanceMethod === 'euclidean') && (this.manager.distanceMethod != 'euclidean')) {
            this.manager.particlesLineDistance = this.manager.particlesLineDistance * this.manager.particlesLineDistance;                
        }
        //console.log(this.manager.particlesLineDistance);
        this.previousDistanceMethod = String(this.manager.distanceMethod);
        this.manager.initPSystemAnimation();
    }

    togglePrecompute(event) {
        const value = event.target.checked;
        // Toggle precompute velocities, adjust system properties accordingly.
        console.log('Precompute Velocities: ' + (value ? 'true' : 'false'));
        this.manager.precomputeVelocities = (value) ? true : false;
        this.manager.initPSystemAnimation();
    }

    syncParticleSettingsEvent(event) {
        // Synchronize particle settings between slider and number input, adjust system properties accordingly.
        const value = event.target.value;
        this.particlesSlider.value = value;
        this.particlesNumberInput.value = value;

        this.syncParticleSettings(value);

    }

    syncParticleSettings(value) {
        const desiredAmount = parseInt(this.particlesSlider.value, 10); // or particlesNumberInput.value, they should be the same
        const currentAmount = this.system.particles.length;
        const difference = desiredAmount - currentAmount;

        if (difference > 0) {
            // Add particles if desired amount is greater than current amount
            for (let i = 0; i < difference; i++) {
                // system.addAndShuffleParticles adds a single particle and shuffles
                this.system.addAndShuffleParticles(1, this.manager.canvas.width, this.manager.canvas.height); // Replace xRange and yRange with appropriate values
            }
        } else if (difference < 0) {
            // Remove particles if desired amount is less than current amount
            this.system.removeRandomParticles(Math.abs(difference));
        }

        this.manager.particleCount = this.system.particles.length;
        // Optionally, shuffle only once after adding or removing particles
        // if system.addAndShuffleParticles doesn't shuffle or if you want to ensure randomness
        // system.shuffleParticles(); // This would be a new method to shuffle particles
    }
}