class ParticleSystem { /* distanceMethodType = 'squared' || 'euclidean' || 'hybrid' */
    constructor(numBinsX=10, numBinsY=10, distanceMethodType='squared', enablePrecomputeVelocities=true) {
        this.particles = [];
        this.bins = {};
        this.particleRadius = 5;
        this.canvasWidth = window.innerWidth;
        this.canvasHeight = window.innerHeight;

        this.ctx = null;

        // Size of the bins for spatial partitioning
		this.numBinsX = numBinsX; // Desired number of bins horizontally
        this.numBinsY = numBinsY; // Desired number of bins vertically

        this.distanceMethodType = distanceMethodType; 

        this.distanceMethodLines = null; 
		this.distanceMethodCollisions = null; 
		this.collisionLogic = null; 	

		//70^2 for 'squared'  || 'hybrid'
        this.distanceForLines = (this.distanceMethodType === 'squared' || this.distanceMethodType === 'hybrid') ? 4900 : 80; //70^2
        this.minDistanceForLines; //(this.distanceMethodType === 'squared' || this.distanceMethodType === 'hybrid') ? (this.particleRadius*2) * (this.particleRadius*2) + 1000 : 8000; //70^2; //particle radius * 2

        this.minDistanceForLinesOffset = 15;
		this.setDistanceOptions(this.distanceMethodType); 

        this.enablePrecomputeVelocities = enablePrecomputeVelocities;
        //this.collisionThreshold = 1;

        this.showBinsBoundaries = false;
        this.showSubdividedBins = false;

        if (this.enablePrecomputeVelocities) {
        	this.precomputedVelocities = [];
        	this.precomputeParticlesVelocities();
		}

        this.updateBinSize();
    }

    setDistanceOptions(distanceMethod) {
    	console.log('setDistanceOptions :: ',distanceMethod);
    	if (distanceMethod === 'squared') {
			this.distanceMethodLines = this.getDistanceSquared;
			this.distanceMethodCollisions = this.getDistanceSquared;
			this.collisionLogic = this.collisionLogicSquared;
			this.minDistanceForLines = (this.particleRadius*2) * (this.particleRadius*2) + (this.minDistanceForLinesOffset * this.minDistanceForLinesOffset); // (particle radius * 2)^2 + offset^2
		}
        if (distanceMethod === 'euclidean') {
        	this.distanceMethodLines = this.getEuclideanDistance;
        	this.distanceMethodCollisions =  this.getEuclideanDistance;
        	this.collisionLogic = this.collisionLogicEuclidean;
        	this.minDistanceForLines = (this.particleRadius*2) + this.minDistanceForLinesOffset; //particle radius * 2 + offset
        }
        if (distanceMethod === 'hybrid') {
        	this.distanceMethodLines = this.getDistanceSquared;
        	this.distanceMethodCollisions =  this.getEuclideanDistance;
        	this.collisionLogic = this.collisionLogicEuclidean;
        	this.minDistanceForLines =  (this.particleRadius*2) + (this.minDistanceForLinesOffset * this.minDistanceForLinesOffset); // particle radius + offset^2
        }
    }

    setDistanceForLines(distanceForLines) {
    	this.distanceForLines = distanceForLines;
    }

    getParticles() {
    	return this.particles;
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
        const particle = new Particle(x, y, this.particleRadius, speedMethod);
        if (this.enablePrecomputeVelocities) particle.setFindClosestPrecomputedVelocity(this.findClosestPrecomputedVelocity.bind(this));
        this.particles.push(particle);
    }

    // Remove a fixed number of particles from random positions
	removeRandomParticles(count) {
	    for (let i = 0; i < count; i++) {
	        if (this.particles.length > 0) {
	            const randomIndex = Math.floor(Math.random() * this.particles.length);
	            this.particles.splice(randomIndex, 1);
	        } else {
	            console.log("No more particles to remove.");
	            break;
	        }
	    }
	}

	// Add a fixed number of particles and shuffle them
	addAndShuffleParticles(count, xRange, yRange) {
	    for (let i = 0; i < count; i++) {
	        const x = Math.random() * xRange; // Replace xRange with the range of x values you desire
	        const y = Math.random() * yRange; // Replace yRange with the range of y values you desire
	        //const particle = new Particle(x, y, (this.enablePrecomputeVelocities) ? 'precomputed' : 'dynamic');
	        this.addParticle(x, y);
	        //this.particles.push(particle);
	    }
	    // Shuffle the particles array
	    for (let i = this.particles.length - 1; i > 0; i--) {
	        const j = Math.floor(Math.random() * (i + 1));
	        [this.particles[i], this.particles[j]] = [this.particles[j], this.particles[i]];
	    }
	}

	// Remove a specific particle based on its ID
	removeParticleById(particleId) {
	    const index = this.particles.findIndex(particle => particle.id === particleId);
	    if (index !== -1) {
	        this.particles.splice(index, 1);
	    } else {
	        console.log("Particle with ID " + particleId + " not found.");
	    }
	}

    // Update system state: particle positions, bin assignments
	update() {
	    this.clearBins();
	    this.particles.forEach(particle => {
	        particle.update(this.canvasWidth, this.canvasHeight);
	        particle.updateColor(); // Using color transitions
	        this.assignToBin(particle);
	    });

	    this.handleCollisions(); 
	}

	// Update the size of the bins based on canvas size
    updateBinSize(canvasWidth, canvasHeight) {
    	this.canvasWidth = canvasWidth;
    	this.canvasHeight = canvasHeight;

        this.binSizeX = this.canvasWidth / this.numBinsX;
        this.binSizeY = this.canvasHeight / this.numBinsY;
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

    // Update system state: particle positions, bin assignments
	resetParticlesVelocity() {
	    this.particles.forEach(particle => {
	        particle.vx = Math.random() * 2 - 1; // Velocity x
        	particle.vy = Math.random() * 2 - 1; // Velocity y
	    });
	}

    // Clears the bins for the next update cycle
    clearBins() {
        this.bins = {};
    }

    // Draw particles and connections
    draw(ctx) {
    	this.ctx = ctx;
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
	//drawConnectionsV1(ctx, reach = 1) {
	//    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Default line color and alpha
	//    ctx.lineWidth = 1; // Default line width
	//
	//    const checkAndDrawLine = (particleA, particleB) => {
	//        const distance = this.distanceMethodLines(particleA, particleB);
	//        const maxDistance = this.distanceForLines; // Adjust as needed
	//        if (distance < maxDistance) {
	//            const alpha = Math.max(0.1, 1 - distance / maxDistance);
	//
	//            const originalLineColor = `rgba(${particleA.originalColorRGB[0]}, ${particleA.originalColorRGB[1]}, ${particleA.originalColorRGB[2]}, ${alpha})`;
	//            let infectedLineColor = `rgba(0, 255, 255, ${alpha})`;
	//
	//            if (particleA.infected) infectedLineColor = `rgba(${particleA.effectRGB[0]}, ${particleA.effectRGB[1]}, ${particleA.effectRGB[2]}, ${alpha})`;
	//            if (particleB.infected) infectedLineColor = `rgba(${particleB.effectRGB[0]}, ${particleB.effectRGB[1]}, ${particleB.effectRGB[2]}, ${alpha})`;
	//            
	//            ctx.strokeStyle = particleA.infected || particleB.infected ? infectedLineColor : originalLineColor;
	//            //ctx.lineWidth = particleA.infected || particleB.infected ? 1.2 : 1; // Slightly thicker lines for infected state
	//            ctx.beginPath();
	//            ctx.moveTo(particleA.x, particleA.y);
	//            ctx.lineTo(particleB.x, particleB.y);
	//            ctx.stroke();
	//        }
	//    };
	//
	//	// Dynamically calculate neighbor offsets based on reach
	//	const neighborOffsets = [];
	//	for (let dx = -reach; dx <= reach; dx++) {
	//	    for (let dy = -reach; dy <= reach; dy++) {
	//	        neighborOffsets.push([dx, dy]);
	//	    }
	//	}
	//
	//	// Drawing code, using the dynamically calculated neighborOffsets...
	//	Object.keys(this.bins).forEach(binId => {
	//	    const [binX, binY] = binId.split(',').map(Number);
	//
	//	    neighborOffsets.forEach(([offsetX, offsetY]) => {
	//	        const neighborBinId = `${binX + offsetX},${binY + offsetY}`;
	//	        const currentBinParticles = this.bins[binId] || [];
	//	        const neighborBinParticles = this.bins[neighborBinId] || [];
	//
	//	        currentBinParticles.forEach(particleA => {
	//	            neighborBinParticles.forEach(particleB => {
	//	                if (particleA === particleB) return; // Avoid self-comparison
	//	                checkAndDrawLine(particleA, particleB);
	//	            });
	//	        });
	//	    });
	//	});
	//}

	// Draw connections between close particles including neighboring bins
	// improved drawing method 
	// skipSameBinConnections could be helpful for really small bins
	//drawConnections(ctx, reach = 1, skipSameBinConnections = false) {
	drawConnections(ctx, reach = 1) {
		if (this.distanceForLines <= this.particleRadius + this.particleRadius) return; 
	    ctx.lineWidth = 1; // Default line width
	
	    const linesByColor = new Map();
	
	    const addLine = (particleA, particleB, color) => {
	        if (!linesByColor.has(color)) {
	            linesByColor.set(color, []);
	        }
	        linesByColor.get(color).push({ from: particleA, to: particleB });
	    };
	
	    // Optimized neighbor offsets to avoid unnecessary checks
	    const neighborOffsets = [];
	    for (let dx = -reach; dx <= reach; dx++) {
	        for (let dy = -reach; dy <= reach; dy++) {
	            // Skip the offset for the same bin if skipSameBinConnections is true
	            //if (skipSameBinConnections && dx === 0 && dy === 0) continue;
	            neighborOffsets.push([dx, dy]);
	        }
	    }
	
	    Object.keys(this.bins).forEach(binId => {
	        const [binX, binY] = binId.split(',').map(Number);
	
	        neighborOffsets.forEach(([offsetX, offsetY]) => {
	            const neighborBinId = `${binX + offsetX},${binY + offsetY}`;
	            const currentBinParticles = this.bins[binId] || [];
	            const neighborBinParticles = this.bins[neighborBinId] || [];
	
	            currentBinParticles.forEach(particleA => {
	                neighborBinParticles.forEach(particleB => {
	                    if (particleA === particleB) {
	                        // Ensure we do not compare a particle with itself
	                        return;
	                    }
	
	                    // Continue with original logic for determining if a line should be drawn
	                    const distance = this.distanceMethodLines(particleA, particleB);
	
	                    if (distance >= this.distanceForLines || distance <= this.minDistanceForLines) return;
	
	                    const alpha = Math.max(0.1, 1 - distance / this.distanceForLines);
	                    let color = `rgba(${particleA.originalColorRGB[0]}, ${particleA.originalColorRGB[1]}, ${particleA.	originalColorRGB[2]}, ${alpha})`;
	
	                    if (particleA.infected || particleB.infected) {
	                        const effectRGB = particleA.infected ? particleA.effectRGB : particleB.effectRGB;
	                        color = `rgba(${effectRGB[0]}, ${effectRGB[1]}, ${effectRGB[2]}, ${alpha})`;
	                    }
	
	                    addLine(particleA, particleB, color);
	                });
	            });
	        });
	    });
	
	    // Draw all lines grouped by color
	    linesByColor.forEach((value, key) => {
	        ctx.strokeStyle = key;
	        value.forEach(line => {
	            ctx.beginPath();
	            ctx.moveTo(line.from.x, line.from.y);
	            ctx.lineTo(line.to.x, line.to.y);
	            ctx.stroke();
	        });
	    });
	}

	drawConnectionsGOOD1(ctx, reach = 1, skipSameBinConnections = false) {
	    ctx.lineWidth = 1; // Default line width
	
	    const linesByColor = new Map();
	
	    const addLine = (particleA, particleB, color) => {
	        if (!linesByColor.has(color)) {
	            linesByColor.set(color, []);
	        }
	        linesByColor.get(color).push({ from: particleA, to: particleB });
	    };
	
	    const neighborOffsets = [];
	    for (let dx = -reach; dx <= reach; dx++) {
	        for (let dy = -reach; dy <= reach; dy++) {
	            neighborOffsets.push([dx, dy]);
	        }
	    }
	
	    Object.keys(this.bins).forEach(binId => {
	        const [binX, binY] = binId.split(',').map(Number);
	
	        neighborOffsets.forEach(([offsetX, offsetY]) => {
	            const neighborBinId = `${binX + offsetX},${binY + offsetY}`;
	            const currentBinParticles = this.bins[binId] || [];
	            const neighborBinParticles = this.bins[neighborBinId] || [];
	
	            currentBinParticles.forEach(particleA => {
	                neighborBinParticles.forEach(particleB => {
	                    if (skipSameBinConnections && binId === neighborBinId && particleA !== particleB) {
	                        // Skip connections within the same bin if skipSameBinConnections is true
	                        return;
	                    }
	
	                    // Continue with original logic for determining if a line should be drawn
	                    const distance = this.distanceMethodLines(particleA, particleB);
	                    
	                    if (distance >= this.distanceForLines || distance <= this.minDistanceForLines) return;
	
	                    const alpha = Math.max(0.1, 1 - distance / this.distanceForLines);
	                    let color = `rgba(${particleA.originalColorRGB[0]}, ${particleA.originalColorRGB[1]}, ${particleA.originalColorRGB[2]}, ${alpha})`;
	
	                    if (particleA.infected || particleB.infected) {
	                        const effectRGB = particleA.infected ? particleA.effectRGB : particleB.effectRGB;
	                        color = `rgba(${effectRGB[0]}, ${effectRGB[1]}, ${effectRGB[2]}, ${alpha})`;
	                    }
	
	                    addLine(particleA, particleB, color);
	                });
	            });
	        });
	    });
	
	    // Draw all lines grouped by color
	    linesByColor.forEach((value, key) => {
	        ctx.strokeStyle = key;
	        value.forEach(line => {
	            ctx.beginPath();
	            ctx.moveTo(line.from.x, line.from.y);
	            ctx.lineTo(line.to.x, line.to.y);
	            ctx.stroke();
	        });
	    });
	}

    // Calculates the distance between two particles based on the distanceMethod formula choosen at instantiation
    calculateDistance(particleA, particleB) {
    	return this.distanceMethodCollisions(particleA, particleB);
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

	handleCollisionsV0() {
	    for (const binId in this.bins) {
	        const particles = this.bins[binId];
	        if (!particles || particles.length < 2) continue;// Skip if bin is empty or has only one particle

			// Check for collisions only within the same bin
	        for (let i = 0; i < particles.length; i++) {
	            for (let j = i + 1; j < particles.length; j++) {
	                const p1 = particles[i];
	                const p2 = particles[j];
	                // Returns squared or Euclidean distance base on instantiation parameters
	                const distance = this.calculateDistance(p1, p2); 
	                
	                let minDistance = (this.distanceMethodType === 'squared') ? p1.squaredRadius : p1.radius + p2.radius;
	                
	                if (distance < minDistance) {	                	
	            	    // Collision detected 
	            	    this.collisionLogic(p1, p2, distance, minDistance);
	            	}
	            }
	        }
	    }
	}

	handleCollisions() {
		const particleNumThreshold = 5;
		const minBinSize = 50;
	    for (const binId in this.bins) {
	        const particles = this.bins[binId];
	        if (!particles || particles.length < 2) continue; // Skip if bin is empty or has only one particle
	
	        // Subdivide bin if threshold exceeded and bin size allows
	        if (particles.length > particleNumThreshold && this.canSubdivide(binId, minBinSize)) {
	            this.subdivideBin(binId);
	            continue; // Skip further collision checks in this cycle
	        }
	
	        // Check for collisions only within the same bin
	        this.checkCollisionsWithinBin(particles);
	    }
	}
	
    // Method to check if a bin can be subdivided
	canSubdivide(binId, minBinSizeVal) {
	    // minimum value for bin size, based on particle diameter
	    const minBinSize = minBinSizeVal;
	
	    // Calculate new potential bin sizes after subdivision
	    const newBinSizeX = this.binSizeX / 2;
	    const newBinSizeY = this.binSizeY / 2;
	
	    // Check if subdividing the bin would result in bins smaller than the minimum size in both dimensions	    
	    return newBinSizeX >= minBinSize && newBinSizeY >= minBinSize;
	}

	subdivideBin(binId) {
	    const [binX, binY] = binId.split(',').map(Number); 
	    const particles = this.bins[binId];
	    const halfBinSizeX = this.binSizeX / 2;
	    const halfBinSizeY = this.binSizeY / 2;
	    const startX = binX * this.binSizeX;
	    const startY = binY * this.binSizeY;
	
	    let tempBins = {};
	    let subdividedBinDetails = [];
	
	    const positions = [
	        [startX, startY],
	        [startX + halfBinSizeX, startY],
	        [startX, startY + halfBinSizeY],
	        [startX + halfBinSizeX, startY + halfBinSizeY],
	    ];
	
	    positions.forEach(([x, y]) => {
	        const subBinX = Math.floor(x / this.binSizeX);
	        const subBinY = Math.floor(y / this.binSizeY);
	        const newBinId = `${subBinX},${subBinY}`;
	        tempBins[newBinId] = []; // Ensure initialization
	        subdividedBinDetails.push({ x, y, width: halfBinSizeX, height: halfBinSizeY });
	    });
	
	    // Distribute particles into new temporary bins
	    particles.forEach(particle => {
	        const particleX = Math.floor(particle.x / halfBinSizeX) * halfBinSizeX;
	        const particleY = Math.floor(particle.y / halfBinSizeY) * halfBinSizeY;
	        const subBinX = Math.floor(particleX / this.binSizeX);
	        const subBinY = Math.floor(particleY / this.binSizeY);
	        const newBinId = `${subBinX},${subBinY}`;
	
	        if (!tempBins[newBinId]) {
	            tempBins[newBinId] = [];
	        }
	        tempBins[newBinId].push(particle);
	    });
	
	    if (this.showSubdividedBins) {
	        this.drawSubdividedBinBoundaries(subdividedBinDetails);
	    }
	
	    Object.keys(tempBins).forEach(binId => {
	        this.checkCollisionsWithinBin(tempBins[binId]);
	    });
	}
	
	checkCollisionsWithinBin(particles) {
	    for (let i = 0; i < particles.length; i++) {
	        for (let j = i + 1; j < particles.length; j++) {
	            const p1 = particles[i];
	            const p2 = particles[j];
	            const distance = this.calculateDistance(p1, p2);
	            let minDistance = (this.distanceMethodType === 'squared') ? p1.squaredRadius : p1.radius + p2.radius;
	            
	            if (distance < minDistance) {
	                // Collision detected
	                this.collisionLogic(p1, p2, distance, minDistance);
	            }
	        }
	    }
	}

	drawSubdividedBinBoundaries(subdividedBinDetails) {
		if (!this.ctx) return ;
	    const ctx = this.ctx; // Assuming this is your canvas rendering context
	    ctx.save(); // Save the current context state
	
	    ctx.strokeStyle = 'rgba(255, 255, 255, 1.5)'; // Semi-transparent red for visibility
	    ctx.lineWidth = 1; // Thin line width for the bin boundaries
	
	    // Iterate over the provided subdivided bin details
	    subdividedBinDetails.forEach(({x, y, width, height}) => {
	        ctx.beginPath();
	        ctx.rect(x, y, width, height); // Draw the rectangle for the bin boundary
	        ctx.stroke();
	    });
	
	    ctx.restore(); // Restore the context state
	}

	debugInfect(p1, p2) {
		p1.effectRGB = [255, 5, 5];
		p1.effectColor = 'rgba(255, 5, 5, 1)';
		p1.infect(); 
		p2.effectRGB = [255, 5, 5];		
		p1.effectColor = 'rgba(255, 5, 5, 1)';
		p2.infect();
	}

	collisionLogicEuclidean(p1, p2, distance, minDistance) {
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

	// simplified collision logic with distanceSquared for faster performance but less accurate then math.sqrt euclidean logic
	collisionLogicSquared(p1, p2, distanceSquared, minDistanceSquared) {
	    const dx = p1.x - p2.x;
	    const dy = p1.y - p2.y;
	
	    const dvx = p1.vx - p2.vx;
	    const dvy = p1.vy - p2.vy;
	
	    const projectionFactor = (dvx * dx + dvy * dy) / distanceSquared;
	
	    const changeVx = dx * projectionFactor;
	    const changeVy = dy * projectionFactor;
	
	    p1.vx -= changeVx;
	    p1.vy -= changeVy;
	    p2.vx += changeVx;
	    p2.vy += changeVy;
	
	    // Fixed overlap adjustment
	    // Determine the direction of the adjustment
	    const adjustDirectionX = dx < 0 ? -1 : 1;
	    const adjustDirectionY = dy < 0 ? -1 : 1;
	    // Fixed amount of separation to apply
	    const separationAmount = 1; // Choose a small value that works for the simulation
	
	    // Apply a fixed separation along the direction vector
	    p1.x += adjustDirectionX * separationAmount;
	    p1.y += adjustDirectionY * separationAmount;
	    p2.x -= adjustDirectionX * separationAmount;
	    p2.y -= adjustDirectionY * separationAmount;
	}


	// TODO:: test simplified Euclidean collision logic for faster performance but less accurate
	//collisionLogicEuclidean(p1, p2, distance, minDistance) {
	//    const dx = p1.x - p2.x;
	//    const dy = p1.y - p2.y;
	//
	//    // Invert velocities for a simple collision effect
	//    [p1.vx, p2.vx] = [-p2.vx, -p1.vx];
	//    [p1.vy, p2.vy] = [-p2.vy, -p1.vy];
	//
	//	// For Euclidean distances, directly use the calculated overlap
	//	 const overlap = minDistance - distance;
	//	 const adjustmentFactor = overlap / distance; // Normalize based on distance
	//	 p1.x += dx * adjustmentFactor;
	//	 p1.y += dy * adjustmentFactor;
	//	 p2.x -= dx * adjustmentFactor;
	//	 p2.y -= dy * adjustmentFactor;
	//}

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
	            	// TODO :: decide if use variable distance type calculation or parametrize it 
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

	killAll() {
		this.clearBins();
		this.particles = [];
		this.particles = null;

	}
/*end of class*/
}
