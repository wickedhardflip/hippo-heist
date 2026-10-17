// ================= CORE: utils, renderer, post-processing, builders, collision, particles =================
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function fbm(x, z) { return vnoise(x, z) * 0.55 + vnoise(x * 2.07, z * 2.07) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.17; }
let seedState = 1;
function srand(s) { seedState = s >>> 0 || 1; }
function srnd() { seedState ^= seedState << 13; seedState ^= seedState >>> 17; seedState ^= seedState << 5; return (seedState >>> 0) / 4294967296; }
function srange(a, b) { return a + srnd() * (b - a); }

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.autoClear = false;
renderer.setClearColor(0x000000, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const isGL2 = renderer.capabilities.isWebGL2;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, 1, 0.1, 1200);
camera.rotation.order = 'YXZ';
scene.add(camera);
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(60, 1, 0.03, 30);

const FSVERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsScene = new THREE.Scene();
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const brightMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, th: { value: 0.8 } }, vertexShader: FSVERT, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(th,th+0.22,l),1.0); }'
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: FSVERT, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb*0.227; c+=texture2D(t,vUv+dir*1.384).rgb*0.316; c+=texture2D(t,vUv-dir*1.384).rgb*0.316; c+=texture2D(t,vUv+dir*3.23).rgb*0.07; c+=texture2D(t,vUv-dir*3.23).rgb*0.07; gl_FragColor=vec4(c,1.0); }'
});
const compMat = new THREE.ShaderMaterial({
  uniforms: {
    tS: { value: null }, tB: { value: null }, time: { value: 0 }, bloom: { value: 0.9 }, sat: { value: 0.9 }, vig: { value: 0.38 },
    dmg: { value: 0 }, grain: { value: 0.035 }, aberr: { value: 0.0035 }, expo: { value: 1.0 }, slowmo: { value: 0 }, flash: { value: 0 },
    gain: { value: new THREE.Vector3(1.04, 1.0, 0.94) }, lift: { value: new THREE.Vector3(0.02, 0.022, 0.03) }, res: { value: new THREE.Vector2(1, 1) }, tint: { value: new THREE.Vector4(0, 0, 0, 0) }
  },
  vertexShader: FSVERT, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tS,tB; uniform float time,bloom,sat,vig,dmg,grain,aberr,expo,slowmo,flash; uniform vec3 gain,lift; uniform vec2 res; uniform vec4 tint; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    vec2 c=vUv-0.5; float r=dot(c,c);
    float ab=aberr*(1.0+dmg*3.0+slowmo*2.5);
    vec3 col=vec3(texture2D(tS,vUv+c*ab).r, texture2D(tS,vUv).g, texture2D(tS,vUv-c*ab).b);
    col+=texture2D(tB,vUv).rgb*bloom;
    col*=expo;
    col=col/(1.0+0.16*col)*1.1;
    col=mix(col,col*col*(3.0-2.0*col),0.4);
    float l=dot(col,vec3(0.299,0.587,0.114));
    col=mix(vec3(l),col,sat*(1.0-dmg*0.55)*(1.0-slowmo*0.45));
    col=col*gain+lift*(1.0-col);
    col=mix(col,tint.rgb,tint.a*smoothstep(0.02,0.4,r));
    col=mix(col,col*vec3(1.35,0.45,0.4),dmg*smoothstep(0.04,0.32,r));
    col*=1.0-vig*smoothstep(0.06,0.55,r)*(1.0+slowmo*0.8);
    col+=(h(vUv*res+fract(time*7.13))-0.5)*grain;
    col+=vec3(flash);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
  }`
});

const RQ = { quality: matchMedia('(pointer: coarse)').matches ? 'low' : 'high', pr: 1, bloom: true, rtMain: null, rtA: null, rtB: null, w: 1, h: 1 };
function makeRTs() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  RQ.w = w; RQ.h = h;
  const q = RQ.quality;
  RQ.pr = q === 'low' ? Math.min(devicePixelRatio, 1) : q === 'high' ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2);
  RQ.bloom = q !== 'low';
  const W = Math.floor(w * RQ.pr), H = Math.floor(h * RQ.pr);
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  [RQ.rtMain, RQ.rtA, RQ.rtB].forEach(r => r && r.dispose());
  const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
  if (isGL2 && q !== 'low' && THREE.WebGLMultisampleRenderTarget) { RQ.rtMain = new THREE.WebGLMultisampleRenderTarget(W, H, o); RQ.rtMain.samples = 4; }
  else RQ.rtMain = new THREE.WebGLRenderTarget(W, H, o);
  const bo = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false };
  RQ.rtA = new THREE.WebGLRenderTarget(Math.max(1, W >> 2), Math.max(1, H >> 2), bo);
  RQ.rtB = new THREE.WebGLRenderTarget(Math.max(1, W >> 2), Math.max(1, H >> 2), bo);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vmCam.aspect = w / h; vmCam.updateProjectionMatrix();
  compMat.uniforms.res.value.set(W, H);
}
function renderFrame(showVM) {
  renderer.setRenderTarget(RQ.rtMain); renderer.clear();
  renderer.render(scene, camera);
  if (showVM) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
  if (RQ.bloom) {
    fsQuad.material = brightMat; brightMat.uniforms.t.value = RQ.rtMain.texture;
    renderer.setRenderTarget(RQ.rtA); renderer.render(fsScene, fsCam);
    fsQuad.material = blurMat;
    for (let i = 0; i < 2; i++) {
      blurMat.uniforms.t.value = RQ.rtA.texture; blurMat.uniforms.dir.value.set((1 + i) / RQ.rtA.width, 0);
      renderer.setRenderTarget(RQ.rtB); renderer.render(fsScene, fsCam);
      blurMat.uniforms.t.value = RQ.rtB.texture; blurMat.uniforms.dir.value.set(0, (1 + i) / RQ.rtA.height);
      renderer.setRenderTarget(RQ.rtA); renderer.render(fsScene, fsCam);
    }
  }
  fsQuad.material = compMat;
  compMat.uniforms.tS.value = RQ.rtMain.texture; compMat.uniforms.tB.value = RQ.rtA.texture;
  compMat.uniforms.bloom.value = RQ.bloom ? 0.55 : 0;
  renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
}

// ---------- materials & geometry helpers ----------
const MATC = {};
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!MATC[k]) MATC[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, o));
  return MATC[k];
}
const propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02 });
const propMatFlat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  sph: new THREE.SphereGeometry(1, 16, 12),
  sphHi: new THREE.SphereGeometry(1, 28, 20),
  sphLo: new THREE.SphereGeometry(1, 8, 6),
  cone: new THREE.ConeGeometry(1, 1, 10),
  cone6: new THREE.ConeGeometry(1, 1, 6),
  ico: new THREE.IcosahedronGeometry(1, 0),
  dode: new THREE.DodecahedronGeometry(1, 0),
};
// triangular prism: apex up at y=1, base at y=-0.5, z half width 0.866, length 1 along x
GEO.prism = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 3); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); return g; })();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
}
class Builder {
  constructor() { this.items = []; }
  add(geo, color, m) { this.items.push([geo, new THREE.Color(color), m]); if (window.__hhTrace) { if (!geo.boundingBox) geo.computeBoundingBox(); const b = geo.boundingBox.clone().applyMatrix4(m); b.tag = new Error().stack.split('\n')[2]; window.__hhTrace.push(b); } return this; }
  geometry() {
    let count = 0;
    const gs = this.items.map(([g, c, m]) => { const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(m); count += gg.attributes.position.count; return [gg, c]; });
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
    let o = 0;
    for (const [gg, c] of gs) {
      const n = gg.attributes.position.count;
      pos.set(gg.attributes.position.array, o * 3); nor.set(gg.attributes.normal.array, o * 3);
      for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += n; gg.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  mesh(m = propMat, shadow = true) {
    if (!this.items.length) return new THREE.Group();
    const mesh = new THREE.Mesh(this.geometry(), m);
    mesh.castShadow = shadow; mesh.receiveShadow = true; return mesh;
  }
}
function mk(geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, parent = null, shadow = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = shadow; m.receiveShadow = shadow; if (parent) parent.add(m); return m;
}
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}

// ---------- collision ----------
const COL = {
  cell: 8, grid: new Map(), boxes: [],
  reset() { this.grid.clear(); this.boxes.length = 0; },
  key(ix, iz) { return ix * 4096 + iz; },
  addCircle(x, z, r, tag) {
    const c = { x, z, r, tag };
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell), z0 = Math.floor((z - r) / this.cell), z1 = Math.floor((z + r) / this.cell);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = this.key(i, j); if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(c); }
    return c;
  },
  addBox(cx, cz, hx, hz, tall = true) { const b = { x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, tall }; this.boxes.push(b); return b; },
  resolve(o, r) {
    const ix = Math.floor(o.x / this.cell), iz = Math.floor(o.z / this.cell);
    let hit = false;
    for (let i = ix - 1; i <= ix + 1; i++) for (let j = iz - 1; j <= iz + 1; j++) {
      const arr = this.grid.get(this.key(i, j)); if (!arr) continue;
      for (const c of arr) {
        const dx = o.x - c.x, dz = o.z - c.z, d2 = dx * dx + dz * dz, rr = r + c.r;
        if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; const p = (rr - d); o.x += dx / d * p; o.z += dz / d * p; hit = true; }
      }
    }
    for (const b of this.boxes) {
      if (o.x < b.x0 - r || o.x > b.x1 + r || o.z < b.z0 - r || o.z > b.z1 + r) continue;
      const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1);
      const dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz;
      if (d2 > 1e-6) { if (d2 < r * r) { const d = Math.sqrt(d2); o.x += dx / d * (r - d); o.z += dz / d * (r - d); hit = true; } }
      else { // inside: push along min axis
        const l = o.x - b.x0, rr2 = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z; const m = Math.min(l, rr2, t, bt);
        if (m === l) o.x = b.x0 - r; else if (m === rr2) o.x = b.x1 + r; else if (m === t) o.z = b.z0 - r; else o.z = b.z1 + r; hit = true;
      }
    }
    const B = WORLD - 1; if (o.x < -B) o.x = -B; if (o.x > B) o.x = B; if (o.z < -B) o.z = -B; if (o.z > B) o.z = B;
    return hit;
  },
  los(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    for (const b of this.boxes) {
      if (!b.tall) continue;
      let tmin = 0, tmax = 1;
      if (Math.abs(dx) < 1e-6) { if (x0 < b.x0 || x0 > b.x1) continue; } else { let a = (b.x0 - x0) / dx, c = (b.x1 - x0) / dx; if (a > c) [a, c] = [c, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, c); if (tmin > tmax) continue; }
      if (Math.abs(dz) < 1e-6) { if (z0 < b.z0 || z0 > b.z1) continue; } else { let a = (b.z0 - z0) / dz, c = (b.z1 - z0) / dz; if (a > c) [a, c] = [c, a]; tmin = Math.max(tmin, a); tmax = Math.min(tmax, c); if (tmin > tmax) continue; }
      return false;
    }
    return true;
  }
};

// ---------- particles ----------
const PT = {
  pool: [], active: [], geo: new THREE.IcosahedronGeometry(1, 1),
  get() {
    let p = this.pool.pop();
    if (!p) { const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })); m.frustumCulled = false; p = { m, v: new THREE.Vector3() }; }
    scene.add(p.m); return p;
  },
  spawn(o) {
    if (this.active.length > 650) return;
    const p = this.get();
    p.m.position.set(o.x, o.y, o.z); p.v.set(o.vx || 0, o.vy || 0, o.vz || 0);
    p.s = o.s || 0.1; p.life = o.life || 1; p.t = 0; p.g = o.g === undefined ? -9.8 : o.g; p.grow = o.grow || 0; p.drag = o.drag || 0; p.op = o.op === undefined ? 1 : o.op; p.water = !!o.water;
    p.m.material.color.set(o.c || 0xffffff); p.m.material.opacity = p.op; p.m.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.m.scale.setScalar(p.s); p.sx = o.sx || 1; p.sy = o.sy || 1;
    this.active.push(p);
  },
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]; p.t += dt; const k = p.t / p.life;
      if (k >= 1 || (p.water && p.m.position.y < -0.05 && p.v.y < 0)) { scene.remove(p.m); this.pool.push(p); this.active.splice(i, 1); continue; }
      p.v.y += p.g * dt; if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.m.position.addScaledVector(p.v, dt);
      const sc = p.grow ? p.s * (1 + p.grow * k) : p.s * Math.sqrt(1 - k);
      p.m.scale.set(sc * p.sx, sc * p.sy, sc * p.sx);
      p.m.material.opacity = p.op * (p.grow ? (1 - k) : Math.min(1, (1 - k) * 2.5));
    }
  },
  clear() { for (const p of this.active) { scene.remove(p.m); this.pool.push(p); } this.active.length = 0; }
};
function splash(x, z, n = 24, power = 1) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(1, 4) * power; PT.spawn({ x: x + Math.cos(a) * rand(0, 0.6), y: 0.1, z: z + Math.sin(a) * rand(0, 0.6), vx: Math.cos(a) * s, vy: rand(3, 8) * power, vz: Math.sin(a) * s, s: rand(0.05, 0.16), c: pick([0xdff3f5, 0xb9dde0, 0xffffff]), life: rand(0.6, 1.2), water: true, op: 0.85 }); }
  for (let i = 0; i < 6; i++) PT.spawn({ x: x + rand(-1, 1), y: 0.05, z: z + rand(-1, 1), s: rand(0.4, 0.8) * power, sy: 0.12, c: 0xe8f4f4, life: 0.9, g: 0, grow: 3, op: 0.45 });
}
function dust(x, y, z, n = 10, c = 0x8a7656) {
  for (let i = 0; i < n; i++) PT.spawn({ x: x + rand(-0.4, 0.4), y: y + rand(0, 0.3), z: z + rand(-0.4, 0.4), vx: rand(-1.5, 1.5), vy: rand(0.3, 1.6), vz: rand(-1.5, 1.5), s: rand(0.18, 0.4), c, life: rand(0.8, 1.4), g: 0.4, grow: 2.2, drag: 1.5, op: 0.4 });
}
function sparkle(x, y, z, c = 0xffe066, n = 14) {
  for (let i = 0; i < n; i++) PT.spawn({ x, y, z, vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-3, 3), s: rand(0.04, 0.09), c, life: rand(0.4, 0.9), add: true, g: -6 });
}
