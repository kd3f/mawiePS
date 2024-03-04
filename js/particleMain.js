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
const particleCount = isMobile ? 500 : 1500; // Less particles on mobile devices
// need to improve the bin adjustment on resize or landscape on mobile
const binSizeX = isMobile ? 5 : 20; // Adjust bin size for mobile
const binSizeY = isMobile ? 10 : 10; // Adjust bin size for mobile

const system = new ParticleSystem(binSizeX, binSizeY);

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

// Add particles in random positions and start the animation
addRandomParticles(particleCount);

// Init animation loop
animate();

/* Event listeners */

// Handle canvas resizing
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Adjust system settings
    system.canvasWidth = canvas.width;
    system.canvasHeight = canvas.height;
    
    // TODO :: Evaluate if Dynamically adjust bin counts based on device type or other criteria for performance
    //if (isMobileDevice()) {
    //    system.numBinsX = 30; 
    //    system.numBinsY = 30; 
    //} else {
    //    system.numBinsX = 20; 
    //    system.numBinsY = 10; 
    //}

    system.updateBinSize(); // Update the bin size based on new canvas dimensions

    // Clear and reassign particles to bins as before
    system.clearBins(); // Clear existing bin assignments
    system.particles.forEach(particle => {
        system.assignToBin(particle); // Reassign particles to bins
    });
});

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