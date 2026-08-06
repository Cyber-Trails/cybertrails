const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
        const isOpen = navigation.classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    navigation.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navigation.classList.remove('open');
            menuButton.setAttribute('aria-expanded', 'false');
        });
    });
}

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => {
    revealObserver.observe(element);
});

const canvas = document.querySelector('#network-canvas');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !prefersReducedMotion) {
    const context = canvas.getContext('2d');
    const pointer = { x: -1000, y: -1000 };
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let nodes = [];
    let pulses = [];
    let lastPulseTime = 0;

    const settings = {
        nodeSpacing: 88,
        linkDistance: 145,
        pointerDistance: 180,
        maxNodes: 125
    };

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        createNodes();
    }

    function createNodes() {
        const targetCount = Math.min(
            settings.maxNodes,
            Math.max(36, Math.floor((width * height) / (settings.nodeSpacing * settings.nodeSpacing)))
        );

        nodes = Array.from({ length: targetCount }, (_, index) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            baseX: 0,
            baseY: 0,
            vx: (Math.random() - 0.5) * 0.075,
            vy: (Math.random() - 0.5) * 0.075,
            radius: Math.random() * 1.35 + 0.75,
            phase: Math.random() * Math.PI * 2,
            strength: index % 9 === 0 ? 1 : Math.random() * 0.55 + 0.22
        }));

        nodes.forEach((node) => {
            node.baseX = node.x;
            node.baseY = node.y;
        });
    }

    function updateNodes(time) {
        nodes.forEach((node) => {
            node.baseX += node.vx;
            node.baseY += node.vy;

            if (node.baseX < -30) node.baseX = width + 30;
            if (node.baseX > width + 30) node.baseX = -30;
            if (node.baseY < -30) node.baseY = height + 30;
            if (node.baseY > height + 30) node.baseY = -30;

            const dx = pointer.x - node.baseX;
            const dy = pointer.y - node.baseY;
            const distance = Math.hypot(dx, dy);
            const influence = Math.max(0, 1 - distance / settings.pointerDistance);
            const driftX = Math.sin(time * 0.00018 + node.phase) * 4;
            const driftY = Math.cos(time * 0.00016 + node.phase) * 4;

            node.x = node.baseX + driftX - dx * influence * 0.025;
            node.y = node.baseY + driftY - dy * influence * 0.025;
        });
    }

    function drawConnections() {
        for (let index = 0; index < nodes.length; index += 1) {
            const nodeA = nodes[index];

            for (let next = index + 1; next < nodes.length; next += 1) {
                const nodeB = nodes[next];
                const distance = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);

                if (distance < settings.linkDistance) {
                    const alpha = (1 - distance / settings.linkDistance) * 0.12;
                    context.beginPath();
                    context.moveTo(nodeA.x, nodeA.y);
                    context.lineTo(nodeB.x, nodeB.y);
                    context.strokeStyle = `rgba(103, 232, 249, ${alpha})`;
                    context.lineWidth = 0.65;
                    context.stroke();
                }
            }
        }
    }

    function drawNodes(time) {
        nodes.forEach((node) => {
            const breathing = 0.55 + Math.sin(time * 0.001 + node.phase) * 0.25;
            const pointerDistance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
            const pointerGlow = Math.max(0, 1 - pointerDistance / settings.pointerDistance);
            const alpha = Math.min(0.88, node.strength * breathing + pointerGlow * 0.58);

            if (alpha > 0.34) {
                const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 14);
                glow.addColorStop(0, `rgba(177, 244, 255, ${alpha * 0.55})`);
                glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
                context.fillStyle = glow;
                context.beginPath();
                context.arc(node.x, node.y, 14, 0, Math.PI * 2);
                context.fill();
            }

            context.fillStyle = `rgba(165, 239, 255, ${Math.max(0.16, alpha)})`;
            context.beginPath();
            context.arc(node.x, node.y, node.radius + pointerGlow * 1.2, 0, Math.PI * 2);
            context.fill();
        });
    }

    function createPulse() {
        if (nodes.length < 2) return;
        const startIndex = Math.floor(Math.random() * nodes.length);
        const startNode = nodes[startIndex];
        const nearby = nodes
            .map((node, index) => ({ node, index, distance: Math.hypot(startNode.x - node.x, startNode.y - node.y) }))
            .filter((item) => item.index !== startIndex && item.distance < settings.linkDistance * 1.25)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 6);

        if (!nearby.length) return;
        const destination = nearby[Math.floor(Math.random() * nearby.length)].node;
        pulses.push({
            from: startNode,
            to: destination,
            progress: 0,
            speed: Math.random() * 0.0035 + 0.0026,
            life: 1
        });
    }

    function drawPulses() {
        pulses = pulses.filter((pulse) => pulse.life > 0);

        pulses.forEach((pulse) => {
            pulse.progress += pulse.speed;
            if (pulse.progress >= 1) {
                pulse.progress = 1;
                pulse.life -= 0.06;
            }

            const x = pulse.from.x + (pulse.to.x - pulse.from.x) * pulse.progress;
            const y = pulse.from.y + (pulse.to.y - pulse.from.y) * pulse.progress;

            context.beginPath();
            context.moveTo(pulse.from.x, pulse.from.y);
            context.lineTo(x, y);
            context.strokeStyle = `rgba(103, 232, 249, ${0.54 * pulse.life})`;
            context.lineWidth = 1.4;
            context.shadowBlur = 14;
            context.shadowColor = 'rgba(34, 211, 238, 0.8)';
            context.stroke();
            context.shadowBlur = 0;

            const glow = context.createRadialGradient(x, y, 0, x, y, 20);
            glow.addColorStop(0, `rgba(223, 252, 255, ${0.82 * pulse.life})`);
            glow.addColorStop(0.25, `rgba(103, 232, 249, ${0.62 * pulse.life})`);
            glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
            context.fillStyle = glow;
            context.beginPath();
            context.arc(x, y, 20, 0, Math.PI * 2);
            context.fill();
        });
    }

    function animate(time) {
        context.clearRect(0, 0, width, height);
        updateNodes(time);
        drawConnections();
        drawNodes(time);
        drawPulses();

        if (time - lastPulseTime > 1500 && pulses.length < 5) {
            createPulse();
            lastPulseTime = time;
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('pointermove', (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
        pointer.x = -1000;
        pointer.y = -1000;
    });

    resizeCanvas();
    requestAnimationFrame(animate);
}
