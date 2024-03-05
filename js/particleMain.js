// Setup Particle System, Helper functions and anvas setup
// Create and append the canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

// Initialize the particle system
// Setup Particle System based on device type
const isMobile = isMobileDevice();
const particleCountMobile = 500;
const particleCountDesktop = 1500;

const particleCount = isMobile ? particleCountMobile : particleCountDesktop; // Less particles on mobile devices
// need to improve the bin adjustment on resize or landscape on mobile
const binSizeX = isMobile ? 5 : 20; // Adjust bin size for mobile
const binSizeY = isMobile ? 10 : 10; // Adjust bin size for mobile

const system = new ParticleSystem(binSizeX, binSizeY);

// Add particles in random positions and start the animation
addRandomParticles(particleCount);

// Calculate binSizeX and binSizeY :: also used in the resize listener
setupBinsEfficiency();

//Show FPS Switch
const showFPS = true;

//FPS Variables
let fps = 0;
let framesThisSecond = 0;
let lastFrameTimeMs = 0;
let lastSecond = Date.now();

// Init animation loop
if(!showFPS) animate();
if(showFPS) animateFPSdebug(); 

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
    requestAnimationFrame(animate);
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

    requestAnimationFrame(animateFPSdebug);

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
    calculateAndUpdateParticleDensity(particleCount, particleCountMobile, particleCountDesktop);

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

    system.updateBinSize(); // This might now just be used to adjust any internal calculations if needed
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