document.addEventListener('DOMContentLoaded', function() { // document ready 

    // Setup Particle System, Helper functions and anvas setup
    // Create and append the canvas
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId; // Variable to store the Animation request ID
    
    // Initialize the particle system
    // Setup Particle System based on device type
    const isMobile = isMobileDevice();
    const particleCountMobile = 500;
    const particleCountDesktop = 1500;
    
    let particleCount = isMobile ? particleCountMobile : particleCountDesktop; // Less particles on mobile devices
    // need to improve the bin adjustment on resize or landscape on mobile
    const binSizeX = isMobile ? 5 : 20; // Adjust bin size for mobile
    const binSizeY = isMobile ? 10 : 10; // Adjust bin size for mobile
    
    let distanceMethod = 'squared'; // 'euclidean' || 'squared' || 'hybrid'
    let precomputeVelocities = true;

    //70^2 squared values for 'squared'  || 'hybrid'
    let particlesLineDistance = (distanceMethod === 'squared' || distanceMethod === 'hybrid') ? 4900 : 80;
    
    let system;
    
    //Show FPS Switch
    const showFPS = true;
    
    //FPS Variables
    let fps = 0;
    let framesThisSecond = 0;
    let lastFrameTimeMs = 0;
    let lastSecond = Date.now();
    
    // Init animation loop
    initPSystemAnimation();
    
    /* particles initialization*/
    // Function to add particles at random positions
    function addRandomParticles(n) {
        for (let i = 0; i < n; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            system.addParticle(x, y);
        }
    }
    
    // Animation loop
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        system.update();
        system.draw(ctx);
    }
    
    /* Test & Debug Animate Loop with FPS */
    function animateFPSdebug() {
        const now = Date.now();
        const delta = now - lastFrameTimeMs;
        lastFrameTimeMs = now;
    
        // Update FPS every second
        if (now - lastSecond >= 1000) {
            fps = framesThisSecond;
            framesThisSecond = 0;
            lastSecond += 1000;
        }
        framesThisSecond++;
    
        animationFrameId = requestAnimationFrame(animateFPSdebug);
    
        // Clear the canvas and draw your frame first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        system.update();
        system.draw(ctx);
    
        // Display the FPS
        displayFPS();
    }
    
    function displayFPS() {
        ctx.fillStyle = 'white'; // Text color
        ctx.font = '16px Arial'; // Text style
        ctx.fillText(`FPS: ${fps}`, 20, 30); // Position and text to display
    }

    function initPSystemAnimation() {
        stopAnimationLoop();
        // Clear and reassign particles to bins as before
        if (system) {
            system.clearBins(); // Clear existing bin assignments
            system.killAll();
            system = null;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        system = new ParticleSystem(binSizeX, binSizeY, distanceMethod, precomputeVelocities);
        system.setDistanceForLines(particlesLineDistance);

        // Add particles in random positions and start the animation
        addRandomParticles(particleCount);
        
        // Calculate binSizeX and binSizeY :: also used in the resize listener
        setupBinsEfficiency();

        if(!showFPS) animate();
        if(showFPS) animateFPSdebug(); 
    }
    
    function stopAnimationLoop() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stop the animation loop
        }
        // Reset the animationFrameId to ensure it doesn't hold an old ID
        animationFrameId = null;    
    }
    
    /* Resize Event listener */
    // Handle canvas resizing
    window.addEventListener('resize', setupBinsEfficiency );
    
    /* Bin division logic based on particle density and screen size */
    function setupBinsEfficiency() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    
        // Adjust system settings
        system.canvasWidth = canvas.width;
        system.canvasHeight = canvas.height;
        
        // TODO :: RE Evaluate if Dynamically adjusting bin based on device type or other criteria for performance
        calculateAndUpdateParticleDensity(particleCount);
    
        // Clear and reassign particles to bins as before
        system.clearBins(); // Clear existing bin assignments
        system.particles.forEach(particle => {
            system.assignToBin(particle); // Reassign particles to bins
        });
    }
    
    function calculateAndUpdateParticleDensity(particleCount) {    
        // Calculate canvas area
        const canvasArea = canvas.width * canvas.height;
        
        // Calculate particle density (particles per unit area)
        const particleDensity = particleCount / canvasArea;
        
        // Update the system with the calculated density
        updateSystemBasedOnScreenSizeAndDensity(particleDensity, particleCount);
    }
    
    function updateSystemBasedOnScreenSizeAndDensity(particleDensity, particleCurrentCount) {
        // particleDensity represents the number of particles per unit area
    
        // Define minimum and maximum bin sizes (in pixels)
        const minBinSize = 25; // Minimum practical bin size
        const maxBinSize = 100; // Maximum practical bin size to avoid too large bins
    
        // Screen dimensions and orientation
        const screenWidth = canvas.width;
        const screenHeight = canvas.height;
        const isLandscape = screenWidth > screenHeight;
    
        // Calculate an initial bin size based on screen size and orientation
        // This could be more sophisticated based on actual device performance metrics
        let baseBinSize = Math.sqrt(screenWidth * screenHeight / (particleDensity * particleCurrentCount));
        baseBinSize = Math.max(minBinSize, Math.min(baseBinSize, maxBinSize)); // Clamp to min/max sizes
    
        // Adjust bin size slightly based on orientation
        let binSizeX = isLandscape ? baseBinSize * 1.1 : baseBinSize; // Slightly larger bins in landscape
        let binSizeY = isLandscape ? baseBinSize : baseBinSize * 1.1; // Slightly larger bins in portrait
    
        // Calculate the number of bins based on adjusted bin size
        let numBinsX = Math.floor(screenWidth / binSizeX);
        let numBinsY = Math.floor(screenHeight / binSizeY);
    
        // Update the particle system with the new bin sizes and counts
        system.numBinsX = numBinsX;
        system.numBinsY = numBinsY;
        system.binSizeX = binSizeX;
        system.binSizeY = binSizeY;
    
        system.updateBinSize(screenWidth, screenHeight); // This might now just be used to adjust any internal calculations if needed
    }
    
    /* Click Event listener */
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;    // Relationship bitmap vs. element for X
        const scaleY = canvas.height / rect.height;  // Relationship bitmap vs. element for Y
    
        const x = (e.clientX - rect.left) * scaleX;  // Scale mouse coordinates after they have
        const y = (e.clientY - rect.top) * scaleY;   // been adjusted to be relative to element
        system.handleInteraction(x, y);
    });
    
    /* Check mobile devices*/
    function isMobileDevice() {
      let check = false;
      // User-agent check you already have
      (function(a) {
        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a)) {
          check = true;
        }
      })(navigator.userAgent || navigator.vendor || window.opera);
    
      // Touch screen check
      if ('ontouchstart' in window || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
        check = true;
      }
    
      // Ceck for screen width (considering <1024 as mobile/tablet screen size)
      if (window.innerWidth < 1024) {
        check = true;
      }
    
      return check;
    }
    
    /* dynamic options settings */

    const distanceSlider = document.getElementById('distance-slider');
    const distanceNumber = document.getElementById('distance-number');
    const particlesSlider = document.getElementById('particles-slider');
    const particlesNumberInput = document.getElementById('particles-number-input');

    let previousDistanceMethod = String(distanceMethod);

    // Set fields initial values
    initializeFormFields({
        distanceMethod: distanceMethod, 
        precomputeVelocities: precomputeVelocities,
        particleLinesDistance: system.distanceForLines,
        particlesNumber: particleCount
    });

    // Initialize form fields function
    function initializeFormFields(initialValues) {
        if (initialValues.distanceMethod) {
            document.querySelector(`input[name="distance"][value="${initialValues.distanceMethod}"]`).checked = true;
        }
        if (initialValues.precomputeVelocities !== undefined) {
            document.getElementById('precompute').checked = initialValues.precomputeVelocities;
        }
        if (initialValues.particleLinesDistance !== undefined) {
            const linesDistance = (initialValues.distanceMethod === 'euclidean') ? initialValues.particleLinesDistance : Math.sqrt(initialValues.particleLinesDistance);
            distanceSlider.value = linesDistance;
            distanceNumber.value = linesDistance;
        }
        if (initialValues.particlesNumber !== undefined) {
            particlesSlider.value = initialValues.particlesNumber;
            particlesNumberInput.value = initialValues.particlesNumber;
        }
    }
    
    document.getElementById('settingsIcon').addEventListener('click', function() {
        document.getElementById('modalOverlay').style.display = 'flex';
    });
    
    // Close the modal when clicking on the overlay
    document.getElementById('modalOverlay').addEventListener('click', function() {
        this.style.display = 'none';
    });
    
    // Prevent click events from the canvas from bubbling up to the modal overlay
    document.getElementById('settingsFormContainer').addEventListener('click', function(event) {
        event.stopPropagation();
    });

    // Synchronize slider with number input
    distanceSlider.addEventListener('input', function() {
        distanceNumber.value = distanceSlider.value;
        //console.log('Particle Lines Distance: ' + distanceSlider.value);
        const distanceValue = (distanceMethod === 'euclidean') ? distanceSlider.value : distanceSlider.value *distanceSlider.value;
        particlesLineDistance = distanceValue;
        system.setDistanceForLines(distanceValue); 
     
    });

    distanceNumber.addEventListener('input', function() {
        distanceSlider.value = distanceNumber.value;
        console.log('Particle Lines Distance: ' + distanceNumber.value);
    });

    // Handle radio and checkbox changes
    document.querySelectorAll('input[name="distance"]').forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('Distance Type Selected: ' + this.value);
            console.log('Previous Distance Type Selected: ' + previousDistanceMethod);
            distanceMethod = this.value;
            if( (previousDistanceMethod != 'euclidean') && (distanceMethod === 'euclidean') ) {
                particlesLineDistance = Math.sqrt(particlesLineDistance);                
            }
            if( (previousDistanceMethod === 'euclidean') && (distanceMethod != 'euclidean')) {
                particlesLineDistance = particlesLineDistance * particlesLineDistance;                
            }
            console.log(particlesLineDistance);
            previousDistanceMethod = String(distanceMethod);
            initPSystemAnimation();

        });
    });

    document.getElementById('precompute').addEventListener('change', function() {
        console.log('Precompute Velocities: ' + (this.checked ? 'true' : 'false'));
        precomputeVelocities = (this.checked) ? true : false;
        initPSystemAnimation();
    });

    // Add event listeners
    particlesSlider.addEventListener('input', syncParticleSettings);
        particlesSlider.addEventListener('input', function() {
        syncParticleSettings(this.value); // particlesSlider.value
        particlesNumberInput.value = system.getParticles().length;

    });

    // Sync the slider and the number input
    function syncParticleSettings(value) {
        const desiredAmount = parseInt(particlesSlider.value, 10); // or particlesNumberInput.value, they should be the same
        const currentAmount = system.particles.length;
        const difference = desiredAmount - currentAmount;

        if (difference > 0) {
            // Add particles if desired amount is greater than current amount
            for (let i = 0; i < difference; i++) {
                // system.addAndShuffleParticles adds a single particle and shuffles
                system.addAndShuffleParticles(1, canvas.width, canvas.height); // Replace xRange and yRange with appropriate values
            }
        } else if (difference < 0) {
            // Remove particles if desired amount is less than current amount
            system.removeRandomParticles(Math.abs(difference));
        }        

        // Optionally, shuffle only once after adding or removing particles
        // if system.addAndShuffleParticles doesn't shuffle or if you want to ensure randomness
        // system.shuffleParticles(); // This would be a new method to shuffle particles
    }

    particlesNumberInput.addEventListener('input', function() {
        particlesSlider.value = this.value;
        syncParticleSettings(this.value); 
        console.log('Particle Number: ' + particlesSlider.value);
    });

// end of document ready    
});