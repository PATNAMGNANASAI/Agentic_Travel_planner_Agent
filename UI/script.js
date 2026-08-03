document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. ADVANCED 3D GLOBE (Three.js)
    // ==========================================
    const container = document.getElementById('webgl-container');
    const scene = new THREE.Scene();
    
    // Add Fog for depth
    scene.fog = new THREE.FogExp2(0x030614, 0.02);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Group to hold globe and rings
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Holographic Wireframe Sphere
    const sphereGeo = new THREE.SphereGeometry(8, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ 
        color: 0x1e3a8a, 
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(sphere);

    // Glowing Nodes (Particles on the sphere surface)
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = [];
    const posAttr = sphereGeo.attributes.position;
    for(let i=0; i < posAttr.count; i++) {
        if(Math.random() > 0.8) { // Sparse nodes
            particlePos.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        }
    }
    particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const nodes = new THREE.Points(particleGeo, particleMat);
    globeGroup.add(nodes);

    // Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(10, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    globeGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(12, 0.01, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.2 });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 3;
    globeGroup.add(ring2);

    // Background Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for(let i=0; i<1000; i++) {
        starPos.push((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100 - 30);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.3 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Animation Loop
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        // Base rotation
        globeGroup.rotation.y += 0.002;
        ring1.rotation.z += 0.005;
        ring2.rotation.x += 0.003;
        stars.rotation.y -= 0.0005;

        // Mouse Parallax
        gsap.to(scene.rotation, {
            x: mouseY * 0.1,
            y: mouseX * 0.1,
            duration: 2,
            ease: "power2.out"
        });

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ==========================================
    // 2. APP LOGIC & STREAMING UI
    // ==========================================
    const form = document.getElementById('travel-form');
    const searchView = document.getElementById('search-view');
    const resultsView = document.getElementById('results-view');
    const loadingState = document.getElementById('loading-state');
    const agentLog = document.getElementById('agent-log');
    const itineraryContent = document.getElementById('itinerary-content');
    const resetBtn = document.getElementById('reset-btn');

    // Swap origin/destination
    const swapBtn = document.getElementById('swap-btn');
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    swapBtn.addEventListener('click', () => {
        const temp = originInput.value;
        originInput.value = destinationInput.value;
        destinationInput.value = temp;
    });

    // Budget quick-pick chips
    const budgetInput = document.getElementById('budget');
    const budgetChips = document.querySelectorAll('.budget-chip');
    budgetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            budgetInput.value = chip.dataset.amount;
            budgetChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });
    budgetInput.addEventListener('input', () => {
        budgetChips.forEach(c => c.classList.toggle('active', c.dataset.amount === budgetInput.value));
    });

    // Maps keywords found in a heading to a Font Awesome icon class
    function iconForHeading(text) {
        const t = text.toLowerCase();
        if (/flight|airfare|transport/.test(t)) return 'fa-plane';
        if (/hotel|lodging|stay|accommodation/.test(t)) return 'fa-bed';
        if (/budget|cost|price|expense/.test(t)) return 'fa-wallet';
        if (/day\s*\d/.test(t)) return 'fa-calendar-day';
        if (/food|dining|restaurant|cuisine/.test(t)) return 'fa-utensils';
        if (/activit|sightsee|tour|explore/.test(t)) return 'fa-compass';
        if (/tip|note|advice/.test(t)) return 'fa-lightbulb';
        return 'fa-route';
    }

    // Adds icons to headings and a quick-glance stat card row at the top of the itinerary
    function decorateItinerary(origin, destination, budget, totalCost) {
        const headings = itineraryContent.querySelectorAll('h1, h2, h3');
        headings.forEach(h => {
            const icon = document.createElement('i');
            icon.className = `fa-solid ${iconForHeading(h.innerText)} md-heading-icon`;
            h.prepend(icon);
        });

        const remaining = budget - totalCost;
        const statHtml = `
            <div class="trip-stat-grid">
                <div class="trip-stat-card"><div class="stat-label">Route</div><div class="stat-value"><i class="fa-solid fa-plane-departure"></i>${origin.split(',')[0]} → ${destination.split(',')[0]}</div></div>
                <div class="trip-stat-card"><div class="stat-label">Budget</div><div class="stat-value"><i class="fa-solid fa-wallet"></i>$${budget.toFixed(2)}</div></div>
                <div class="trip-stat-card"><div class="stat-label">Estimated Cost</div><div class="stat-value"><i class="fa-solid fa-receipt"></i>$${totalCost.toFixed(2)}</div></div>
                <div class="trip-stat-card"><div class="stat-label">${remaining >= 0 ? 'Remaining' : 'Over Budget'}</div><div class="stat-value"><i class="fa-solid ${remaining >= 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>$${Math.abs(remaining).toFixed(2)}</div></div>
            </div>`;
        itineraryContent.insertAdjacentHTML('afterbegin', statHtml);
    }

    // Groups consecutive "Day N" headings + their content into a connected visual timeline
    function buildDayTimeline() {
        const dayRegex = /day\s*\d+/i;
        const original = Array.from(itineraryContent.children);
        const firstDayIdx = original.findIndex(node =>
            ['H1', 'H2', 'H3'].includes(node.tagName) && dayRegex.test(node.textContent)
        );
        if (firstDayIdx === -1) return; // no day-by-day structure detected, leave content as-is

        const timeline = document.createElement('div');
        timeline.className = 'itinerary-timeline';
        itineraryContent.insertBefore(timeline, original[firstDayIdx]);

        let i = firstDayIdx;
        while (i < original.length) {
            const node = original[i];
            const isHeading = ['H1', 'H2', 'H3'].includes(node.tagName);
            if (isHeading && dayRegex.test(node.textContent)) {
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                const match = node.textContent.match(/day\s*(\d+)/i);
                const badge = document.createElement('div');
                badge.className = 'day-badge';
                badge.textContent = match ? match[1] : '•';
                dayCard.appendChild(badge);

                const body = document.createElement('div');
                body.className = 'day-body';
                body.appendChild(node); // moves the heading node itself
                i++;
                while (i < original.length && !['H1', 'H2', 'H3'].includes(original[i].tagName)) {
                    body.appendChild(original[i]); // moves each sibling until the next heading
                    i++;
                }
                dayCard.appendChild(body);
                timeline.appendChild(dayCard);
            } else {
                break; // hit a non-day heading — stop grouping, let the rest flow normally
            }
        }
    }

    // Flattens top-level itinerary blocks (including individual day-cards) for a granular stream-in
    function collectStreamableBlocks() {
        const blocks = [];
        Array.from(itineraryContent.children).forEach(el => {
            if (el.classList.contains('itinerary-timeline')) {
                Array.from(el.children).forEach(day => blocks.push(day));
            } else {
                blocks.push(el);
            }
        });
        return blocks;
    }

    const agentPhases = [
        { icon: 'fa-microchip', text: 'Booting Bedrock supervisor agent' },
        { icon: 'fa-plane-up', text: 'Transport agent scanning routes' },
        { icon: 'fa-hotel', text: 'Lodging agent negotiating rates' },
        { icon: 'fa-calculator', text: 'Budget critic verifying costs' },
        { icon: 'fa-wand-magic-sparkles', text: 'Synthesizing master itinerary' }
    ];

    // Pushes a new line into the live agent log and dims older ones, terminal-style
    let logLines = [];
    function pushLog(phase) {
        const line = document.createElement('div');
        line.className = 'agent-log-line';
        line.innerHTML = `<i class="fa-solid ${phase.icon}"></i><span>${phase.text}...</span>`;
        agentLog.appendChild(line);
        requestAnimationFrame(() => line.classList.add('visible'));

        logLines.push(line);
        logLines.slice(0, -2).forEach(l => l.classList.add('settled'));
        if (logLines.length > 4) {
            logLines.shift().remove();
        }
        agentLog.scrollTop = agentLog.scrollHeight;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;
        const budget = parseFloat(document.getElementById('budget').value);

        // UI: Show Loader
        loadingState.style.display = 'flex';
        gsap.fromTo(loadingState, { opacity: 0 }, { opacity: 1, duration: 0.3 });

        // Populate flight radar with real cities
        document.getElementById('radar-origin-label').innerText = origin.split(',')[0];
        document.getElementById('radar-dest-label').innerText = destination.split(',')[0];
        
        // UI: Stream Status Log
        agentLog.innerHTML = '';
        logLines = [];
        let phase = 0;
        pushLog(agentPhases[0]);
        const statusInterval = setInterval(() => {
            phase = (phase + 1) % agentPhases.length;
            pushLog(agentPhases[phase]);
        }, 2000);

        // 3D: Activate "Processing" Mode (Spin faster, glow brighter)
        const fastSpin = gsap.to(globeGroup.rotation, { y: "+=15", duration: 10, ease: "none", repeat: -1 });
        gsap.to(particleMat.color, { r: 0.1, g: 0.8, b: 0.4, duration: 1 }); // Turn green-ish

        try {
            // API CALL
            const response = await fetch('http://localhost:8000/api/v1/plan-trip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin, destination, budget })
            });

            if (!response.ok) throw new Error("API Request Failed");
            const data = await response.json();

            // Cleanup Loading State
            clearInterval(statusInterval);
            fastSpin.kill();
            gsap.to(particleMat.color, { r: 0.22, g: 0.74, b: 0.97, duration: 1 }); // Reset color

            // TRANSITION: Hide Search, Show Results
            gsap.to(searchView, { 
                opacity: 0, 
                y: -50, 
                duration: 0.6, 
                ease: "power3.in",
                onComplete: () => {
                    searchView.classList.add('hidden');
                    resultsView.classList.remove('hidden');
                    
                    // Populate Data
                    document.getElementById('total-cost').innerText = `$${data.total_cost.toFixed(2)}`;
                    document.getElementById('route-origin').innerText = origin.split(',')[0];
                    document.getElementById('route-destination').innerText = destination.split(',')[0];
                    itineraryContent.innerHTML = marked.parse(data.itinerary);
                    decorateItinerary(origin, destination, budget, data.total_cost);
                    buildDayTimeline();
                    
                    // Animate the Results Container In
                    gsap.fromTo(resultsView, 
                        { opacity: 0, y: 50 }, 
                        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                    );

                    // STREAMING EFFECT: cinematic materialize-in, block by block, with a live cursor
                    const blocks = collectStreamableBlocks();
                    gsap.set(blocks, { opacity: 0, y: 24, scale: 0.97, filter: 'blur(6px)' });

                    const cursor = document.createElement('span');
                    cursor.className = 'stream-cursor';
                    itineraryContent.appendChild(cursor);

                    const revealTl = gsap.timeline({
                        delay: 0.4,
                        onComplete: () => cursor.remove()
                    });
                    blocks.forEach((block, idx) => {
                        revealTl.to(block, {
                            opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
                            duration: 0.55, ease: 'power2.out',
                            onStart: () => {
                                block.classList.add('just-streamed');
                                itineraryContent.appendChild(cursor); // keep cursor trailing at the end
                                setTimeout(() => block.classList.remove('just-streamed'), 750);
                            }
                        }, idx * 0.22);
                    });
                }
            });

        } catch (error) {
            console.error(error);
            alert("Connection Error. Ensure your FastAPI server is running.");
            clearInterval(statusInterval);
            gsap.to(loadingState, { opacity: 0, duration: 0.3, onComplete: () => loadingState.style.display = 'none' });
            fastSpin.kill();
        }
    });

    // Reset Flow
    resetBtn.addEventListener('click', () => {
        gsap.to(resultsView, {
            opacity: 0, y: 50, duration: 0.5, ease: "power3.in",
            onComplete: () => {
                resultsView.classList.add('hidden');
                
                loadingState.style.display = 'none';
                gsap.set(loadingState, { opacity: 0 });
                searchView.classList.remove('hidden');
                
                gsap.fromTo(searchView, 
                    { opacity: 0, y: -50 }, 
                    { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                );
            }
        });
    });
});