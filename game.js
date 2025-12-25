// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 10, 18);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = false;
scene.add(directionalLight);

// Simple texture loading - files must be in same directory as HTML
function createMinecraftTexture(type) {
    // Create colored canvas texture as backup
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const colors = {
        grass: '#5a8c2a',
        dirt: '#8c6344',
        stone: '#7a7a7a',
        wood: '#9c7f4e',
        sand: '#ddd494',
        water: '#2e5fbd',
        leaves: '#4a7c30'
    };
    
    ctx.fillStyle = colors[type] || '#7a7a7a';
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    return texture;
}

// World parameters
const WORLD_SIZE = 64;
const WORLD_HEIGHT = 16;
const BLOCK_SIZE = 1;
let renderDistance = 15;

// Block types with textures
const blockTypes = {
    grass: { 
        color: 0x5a8c2a, 
        name: 'Grass',
        texture: createMinecraftTexture('grass')
    },
    dirt: { 
        color: 0x8c6344, 
        name: 'Dirt',
        texture: createMinecraftTexture('dirt')
    },
    stone: { 
        color: 0x7a7a7a, 
        name: 'Stone',
        texture: createMinecraftTexture('stone')
    },
    wood: { 
        color: 0x9c7f4e, 
        name: 'Wood',
        texture: createMinecraftTexture('wood')
    },
    sand: { 
        color: 0xddd494, 
        name: 'Sand',
        texture: createMinecraftTexture('sand')
    },
    water: { 
        color: 0x2e5fbd, 
        name: 'Water',
        texture: createMinecraftTexture('water'),
        transparent: true
    },
    leaves: { 
        color: 0x4a7c30, 
        name: 'Leaves',
        texture: createMinecraftTexture('leaves'),
        transparent: true
    }
};

// World data structure
let world = {};
let meshes = {};
let selectedBlock = 'grass';

// Generate world on-demand (optimized)
const generatedChunks = new Set();
const CHUNK_SIZE = 16;

// Simple Perlin noise implementation
function noise2D(x, z, seed = 0) {
    // Simple pseudo-random hash function
    function hash(x, z) {
        let h = seed + x * 374761393 + z * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return (h ^ (h >> 16)) / 2147483648.0;
    }
    
    // Interpolation function (smoothstep)
    function lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    function smoothstep(t) {
        return t * t * (3 - 2 * t);
    }
    
    // Get integer and fractional parts
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    
    const fx = x - x0;
    const fz = z - z0;
    
    const sx = smoothstep(fx);
    const sz = smoothstep(fz);
    
    // Hash corners
    const n00 = hash(x0, z0);
    const n10 = hash(x1, z0);
    const n01 = hash(x0, z1);
    const n11 = hash(x1, z1);
    
    // Interpolate
    const nx0 = lerp(n00, n10, sx);
    const nx1 = lerp(n01, n11, sx);
    return lerp(nx0, nx1, sz);
}

// Multi-octave noise for more detailed terrain
function fractalNoise(x, z, octaves, persistence, scale) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, z * frequency, i * 1000) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return total / maxValue;
}

function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

// Generate a tree at the specified position (smaller for performance)
function generateTree(x, y, z) {
    // Shorter trunk
    const trunkHeight = 3;
    for (let i = 0; i < trunkHeight; i++) {
        setBlock(x, y + i, z, 'wood');
    }
    
    // Simpler leaves (just a small sphere)
    const leavesY = y + trunkHeight;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            for (let dy = 0; dy < 2; dy++) {
                if (dx === 0 && dz === 0 && dy === 0) continue;
                
                const newX = x + dx;
                const newZ = z + dz;
                const newY = leavesY + dy;
                
                if (newX >= 0 && newX < WORLD_SIZE && newZ >= 0 && newZ < WORLD_SIZE) {
                    setBlock(newX, newY, newZ, 'leaves');
                }
            }
        }
    }
    setBlock(x, leavesY + 2, z, 'leaves');
}

function generateChunk(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    if (generatedChunks.has(key)) return;
    
    const startX = chunkX * CHUNK_SIZE;
    const startZ = chunkZ * CHUNK_SIZE;
    const waterLevel = 9;
    
    for (let x = startX; x < startX + CHUNK_SIZE; x++) {
        for (let z = startZ; z < startZ + CHUNK_SIZE; z++) {
            if (x >= WORLD_SIZE || z >= WORLD_SIZE) continue;
            
            // Beta 1.7.3 style terrain generation
            // Main terrain shape (large continents and oceans)
            const selector = fractalNoise(x, z, 2, 0.5, 0.005);
            
            // Height variation based on selector
            let height;
            if (selector > 0.3) {
                // Land areas - hills and mountains
                const heightNoise = fractalNoise(x, z, 3, 0.5, 0.02) * 12;
                const detailNoise = noise2D(x * 0.08, z * 0.08, 1000) * 3;
                height = Math.floor(12 + heightNoise + detailNoise + selector * 8);
            } else if (selector > -0.1) {
                // Coastal/beach areas - flatter
                const heightNoise = fractalNoise(x, z, 2, 0.5, 0.03) * 4;
                height = Math.floor(8 + heightNoise + selector * 5);
            } else {
                // Ocean floors - deep and flat
                const heightNoise = noise2D(x * 0.03, z * 0.03, 2000) * 2;
                height = Math.floor(4 + heightNoise + selector * 3);
            }
            
            height = Math.max(1, Math.min(28, height));
            
            // Generate layers (Beta style)
            for (let y = 0; y < height; y++) {
                let blockType;
                
                if (y === height - 1) {
                    // Top layer
                    if (height > waterLevel + 1) {
                        blockType = 'grass';
                    } else if (height >= waterLevel - 2) {
                        blockType = 'sand'; // Beaches
                    } else {
                        blockType = 'dirt'; // Ocean floor
                    }
                } else if (y > height - 4 && height > waterLevel) {
                    // Dirt layer under grass (3 blocks)
                    blockType = 'dirt';
                } else if (y > height - 3 && height <= waterLevel) {
                    // Less dirt underwater
                    blockType = 'dirt';
                } else {
                    // Deep stone
                    blockType = 'stone';
                }
                
                setBlock(x, y, z, blockType);
            }
            
            // Fill water
            if (height <= waterLevel) {
                for (let y = height; y <= waterLevel; y++) {
                    setBlock(x, y, z, 'water');
                }
            }
        }
    }
    
    generatedChunks.add(key);
}

function generateNearbyChunks(playerX, playerZ) {
    const chunkX = Math.floor(playerX / CHUNK_SIZE);
    const chunkZ = Math.floor(playerZ / CHUNK_SIZE);
    const loadRadius = 1;
    
    for (let x = chunkX - loadRadius; x <= chunkX + loadRadius; x++) {
        for (let z = chunkZ - loadRadius; z <= chunkZ + loadRadius; z++) {
            if (x >= 0 && x < WORLD_SIZE / CHUNK_SIZE && z >= 0 && z < WORLD_SIZE / CHUNK_SIZE) {
                generateChunk(x, z);
            }
        }
    }
}

// Pre-load terrain around spawn
async function preloadTerrain() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');
    
    const spawnX = WORLD_SIZE / 2;
    const spawnZ = WORLD_SIZE / 2;
    const spawnChunkX = Math.floor(spawnX / CHUNK_SIZE);
    const spawnChunkZ = Math.floor(spawnZ / CHUNK_SIZE);
    const preloadRadius = 3; // Pre-load 7x7 chunks
    
    const totalChunks = (preloadRadius * 2 + 1) * (preloadRadius * 2 + 1);
    let loadedChunks = 0;
    
    for (let x = spawnChunkX - preloadRadius; x <= spawnChunkX + preloadRadius; x++) {
        for (let z = spawnChunkZ - preloadRadius; z <= spawnChunkZ + preloadRadius; z++) {
            if (x >= 0 && x < WORLD_SIZE / CHUNK_SIZE && z >= 0 && z < WORLD_SIZE / CHUNK_SIZE) {
                generateChunk(x, z);
                loadedChunks++;
                
                // Update progress
                const progress = (loadedChunks / totalChunks) * 100;
                loadingProgress.style.width = progress + '%';
                loadingText.textContent = `Loading chunks: ${loadedChunks}/${totalChunks}`;
                
                // Allow UI to update every few chunks
                if (loadedChunks % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    }
    
    // Hide loading screen
    loadingText.textContent = 'Ready! Click to start...';
    await new Promise(resolve => setTimeout(resolve, 500));
    loadingScreen.style.display = 'none';
}

// Set block in world
function setBlock(x, y, z, type) {
    const key = `${x},${y},${z}`;
    
    if (type === null) {
        // Remove block
        if (world[key]) {
            scene.remove(meshes[key]);
            delete world[key];
            delete meshes[key];
        }
    } else {
        // Add/update block
        if (world[key]) {
            scene.remove(meshes[key]);
        }
        
        world[key] = type;
        
        const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        const blockData = blockTypes[type];
        const material = new THREE.MeshLambertMaterial({ 
            map: blockData.texture,
            transparent: blockData.transparent || false,
            opacity: blockData.transparent ? 0.7 : 1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        
        // Store position for raycasting
        mesh.userData = { x, y, z };
        
        scene.add(mesh);
        meshes[key] = mesh;
    }
}

// Player setup
camera.position.set(WORLD_SIZE / 2, 20, WORLD_SIZE / 2);
const playerHeight = 1.7;
const moveSpeed = 0.25;
const sensitivity = 0.002;

let pitch = 0;
let yaw = 0;

const keys = {};

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Number keys for block selection
    if (e.key >= '1' && e.key <= '6') {
        const blockBtns = document.querySelectorAll('.block-btn');
        const index = parseInt(e.key) - 1;
        if (blockBtns[index]) {
            blockBtns[index].click();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

let isPointerLocked = false;

document.addEventListener('click', () => {
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked) return;
    
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
});

// Raycasting for block interaction
const raycaster = new THREE.Raycaster();
raycaster.far = 10;

document.addEventListener('mousedown', (e) => {
    if (!isPointerLocked) return;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    raycaster.set(camera.position, direction);
    
    const objects = Object.values(meshes);
    const intersects = raycaster.intersectObjects(objects);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const { x, y, z } = intersect.object.userData;
        
        if (e.button === 0) {
            // Left click - break block
            setBlock(x, y, z, null);
        } else if (e.button === 2) {
            // Right click - place block
            const normal = intersect.face.normal;
            const newX = x + Math.round(normal.x);
            const newY = y + Math.round(normal.y);
            const newZ = z + Math.round(normal.z);
            
            // Check if position is valid and not occupied
            if (newX >= 0 && newX < WORLD_SIZE && 
                newZ >= 0 && newZ < WORLD_SIZE && 
                newY >= 0 && newY < WORLD_HEIGHT) {
                const key = `${newX},${newY},${newZ}`;
                if (!world[key]) {
                    setBlock(newX, newY, newZ, selectedBlock);
                }
            }
        }
    }
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// Block selector
const blockButtons = document.querySelectorAll('.block-btn');
blockButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const blockType = btn.dataset.block;
        selectedBlock = blockType;
        
        blockButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        document.getElementById('selectedBlock').textContent = blockTypes[blockType].name;
    });
});

// Render distance control
const renderDistSlider = document.getElementById('renderDist');
const renderDistValue = document.getElementById('renderDistValue');

renderDistSlider.addEventListener('input', (e) => {
    renderDistance = parseInt(e.target.value);
    renderDistValue.textContent = renderDistance;
    camera.far = renderDistance + 20;
    camera.updateProjectionMatrix();
    scene.fog.near = renderDistance * 0.75;
    scene.fog.far = renderDistance * 1.25;
});

// Update camera and movement
let frameCount = 0;
let lastFrameTime = performance.now();
const targetFrameTime = 1000 / 40; // 40 FPS cap

function updatePlayer() {
    // Rotation
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    
    // Movement
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();
    
    let speed = moveSpeed;
    if (keys['shift']) speed *= 0.5; // Crouch
    
    if (keys['w']) camera.position.add(forward.multiplyScalar(speed));
    if (keys['s']) camera.position.add(forward.multiplyScalar(-speed));
    if (keys['a']) camera.position.add(right.multiplyScalar(-speed));
    if (keys['d']) camera.position.add(right.multiplyScalar(speed));
    if (keys[' ']) camera.position.y += speed; // Jump/fly up
    if (keys['shift']) camera.position.y -= speed * 0.5; // Crouch/fly down
    
    // Keep player above ground
    camera.position.y = Math.max(playerHeight, camera.position.y);
    
    // Optimized render distance culling (only update every 20 frames)
    frameCount++;
    if (frameCount % 20 === 0) {
        const cameraPos = camera.position;
        const renderDistSq = renderDistance * renderDistance;
        
        Object.keys(meshes).forEach(key => {
            const mesh = meshes[key];
            const dx = mesh.position.x - cameraPos.x;
            const dz = mesh.position.z - cameraPos.z;
            const distSq = dx * dx + dz * dz;
            mesh.visible = distSq < renderDistSq;
        });
        
        // Generate nearby chunks
        generateNearbyChunks(cameraPos.x, cameraPos.z);
    }
}

// Animation loop with FPS cap
function animate() {
    requestAnimationFrame(animate);
    
    // FPS limiter
    const now = performance.now();
    const elapsed = now - lastFrameTime;
    
    if (elapsed >= targetFrameTime) {
        lastFrameTime = now - (elapsed % targetFrameTime);
        updatePlayer();
        renderer.render(scene, camera);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize with player spawn area
console.log('Starting terrain pre-load...');
preloadTerrain().then(() => {
    console.log('Terrain loaded! Starting game...');
    animate();
});
