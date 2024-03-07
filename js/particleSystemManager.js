class ParticleSystemManager {
    constructor() {
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');

        this.isMobile = this.isMobileDevice();
        this.particleCount = this.isMobile ? 500 : 1500;
        this.binSizeX = this.isMobile ? 5 : 20;
        this.binSizeY = this.isMobile ? 10 : 10;
        this.distanceMethod = 'squared';
        this.precomputeVelocities = true;
        this.particlesLineDistance = this.distanceMethod === 'squared' || this.distanceMethod === 'hybrid' ? 4900 : 80;
        this.showFPS = true;
        this.fps = 0;
        this.framesThisSecond = 0;
        this.lastFrameTimeMs = 0;
        this.lastSecond = Date.now();
        this.animationFrameId = null;

        this.settingsUI = null;

        this.initPSystemAnimation();
        this.setupEventListeners();
    }

    setSettingsUI(settingsUI) {
        this.settingsUI = settingsUI;
    }

    isMobileDevice() {
        let check = false;
        (function(a) {
            if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a)) {
                check = true;
            }
        })(navigator.userAgent || navigator.vendor || window.opera);
        if ('ontouchstart' in window || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
            check = true;
        }
        if (window.innerWidth < 1024) {
            check = true;
        }
        return check;
    }

    initPSystemAnimation() {
        this.stopAnimationLoop();
        if (this.system) {
            this.system.clearBins();
            this.system.killAll();
            this.system = null;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.system = new ParticleSystem(this.binSizeX, this.binSizeY, this.distanceMethod, this.precomputeVelocities);
        this.system.setDistanceForLines(this.particlesLineDistance);
        this.addRandomParticles(this.particleCount);
        this.setupBinsEfficiency();

        if(this.settingsUI) this.settingsUI.system = this.system;

        if(!this.showFPS) this.animate();
        if(this.showFPS) this.animateFPSdebug();
    }

    addRandomParticles(n) {
        for (let i = 0; i < n; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.system.addParticle(x, y);
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.system.update();
        this.system.draw(this.ctx);
    }

    animateFPSdebug() {
        const now = Date.now();
        const delta = now - this.lastFrameTimeMs;
        this.lastFrameTimeMs = now;
        if (now - this.lastSecond >= 1000) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.lastSecond += 1000;
        }
        this.framesThisSecond++;
        this.animationFrameId = requestAnimationFrame(() => this.animateFPSdebug());
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.system.update();
        this.system.draw(this.ctx);
        this.displayFPS();
    }

    displayFPS() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`FPS: ${this.fps}`, 20, 30);
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
    }

    setupBinsEfficiency() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.system.canvasWidth = this.canvas.width;
        this.system.canvasHeight = this.canvas.height;
        this.calculateAndUpdateParticleDensity(this.particleCount);
        this.system.clearBins();
        this.system.particles.forEach(particle => {
            this.system.assignToBin(particle);
        });
    }

    calculateAndUpdateParticleDensity(particleCount) {
        const canvasArea = this.canvas.width * this.canvas.height;
        const particleDensity = particleCount / canvasArea;
        this.updateSystemBasedOnScreenSizeAndDensity(particleDensity, particleCount);
    }

    updateSystemBasedOnScreenSizeAndDensity(particleDensity, particleCurrentCount) {
        // particleDensity represents the number of particles per unit area
    
        // Define minimum and maximum bin sizes (in pixels)
        const minBinSize = 25; // Minimum practical bin size
        const maxBinSize = 100; // Maximum practical bin size to avoid too large bins
    
        // Screen dimensions and orientation
        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;
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
        this.system.numBinsX = numBinsX;
        this.system.numBinsY = numBinsY;
        this.system.binSizeX = binSizeX;
        this.system.binSizeY = binSizeY;
    
        this.system.updateBinSize(screenWidth, screenHeight); // This might now just be used to adjust any internal calculations if needed
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.setupBinsEfficiency());
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            this.system.handleInteraction(x, y);
        });
    }
}