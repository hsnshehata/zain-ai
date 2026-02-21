/**
 * Neural Data Flow Background
 * A dynamic, interactive network representing AI processing and data flow.
 * 
 * Features:
 * - Nodes: Moving points representing data nodes.
 * - Connections: Lines connecting close nodes.
 * - Pulse: Data packets traveling along connections.
 * - Mouse Interaction: Parallax movement and connection strengthening.
 */

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.prepend(canvas);

canvas.id = 'neural-bg';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
canvas.style.background = '#050510'; // Deep Void background

let width, height;
let nodes = [];
const config = {
    nodeCount: 100, // Reduced particle count for better performance with video
    connectionDistance: 100, // Was 150, now shorter connections
    mouseDistance: 150,
    nodeSpeed: 0.5,
    pulseSpeed: 2,
    pulseChance: 0.02, // Chance of a pulse starting on a connection
    colors: {
        node: 'rgba(0, 242, 255, 0.2)',      // Electric Cyan - Reduced Opacity
        connection: 'rgba(0, 242, 255, 0.05)', // Faint Cyan - Very Subtle
        pulse: 'rgba(255, 215, 0, 0.8)',      // Golden Glow - Kept bright for contrast
        highlight: 'rgba(255, 215, 0, 0.1)'  // Mouse highlight - Subtle
    }
};

const mouse = { x: null, y: null };

window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initNodes();
}

class Node {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.nodeSpeed;
        this.vy = (Math.random() - 0.5) * config.nodeSpeed;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction (Parallax / Attraction)
        if (mouse.x != null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.mouseDistance) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (config.mouseDistance - distance) / config.mouseDistance;
                const directionX = forceDirectionX * force * 0.5;
                const directionY = forceDirectionY * force * 0.5;

                this.x += directionX;
                this.y += directionY;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = config.colors.node;
        ctx.fill();
    }
}

// Pulses travel along active connections
class Pulse {
    constructor(nodeA, nodeB) {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.progress = 0; // 0 to 1
        this.speed = config.pulseSpeed / 100; // Normalized speed
        this.dead = false;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.dead = true;
        }
    }

    draw() {
        if (this.dead) return;
        const x = this.nodeA.x + (this.nodeB.x - this.nodeA.x) * this.progress;
        const y = this.nodeA.y + (this.nodeB.y - this.nodeA.y) * this.progress;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = config.colors.pulse;
        ctx.shadowBlur = 10;
        ctx.shadowColor = config.colors.pulse;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    }
}

let pulses = [];

function initNodes() {
    nodes = [];
    // Adjust node count based on screen size
    const area = width * height;
    const count = Math.floor(area / 15000); // 1 node per 15000px^2

    for (let i = 0; i < count; i++) {
        nodes.push(new Node());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update and draw nodes
    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    // Draw connections and manage pulses
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.connectionDistance) {
                // Draw connection
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);

                let opacity = 1 - (distance / config.connectionDistance);
                ctx.strokeStyle = config.colors.connection.replace('0.1', opacity * 0.2); // Dynamic opacity
                ctx.lineWidth = 1;
                ctx.stroke();

                // Randomly spawn a pulse
                if (Math.random() < config.pulseChance) {
                    pulses.push(new Pulse(nodeA, nodeB));
                }
            }
        }
    }

    // Update and draw pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].update();
        pulses[i].draw();
        if (pulses[i].dead) {
            pulses.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

// Start
resize();
animate();
