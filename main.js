// ===== THREE.JS SETUP =====
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 120;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===== PARTICLES =====
const COUNT = 3000;
const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);

for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 150;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 150;

  colors[i * 3] = 1;
  colors[i * 3 + 1] = 1;
  colors[i * 3 + 2] = 1;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 1.8,
  vertexColors: true,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// ===== HAND TRACKING =====
let handDetected = false;
let targetScale = 1;

const video = document.getElementById("video");

const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  if (results.multiHandLandmarks.length > 0) {
    handDetected = true;

    const lm = results.multiHandLandmarks[0];
    const thumb = lm[4];
    const index = lm[8];

    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    const pinch = Math.sqrt(dx * dx + dy * dy);

    // Pinch controls expansion
    targetScale = THREE.MathUtils.clamp(1 + (0.25 - pinch) * 5, 0.6, 2);

    // Color based on hand Y
    const hue = lm[0].y;
    for (let i = 0; i < COUNT; i++) {
      colors[i * 3] = hue;
      colors[i * 3 + 1] = 1 - hue;
      colors[i * 3 + 2] = 1;
    }
    geometry.attributes.color.needsUpdate = true;

  } else {
    handDetected = false;
  }
});

// ===== CAMERA =====
const cam = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480
});
cam.start();

// ===== ANIMATION LOOP =====
function animate() {
  requestAnimationFrame(animate);

  // ❗ CRITICAL FIX: only move when hand exists
  if (handDetected) {
    particles.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
    particles.rotation.y += 0.002;
  }

  renderer.render(scene, camera);
}

animate();

// ===== RESIZE =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});