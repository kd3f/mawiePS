class Particle { // adjustSpeed = 'dynamic' || 'precomputed' 
    constructor(x, y, radius, adjustSpeed='dynamic') {
        this.x = x;
        this.y = y;
        this.vx = Math.random() * 2 - 1; // Velocity x
        this.vy = Math.random() * 2 - 1; // Velocity y
        this.radius = radius;
        //this.squaredRadius = Math.pow(this.radius, 2);
        this.squaredRadius = (this.radius + this.radius) * (this.radius + this.radius);

        this.color = 'rgba(245, 5, 213, 1)'; //'rgba(255, 255, 255, 1)'; // Default color
        
        this.originalColor = this.color; // Default color
        this.originalColorRGB = [245, 5, 213]; 

        this.effectColor = 'rgba(93, 198, 240, 1)'; //'rgba(0, 255, 255, 1)'; // Color when affected by repulsion/effect
        this.effectRGB = [93, 198, 240]; 

        //this.color = this.originalColor;
        this.infected = false; // Whether the particle is currently affected by the effect
        this.infectionStep = 0; // Tracks the progression of the infection (color change)

        this.friction = 0.99; // Friction factor; closer to 1 means less friction
        this.minSpeed = 0.6; // Specify the minimum speed

        this.adjustForMinimumSpeed = (adjustSpeed==='dynamic') ? this.adjustForMinimumSpeedDynamic : this.adjustForMinimumSpeedPrecomputed;

        this.findClosestPrecomputedVelocity = null; // ParticleSystem function

        this.check = false;

    }

    setFindClosestPrecomputedVelocity(fn) {
        this.findClosestPrecomputedVelocity = fn;
    }

    adjustForMinimumSpeedDynamic() {
        // Adjust for minimum speed :: more accurate simulation but slow
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const angle = Math.atan2(this.vy, this.vx);
        if (speed < this.minSpeed) {
            this.vx = Math.cos(angle) * this.minSpeed;
            this.vy = Math.sin(angle) * this.minSpeed;
        }
    }

    adjustForMinimumSpeedPrecomputed() {
        // Adjust for minimum speed without using Math.sqrt() and Math functions
        // Snap to closest precomputed velocity if below minSpeed
        const squaredSpeed = this.vx * this.vx + this.vy * this.vy;
        const squaredMinSpeed = this.minSpeed * this.minSpeed;
        if (squaredSpeed < squaredMinSpeed) {
            const closestVelocity = this.findClosestPrecomputedVelocity(this.vx, this.vy);
            this.vx = closestVelocity.vx;
            this.vy = closestVelocity.vy;
        }
    }

	// Update particle position with improved boundary collision handling
	update(canvasWidth, canvasHeight) {
	    // Apply friction
	    this.vx *= this.friction;
	    this.vy *= this.friction;	

        this.adjustForMinimumSpeed();
	
	    // Preliminary position update
	    this.x += this.vx;
	    this.y += this.vy;
	
	    // Boundary collision and position correction
	    if (this.x - this.radius <= 0) {
	        this.vx *= -1;
	        this.x = this.radius; // Position correction
	    } else if (this.x + this.radius >= canvasWidth) {
	        this.vx *= -1;
	        this.x = canvasWidth - this.radius; // Position correction
	    }
	
	    if (this.y - this.radius <= 0) {
	        this.vy *= -1;
	        this.y = this.radius; // Position correction
	    } else if (this.y + this.radius >= canvasHeight) {
	        this.vy *= -1;
	        this.y = canvasHeight - this.radius; // Position correction
	    }
	}

    // Draw particle on canvas
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    }

    // Check if a point is close to the particle within a certain threshold
    isNear(point, threshold) {
        const dx = this.x - point.x;
        const dy = this.y - point.y;
        return dx * dx + dy * dy < threshold * threshold;
    }

	// Method to infect the particle, initiating the color change
    infect() {
        this.infected = true;
        this.infectionStep = 1; // Start the infection process
    }

    updateColor() {
        if (this.infected) {
            // Progressively fade color back to original
            const fadeRate = 0.005; // How quickly the color fades each frame
            this.infectionStep -= fadeRate;
            if (this.infectionStep <= 0) {
                this.infected = false;
                this.color = this.originalColor;
                this.infectionStep = 0;
            } else {
                // Calculate intermediate color
                //this.color = this.interpolateColor(this.effectColor, this.originalColor, 1 - this.infectionStep);
                this.color = this.lerpColor(this.effectColor, this.originalColor, 1 - this.infectionStep);
            }
        }
    }

	// Linearly interpolates between two colors specified as RGBA strings
	lerpColor(color1, color2, factor) {
	    // Parse the RGBA strings to arrays of numbers
	    const rgba1 = color1.match(/\d+/g).map(Number);
	    const rgba2 = color2.match(/\d+/g).map(Number);
	
	    // Interpolate each component
	    let result = rgba1.map((component, index) => {
	        return Math.round(component + (rgba2[index] - component) * factor);
	    });

	    this.effectRGB = [result[0], result[1], result[2]];
	
	    // Construct the interpolated RGBA string
	    return `rgba(${result[0]}, ${result[1]}, ${result[2]}, ${result[3]})`;
	}


    // Interpolate between two colors
    interpolateColor(color1, color2, factor) {
        // Simple linear interpolation between two colors
        // Note: This is a placeholder. You'll need a more complex function for RGB color interpolation
        // Consider using a library or a detailed function that parses the colors and interpolates each channel
        return factor < 0.5 ? color1 : color2;
    }

    // Change color of the particle
    changeColor(newColor, transitionTime = 1000) {
        // Gradually change the particle's color to newColor over transitionTime
        // Placeholder for color transition logic
        this.color = newColor; // Immediate color change for now
    }

    // Placeholder for repulsion effect
    repulse(directionVector, force) {
        // This method would change the particle's velocity based on the repulsion force and direction
        // Placeholder logic for repulsion
    }
}