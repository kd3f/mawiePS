class ParticleSystem { /* distanceType = 'squared' || 'euclidean' */
    constructor(numBinsX=10, numBinsY=10, distanceType='squared', enablePrecomputeVelocities=true) {
        this.particles = [];
        this.bins = {};

        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        // Size of the bins for spatial partitioning
		this.numBinsX = numBinsX; // Desired number of bins horizontally
        this.numBinsY = numBinsY; // Desired number of bins vertically

        this.distanceMethod = null; 
		if (distanceType === 'squared') {
			this.distanceMethod = this.getDistanceSquared;
			this.collisionLogic = this.collisionLogicSquared;
		}
        if (distanceType === 'euclidean') {
        	this.distanceMethod =  this.getEuclideanDistance;
        	this.collisionLogic = this.collisionLogicEuclidean;
        }
        this.distanceForLines = (distanceType === 'euclidean') ? 80 : 4900; //70^2

        this.enablePrecomputeVelocities = enablePrecomputeVelocities;

        this.showBinsBoundaries = false;

        if (this.enablePrecomputeVelocities) {
        	this.precomputedVelocities = [];
        	this.precomputeParticlesVelocities();
		}

        this.updateBinSize();
    }

    precomputeParticlesVelocities() {
		//precompute vectors //
		const minSpeed = 0.6;
		const directions = 24;				
		
		for (let i = 0; i < directions; i++) {
		    const theta = (i * (360 / directions)) * (Math.PI / 180); // Convert angle to radians
		    const vx = Math.cos(theta) * minSpeed;
		    const vy = Math.sin(theta) * minSpeed;
		    this.precomputedVelocities.push({ vx, vy });
		}
    }

	findClosestPrecomputedVelocity(vx, vy) {
	    let closestDistance = Infinity;
	    let closestVelocity = null;
	
	    for (const precomputedVelocity of this.precomputedVelocities) {
	        const dx = precomputedVelocity.vx - vx;
	        const dy = precomputedVelocity.vy - vy;
	        const distanceSquared = dx * dx + dy * dy; // No need for Math.sqrt, comparing squared distances is sufficient
	
	        if (distanceSquared < closestDistance) {
	            closestDistance = distanceSquared;
	            closestVelocity = precomputedVelocity;
	        }
	    }
	
	    return closestVelocity;
	}

    // Add particle to system
    addParticle(x, y) {
    	const speedMethod = (this.enablePrecomputeVelocities) ? 'precomputed' : 'dynamic';
        const particle = new Particle(x, y, speedMethod);
        if (this.enablePrecomputeVelocities) particle.setFindClosestPrecomputedVelocity(this.findClosestPrecomputedVelocity.bind(this));
        this.particles.push(particle);
    }

    // Update system state: particle positions, bin assignments
	update() {
	    this.clearBins();
	    this.particles.forEach(particle => {
	        particle.update(this.canvasWidth, this.canvasHeight);
	        particle.updateColor(); // Ensure this is still here if you're using color transitions
	        this.assignToBin(particle);
	    });

	    this.handleCollisions(); 
	}

	// Update the size of the bins based on canvas size
    updateBinSize() {
        this.binSizeX = canvas.width / this.numBinsX;
        this.binSizeY = canvas.height / this.numBinsY;
    }

    // Assigns a particle to the appropriate bin using binSizeX and binSizeY for binning logic
    assignToBin(particle) {
        const binX = Math.floor(particle.x / this.binSizeX);
        const binY = Math.floor(particle.y / this.binSizeY);
        const binId = `${binX},${binY}`;

        if (!this.bins[binId]) {
            this.bins[binId] = [];
        }

        this.bins[binId].push(particle);
    }

    // Clears the bins for the next update cycle
    clearBins() {
        this.bins = {};
    }

    // Draw particles and connections
    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
        if (this.showBinsBoundaries) this.drawBinBoundaries(ctx); // Draw the bin boundaries for debugging
        this.drawConnections(ctx);
    }

    // Method to draw the boundaries of the bins
	drawBinBoundaries(ctx) {
	    ctx.save(); // Save the current context state to preserve settings like strokeStyle
	
	    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Use a semi-transparent red for visibility
	    ctx.lineWidth = 1; // Set a thin line width for the bin boundaries
	
	    // Use separate bin sizes for X and Y
	    const binSizeX = this.binSizeX;
	    const binSizeY = this.binSizeY;
	
	    Object.keys(this.bins).forEach(binId => {
	        const [binX, binY] = binId.split(',').map(Number);
	        // Calculate the top-left corner of the bin
	        const x = binX * binSizeX;
	        const y = binY * binSizeY;
	
	        ctx.beginPath();
	        ctx.rect(x, y, binSizeX, binSizeY); // Draw a rectangle representing the bin boundary
	        ctx.stroke();
	    });
	
	    ctx.restore(); // Restore the context state
	}

    // Draw connections between close particles with debugging checks
	drawConnectionsDebug(ctx) {

	    ctx.save(); // Save the current context state
	
	    ctx.strokeStyle = 'rgba(255, 0, 0, 1)'; // Use a bright color for visibility
	    ctx.lineWidth = 2; // Ensure lines are thick enough to be visible
	
	    Object.values(this.bins).forEach(bin => {
	        bin.forEach(particleA => {
	            bin.forEach(particleB => {
	                if (particleA === particleB) return; // Skip self connections
	                
	                const distance = this.calculateDistance(particleA, particleB);
	                if (distance < 100) { // Use a simplified fixed threshold
	                    console.log("Drawing line:", particleA, particleB); // Debugging output
	                    ctx.beginPath();
	                    ctx.moveTo(particleA.x, particleA.y);
	                    ctx.lineTo(particleB.x, particleB.y);
	                    ctx.stroke();
	                }
	            });
	        });
	    });
	
	    ctx.restore(); // Restore the context state to what it was before
	}

	// Draw connections between close particles including neighboring bins
	drawConnections(ctx, reach = 1) {
	    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Default line color and alpha
	    ctx.lineWidth = 1; // Default line width
	
	    const checkAndDrawLine = (particleA, particleB) => {
	        const distance = this.calculateDistance(particleA, particleB);
	        const maxDistance = this.distanceForLines; // Adjust as needed
	        if (distance < maxDistance) {
	            const alpha = Math.max(0.1, 1 - distance / maxDistance);
	            //ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;originalColorRGB

	            const originalLineColor = `rgba(${particleA.originalColorRGB[0]}, ${particleA.originalColorRGB[1]}, ${particleA.originalColorRGB[2]}, ${alpha})`;
	            let infectedLineColor = `rgba(0, 255, 255, ${alpha})`;

	            //if (particleA.infected) console.log('particleA', particleA.color);
	            //if (particleB.infected) console.log('particleB', particleB.color);

	            if (particleA.infected) infectedLineColor = `rgba(${particleA.effectRGB[0]}, ${particleA.effectRGB[1]}, ${particleA.effectRGB[2]}, ${alpha})`;
	            if (particleB.infected) infectedLineColor = `rgba(${particleB.effectRGB[0]}, ${particleB.effectRGB[1]}, ${particleB.effectRGB[2]}, ${alpha})`;
	            
	            ctx.strokeStyle = particleA.infected || particleB.infected ? infectedLineColor : originalLineColor;
	            //ctx.lineWidth = particleA.infected || particleB.infected ? 1.2 : 1; // Slightly thicker lines for infected state
	            ctx.beginPath();
	            ctx.moveTo(particleA.x, particleA.y);
	            ctx.lineTo(particleB.x, particleB.y);
	            ctx.stroke();
	        }
	    };

		// Dynamically calculate neighbor offsets based on reach
		const neighborOffsets = [];
		for (let dx = -reach; dx <= reach; dx++) {
		    for (let dy = -reach; dy <= reach; dy++) {
		        neighborOffsets.push([dx, dy]);
		    }
		}

		// Drawing code, using the dynamically calculated neighborOffsets...
		Object.keys(this.bins).forEach(binId => {
		    const [binX, binY] = binId.split(',').map(Number);

		    neighborOffsets.forEach(([offsetX, offsetY]) => {
		        const neighborBinId = `${binX + offsetX},${binY + offsetY}`;
		        const currentBinParticles = this.bins[binId] || [];
		        const neighborBinParticles = this.bins[neighborBinId] || [];

		        currentBinParticles.forEach(particleA => {
		            neighborBinParticles.forEach(particleB => {
		                if (particleA === particleB) return; // Avoid self-comparison
		                checkAndDrawLine(particleA, particleB);
		            });
		        });
		    });
		});
	}

    // Calculates the distance between two particles based on the distanceMethod formula choosen at instantiation
    calculateDistance(particleA, particleB) {
    	return this.distanceMethod(particleA, particleB);
    }
    
    getEuclideanDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getDistanceSquared(p1, p2){
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }

    // old approach delete method if not needed elsewhere
	changeAlpha(rgbaColor, newAlpha) {
	    // Regular expression to match the rgba format
	    const rgbaRegex = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)\)/;
	    const match = rgbaColor.match(rgbaRegex);
	
	    if (match) {
	        // Construct a new rgba string with the original RGB values and the new alpha value
	        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${newAlpha})`;
	    } else {
	        console.error('Invalid RGBA color string:', rgbaColor);
	        return rgbaColor; // Return the original string if it doesn't match the expected format
	    }
	}

	handleCollisions() {
	    // Directly iterate over bins without using Object.keys
	    for (const binId in this.bins) {
	        const particles = this.bins[binId];
	        if (!particles || particles.length < 2) continue; // Skip if bin is empty or has only one particle
	
	        // Check for collisions only within the same bin
	        for (let i = 0; i < particles.length; i++) {
	            for (let j = i + 1; j < particles.length; j++) {
	                const p1 = particles[i];
	                const p2 = particles[j];
	
	                const distance = this.calculateDistance(p1, p2);           
	                let minDistance = p1.radius + p2.radius;  
	                minDistance = (this.distanceType === 'squared') ? minDistance*minDistance : minDistance;
	
	                if (distance < minDistance) {
	                    // Collision response logic here
	                    this.collisionLogic(p1, p2, distance, minDistance);
	                    
	                }
	            }
	        }
	    }
	}

	collisionLogicEuclidean(p1, p2, distance, minDistance) {
		console.log(distance);
		const dx = p1.x - p2.x;
		const dy = p1.y - p2.y;
		// Simple collision response
		const angle = Math.atan2(dy, dx);
		const speed1 = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
		const speed2 = Math.sqrt(p2.vx * p2.vx + p2.vy * p2.vy);
		
		p1.vx = Math.cos(angle) * speed2;
		p1.vy = Math.sin(angle) * speed2;
		p2.vx = Math.cos(angle + Math.PI) * speed1;
		p2.vy = Math.sin(angle + Math.PI) * speed1;
		
		// Adjust positions to ensure particles are not stuck together
		const overlap = 0.5 * (minDistance - distance + 1);
		p1.x += overlap * Math.cos(angle);
		p1.y += overlap * Math.sin(angle);
		p2.x -= overlap * Math.cos(angle);
		p2.y -= overlap * Math.sin(angle);
	}

	// simplified collision logic for faster performance but less accurate
	// invert velocities method
	collisionLogicSquared(p1, p2, distanceSquared, minDistanceSquared) {
	    // Directly invert velocities for bounce
	    p1.vx = -p1.vx;
	    p1.vy = -p1.vy;
	    p2.vx = -p2.vx;
	    p2.vy = -p2.vy;
	
	    // Estimate overlap resolution without sqrt; use a fixed small step based on squared values
	    // Assuming minDistanceSquared is a bit larger than distanceSquared due to overlap
	    const overlapStep = 0.9; // Arbitrary step for adjustment
	    
	    // Calculate directional vector components between particles
	    const dx = p1.x - p2.x;
	    const dy = p1.y - p2.y;
	
	    // Normalize the direction vector components based on their squared magnitude
	    // To avoid sqrt, use a relative adjustment based on the ratio of squared distances
	    const magnitudeSquared = dx * dx + dy * dy;
	    const adjustX = dx / magnitudeSquared * overlapStep * (minDistanceSquared - distanceSquared);
	    const adjustY = dy / magnitudeSquared * overlapStep * (minDistanceSquared - distanceSquared);
	
	    // Apply position adjustments to separate particles slightly
	    // Distribute the adjustment between particles to ensure they move apart equally
	    p1.x += adjustX / 2;
	    p1.y += adjustY / 2;
	    p2.x -= adjustX / 2;
	    p2.y -= adjustY / 2;
	}	


	// simplified collision logic for faster performance but less accurate
	/*collisionLogicEuclidean(p1, p2, distance, minDistance) {
	    const dx = p1.x - p2.x;
	    const dy = p1.y - p2.y;
	
	    // Invert velocities for a simple collision effect
	    [p1.vx, p2.vx] = [-p2.vx, -p1.vx];
	    [p1.vy, p2.vy] = [-p2.vy, -p1.vy];
	
		// For Euclidean distances, directly use the calculated overlap
		 const overlap = minDistance - distance;
		 const adjustmentFactor = overlap / distance; // Normalize based on distance
		 p1.x += dx * adjustmentFactor;
		 p1.y += dy * adjustmentFactor;
		 p2.x -= dx * adjustmentFactor;
		 p2.y -= dy * adjustmentFactor;
	}*/

    // Handle user interaction
    handleInteraction(x, y) {
	    const repulsionRadius = 100; // Distance within which particles will be repulsed
	    const repulsionStrength = 5; // How strongly the particles are pushed away
	
	    // Calculate the range of bins that could be affected based on the repulsion radius
	    const minXBin = Math.floor((x - repulsionRadius) / this.binSizeX);
	    const maxXBin = Math.floor((x + repulsionRadius) / this.binSizeX);
	    const minYBin = Math.floor((y - repulsionRadius) / this.binSizeY);
	    const maxYBin = Math.floor((y + repulsionRadius) / this.binSizeY);
	
	    // Iterate only over bins that are within the repulsion radius
	    for (let binX = minXBin; binX <= maxXBin; binX++) {
	        for (let binY = minYBin; binY <= maxYBin; binY++) {
	            const binId = `${binX},${binY}`;
	            const particles = this.bins[binId] || [];
	
	            // Apply repulsion to particles within these bins if they're within the radius
	            particles.forEach(particle => {
	                const dx = particle.x - x;
	                const dy = particle.y - y;
	                const distance = Math.sqrt(dx * dx + dy * dy);
	
	                if (distance < repulsionRadius) {
	                    const repulseDir = { x: dx / distance, y: dy / distance };
	                    particle.vx += repulseDir.x * repulsionStrength;
	                    particle.vy += repulseDir.y * repulsionStrength;
	                    particle.infect(); // Optionally apply additional effects like infection
	                }
	            });
	        }
	    }
	}
/*end of class*/
}