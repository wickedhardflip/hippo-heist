// 3D rendering engine for Hippo Heist (Three.js / WebGL).
// Replaces the original 2D canvas renderer. Gameplay logic still runs in 2D
// world-pixel space; this layer maps it into a 3D angled top-down world with an
// orbiting camera, a mountain-ringed valley, dynamic lighting, shadows and water.
const Render = {
    TILE_SIZE: 32,
    S: 0.1,            // world units per game pixel (32px tile -> 3.2 units)
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    sun: null,
    clock: null,

    // scene groups
    worldGroup: null,      // per-level static geometry (terrain/water/trees/cage)
    entityGroup: null,     // hippo/leopard/farmers
    fxGroup: null,         // particles & floating text

    // entity meshes
    hippo: null,
    leopard: null,
    cageMesh: null,
    farmerMeshes: [],      // index-aligned with Farmers.list
    treeMeshes: [],        // index-aligned with Level.trees
    carriedBananas: [],

    waterMat: null,

    // camera orbit state
    cam: {
        yaw: Math.PI * 0.15,
        pitch: 0.82,        // radians; lower = more of the field visible toward the horizon
        dist: 56,
        targetYaw: Math.PI * 0.15,
        targetPitch: 0.82,
        targetDist: 56,
        minDist: 22,
        maxDist: 120,
        focus: new THREE.Vector3(),
        smoothFocus: new THREE.Vector3()
    },
    autoOrbit: true,        // spin slowly on menus

    shake: { intensity: 0, duration: 0, x: 0, y: 0, z: 0 },
    particles: [],
    floatingTexts: [],

    levelBuilt: false,

    // ---- pseudo-noise (deterministic) for terrain ----
    hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    },
    noise(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = this.hash(xi, yi), b = this.hash(xi + 1, yi);
        const c = this.hash(xi, yi + 1), d = this.hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    },
    fbm(x, y) {
        let t = 0, amp = 0.5, f = 1;
        for (let i = 0; i < 4; i++) { t += this.noise(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
        return t;
    },

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.clock = new THREE.Clock();

        try {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
        } catch (err) {
            console.error('WebGL init failed', err);
            const el = document.getElementById('webgl-error');
            if (el) el.classList.remove('hidden');
            this.failed = true;
            return;
        }
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.92;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87b8e0);
        this.scene.fog = new THREE.Fog(0xbcd6e8, 110, 380);

        this.worldGroup = new THREE.Group();
        this.entityGroup = new THREE.Group();
        this.fxGroup = new THREE.Group();
        this.scene.add(this.worldGroup, this.entityGroup, this.fxGroup);

        this.buildLighting();
        this.buildSky();
        this.buildFX();
        this.initControls();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // gentle idle backdrop until a level loads
        this.cam.focus.set(0, 0, 0);
        this.cam.smoothFocus.set(0, 0, 0);
    },

    buildLighting() {
        const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a6b3a, 0.5);
        this.scene.add(hemi);

        const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
        sun.position.set(40, 70, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 220;
        const d = 70;
        sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
        sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.02;
        this.scene.add(sun);
        this.scene.add(sun.target);
        this.sun = sun;

        const fill = new THREE.DirectionalLight(0x88aaff, 0.2);
        fill.position.set(-30, 25, -20);
        this.scene.add(fill);
    },

    buildSky() {
        // gradient sky dome
        const skyGeo = new THREE.SphereGeometry(400, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                top: { value: new THREE.Color(0x2e6fb0) },
                mid: { value: new THREE.Color(0x87b8e0) },
                bot: { value: new THREE.Color(0xdceefb) }
            },
            vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
            fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
                void main(){ float h = normalize(vP).y;
                    vec3 c = h>0.0 ? mix(mid, top, pow(h,0.6)) : mix(mid, bot, pow(-h,0.5));
                    gl_FragColor = vec4(c,1.0);} `
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        // soft clouds (billboards)
        const cloudTex = this.makeCloudTexture();
        const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false });
        for (let i = 0; i < 14; i++) {
            const s = new THREE.Sprite(cloudMat);
            const a = Math.random() * Math.PI * 2;
            const r = 120 + Math.random() * 120;
            s.position.set(Math.cos(a) * r, 45 + Math.random() * 45, Math.sin(a) * r);
            const sc = 30 + Math.random() * 50;
            s.scale.set(sc, sc * 0.55, 1);
            this.scene.add(s);
        }
    },

    makeCloudTexture() {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const ctx = c.getContext('2d');
        for (let i = 0; i < 18; i++) {
            const x = 64 + (Math.random() - 0.5) * 70, y = 64 + (Math.random() - 0.5) * 40;
            const r = 18 + Math.random() * 26;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.9)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
    },

    // ---------------- coordinate mapping ----------------
    // game pixel (px,py) -> 3D ground position. (origin centered on map)
    toWorld(px, py) {
        return new THREE.Vector3(
            (px - this.mapPxW / 2) * this.S,
            0,
            (py - this.mapPxH / 2) * this.S
        );
    },

    // ---------------- build a level ----------------
    buildLevel(level) {
        // clear previous
        this.disposeGroup(this.worldGroup);
        this.disposeGroup(this.entityGroup);
        this.farmerMeshes = [];
        this.treeMeshes = [];
        this.carriedBananas = [];
        this.hippo = this.leopard = this.cageMesh = null;

        this.mapPxW = level.width;
        this.mapPxH = level.height;
        const cols = level.map[0].length, rows = level.map.length;
        const T = this.TILE_SIZE * this.S;

        this.buildValley(cols, rows, T);
        this.buildWater(cols, rows, T);
        this.buildGround(level, cols, rows, T);
        this.scatterDecor(level, cols, rows, T);

        // trees
        for (let i = 0; i < level.trees.length; i++) {
            const tr = level.trees[i];
            const m = Models.tree(Math.floor(tr.x + tr.y));
            const p = this.toWorld(tr.x + 20, tr.y + 24);
            m.position.set(p.x, this.groundHeightAt(tr.x + 20, tr.y + 24), p.z);
            Models.setTreeBananas(m, tr.hasBananas);
            this.worldGroup.add(m);
            this.treeMeshes.push(m);
        }

        // hippo
        this.hippo = Models.hippo();
        this.entityGroup.add(this.hippo);

        // leopard
        this.leopard = Models.leopard();
        this.entityGroup.add(this.leopard);
        if (Leopard.isCaged) {
            this.cageMesh = Models.cage();
            this.entityGroup.add(this.cageMesh);
        }

        // farmers
        for (let i = 0; i < Farmers.list.length; i++) {
            const fm = Models.farmer();
            this.entityGroup.add(fm);
            this.farmerMeshes.push(fm);
        }

        // place camera focus at player
        const pc = this.toWorld(Player.x + Player.width / 2, Player.y + Player.height / 2);
        this.cam.focus.copy(pc);
        this.cam.smoothFocus.copy(pc);
        this.autoOrbit = false;
        this.levelBuilt = true;
    },

    // valley terrain ringing the play area: flat bowl floor rising into mountains
    buildValley(cols, rows, T) {
        const w = cols * T, h = rows * T;
        const span = Math.max(w, h) * 3.2;
        const seg = 120;
        const geo = new THREE.PlaneGeometry(span, span, seg, seg);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        const colors = [];
        const halfW = w / 2, halfH = h / 2;
        const cGrass = new THREE.Color(0x5c8048);
        const cRock = new THREE.Color(0x726b63);
        const cSnow = new THREE.Color(0xeef3fb);
        const cDirt = new THREE.Color(0x6a5236);
        const meadowBand = 26; // width of lush green meadow ringing the play area
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            // distance outside the flat play rectangle
            const dx = Math.max(0, Math.abs(x) - halfW * 1.02);
            const dz = Math.max(0, Math.abs(z) - halfH * 1.02);
            const d = Math.sqrt(dx * dx + dz * dz);
            const n = this.fbm(x * 0.045 + 10, z * 0.045 + 10);
            const n2 = this.fbm(x * 0.13, z * 0.13);
            let y;
            if (d <= 0.001) {
                y = -3.5; // hidden bowl floor beneath the water
            } else if (d < meadowBand) {
                // gently rolling green meadow just outside the water
                const k = d / meadowBand;
                y = -0.15 + k * 0.6 + n2 * 1.1 * k;
            } else {
                // rise into mountains
                const ramp = Math.pow((d - meadowBand) / (span * 0.30), 1.4);
                y = 0.5 + ramp * (60 + n * 70) + n2 * 7;
            }
            pos.setY(i, y);
            // color by height: green valley floor -> rock -> snow
            const c = new THREE.Color();
            if (y < -0.5) c.copy(cDirt);
            else if (y < 7) c.copy(cGrass);
            else if (y < 32) c.copy(cGrass).lerp(cRock, (y - 7) / 25);
            else c.copy(cRock).lerp(cSnow, Math.min(1, (y - 32) / 24));
            // subtle large-scale tint variation
            c.offsetHSL((n - 0.5) * 0.03, (n2 - 0.5) * 0.05, (this.hash(Math.floor(x * 0.3), Math.floor(z * 0.3)) - 0.5) * 0.06);
            colors.push(c.r, c.g, c.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.position.y = 0;
        this.worldGroup.add(mesh);

        // a few big distinct mountain peaks on the ring for silhouette
        const peakMat = new THREE.MeshStandardMaterial({ vertexColors: false, color: 0x6b6d72, roughness: 1, flatShading: true, map: Tex.rock() });
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + 0.3;
            const r = Math.max(w, h) * (0.95 + Math.random() * 0.25);
            const ph = 38 + Math.random() * 34;
            const peak = new THREE.Mesh(new THREE.ConeGeometry(ph * 0.7, ph, 7), peakMat);
            peak.position.set(Math.cos(a) * r, ph / 2 - 6, Math.sin(a) * r);
            peak.rotation.y = Math.random();
            peak.castShadow = true; peak.receiveShadow = true;
            // snow cap
            const cap = new THREE.Mesh(new THREE.ConeGeometry(ph * 0.32, ph * 0.34, 7), new THREE.MeshStandardMaterial({ color: 0xf3f7fd, roughness: 0.8, flatShading: true }));
            cap.position.y = ph * 0.33;
            peak.add(cap);
            this.worldGroup.add(peak);
        }
    },

    buildWater(cols, rows, T) {
        const w = cols * T, h = rows * T;
        const geo = new THREE.PlaneGeometry(w * 1.04, h * 1.04, 60, 60);
        geo.rotateX(-Math.PI / 2);
        const normal = Tex.waterNormal();
        this.waterMat = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                uTime: { value: 0 },
                uDeep: { value: new THREE.Color(0x14586f) },
                uShallow: { value: new THREE.Color(0x39b0cf) },
                uSkyTop: { value: new THREE.Color(0x3b78b0) },
                uSkyHorizon: { value: new THREE.Color(0xbfe0f2) },
                uSun: { value: new THREE.Vector3(40, 70, 30).normalize() }
            },
            vertexShader: `
                uniform float uTime; varying vec3 vN; varying vec3 vW;
                // gentle multi-octave ripples; analytic normal from partial derivatives
                float h(vec2 p){
                    return sin(p.x*0.5 + uTime*0.9)*0.05
                         + cos(p.y*0.42 - uTime*0.7)*0.05
                         + sin((p.x*0.9+p.y*0.7) + uTime*1.3)*0.025;
                }
                void main(){
                    vec3 p = position;
                    float e = 0.35;
                    float hC = h(p.xz);
                    float hX = h(p.xz + vec2(e,0.0));
                    float hZ = h(p.xz + vec2(0.0,e));
                    p.y += hC;
                    vec3 dx = vec3(e, hX-hC, 0.0);
                    vec3 dz = vec3(0.0, hZ-hC, e);
                    vN = normalize(cross(dz, dx));
                    vec4 wp = modelMatrix*vec4(p,1.0); vW = wp.xyz;
                    gl_Position = projectionMatrix*viewMatrix*wp;
                }`,
            fragmentShader: `
                uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uSun; uniform float uTime;
                varying vec3 vN; varying vec3 vW;
                void main(){
                    vec3 viewDir = normalize(cameraPosition - vW);
                    vec3 N = normalize(vN);
                    // base depth color, deeper when viewed steeply
                    float depthMix = clamp(dot(viewDir, vec3(0.0,1.0,0.0)), 0.0, 1.0);
                    vec3 base = mix(uDeep, uShallow, depthMix*0.7);
                    // sky reflection via reflected ray elevation
                    vec3 R = reflect(-viewDir, N);
                    float sky = clamp(R.y*0.5+0.5, 0.0, 1.0);
                    vec3 skyCol = mix(uSkyHorizon, uSkyTop, sky);
                    float fres = pow(1.0 - max(dot(viewDir, N),0.0), 4.0);
                    vec3 col = mix(base, skyCol, clamp(fres*0.9+0.05,0.0,1.0));
                    // crisp sun glint
                    vec3 hVec = normalize(uSun + viewDir);
                    float spec = pow(max(dot(N,hVec),0.0), 220.0);
                    col += spec*0.9;
                    float alpha = mix(0.80, 0.97, fres);
                    gl_FragColor = vec4(col, alpha);
                }`
        });
        const water = new THREE.Mesh(geo, this.waterMat);
        water.position.y = -0.4;
        water.renderOrder = 1;
        this.worldGroup.add(water);
    },

    // grass islands (only where grass tiles are) with dirt banks down to water
    buildGround(level, cols, rows, T) {
        const verts = [], norms = [], uvs = [], cols3 = [];
        const top = 0, bankBottom = -1.1;
        const isGrass = (c, r) => (level.map[r] && level.map[r][c] === 'grass');
        const cg = new THREE.Color(0xf2f4e9);   // near-neutral: let the grass map show through
        const tmpU = new THREE.Vector3(), tmpV = new THREE.Vector3(), nrm = new THREE.Vector3();
        const pushQuad = (a, b, c, d, color, uvScale) => {
            // one consistent normal per quad -> smooth, facet-free shading across tiles
            tmpU.subVectors(b, a); tmpV.subVectors(c, a);
            nrm.crossVectors(tmpU, tmpV).normalize();
            if (nrm.y < 0) nrm.multiplyScalar(-1); // keep tops/normals pointing up & banks outward-up
            for (const [p, q, s] of [[a, b, c], [a, c, d]]) {
                verts.push(p.x, p.y, p.z, q.x, q.y, q.z, s.x, s.y, s.z);
                for (let k = 0; k < 3; k++) {
                    cols3.push(color.r, color.g, color.b);
                    norms.push(nrm.x, nrm.y, nrm.z);
                }
            }
            // uvs based on world xz
            for (const p of [a, b, c, a, c, d]) uvs.push(p.x * uvScale, p.z * uvScale);
        };
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!isGrass(c, r)) continue;
                const x0 = (c * this.TILE_SIZE - this.mapPxW / 2) * this.S;
                const z0 = (r * this.TILE_SIZE - this.mapPxH / 2) * this.S;
                const x1 = x0 + T, z1 = z0 + T;
                // gentle bump on top
                const bump = (cc, rr) => this.fbm(cc * 0.6, rr * 0.6) * 0.25;
                const A = new THREE.Vector3(x0, top + bump(c, r), z0);
                const B = new THREE.Vector3(x1, top + bump(c + 1, r), z0);
                const C = new THREE.Vector3(x1, top + bump(c + 1, r + 1), z1);
                const D = new THREE.Vector3(x0, top + bump(c, r + 1), z1);
                pushQuad(A, B, C, D, cg, 0.22);
                // banks where neighbor is not grass
                const dirt = new THREE.Color(0x735237);
                if (!isGrass(c, r - 1)) pushQuad(new THREE.Vector3(x0, bankBottom, z0), new THREE.Vector3(x1, bankBottom, z0), B, A, dirt, 0.18);
                if (!isGrass(c, r + 1)) pushQuad(new THREE.Vector3(x1, bankBottom, z1), new THREE.Vector3(x0, bankBottom, z1), D, C, dirt, 0.18);
                if (!isGrass(c - 1, r)) pushQuad(new THREE.Vector3(x0, bankBottom, z1), new THREE.Vector3(x0, bankBottom, z0), A, D, dirt, 0.18);
                if (!isGrass(c + 1, r)) pushQuad(new THREE.Vector3(x1, bankBottom, z0), new THREE.Vector3(x1, bankBottom, z1), C, B, dirt, 0.18);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols3, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
        const mat = new THREE.MeshStandardMaterial({
            map: Tex.grass(), bumpMap: Tex.grassBump(), bumpScale: 0.4,
            vertexColors: true, roughness: 0.92, metalness: 0,
            side: THREE.DoubleSide   // quads are authored both windings; show + light both faces
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        this.worldGroup.add(mesh);
    },

    scatterDecor(level, cols, rows, T) {
        // place bushes & rocks randomly on grass tiles (deterministic-ish)
        let placed = 0;
        for (let r = 1; r < rows - 1 && placed < 40; r++) {
            for (let c = 1; c < cols - 1; c++) {
                if (level.map[r][c] !== 'grass') continue;
                const hsh = this.hash(c * 3 + 1, r * 7 + 2);
                if (hsh > 0.93) {
                    const px = c * this.TILE_SIZE + this.TILE_SIZE / 2;
                    const py = r * this.TILE_SIZE + this.TILE_SIZE / 2;
                    const wp = this.toWorld(px, py);
                    const deco = hsh > 0.965 ? Models.rock() : Models.bush();
                    deco.position.set(wp.x, 0, wp.z);
                    deco.scale.multiplyScalar(0.8 + this.hash(c, r) * 0.6);
                    this.worldGroup.add(deco);
                    placed++;
                }
            }
        }
    },

    groundHeightAt(px, py) {
        // grass top is ~0 with slight bump; good enough to seat props
        const c = px / this.TILE_SIZE, r = py / this.TILE_SIZE;
        return this.fbm(c * 0.6, r * 0.6) * 0.25;
    },

    // ---------------- camera controls ----------------
    initControls() {
        let dragging = false, lx = 0, ly = 0;
        const el = this.canvas;
        el.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
        window.addEventListener('mouseup', () => dragging = false);
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            this.cam.targetYaw -= (e.clientX - lx) * 0.006;
            this.cam.targetPitch = THREE.MathUtils.clamp(this.cam.targetPitch + (e.clientY - ly) * 0.005, 0.45, 1.3);
            lx = e.clientX; ly = e.clientY;
            this.autoOrbit = false;
        });
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cam.targetDist = THREE.MathUtils.clamp(this.cam.targetDist + Math.sign(e.deltaY) * 4, this.cam.minDist, this.cam.maxDist);
        }, { passive: false });
        // touch drag / pinch
        let pinchD = 0;
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) { dragging = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }
            else if (e.touches.length === 2) { pinchD = this.touchDist(e); }
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && dragging) {
                this.cam.targetYaw -= (e.touches[0].clientX - lx) * 0.008;
                this.cam.targetPitch = THREE.MathUtils.clamp(this.cam.targetPitch + (e.touches[0].clientY - ly) * 0.006, 0.45, 1.3);
                lx = e.touches[0].clientX; ly = e.touches[0].clientY;
                this.autoOrbit = false;
            } else if (e.touches.length === 2) {
                const d = this.touchDist(e);
                this.cam.targetDist = THREE.MathUtils.clamp(this.cam.targetDist - (d - pinchD) * 0.08, this.cam.minDist, this.cam.maxDist);
                pinchD = d;
            }
        }, { passive: true });
        el.addEventListener('touchend', () => dragging = false);
    },
    touchDist(e) {
        const a = e.touches[0], b = e.touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    },

    // Q/E rotation handled here each frame from Input
    handleCameraKeys(dt) {
        const rot = 0.0022 * dt;
        if (Input.isDown('KeyQ')) { this.cam.targetYaw += rot; this.autoOrbit = false; }
        if (Input.isDown('KeyE')) { this.cam.targetYaw -= rot; this.autoOrbit = false; }
        if (Input.isDown('KeyR')) { this.cam.targetDist = THREE.MathUtils.clamp(this.cam.targetDist - 0.08 * dt, this.cam.minDist, this.cam.maxDist); }
        if (Input.isDown('KeyF')) { this.cam.targetDist = THREE.MathUtils.clamp(this.cam.targetDist + 0.08 * dt, this.cam.minDist, this.cam.maxDist); }
    },

    getCameraYaw() { return this.cam.yaw; },

    updateCamera(target, mapW, mapH) {
        // focus on player
        const fp = this.toWorld(target.x + target.width / 2, target.y + target.height / 2);
        this.cam.focus.copy(fp);
    },

    applyCamera(dt) {
        const c = this.cam;
        // smooth params
        c.yaw += (c.targetYaw - c.yaw) * Math.min(1, dt * 0.008);
        c.pitch += (c.targetPitch - c.pitch) * Math.min(1, dt * 0.008);
        c.dist += (c.targetDist - c.dist) * Math.min(1, dt * 0.006);
        if (this.autoOrbit) c.yaw = c.targetYaw += 0.00012 * dt;
        // smooth focus follow
        c.smoothFocus.lerp(c.focus, Math.min(1, dt * 0.01));

        const cosP = Math.cos(c.pitch), sinP = Math.sin(c.pitch);
        const off = new THREE.Vector3(
            Math.sin(c.yaw) * cosP,
            sinP,
            Math.cos(c.yaw) * cosP
        ).multiplyScalar(c.dist);
        const camPos = c.smoothFocus.clone().add(off);
        camPos.add(new THREE.Vector3(this.shake.x, this.shake.y, this.shake.z));
        this.camera.position.copy(camPos);
        const look = c.smoothFocus.clone();
        look.y += 1.5;
        this.camera.lookAt(look);

        // keep sun following the focus so shadows stay crisp over the play area
        if (this.sun) {
            this.sun.position.set(c.smoothFocus.x + 40, 70, c.smoothFocus.z + 30);
            this.sun.target.position.copy(c.smoothFocus);
        }
    },

    // ---------------- per-frame world sync + render ----------------
    renderWorld(player, leopard, farmers, level, time, game) {
        const dt = Math.min(this.clock.getDelta() * 1000, 50);
        const t = time / 1000;

        this.handleCameraKeys(dt);
        this.applyCamera(dt);
        if (this.waterMat) this.waterMat.uniforms.uTime.value = t;

        this.syncHippo(player, t, game.isGracePeriod());
        this.syncLeopard(leopard, t);
        this.syncFarmers(farmers, t);
        this.syncTrees(level, t);
        this.updateParticles3D(dt);
        this.updateFloatingTexts3D(dt);

        this.renderer.render(this.scene, this.camera);
    },

    renderIdle(time) {
        const dt = Math.min((this.clock.getDelta()) * 1000, 50);
        this.autoOrbit = true;
        if (!this.levelBuilt) {
            // slow spin around origin for a pleasant menu backdrop
            this.cam.focus.set(0, 1, 0);
        }
        this.handleCameraKeys(dt);
        this.applyCamera(dt);
        if (this.waterMat) this.waterMat.uniforms.uTime.value = time / 1000;
        this.updateParticles3D(dt);
        this.updateFloatingTexts3D(dt);
        this.renderer.render(this.scene, this.camera);
    },

    place(obj, px, py, footH = 0) {
        const w = this.toWorld(px, py);
        obj.position.x = w.x; obj.position.z = w.z;
        obj.position.y = footH;
    },

    syncHippo(p, t, grace) {
        if (!this.hippo) return;
        const cx = p.x + p.width / 2, cy = p.y + p.height / 2;
        const submerged = p.isSubmerged;
        const w = this.toWorld(cx, cy);
        this.hippo.position.x = w.x; this.hippo.position.z = w.z;
        const sink = submerged ? -1.35 : 0;
        const bob = Math.sin(t * 4) * (submerged ? 0.12 : 0.06);
        this.hippo.position.y = sink + bob + 0.0;
        // face movement direction (worldX=x, worldZ=y)
        if (p.facingX !== 0 || p.facingY !== 0) {
            const targetYaw = Math.atan2(p.facingX, p.facingY);
            this.hippo.rotation.y = this.lerpAngle(this.hippo.rotation.y, targetYaw, 0.2);
        }
        // leg walk
        const moving = (Input.up || Input.down || Input.left || Input.right) && !submerged;
        const parts = this.hippo.userData.parts;
        const sp = moving ? t * 10 : 0;
        parts.legs.forEach((leg, i) => {
            const ph = i * Math.PI / 2;
            leg.rotation.x = moving ? Math.sin(sp + ph) * 0.5 : 0;
        });
        // grace blink
        const blink = grace ? (Math.sin(t * 18) > 0 ? 0.35 : 1) : 1;
        this.setOpacity(this.hippo, blink);
        // submerge ripple opacity handled by sink; show carried bananas
        this.syncCarried(p);
    },

    syncCarried(p) {
        // pool of carried banana meshes above the hippo's back
        while (this.carriedBananas.length < p.bananas) {
            const b = Models.banana(0.9);
            this.hippo.add(b);
            this.carriedBananas.push(b);
        }
        for (let i = 0; i < this.carriedBananas.length; i++) {
            const b = this.carriedBananas[i];
            b.visible = i < p.bananas;
            if (b.visible) {
                const a = (i / Math.max(1, p.bananas)) * Math.PI * 2;
                b.position.set(Math.cos(a) * 0.7, 2.7 + (i % 2) * 0.3, -0.5 + Math.sin(a) * 0.7);
                b.rotation.y = a;
            }
        }
    },

    syncLeopard(l, t) {
        if (!this.leopard) return;
        const cx = l.x + l.width / 2, cy = l.y + l.height / 2;
        const w = this.toWorld(cx, cy);
        this.leopard.position.x = w.x; this.leopard.position.z = w.z;
        this.leopard.position.y = 0;
        const parts = this.leopard.userData.parts;
        // face movement
        if (l.isRoaming || l.isHunter) {
            const targetYaw = Math.atan2(l.roamDirX, l.roamDirY);
            this.leopard.rotation.y = this.lerpAngle(this.leopard.rotation.y, targetYaw, 0.15);
        }
        const moving = l.isRoaming || l.isHunter;
        const sp = l.isLunging ? t * 18 : (moving ? t * 9 : t * 2);
        parts.legs.forEach((leg, i) => {
            const ph = (i % 2) * Math.PI + Math.floor(i / 2) * Math.PI;
            leg.rotation.x = moving ? Math.sin(sp + ph) * (l.isLunging ? 0.8 : 0.5) : Math.sin(t * 2 + i) * 0.05;
        });
        // tail sway
        parts.tailSegs.forEach((s, i) => {
            s.rotation.y = Math.sin(t * 3 + i * 0.6) * 0.25;
            s.rotation.x = -0.15 + Math.sin(t * 2 + i) * 0.08;
        });
        // breathing
        parts.head.position.y = 2.0 + Math.sin(t * 2) * 0.05;
        // cage follows
        if (this.cageMesh) {
            this.cageMesh.position.set(this.leopard.position.x, 0, this.leopard.position.z);
            this.cageMesh.visible = l.isCaged;
        }
    },

    syncFarmers(farmers, t) {
        const list = farmers.list;
        for (let i = 0; i < this.farmerMeshes.length; i++) {
            const fm = this.farmerMeshes[i];
            const f = list[i];
            if (!f) { fm.visible = false; continue; }
            fm.visible = f.isAlive;
            if (!f.isAlive) continue;
            const cx = f.x + f.width / 2, cy = f.y + f.height / 2;
            const w = this.toWorld(cx, cy);
            fm.position.x = w.x; fm.position.z = w.z;
            const parts = fm.userData.parts;

            if (f.isBeingEaten) {
                // shrink & spin into the ground
                const s = Math.max(0.01, 1 - f.eatProgress);
                fm.scale.setScalar(s);
                fm.position.y = -f.eatProgress * 2;
                fm.rotation.y += 0.4;
                continue;
            } else {
                fm.scale.setScalar(1);
                fm.position.y = 0;
            }

            // face along velocity-ish: toward last seen / patrol target. Use facing toward player when chasing.
            let fyaw = fm.rotation.y;
            if (f.isChasing) {
                fyaw = Math.atan2((Player.x - f.x), (Player.y - f.y));
            } else {
                const tgt = f.patrolPoints[f.currentPatrolIndex];
                if (tgt) fyaw = Math.atan2((tgt.x - f.x), (tgt.y - f.y));
            }
            fm.rotation.y = this.lerpAngle(fm.rotation.y, fyaw, 0.12);

            const speed = f.isChasing ? t * 14 : t * 7;
            const amp = f.isChasing ? 0.9 : 0.5;
            parts.legs.forEach((leg, k) => { leg.rotation.x = Math.sin(speed + k * Math.PI) * amp; });
            parts.arms.forEach((arm, k) => { arm.rotation.x = Math.sin(speed + k * Math.PI) * amp * 0.6; });
            // angry brows + raised pitchfork when chasing
            parts.brows.forEach(b => b.visible = f.isChasing);
            parts.fork.rotation.x = f.isChasing ? -0.6 + Math.sin(t * 14) * 0.2 : 0.15;
            parts.head.rotation.x = f.isChasing ? -0.1 : 0;
        }
    },

    syncTrees(level, t) {
        for (let i = 0; i < this.treeMeshes.length; i++) {
            const m = this.treeMeshes[i];
            const tr = level.trees[i];
            if (!tr) continue;
            Models.setTreeBananas(m, tr.hasBananas);
            const parts = m.userData.parts;
            if (parts.crown) {
                parts.crown.rotation.z = Math.sin(t * 1.2 + i) * 0.04;
                parts.crown.rotation.x = Math.cos(t * 1.0 + i) * 0.03;
            }
            if (parts.bunch && tr.hasBananas) {
                parts.bunch.position.y = -0.3 + Math.sin(t * 2 + i) * 0.06;
            }
        }
    },

    // ---------------- helpers ----------------
    lerpAngle(a, b, t) {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    },
    setOpacity(group, o) {
        group.traverse(n => {
            if (n.isMesh && n.material) {
                if (Array.isArray(n.material)) n.material.forEach(m => { m.transparent = o < 1; m.opacity = o; });
                else { n.material.transparent = o < 1; n.material.opacity = o; }
            }
        });
    },
    disposeGroup(g) {
        for (let i = g.children.length - 1; i >= 0; i--) {
            const c = g.children[i];
            c.traverse(n => {
                if (n.geometry) n.geometry.dispose();
            });
            g.remove(c);
        }
    },
    resize() {
        const cont = document.getElementById('game-container');
        const w = cont.clientWidth, h = cont.clientHeight;
        this.renderer.setSize(w, h, false);
        if (!this.camera) {
            this.camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 700);
        } else {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
        }
    },

    // ---------------- effects: FX group ----------------
    buildFX() {
        // shared geometries/materials for particles
        this.pGeo = new THREE.SphereGeometry(0.18, 6, 5);
        this.pMats = {
            splash: new THREE.MeshStandardMaterial({ color: 0x9bd6f5, roughness: 0.3, emissive: 0x2a5a7a, emissiveIntensity: 0.3 }),
            dust: new THREE.MeshStandardMaterial({ color: 0xb39a6a, roughness: 1 }),
            sparkle: new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xb39a00, emissiveIntensity: 0.8, roughness: 0.3 }),
            heart: new THREE.MeshStandardMaterial({ color: 0xff5a6e, emissive: 0x5a0010, emissiveIntensity: 0.5, roughness: 0.4 }),
            poof: new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 1, transparent: true, opacity: 0.9 })
        };
    },

    spawnParticles(worldX, worldY, type, count = 5) {
        const base = this.toWorld(worldX, worldY);
        for (let i = 0; i < count; i++) {
            const mat = (this.pMats[type] || this.pMats.poof);
            const mesh = new THREE.Mesh(this.pGeo, mat);
            mesh.castShadow = false;
            const sz = type === 'poof' ? 1.6 : type === 'heart' ? 1.4 : 1.0;
            mesh.scale.setScalar(sz * (0.6 + Math.random() * 0.8));
            mesh.position.set(base.x + (Math.random() - 0.5) * 0.6, 1.2, base.z + (Math.random() - 0.5) * 0.6);
            this.fxGroup.add(mesh);
            const up = (type === 'splash') ? 0.18 : (type === 'heart' ? 0.12 : 0.1);
            this.particles.push({
                mesh,
                vx: (Math.random() - 0.5) * 0.12,
                vy: Math.random() * up + 0.05,
                vz: (Math.random() - 0.5) * 0.12,
                life: type === 'heart' ? 1.0 : 0.6,
                maxLife: type === 'heart' ? 1.0 : 0.6,
                spin: (Math.random() - 0.5) * 0.4,
                grav: type === 'sparkle' ? 0.002 : 0.012
            });
        }
    },

    updateParticles3D(dt) {
        const f = dt / 16.67;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.x += p.vx * f;
            p.mesh.position.y += p.vy * f;
            p.mesh.position.z += p.vz * f;
            p.vy -= p.grav * f;
            p.mesh.rotation.x += p.spin * f;
            p.mesh.rotation.y += p.spin * f;
            p.life -= dt / 1000;
            const a = Math.max(0, p.life / p.maxLife);
            p.mesh.scale.setScalar(p.mesh.scale.x * (1 - 0.01 * f) + 0.0001);
            if (p.life <= 0) {
                this.fxGroup.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    },
    // game.js compatibility shims (old per-frame draw model)
    updateParticles() {},
    drawParticles() {},

    addFloatingText(worldX, worldY, text, color = '#ffffff') {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const ctx = c.getContext('2d');
        ctx.font = 'bold 44px "Segoe UI", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeText(text, 128, 32);
        ctx.fillStyle = color;
        ctx.fillText(text, 128, 32);
        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sp = new THREE.Sprite(mat);
        const w = this.toWorld(worldX, worldY);
        sp.position.set(w.x, 3.2, w.z);
        sp.scale.set(4, 1, 1);
        this.fxGroup.add(sp);
        this.floatingTexts.push({ sp, life: 1.1, maxLife: 1.1 });
    },
    updateFloatingTexts3D(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.sp.position.y += dt * 0.0016;
            ft.life -= dt / 1000;
            ft.sp.material.opacity = Math.max(0, ft.life / ft.maxLife);
            if (ft.life <= 0) {
                this.fxGroup.remove(ft.sp);
                ft.sp.material.map.dispose();
                ft.sp.material.dispose();
                this.floatingTexts.splice(i, 1);
            }
        }
    },
    updateFloatingTexts() {},
    drawFloatingTexts() {},

    // ---------------- screen shake (applied to camera offset) ----------------
    startShake(intensity, duration) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity * 0.06);
        this.shake.duration = Math.max(this.shake.duration, duration);
    },
    updateShake(dt) {
        if (this.shake.duration > 0) {
            this.shake.duration -= dt;
            const k = this.shake.intensity * Math.min(1, this.shake.duration / 200);
            this.shake.x = (Math.random() - 0.5) * k * 2;
            this.shake.y = (Math.random() - 0.5) * k * 2;
            this.shake.z = (Math.random() - 0.5) * k * 2;
        } else {
            this.shake.x = this.shake.y = this.shake.z = 0;
            this.shake.intensity = 0;
        }
    },

    // ---------------- damage flash via CSS overlay ----------------
    drawDamageFlash(alpha) {
        const el = document.getElementById('fx-flash');
        if (el) el.style.opacity = Math.min(0.85, alpha);
    },
    clearDamageFlash() {
        const el = document.getElementById('fx-flash');
        if (el) el.style.opacity = 0;
    },

    // unused legacy hooks (kept so game.js calls are harmless if present)
    clear() {}, applyShake() {}, resetShake() {}, drawVignette() {}, drawEatEffect() {},
    updateCameraLegacy() {}
};
