// ================= WORLD: terrain, water, sky, lighting, props, vegetation =================
let L = LEVELS[0];
let FLAT = [];
let TREES = [];
let HOUSES = [], FOOD_SLOTS = [], LAMPS = [];
const worldRoot = new THREE.Group(); scene.add(worldRoot);
const WATER_CORE = 13.4, ZONE_D = 19.5;

function riverCoord(w, t) { return w.base + w.a1 * Math.sin(t * w.f1 + w.p1) + w.a2 * Math.sin(t * w.f2 + w.p2); }
function waterDist(x, z) {
  let d = 1e9; const ws = L.water;
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]; let v;
    if (w.type === 'river') v = w.axis === 'z' ? Math.abs(x - riverCoord(w, z)) : Math.abs(z - riverCoord(w, x));
    else v = Math.max(0, Math.hypot(x - w.x, z - w.z) - (w.r - WATER_CORE));
    if (v < d) d = v;
  }
  return d;
}
function rawGround(x, z) {
  let h = L.base + (vnoise(x * 0.034 + L.seed, z * 0.034) - 0.5) * L.hill + (vnoise(x * 0.11, z * 0.11 + 3) - 0.5) * 0.5;
  for (let i = 0; i < FLAT.length; i++) {
    const f = FLAT[i]; const d = Math.max(Math.abs(x - f.x) - f.hx, Math.abs(z - f.z) - f.hz);
    if (d < 5) h = lerp(f.h, h, smooth(d / 5));
  }
  return h;
}
function groundH(x, z) {
  let h = rawGround(x, z);
  const wd = waterDist(x, z);
  if (wd < 20) { const t = clamp((wd - 5.5) / 14.5, 0, 1); h = lerp(-2.5, h, smooth(t)); }
  return h;
}
function inZone(x, z) { return waterDist(x, z) < ZONE_D; }
function waterPoint(spec) {
  const w = L.water[spec.river !== undefined ? spec.river : spec.pond];
  if (w.type === 'river') { const c = riverCoord(w, spec.t), o = spec.off * (spec.side || 1); return w.axis === 'z' ? { x: c + o, z: spec.t } : { x: spec.t, z: c + o }; }
  const r = w.r - WATER_CORE + spec.off; return { x: w.x + Math.cos(spec.a) * r, z: w.z + Math.sin(spec.a) * r };
}
function inField(x, z, m = 0) { for (const f of L.fields) if (x > f.x0 - m && x < f.x1 + m && z > f.z0 - m && z < f.z1 + m) return f; return null; }
function onStreet(x, z, m = 0) { if (!L.streets) return null; for (const f of L.streets) if (x > f.x0 - m && x < f.x1 + m && z > f.z0 - m && z < f.z1 + m) return f; return null; }
// enterable houses: the interior rectangle the hippo can hide in
function indoorOf(x, z, m = 0) { for (const h of HOUSES) if (x > h.x0 - m && x < h.x1 + m && z > h.z0 - m && z < h.z1 + m) return h; return null; }

// ---------- lights & sky ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.castShadow = true;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 260;
scene.add(sun); scene.add(sun.target);
function setShadowRes() { const s = RQ.quality === 'low' ? 1024 : RQ.quality === 'high' ? 2048 : 4096; if (sun.shadow.mapSize.x !== s) { sun.shadow.mapSize.set(s, s); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
const LANTERNS = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffb05a, 0, 14, 2); scene.add(l); LANTERNS.push(l); }
const LAMPLIGHTS = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffc879, 0, 17, 2); scene.add(l); LAMPLIGHTS.push(l); }
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, cloudCol: { value: new THREE.Color() }, cloud: { value: 0.4 }, time: { value: 0 }, night: { value: 0 }, flash: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }',
  fragmentShader: `uniform vec3 top,hor,sunDir,sunCol,cloudCol; uniform float cloud,time,night,flash; varying vec3 vD;
  float hs(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z); }
  void main(){
    vec3 d=normalize(vD); float h=d.y;
    vec3 col=mix(hor,top,pow(clamp(h,0.0,1.0),0.48));
    vec3 sd=normalize(sunDir); float s=max(dot(d,sd),0.0);
    float disk=smoothstep(0.9993,0.9997,s);
    col+=sunCol*(disk*(night>0.5?1.0:2.0)+pow(s,32.0)*0.22+pow(s,6.0)*0.08);
    if(h>-0.02){
      vec2 p=d.xz/(max(h,0.0)+0.12);
      float c=n3(vec3(p*1.2+vec2(time*0.012,time*0.004),time*0.01))*0.52+n3(vec3(p*2.9,3.0+time*0.01))*0.3+n3(vec3(p*7.0,5.0))*0.18;
      float cov=smoothstep(1.0-cloud,1.0-cloud+0.32,c)*smoothstep(-0.02,0.2,h);
      vec3 cc=cloudCol*(0.72+0.55*pow(s,3.0))+sunCol*pow(s,12.0)*0.25*(1.0-night);
      float edge=smoothstep(0.0,0.4,cov)*(1.0-smoothstep(0.4,1.0,cov));
      cc+=sunCol*edge*0.25*pow(s,2.0)*(1.0-night);
      col=mix(col,cc,cov*0.9);
      if(night>0.5){ float st=step(0.9982,hs(floor(d*420.0))); col+=vec3(st)*(1.0-cov)*0.9*smoothstep(0.05,0.3,h); }
      col+=vec3(0.75,0.8,1.0)*flash*(0.4+cov*1.2);
    } else col=mix(hor*0.9,hor*0.55,clamp(-h*4.0,0.0,1.0));
    gl_FragColor=vec4(col,1.0);
  }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);

// ---------- textures ----------
const TEX = {};
TEX.ground = canvasTex(512, 512, (g, w, h) => {
  const id = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x / 22, y / 22) * 0.55 + fbm(x / 5, y / 5) * 0.3 + Math.random() * 0.15;
    const v = 170 + n * 85; const i = (y * w + x) * 4; id.data[i] = v; id.data[i + 1] = v * 0.98; id.data[i + 2] = v * 0.92; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < 2600; i++) { const x = Math.random() * w, y = Math.random() * h, l = rand(3, 9), a = rand(-0.5, 0.5) - Math.PI / 2; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,235' : '60,60,40'},${rand(0.06, 0.18)})`; g.lineWidth = rand(0.6, 1.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
});
TEX.leaf = canvasTex(128, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#3d6e22'); grad.addColorStop(0.5, '#6aa63a'); grad.addColorStop(1, '#3a6a20');
  g.fillStyle = grad; g.beginPath(); g.moveTo(w / 2, 4);
  g.bezierCurveTo(w * 1.02, h * 0.15, w * 1.0, h * 0.75, w / 2 + 4, h - 2); g.bezierCurveTo(w * 0.0, h * 0.75, -w * 0.02, h * 0.15, w / 2, 4); g.fill();
  g.strokeStyle = 'rgba(30,50,15,.35)'; g.lineWidth = 1.2;
  for (let y = 18; y < h - 10; y += 7) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(4, y - 24); g.moveTo(w / 2, y); g.lineTo(w - 4, y - 24); g.stroke(); }
  g.strokeStyle = '#d4e3a2'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) { const y = rand(60, h - 40), s = Math.random() < 0.5 ? 1 : -1; g.beginPath(); g.moveTo(w / 2 + s * 8, y); g.lineTo(w / 2 + s * w, y - rand(10, 40)); g.lineTo(w / 2 + s * w, y - rand(44, 60)); g.closePath(); g.fill(); }
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,90,30,.55)';
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(Math.random() < 0.5 ? 6 : w - 6, rand(40, h), 10, rand(10, 40), 0, 0, TAU); g.fill(); }
}, false);
TEX.bark = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = '#6a6b3d'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += rand(10, 22)) { g.fillStyle = `rgba(${randi(70, 110)},${randi(60, 85)},${randi(30, 50)},.8)`; g.fillRect(0, y, w, rand(3, 8)); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,40,20,.35)'; g.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(10, 40)); }
});
TEX.spots = canvasTex(512, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c78f3c'); gr.addColorStop(0.5, '#dcaa55'); gr.addColorStop(1, '#ead2a0');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 170; i++) {
    const x = Math.random() * w, y = Math.random() * h * 0.9, r = rand(6, 13);
    g.fillStyle = 'rgba(170,110,40,.7)'; g.beginPath(); g.arc(x, y, r * 0.75, 0, TAU); g.fill();
    g.fillStyle = '#24170c';
    const n = randi(4, 6); for (let k = 0; k < n; k++) { const a = k / n * TAU + rand(-0.3, 0.3); g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, rand(2.5, 4.5), rand(1.8, 3), a + Math.PI / 2, 0, TAU); g.fill(); }
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = '#24170c'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rand(1.2, 3), 0, TAU); g.fill(); }
});
TEX.hippo = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7a6870'; g.fillRect(0, 0, w, h);
  const id = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; const n = fbm(x / 18, y / 18) * 40 - 20 + Math.random() * 10; id.data[i * 4] += n; id.data[i * 4 + 1] += n * 0.9; id.data[i * 4 + 2] += n; }
  g.putImageData(id, 0, 0);
  g.strokeStyle = 'rgba(40,28,34,.25)'; g.lineWidth = 1;
  for (let i = 0; i < 140; i++) { const x = rand(0, w), y = rand(0, h); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + rand(-14, 14), y + rand(-6, 6), x + rand(-28, 28), y + rand(-4, 4)); g.stroke(); }
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(200,140,150,.18)'; g.beginPath(); g.arc(rand(0, w), rand(0, h), rand(3, 12), 0, TAU); g.fill(); }
});
TEX.wood = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { g.fillStyle = `rgba(0,0,0,${rand(0.05, 0.18)})`; g.fillRect(x, 0, 16, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, 0, 1.5, h); }
  for (let i = 0; i < 80; i++) { g.strokeStyle = `rgba(0,0,0,${rand(0.04, 0.12)})`; g.beginPath(); const x = rand(0, w); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-4, 4), h / 3, x + rand(-4, 4), h * 0.66, x, h); g.stroke(); }
});
const propMatTex = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, map: TEX.wood });

// ---------- water ----------
let hmapTex = null;
const waterMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { hMap: { value: null }, time: { value: 0 }, S: { value: 400 }, rain: { value: 0 }, deep: { value: new THREE.Color(0x1c3a3c) }, shallow: { value: new THREE.Color(0x4a7a6c) }, skyC: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunC: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, fogD: { value: 0.01 }, night: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D hMap; uniform float time,S,rain,fogD,night; uniform vec3 deep,shallow,skyC,sunDir,sunC,fogC; varying vec3 vW;
  float hs(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
  float wv(vec2 p){ return n2(p+vec2(time*0.5,time*0.23))+0.5*n2(p*2.3-vec2(time*0.37,-time*0.61))+0.25*n2(p*5.1+vec2(time*0.9,0.0)); }
  void main(){
    vec2 uv=vW.xz/S+0.5; float gh=texture2D(hMap,uv).r*24.0-12.0; float depth=-gh;
    if(depth<-0.02) discard;
    vec2 p=vW.xz*0.32; float e=0.08;
    float h0=wv(p), hx=wv(p+vec2(e,0.0)), hz=wv(p+vec2(0.0,e));
    float amp=1.1+rain*1.6;
    vec3 n=normalize(vec3((h0-hx)*amp,1.0,(h0-hz)*amp));
    if(rain>0.0){ vec2 cell=floor(vW.xz*1.5); vec2 f=fract(vW.xz*1.5)-0.5; float ph=fract(time*1.3+hs(cell)); float rr=length(f); float ring=smoothstep(0.05,0.0,abs(rr-ph*0.5))*(1.0-ph); n.xz+=f*ring*2.0*rain; n=normalize(n); }
    vec3 V=normalize(cameraPosition-vW);
    float fr=0.06+0.94*pow(1.0-max(dot(n,V),0.0),5.0);
    vec3 base=mix(shallow,deep,smoothstep(0.0,2.4,depth));
    vec3 col=mix(base,skyC,clamp(fr*0.9,0.0,0.6));
    vec3 Hh=normalize(normalize(sunDir)+V); float sp=pow(max(dot(n,Hh),0.0),220.0)*(night>0.5?1.4:3.2); col+=sunC*sp;
    float foam=smoothstep(0.32,0.0,depth)*(0.45+0.55*n2(vW.xz*2.2+time*0.7));
    col=mix(col,vec3(0.86,0.88,0.84)*(night>0.5?0.35:1.0),foam*0.75);
    float a=clamp(0.62+depth*0.3,0.62,0.95); a=max(a,foam*0.9);
    float dist=length(cameraPosition-vW); float f=1.0-exp(-fogD*fogD*dist*dist); col=mix(col,fogC,f);
    gl_FragColor=vec4(col,a);
  }`
});

// ---------- vegetation geometry ----------
const leafGeo = (() => {
  const g = new THREE.PlaneGeometry(1.15, 3.6, 2, 8); g.rotateX(Math.PI / 2); g.translate(0, 0, 1.8);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), t = z / 3.6; p.setY(i, p.getY(i) - t * t * 1.7 + Math.sin(t * Math.PI) * 0.25); p.setX(i, p.getX(i) * (1 - Math.abs(p.getX(i)) * 0.15 * t)); }
  g.computeVertexNormals(); return g;
})();
const trunkGeo = (() => { const g = new THREE.CylinderGeometry(0.17, 0.32, 1, 9, 4); g.translate(0, 0.5, 0); return g; })();
const bladeGeo = (() => {
  const pos = [], col = []; const c0 = [0.55, 0.6, 0.45], c1 = [1.0, 1.0, 0.9];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + Math.random() * 0.5, r = 0.12, lean = rand(0.1, 0.35), hgt = rand(0.45, 0.8), w = 0.045;
    const bx = Math.cos(a) * r * 0.4, bz = Math.sin(a) * r * 0.4, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const tx = bx + Math.cos(a) * lean, tz = bz + Math.sin(a) * lean;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, hgt, tz); col.push(...c0, ...c0, ...c1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); return g;
})();
const reedGeo = (() => { const g = new THREE.ConeGeometry(0.035, 1.8, 4); g.translate(0, 0.9, 0); return g; })();
const bunchGeo = (() => {
  const B = new Builder();
  B.add(GEO.cyl8, 0x5d6b2a, M(0, 0.2, 0, 0, 0, 0, 0.05, 1.1, 0.05));
  const tiers = [[0.45, 7, 0.3], [0.2, 8, 0.33], [-0.05, 7, 0.3], [-0.28, 6, 0.26]];
  const bt = new THREE.TorusGeometry(0.3, 0.06, 6, 10, 1.05);
  tiers.forEach(([y, n, r], ti) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + ti * 0.4; B.add(bt, ti > 1 ? 0xe9cf3c : 0xd8d23a, M(Math.cos(a) * 0.08, y, Math.sin(a) * 0.08, 0, -a, -1.1, 1, 1, 1).premultiply(new THREE.Matrix4())); } });
  B.add(GEO.cone, 0x6b2546, M(0, -0.65, 0, Math.PI, 0, 0, 0.12, 0.35, 0.12));
  return B.geometry();
})();
const bunchMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x332600, emissiveIntensity: 0.6 });
// a smoked ham and a string of sausages hanging from a hook, same footprint as a banana bunch
const meatGeo = (() => {
  const B = new Builder();
  B.add(GEO.cyl8, 0x6a5a40, M(0, 0.45, 0, 0, 0, 0, 0.02, 0.7, 0.02));
  B.add(GEO.sph, 0x8e3b22, M(0, -0.12, 0, 0.25, 0, 0, 0.32, 0.46, 0.3)); B.add(GEO.sph, 0xa84a2c, M(0, 0.1, 0.02, 0.25, 0, 0, 0.24, 0.3, 0.24));
  B.add(GEO.cyl, 0xd88a7c, M(0, -0.5, 0.1, 0.25, 0, 0, 0.2, 0.04, 0.2)); B.add(GEO.cyl8, 0xeee4cc, M(0, 0.3, -0.06, 0.25, 0, 0, 0.05, 0.3, 0.05));
  for (let i = 0; i < 4; i++) B.add(GEO.sph, i % 2 ? 0xb4563a : 0xa04a30, M(0.3, 0.16 - i * 0.2, 0.05, 0, 0, 0.15, 0.07, 0.11, 0.07));
  return B.geometry();
})();
const meatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x2a0c04, emissiveIntensity: 0.7 });
const SIGNTEX = {};
function signMesh(text, w, h, bg = '#2a2018', fg = '#f2e2b6') {
  const k = text + bg + fg;
  if (!SIGNTEX[k]) SIGNTEX[k] = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = fg; g.lineWidth = ch * 0.06; g.strokeRect(ch * 0.08, ch * 0.08, cw - ch * 0.16, ch - ch * 0.16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = ch * 0.5; g.font = `800 ${fs}px Georgia,serif`; while (g.measureText(text).width > cw * 0.86 && fs > 8) { fs -= 2; g.font = `800 ${fs}px Georgia,serif`; } g.fillText(text, cw / 2, ch * 0.54); }, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: SIGNTEX[k], roughness: 0.8, emissive: 0xffffff, emissiveMap: SIGNTEX[k], emissiveIntensity: L.sky.night ? 0.35 : 0 }));
  m.receiveShadow = true; return m;
}
function placeSign(P, text, lx, ly, lz, w, h, bg, fg, face = 0) { const m = signMesh(text, w, h, bg, fg); const [wx, wz] = rotXZ(P, lx, lz); m.position.set(wx, P.y + ly, wz); m.rotation.y = (P.ry || 0) + face; worldRoot.add(m); return m; }

// ---------- props ----------
function rotXZ(P, lx, lz) { const c = Math.cos(P.ry || 0), s = Math.sin(P.ry || 0); return [P.x + lx * c + lz * s, P.z - lx * s + lz * c]; }
function padd(B, geo, color, P, lx, ly, lz, sx, sy, sz, rx = 0, ry = 0, rz = 0) { const [wx, wz] = rotXZ(P, lx, lz); B.add(geo, color, M(wx, P.y + ly, wz, rx, ry + (P.ry || 0), rz, sx, sy, sz)); }
function pbox(P, lx, lz, hx, hz, tall = true) { const [wx, wz] = rotXZ(P, lx, lz); const sw = Math.abs(Math.sin(P.ry || 0)) > 0.5; COL.addBox(wx, wz, sw ? hz : hx, sw ? hx : hz, tall); }
function pcirc(P, lx, lz, r) { const [wx, wz] = rotXZ(P, lx, lz); COL.addCircle(wx, wz, r); }
const PROP_PADS = { house: [6, 5], shop: [7, 6], police: [9, 6], station: [10, 5], church: [6, 9], stall: [2.5, 1.5], rack: [2, 1.2], cart: [1.6, 1.6], fountain: [3.2, 3.2], hay: [2.2, 2.2], crates: [2.6, 2.6], barrels: [1.5, 1.5], lamp: [0.8, 0.8], scarecrow: [1, 1], farmhouse: [9, 8], barn: [9, 12], silo: [4, 4], shed: [4, 4], packing: [14, 10], sawmill: [12, 9], watertower: [4, 4], tractor: [3, 3], pickup: [3, 3.5], well: [2, 2], outhouse: [2, 2], logs: [5, 3] };
const PROPS = {
  farmhouse(B, P, G) {
    const W = 14, D = 10, H = 4.4;
    padd(B, GEO.box, 0x6d6457, P, 0, 0.3, 0, W + 0.6, 1.4, D + 0.6);
    padd(B, GEO.box, 0xd9cfb6, P, 0, 0.9 + H / 2, 0, W, H, D);
    for (let i = -3; i <= 3; i++) padd(B, GEO.box, 0xbfb397, P, i * 2, 0.9 + H / 2, D / 2 + 0.03, 0.12, H, 0.06);
    padd(B, GEO.prism, 0x6a3426, P, 0, 0.9 + H + 0.5 * 2.0, 0, W + 1.4, 2.0, (D / 2 + 0.9) / 0.866);
    padd(B, GEO.box, 0x7b6b5b, P, 4, 0.9 + H + 2.6, -1.5, 0.9, 2.4, 0.9);
    padd(B, GEO.box, 0x3a2a22, P, 0, 0.9 + 1.2, D / 2 + 0.05, 1.3, 2.4, 0.1);
    const winC = L.sky.night ? 0xffc46a : 0x24323c;
    [[-4.5, 0], [4.5, 0], [-4.5, 1], [4.5, 1]].forEach(([x, side]) => { const z = side ? -D / 2 - 0.05 : D / 2 + 0.05; padd(L.sky.night ? G : B, GEO.box, winC, P, x, 0.9 + 2.3, z, 1.6, 1.3, 0.08); padd(B, GEO.box, 0xf1ece0, P, x, 0.9 + 2.3, z * 1.002, 1.85, 1.55, 0.05); });
    padd(B, GEO.box, 0x8a7a64, P, 0, 0.95, D / 2 + 1.6, W, 0.2, 3.2);
    for (let i = -3; i <= 3; i += 2) padd(B, GEO.cyl8, 0xe8e2d2, P, i * 2.2, 0.95 + 1.5, D / 2 + 3, 0.1, 3, 0.1);
    padd(B, GEO.box, 0x5a3a2a, P, 0, 0.95 + 3.05, D / 2 + 1.8, W + 0.4, 0.15, 3.8, -0.12);
    pbox(P, 0, 0, W / 2, D / 2);
  },
  barn(B, P) {
    const W = 14, D = 18, H = 6;
    padd(B, GEO.box, 0x8e3324, P, 0, H / 2, 0, W, H, D);
    padd(B, GEO.prism, 0x3e3632, P, 0, H + 0.5 * 3.2, 0, D + 1, 3.2, (W / 2 + 0.8) / 0.866, 0, Math.PI / 2);
    padd(B, GEO.box, 0x5a1f16, P, 0, 2.4, D / 2 + 0.05, 5, 4.8, 0.12);
    padd(B, GEO.box, 0xece6d6, P, 0, 2.4, D / 2 + 0.12, 5.4, 0.25, 0.06, 0, 0, 0.75); padd(B, GEO.box, 0xece6d6, P, 0, 2.4, D / 2 + 0.12, 5.4, 0.25, 0.06, 0, 0, -0.75);
    padd(B, GEO.box, 0xece6d6, P, 0, 4.85, D / 2 + 0.1, 5.4, 0.2, 0.08); padd(B, GEO.box, 0x2a1a14, P, 0, 7.2, D / 2 + 0.05, 1.8, 1.6, 0.1);
    pbox(P, 0, 0, W / 2, D / 2);
  },
  silo(B, P) { padd(B, GEO.cyl, 0xa9aeb2, P, 0, 6, 0, 3, 12, 3); padd(B, GEO.sph, 0x8e969c, P, 0, 12, 0, 3.05, 1.8, 3.05); for (let i = 1; i < 6; i++) padd(B, GEO.cyl, 0x7e858a, P, 0, i * 2, 0, 3.06, 0.15, 3.06); pcirc(P, 0, 0, 3.1); },
  shed(B, P) { padd(B, GEO.box, 0x7a5a3a, P, 0, 1.6, 0, 6, 3.2, 5); padd(B, GEO.box, 0x4b4038, P, 0, 3.45, 0, 6.8, 0.2, 5.8, 0.18); padd(B, GEO.box, 0x3a2a1c, P, 0, 1.1, 2.52, 1.4, 2.2, 0.08); pbox(P, 0, 0, 3, 2.5); },
  tractor(B, P) {
    padd(B, GEO.box, 0x2f6a34, P, 0, 1.5, 0.6, 1.4, 1.1, 3); padd(B, GEO.box, 0x2f6a34, P, 0, 1.9, -0.9, 1.6, 1.6, 1.4);
    padd(B, GEO.box, 0x1a1a1a, P, 0, 3.1, -0.9, 1.7, 0.1, 1.6); for (const x of [-0.75, 0.75]) for (const z of [-1.55, -0.25]) padd(B, GEO.cyl8, 0x222222, P, x, 2.4, z, 0.05, 1.5, 0.05);
    for (const s of [-1, 1]) { padd(B, GEO.cyl, 0x1b1b1b, P, s * 1.05, 1.05, -1.0, 1.05, 0.55, 1.05, 0, 0, Math.PI / 2); padd(B, GEO.cyl, 0xd6b23a, P, s * 1.32, 1.05, -1.0, 0.5, 0.02, 0.5, 0, 0, Math.PI / 2); padd(B, GEO.cyl, 0x1b1b1b, P, s * 0.85, 0.55, 1.6, 0.55, 0.35, 0.55, 0, 0, Math.PI / 2); }
    padd(B, GEO.cyl8, 0x333333, P, 0.4, 2.6, 1.3, 0.07, 1.4, 0.07); pcirc(P, 0, -0.6, 1.6); pcirc(P, 0, 1.2, 1.1);
  },
  pickup(B, P) {
    const c = pick([0x8a2c22, 0x2d4f6e, 0xb8b1a0, 0x3d4a2c]);
    padd(B, GEO.box, c, P, 0, 1.0, 0, 2.1, 0.8, 5.2); padd(B, GEO.box, c, P, 0, 1.85, 0.6, 2.0, 0.95, 2.0); padd(B, GEO.box, 0x1e2a33, P, 0, 1.95, 1.62, 1.85, 0.65, 0.05, -0.3);
    padd(B, GEO.box, 0x222222, P, 0, 1.25, -1.6, 1.9, 0.5, 1.9); for (const s of [-1, 1]) for (const z of [-1.6, 1.6]) padd(B, GEO.cyl, 0x151515, P, s * 1.02, 0.45, z, 0.45, 0.32, 0.45, 0, 0, Math.PI / 2);
    padd(B, GEO.box, 0xd8d8c8, P, 0, 0.9, 2.62, 2.0, 0.25, 0.08); pbox(P, 0, 0, 1.1, 2.7);
  },
  hay(B, P) { const a = rand(0, TAU); padd(B, GEO.cyl, 0xcfae5a, P, 0, 0.9, 0, 0.9, 1.4, 0.9, 0, a, Math.PI / 2); padd(B, GEO.cyl, 0xb8963e, P, 0, 0.9, 0, 0.6, 1.42, 0.6, 0, a, Math.PI / 2); pcirc(P, 0, 0, 1.0); },
  crates(B, P) { const n = randi(3, 5); for (let i = 0; i < n; i++) { const x = rand(-1.6, 1.6), z = rand(-1.6, 1.6), s = rand(0.9, 1.3), st = Math.random() < 0.35; padd(B, GEO.box, pick([0x9a7a4a, 0x8a6a3e, 0xa8884e]), P, x, s / 2 + (st ? s : 0), z, s, s, s, 0, rand(0, 1)); if (st) padd(B, GEO.box, 0x9a7a4a, P, x, s / 2, z, s, s, s); padd(B, GEO.box, 0xe6c43a, P, x, s + (st ? s : 0) + 0.12, z, s * 0.6, 0.25, s * 0.6); pcirc(P, x, z, s * 0.7); } },
  barrels(B, P) { for (let i = 0; i < 4; i++) { const x = (i % 2) * 1.1 - 0.5, z = (i >> 1) * 1.1 - 0.5; padd(B, GEO.cyl, pick([0x3a5a7a, 0x7a3a2a, 0x555a40]), P, x, 0.65, z, 0.5, 1.3, 0.5); } pcirc(P, 0, 0, 1.3); },
  scarecrow(B, P) {
    padd(B, GEO.cyl8, 0x6b5232, P, 0, 1.4, 0, 0.07, 2.8, 0.07); padd(B, GEO.cyl8, 0x6b5232, P, 0, 2.1, 0, 0.05, 2.0, 0.05, 0, 0, Math.PI / 2);
    padd(B, GEO.box, 0x7a3a4a, P, 0, 2.0, 0, 0.6, 0.8, 0.3); padd(B, GEO.box, 0x7a3a4a, P, 0, 2.15, 0, 1.6, 0.18, 0.2); padd(B, GEO.sph, 0xd9c08a, P, 0, 2.6, 0, 0.22, 0.24, 0.22);
    padd(B, GEO.cyl, 0xcfb060, P, 0, 2.8, 0, 0.42, 0.04, 0.42); padd(B, GEO.cyl, 0xcfb060, P, 0, 2.92, 0, 0.2, 0.2, 0.2); pcirc(P, 0, 0, 0.3);
  },
  well(B, P) { padd(B, GEO.cyl, 0x8a8478, P, 0, 0.5, 0, 1.0, 1.0, 1.0); padd(B, GEO.cyl, 0x1a1e20, P, 0, 1.0, 0, 0.8, 0.02, 0.8); for (const s of [-1, 1]) padd(B, GEO.box, 0x5a4230, P, s * 0.9, 1.6, 0, 0.12, 2.2, 0.12); padd(B, GEO.prism, 0x5a3426, P, 0, 2.9, 0, 2.2, 0.7, 0.9); pcirc(P, 0, 0, 1.1); },
  outhouse(B, P) { padd(B, GEO.box, 0x6a5034, P, 0, 1.2, 0, 1.4, 2.4, 1.4); padd(B, GEO.box, 0x3a3028, P, 0, 2.5, 0, 1.7, 0.12, 1.7, 0.15); pbox(P, 0, 0, 0.7, 0.7); },
  packing(B, P, G) {
    const W = 26, D = 16, H = 6.5;
    padd(B, GEO.box, 0x6f7f86, P, 0, H / 2, 0, W, H, D);
    for (let i = -12; i <= 12; i += 1.5) padd(B, GEO.box, 0x5f6e74, P, i, H / 2, D / 2 + 0.03, 0.25, H, 0.06);
    padd(B, GEO.box, 0x4a4f52, P, 0, H + 0.6, 0, W + 0.8, 1.2, D + 0.8, 0, 0, 0);
    for (let i = -1; i <= 1; i++) padd(B, GEO.box, 0x30363a, P, i * 7.5, 2.4, D / 2 + 0.08, 4.4, 4.8, 0.1);
    padd(B, GEO.box, 0x75705f, P, 0, 0.6, D / 2 + 1.8, W, 1.2, 3.6);
    padd(L.sky.night ? G : B, GEO.box, 0xfff0c0, P, 0, H - 0.6, D / 2 + 0.2, 8, 0.3, 0.3);
    padd(B, GEO.box, 0xd9b13a, P, -9, H - 1.4, D / 2 + 0.1, 5, 1.2, 0.1);
    pbox(P, 0, 0, W / 2, D / 2); pbox(P, 0, D / 2 + 1.8, W / 2, 1.8, false);
  },
  watertower(B, P) {
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { padd(B, GEO.cyl8, 0x5a4a3a, P, x, 4.5, z, 0.22, 9, 0.22); pcirc(P, x, z, 0.4); }
    padd(B, GEO.box, 0x5a4a3a, P, 0, 3, 0, 4.4, 0.18, 0.18, 0, 0.78); padd(B, GEO.box, 0x5a4a3a, P, 0, 3, 0, 4.4, 0.18, 0.18, 0, -0.78);
    padd(B, GEO.cyl, 0x7a6a56, P, 0, 11, 0, 3, 4, 3); padd(B, GEO.cone, 0x4a3a30, P, 0, 14, 0, 3.3, 2, 3.3); for (let i = 0; i < 3; i++) padd(B, GEO.cyl, 0x3a3a3a, P, 0, 9.6 + i * 1.3, 0, 3.04, 0.12, 3.04);
  },
  sawmill(B, P, G) {
    const W = 22, D = 14, H = 6;
    padd(B, GEO.box, 0x5a4a3a, P, 0, H / 2, -D / 2 + 0.3, W, H, 0.6);
    padd(B, GEO.box, 0x5a4a3a, P, -W / 2 + 0.3, H / 2, 0, 0.6, H, D);
    for (let x = -W / 2 + 0.3; x <= W / 2; x += 5.4) padd(B, GEO.box, 0x4a3a2a, P, x, H / 2, D / 2 - 0.3, 0.4, H, 0.4);
    padd(B, GEO.box, 0x3d3a36, P, 0, H + 0.2, 0, W + 1.2, 0.3, D + 1.2, 0.08);
    padd(B, GEO.box, 0x6a5a48, P, 0, 0.9, 0, 12, 0.3, 2.2); for (const lx of [-5.6, -1.8, 1.8, 5.6]) for (const lz of [-0.9, 0.9]) padd(B, GEO.box, 0x4a3a2a, P, lx, 0.4, lz, 0.22, 0.8, 0.22); padd(B, GEO.cyl, 0xa0a4a8, P, 0, 1.8, 0, 1.4, 0.06, 1.4, Math.PI / 2, 0, 0);
    padd(B, GEO.cyl, 0x7a5a3a, P, -3, 1.45, 0, 0.6, 7, 0.6, 0, 0, Math.PI / 2);
    pbox(P, 0, -D / 2 + 0.3, W / 2, 0.4); pbox(P, -W / 2 + 0.3, 0, 0.4, D / 2); pbox(P, 0, 0, 6, 1.1, false);
    padd(L.sky.night ? G : B, GEO.box, 0xffcf80, P, 0, H - 0.4, 0, 2, 0.25, 0.25); for (const lx of [-0.8, 0.8]) padd(B, GEO.box, 0x2a2a2a, P, lx, H - 0.1, 0, 0.04, 0.4, 0.04);
  },
  logs(B, P) { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) padd(B, GEO.cyl, pick([0x6a4a2a, 0x7a5a36, 0x5e4026]), P, 0, 0.5 + r * 0.85, (i - (3 - r) / 2) * 1.0, 0.5, 8, 0.5, 0, 0, Math.PI / 2); pbox(P, 0, 0, 4, 2.2, false); },
  lamp(B, P, G) { if (L.town) { const [hx, hz] = rotXZ(P, 1.0, 0); LAMPS.push({ x: hx, z: hz, y: P.y + 5.6 }); } padd(B, GEO.cyl8, 0x3a3a3a, P, 0, 3, 0, 0.1, 6, 0.1); padd(B, GEO.box, 0x3a3a3a, P, 0.5, 6, 0, 1.2, 0.1, 0.1); padd(L.sky.night || L.id === 2 ? G : B, GEO.cone, 0xfff3c8, P, 1.0, 5.85, 0, 0.3, 0.3, 0.3, Math.PI); pcirc(P, 0, 0, 0.25); },
  // ----- village -----
  house(B, P, G) {
    const W = 10, D = 8, H = 3.6, th = 0.35, gap = 3.2, seg = (W - gap) / 2;
    const wall = pick([0xd8cdb2, 0xcab79a, 0xe0d6c4, 0xb9a487, 0xc9b9a8, 0xa9b0a0]), roof = pick([0x6a3426, 0x4a3a34, 0x5a2a22, 0x3c4048, 0x6e4a2e]), trim = 0x5a4632;
    padd(B, GEO.box, 0x6d6457, P, 0, 0.12, 0, W + 0.3, 0.3, D + 0.3);
    padd(B, GEO.box, 0x6a5038, P, 0, 0.3, 0, W - th * 2, 0.06, D - th * 2);
    padd(B, GEO.box, 0x7a3a2e, P, 0, 0.34, -0.5, 3.6, 0.03, 2.4);
    padd(B, GEO.box, wall, P, 0, H / 2, -D / 2 + th / 2, W, H, th);
    for (const s of [-1, 1]) { padd(B, GEO.box, wall, P, s * (W / 2 - th / 2), H / 2, 0, th, H, D); padd(B, GEO.box, wall, P, s * (gap / 2 + seg / 2), H / 2, D / 2 - th / 2, seg, H, th); }
    padd(B, GEO.box, wall, P, 0, H - 0.4, D / 2 - th / 2, gap, 0.8, th);
    for (const s of [-1, 1]) padd(B, GEO.box, trim, P, s * (gap / 2 + 0.08), (H - 0.8) / 2, D / 2 + 0.02, 0.16, H - 0.8, 0.1);
    padd(B, GEO.prism, roof, P, 0, H + 0.5 * 2.2, 0, W + 1.0, 2.2, (D / 2 + 0.7) / 0.866);
    padd(B, GEO.box, 0x6a5a4c, P, W / 2 - 2, H + 2.2, -1.2, 0.8, 2.2, 0.8);
    const winC = L.sky.night ? 0xffc46a : 0x24323c, wg = L.sky.night ? G : B;
    for (const s of [-1, 1]) { padd(wg, GEO.box, winC, P, s * 3.3, 2.1, D / 2 + 0.03, 1.4, 1.1, 0.06); padd(B, GEO.box, 0xf1ece0, P, s * 3.3, 2.1, D / 2 + 0.01, 1.6, 1.3, 0.04); padd(wg, GEO.box, winC, P, s * (W / 2 + 0.03), 2.1, -1.5, 0.06, 1.1, 1.4); }
    padd(wg, GEO.box, winC, P, 0, 2.1, -D / 2 - 0.03, 1.4, 1.1, 0.06);
    pbox(P, 0, -D / 2 + th / 2, W / 2, th / 2); for (const s of [-1, 1]) { pbox(P, s * (W / 2 - th / 2), 0, th / 2, D / 2); pbox(P, s * (gap / 2 + seg / 2), D / 2 - th / 2, seg / 2, th / 2); }
    const c = [rotXZ(P, -(W / 2 - th), -(D / 2 - th)), rotXZ(P, W / 2 - th, D / 2 - th)];
    const door = rotXZ(P, 0, D / 2 - th / 2), out = rotXZ(P, 0, D / 2 + 2.6), inn = rotXZ(P, 0, D / 2 - 2.4);
    HOUSES.push({ x0: Math.min(c[0][0], c[1][0]), x1: Math.max(c[0][0], c[1][0]), z0: Math.min(c[0][1], c[1][1]), z1: Math.max(c[0][1], c[1][1]), door: { x: door[0], z: door[1] }, out: { x: out[0], z: out[1] }, inn: { x: inn[0], z: inn[1] } });
  },
  shop(B, P, G) {
    const W = 12, D = 9, H = 5.2, col = P.col || 0x6a4a3a;
    padd(B, GEO.box, 0x6d6457, P, 0, 0.15, 0, W + 0.4, 0.3, D + 0.4);
    padd(B, GEO.box, 0xd2c6ac, P, 0, H / 2, 0, W, H, D); padd(B, GEO.box, col, P, 0, 1.6, D / 2 + 0.03, W, 3.2, 0.06);
    padd(B, GEO.box, 0x4a3a30, P, 0, H + 0.35, 0, W + 0.6, 0.7, D + 0.6);
    for (let i = -5; i <= 5; i++) padd(B, GEO.box, i % 2 ? 0xe8e0cc : col, P, i * 1.1, 3.5, D / 2 + 0.9, 1.1, 0.08, 1.8, -0.35);
    const winC = L.sky.night ? 0xffd28a : 0x24323c, wg = L.sky.night ? G : B;
    for (const s of [-1, 1]) padd(wg, GEO.box, winC, P, s * 3.2, 1.7, D / 2 + 0.07, 3.2, 1.8, 0.05);
    padd(B, GEO.box, 0x2a1e18, P, 0, 1.25, D / 2 + 0.07, 1.4, 2.5, 0.06);
    if (P.sign) placeSign(P, P.sign, 0, 4.4, D / 2 + 0.06, 7, 1.0, '#1e1a16', '#f0d890');
    pbox(P, 0, 0, W / 2, D / 2);
  },
  police(B, P, G) {
    const W = 16, D = 10, H = 5.4;
    padd(B, GEO.box, 0x5a5a58, P, 0, 0.2, 0, W + 0.6, 0.4, D + 0.6);
    padd(B, GEO.box, 0x8a5a44, P, 0, H / 2, 0, W, H, D); padd(B, GEO.box, 0x3a3e46, P, 0, H + 0.3, 0, W + 0.5, 0.6, D + 0.5);
    padd(B, GEO.box, 0x1e2838, P, 0, 1.3, D / 2 + 0.04, 1.8, 2.6, 0.06); padd(B, GEO.box, 0xe6e0d0, P, 0, 2.75, D / 2 + 0.3, 3, 0.15, 0.7);
    padd(L.sky.night ? G : B, GEO.box, 0x6ab0ff, P, 0, 3.4, D / 2 + 0.35, 0.5, 0.5, 0.5);
    const winC = L.sky.night ? 0xfff0c8 : 0x24323c, wg = L.sky.night ? G : B;
    for (const x of [-6, -3.2, 3.2, 6]) { padd(wg, GEO.box, winC, P, x, 2.2, D / 2 + 0.04, 1.4, 1.4, 0.05); padd(wg, GEO.box, winC, P, x, 4.2, D / 2 + 0.04, 1.4, 1.0, 0.05); }
    placeSign(P, 'POLICE', 0, 4.4, D / 2 + 0.06, 4.4, 0.9, '#16243c', '#e8eef8');
    pbox(P, 0, 0, W / 2, D / 2);
  },
  station(B, P, G) {
    const W = 18, D = 7, H = 4.4;
    padd(B, GEO.box, 0x6d6457, P, 0, 0.2, 0, W + 0.4, 0.4, D + 0.4);
    padd(B, GEO.box, 0xc8b48c, P, 0, H / 2, 0, W, H, D); padd(B, GEO.prism, 0x4a3a34, P, 0, H + 0.5 * 1.8, 0, W + 0.8, 1.8, (D / 2 + 0.5) / 0.866);
    const winC = L.sky.night ? 0xffd28a : 0x24323c, wg = L.sky.night ? G : B;
    for (const x of [-6, -2, 2, 6]) padd(wg, GEO.box, winC, P, x, 2, D / 2 + 0.04, 1.6, 1.8, 0.05);
    padd(B, GEO.box, 0x4a3a2c, P, 0, H - 0.1, D / 2 + 3.4, W + 6, 0.18, 6.4, 0.08);
    for (const x of [-11, -5.5, 0, 5.5, 11]) { padd(B, GEO.cyl8, 0x2e3a2e, P, x, (H - 0.2) / 2, D / 2 + 6, 0.12, H - 0.2, 0.12); pcirc(P, x, D / 2 + 6, 0.25); }
    padd(B, GEO.box, 0xe8e2d0, P, 0, H + 0.9, D / 2 + 0.3, 1.2, 1.2, 0.2); padd(B, GEO.box, 0x222222, P, 0, H + 0.9, D / 2 + 0.42, 0.06, 0.45, 0.02);
    placeSign(P, 'MILLBROOK JUNCTION', 0, H - 0.75, D / 2 + 6.35, 7, 0.8, '#1e2a20', '#f0e6c0');
    pbox(P, 0, 0, W / 2, D / 2);
  },
  church(B, P, G) {
    const W = 10, D = 16, H = 6.5;
    padd(B, GEO.box, 0x9a968c, P, 0, H / 2, 0, W, H, D); padd(B, GEO.prism, 0x3c3c44, P, 0, H + 0.5 * 3.4, 0, D + 0.6, 3.4, (W / 2 + 0.6) / 0.866, 0, Math.PI / 2);
    padd(B, GEO.box, 0x8e8a80, P, 0, 7, D / 2 + 1.6, 4.2, 14, 3.4); padd(B, GEO.cone, 0x3c3c44, P, 0, 14 + 3, D / 2 + 1.6, 3.0, 6, 3.0);
    const winC = L.sky.night ? 0xffb860 : 0x2a3848, wg = L.sky.night ? G : B;
    for (const s of [-1, 1]) for (const z of [-5, -1.5, 2, 5.5]) padd(wg, GEO.box, winC, P, s * (W / 2 + 0.03), 3.4, z, 0.06, 2.6, 1.0);
    padd(wg, GEO.box, winC, P, 0, 10.5, D / 2 + 3.32, 1.2, 1.6, 0.06); padd(B, GEO.box, 0x3a2a22, P, 0, 1.4, D / 2 + 3.32, 1.6, 2.8, 0.06);
    pbox(P, 0, 0, W / 2, D / 2); pbox(P, 0, D / 2 + 1.6, 2.1, 1.7);
  },
  stall(B, P, G) {
    const col = pick([0xb8322a, 0x2e6a8a, 0x3a7a3a, 0xc88a2a]);
    for (const x of [-1.8, 1.8]) for (const z of [-0.9, 1.3]) padd(B, GEO.box, 0x5a4632, P, x, 1.3, z, 0.12, 2.6, 0.12);
    padd(B, GEO.box, 0x7a5e40, P, 0, 0.5, -0.2, 3.6, 1.0, 1.2); padd(B, GEO.box, 0x9a7a54, P, 0, 1.02, -0.2, 3.8, 0.06, 1.4);
    for (let i = 0; i < 6; i++) padd(B, GEO.box, i % 2 ? 0xeee6d4 : col, P, -1.75 + i * 0.7, 2.75, 0.25, 0.7, 0.06, 2.8, -0.22);
    padd(B, GEO.box, 0x4a3a2a, P, 0, 2.52, 1.3, 3.8, 0.08, 0.08);
    for (let i = 0; i < 3; i++) padd(B, GEO.sph, pick([0x8e3b22, 0xa04a30, 0xd8c08a]), P, -1 + i, 1.15, -0.3, 0.22, 0.16, 0.2);
    pbox(P, 0, -0.2, 1.9, 0.7, false);
    for (const x of [-0.9, 0.9]) { const [wx, wz] = rotXZ(P, x, 1.3); FOOD_SLOTS.push({ x: wx, z: wz, tx: wx, tz: wz, top: P.y + 2.62, bunch: null }); }
  },
  rack(B, P) {
    for (const x of [-2, 2]) { padd(B, GEO.box, 0x4a3a2a, P, x, 1.5, 0, 0.14, 3, 0.14); pcirc(P, x, 0, 0.2); }
    padd(B, GEO.box, 0x4a3a2a, P, 0, 2.95, 0, 4.3, 0.12, 0.12); padd(B, GEO.prism, 0x5a4a3a, P, 0, 3.3, 0, 4.8, 0.5, 0.7);
    for (const x of [-1.2, 0, 1.2]) { const [wx, wz] = rotXZ(P, x, 0); FOOD_SLOTS.push({ x: wx, z: wz, tx: wx, tz: wz, top: P.y + 3.05, bunch: null }); }
  },
  cart(B, P) {
    padd(B, GEO.box, 0xb8322a, P, 0, 1.1, 0, 2.4, 0.9, 1.3); padd(B, GEO.box, 0xe8d8a8, P, 0, 1.6, 0, 2.5, 0.08, 1.4);
    for (const s of [-1, 1]) padd(B, GEO.cyl, 0x2a2a2a, P, s * 0.7, 0.5, 0.7, 0.5, 0.08, 0.5, Math.PI / 2, 0, 0);
    for (const x of [-1.1, 1.1]) padd(B, GEO.box, 0x5a4632, P, x, 2.2, 0, 0.08, 2.2, 0.08); padd(B, GEO.box, 0xe8d8a8, P, 0, 3.3, 0, 2.8, 0.06, 1.8);
    pcirc(P, 0, 0, 1.3);
    for (const x of [-0.6, 0.6]) { const [wx, wz] = rotXZ(P, x, 0.75); FOOD_SLOTS.push({ x: wx, z: wz, tx: wx, tz: wz, top: P.y + 3.4, bunch: null }); }
  },
  fountain(B, P) {
    padd(B, GEO.cyl, 0x8a8478, P, 0, 0.4, 0, 2.6, 0.8, 2.6); padd(B, GEO.cyl, 0x2a4a58, P, 0, 0.78, 0, 2.3, 0.04, 2.3);
    padd(B, GEO.cyl8, 0x9a948a, P, 0, 1.6, 0, 0.3, 1.8, 0.3); padd(B, GEO.cyl, 0x8a8478, P, 0, 2.5, 0, 1.0, 0.2, 1.0);
    pcirc(P, 0, 0, 2.7);
  },
  fence(B, P) {
    const dx = P.x1 - P.x0, dz = P.z1 - P.z0, len = Math.hypot(dx, dz), n = Math.ceil(len / 3), a = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) { const x = P.x0 + dx * i / n, z = P.z0 + dz * i / n, y = groundH(x, z); B.add(GEO.box, 0x6b5636, M(x, y + 0.6, z, 0, a, 0, 0.16, 1.4, 0.16)); }
    for (let i = 0; i < n; i++) { const x = P.x0 + dx * (i + 0.5) / n, z = P.z0 + dz * (i + 0.5) / n, y = groundH(x, z); for (const h of [0.55, 1.05]) B.add(GEO.box, 0x7a6442, M(x, y + h, z, 0, a, 0, 0.08, 0.14, len / n + 0.2)); }
  }
};

// railway along the north edge of the village, with a trestle bridge over the river
function buildRail() {
  const B = new Builder(), z0 = L.captive.z, y = L.base + 0.08;
  for (let x = -WORLD - 40; x < WORLD + 40; x += 1.1) B.add(GEO.box, 0x3e3026, M(x, y, z0, 0, 0, 0, 0.32, 0.16, 2.8));
  for (const s of [-0.72, 0.72]) B.add(GEO.box, 0x8a8a8a, M(0, y + 0.16, z0 + s, 0, 0, 0, 2 * WORLD + 80, 0.14, 0.1));
  for (let x = -WORLD - 10; x < WORLD + 10; x += 4) { const g = groundH(x, z0); if (g > y - 0.6) continue; for (const s of [-1.3, 1.3]) B.add(GEO.box, 0x4a3a2a, M(x, (g + y) / 2 - 0.3, z0 + s, 0, 0, 0, 0.35, y - g + 0.6, 0.35)); B.add(GEO.box, 0x4a3a2a, M(x, y - 0.25, z0, 0, 0, 0, 0.3, 0.3, 3.2)); }
  worldRoot.add(B.mesh(propMat));
}

const MTN_GEO = (() => { const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 0.75 + fbm(x * 2 + 5, z * 2 + y) * 0.6; y = Math.max(0, y) * n; p.setXYZ(i, x * (0.9 + n * 0.15), y, z * (0.9 + n * 0.15)); } g.computeVertexNormals(); g.userData.keep = true; return g; })();
// ---------- build level ----------
const TREE_MESH = { trunks: null, leaves: null };
function disposeTree(o) { o.traverse(c => { if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose(); }); }
function clearWorld() {
  for (const c of [...worldRoot.children]) { worldRoot.remove(c); disposeTree(c); }
  COL.reset(); TREES = []; HOUSES = []; FOOD_SLOTS = []; LAMPS = []; PT.clear();
}
[leafGeo, trunkGeo, bladeGeo, reedGeo, bunchGeo].forEach(g => g.userData.keep = true);
Object.values(GEO).forEach(g => g.userData.keep = true);

function buildWorld(level) {
  L = level; clearWorld(); srand(level.seed * 977);
  // flat pads
  FLAT = [];
  for (const p of L.props) { const pad = PROP_PADS[p.t]; if (!pad) continue; const sw = Math.abs(Math.sin(p.ry || 0)) > 0.5; FLAT.push({ x: p.x, z: p.z, hx: sw ? pad[1] : pad[0], hz: sw ? pad[0] : pad[1], h: 0 }); }
  const cp = L.captive; FLAT.push({ x: cp.x, z: cp.z, hx: 11, hz: 11, h: 0 });
  const STREET_COL = { stone: 0x5c5850, gravel: 0x3a352f };
  for (const f of L.streets || []) FLAT.push({ x: (f.x0 + f.x1) / 2, z: (f.z0 + f.z1) / 2, hx: (f.x1 - f.x0) / 2, hz: (f.z1 - f.z0) / 2, h: 0, col: new THREE.Color(STREET_COL[f.k] || 0x47443e) });
  FLAT.forEach(f => { f.h = 0; const prev = FLAT; FLAT = []; f.h = rawGround(f.x, f.z); FLAT = prev; f.h = Math.max(f.h, 1.0); if (L.town) f.h = L.base; });
  const S = 2 * WORLD + 160;
  // sky & lights
  const sk = L.sky; skyMat.uniforms.top.value.set(sk.top); skyMat.uniforms.hor.value.set(sk.hor); skyMat.uniforms.sunDir.value.set(...sk.sun).normalize();
  skyMat.uniforms.sunCol.value.set(sk.sunCol); skyMat.uniforms.cloudCol.value.set(sk.cloudCol); skyMat.uniforms.cloud.value = sk.cloud; skyMat.uniforms.night.value = sk.night;
  scene.fog = new THREE.FogExp2(sk.fog, sk.fogD);
  hemi.color.set(sk.hemiSky); hemi.groundColor.set(sk.hemiGround); hemi.intensity = sk.hemiInt; hemi.userData.base = sk.hemiInt;
  sun.color.set(sk.sunCol); sun.intensity = sk.sunInt;
  compMat.uniforms.gain.value.set(...sk.gain); compMat.uniforms.lift.value.set(...sk.lift); compMat.uniforms.expo.value = sk.expo;
  // ground
  const segs = RQ.quality === 'low' ? 150 : RQ.quality === 'high' ? 230 : 300;
  const gg = new THREE.PlaneGeometry(S, S, segs, segs); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, colA = new Float32Array(pos.count * 3);
  const g1 = new THREE.Color(sk.grass[0]), g2 = new THREE.Color(sk.grass[1]), mud = new THREE.Color(sk.mud), soil = new THREE.Color(sk.mud).multiplyScalar(0.85), dirt = new THREE.Color(0x7d6a4a), tmp = new THREE.Color(), wet = new THREE.Color(0x2e2a20);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); let h = groundH(x, z);
    const wd = waterDist(x, z), out = Math.max(Math.abs(x), Math.abs(z)) - WORLD;
    if (out > 0 && wd > 20) h += Math.min(out, 45) * 0.32 + fbm(x * 0.05, z * 0.05) * Math.min(out, 20) * 0.4;
    pos.setY(i, h);
    tmp.copy(g1).lerp(g2, fbm(x * 0.05, z * 0.05));
    tmp.lerp(dirt, smooth((fbm(x * 0.09 + 40, z * 0.09) - 0.55) * 4) * 0.5);
    if (inField(x, z, 1.5)) tmp.lerp(soil, 0.45 + fbm(x * 0.3, z * 0.3) * 0.25);
    for (const f of FLAT) { const d = Math.max(Math.abs(x - f.x) - f.hx, Math.abs(z - f.z) - f.hz); if (f.col) { if (d < 0.8) tmp.lerp(f.col, smooth((0.8 - d) / 1.6) * 0.9); } else if (d < 2.5) tmp.lerp(dirt, smooth(1 - d / 2.5) * 0.7); }
    if (wd < 22) tmp.lerp(mud, smooth((22 - wd) / 7));
    if (h < 0.15) tmp.lerp(wet, smooth((0.15 - h) / 1.6));
    colA[i * 3] = tmp.r; colA[i * 3 + 1] = tmp.g; colA[i * 3 + 2] = tmp.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(colA, 3)); gg.computeVertexNormals();
  const gtex = TEX.ground; gtex.repeat.set(S / 4, S / 4);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: gtex, roughness: 0.96 })); ground.receiveShadow = true; worldRoot.add(ground);
  // water heightmap & plane
  const N = 256, data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = (i + 0.5) / N * S - S / 2, z = (j + 0.5) / N * S - S / 2; const h = clamp((groundH(x, z) + 12) / 24, 0, 1) * 255; const k = (j * N + i) * 4; data[k] = data[k + 1] = data[k + 2] = h; data[k + 3] = 255; }
  if (hmapTex) hmapTex.dispose();
  hmapTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); hmapTex.magFilter = THREE.LinearFilter; hmapTex.minFilter = THREE.LinearFilter; hmapTex.needsUpdate = true;
  const wu = waterMat.uniforms; wu.hMap.value = hmapTex; wu.S.value = S; wu.rain.value = sk.rain; wu.skyC.value.set(sk.hor).lerp(new THREE.Color(sk.top), 0.35); wu.sunDir.value.set(...sk.sun).normalize(); wu.sunC.value.set(sk.sunCol); wu.fogC.value.set(sk.fog); wu.fogD.value = sk.fogD; wu.night.value = sk.night;
  wu.deep.value.set(sk.night ? 0x0a1618 : 0x1d3b3a); wu.shallow.value.set(sk.night ? 0x1c2c28 : 0x52806c);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = 0; water.renderOrder = 2; worldRoot.add(water);
  // props
  const B = new Builder(), BT = new Builder(), G = new Builder();
  for (const p of L.props) { const P = Object.assign({ ry: 0 }, p); if (p.t !== 'fence') P.y = groundH(p.x, p.z); else P.y = 0; const fn = PROPS[p.t]; if (fn) fn(['farmhouse', 'barn', 'shed', 'outhouse', 'packing', 'sawmill', 'house', 'shop', 'station'].includes(p.t) ? BT : B, P, G); }
  worldRoot.add(B.mesh(propMat)); worldRoot.add(BT.mesh(propMatTex)); worldRoot.add(G.mesh(glowMat, false));
  if (L.town) buildRail();
  // banana trees
  for (const f of L.fields) {
    for (let x = f.x0 + 2.5; x < f.x1 - 1; x += 6.2) for (let z = f.z0 + 2.5; z < f.z1 - 1; z += 6.2) {
      const tx = x + srange(-1.1, 1.1), tz = z + srange(-1.1, 1.1);
      if (waterDist(tx, tz) < 21) continue;
      const probe = { x: tx, z: tz }; if (COL.resolve(probe, 1.2)) continue;
      TREES.push({ x: tx, z: tz, h: srange(3.4, 4.8), lean: srange(-0.08, 0.08), la: srange(0, TAU), y: groundH(tx, tz), bunch: null });
    }
  }
  for (let i = 0; i < 26; i++) { // scattered wild banana trees
    const tx = srange(-WORLD + 8, WORLD - 8), tz = srange(-WORLD + 8, WORLD - 8);
    if (waterDist(tx, tz) < 22 || inField(tx, tz, 4) || onStreet(tx, tz, 4) || indoorOf(tx, tz, 3) || Math.hypot(tx - cp.x, tz - cp.z) < 18) continue;
    const probe = { x: tx, z: tz }; if (COL.resolve(probe, 3)) continue;
    TREES.push({ x: tx, z: tz, h: srange(3.6, 5.2), lean: srange(-0.1, 0.1), la: srange(0, TAU), y: groundH(tx, tz), bunch: null });
  }
  // in the village the trees are only scenery and the food hangs on the market stalls
  const PLANT = TREES; if (L.food === 'meat') TREES = FOOD_SLOTS;
  PLANT.forEach(t => COL.addCircle(t.x, t.z, 0.42));
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ map: TEX.bark, roughness: 0.9 }), Math.max(1, PLANT.length));
  const LPT = 8, leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ map: TEX.leaf, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }), Math.max(1, PLANT.length) * LPT);
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: TEX.leaf, alphaTest: 0.45 });
  const o = new THREE.Object3D(), lc = new THREE.Color();
  trunks.count = PLANT.length; leaves.count = PLANT.length * LPT;
  PLANT.forEach((t, i) => {
    o.position.set(t.x, t.y - 0.2, t.z); o.rotation.set(t.lean * Math.cos(t.la), 0, t.lean * Math.sin(t.la)); o.scale.set(1, t.h, 1); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix);
    const topX = t.x + Math.sin(t.lean * Math.sin(t.la)) * -t.h, topZ = t.z + Math.sin(t.lean * Math.cos(t.la)) * t.h; t.tx = topX; t.tz = topZ; t.top = t.y - 0.2 + t.h;
    for (let k = 0; k < LPT; k++) {
      o.position.set(topX, t.top - 0.05, topZ); o.rotation.set(-srange(0.15, 0.75), k / LPT * TAU + srange(-0.3, 0.3), srange(-0.25, 0.25), 'YXZ'); const s = srange(0.75, 1.15); o.scale.set(s, s, s); o.updateMatrix();
      leaves.setMatrixAt(i * LPT + k, o.matrix); lc.setHSL(srange(0.22, 0.29), srange(0.35, 0.6), srange(0.28, 0.42) * (sk.night ? 0.8 : 1)); if (srnd() < 0.12) lc.setHSL(0.11, 0.45, 0.32); leaves.setColorAt(i * LPT + k, lc);
    }
  });
  trunks.castShadow = leaves.castShadow = true; trunks.receiveShadow = leaves.receiveShadow = true; worldRoot.add(trunks, leaves);
  // grass
  const gcount = RQ.quality === 'low' ? 2500 : RQ.quality === 'high' ? 9000 : 16000;
  const grass = new THREE.InstancedMesh(bladeGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), gcount); let gi = 0; const gcol = new THREE.Color();
  for (let tries = 0; tries < gcount * 3 && gi < gcount; tries++) {
    const x = srange(-WORLD - 20, WORLD + 20), z = srange(-WORLD - 20, WORLD + 20), h = groundH(x, z); if (h < 0.25) continue;
    let bad = false; for (const f of FLAT) if (Math.abs(x - f.x) < f.hx && Math.abs(z - f.z) < f.hz) { bad = true; break; } if (bad) continue;
    o.position.set(x, h - 0.03, z); o.rotation.set(0, srange(0, TAU), 0); const s = srange(0.7, 1.5); o.scale.set(s, s * srange(0.8, 1.4), s); o.updateMatrix(); grass.setMatrixAt(gi, o.matrix);
    gcol.copy(g1).lerp(g2, srnd()).multiplyScalar(srange(0.85, 1.25)); grass.setColorAt(gi, gcol); gi++;
  }
  grass.count = gi; grass.receiveShadow = true; worldRoot.add(grass);
  // reeds and lily pads
  const reeds = new THREE.InstancedMesh(reedGeo, new THREE.MeshLambertMaterial({ color: sk.night ? 0x3c4a2c : 0x6f7f3c }), 1400); let ri = 0;
  const lilies = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 10, 0.3, TAU - 0.6), new THREE.MeshLambertMaterial({ color: 0x4d7a32, side: THREE.DoubleSide }), 240); let li = 0;
  for (let tries = 0; tries < 30000 && (ri < 1400 || li < 240); tries++) {
    const x = srange(-WORLD - 10, WORLD + 10), z = srange(-WORLD - 10, WORLD + 10), wd = waterDist(x, z);
    if (wd > 11.5 && wd < 15.5 && ri < 1400) { const h = groundH(x, z); o.position.set(x, h - 0.1, z); o.rotation.set(srange(-0.2, 0.2), 0, srange(-0.2, 0.2)); const s = srange(0.6, 1.3); o.scale.set(s, s, s); o.updateMatrix(); reeds.setMatrixAt(ri++, o.matrix); }
    else if (wd > 6 && wd < 11 && li < 240 && srnd() < 0.2) { o.position.set(x, 0.02, z); o.rotation.set(-Math.PI / 2, 0, srange(0, TAU)); o.scale.set(1, 1, 1); const s = srange(0.6, 1.2); o.scale.setScalar(s); o.updateMatrix(); lilies.setMatrixAt(li++, o.matrix); }
  }
  reeds.count = ri; lilies.count = li; worldRoot.add(reeds, lilies);
  // rocks
  const rocks = new THREE.InstancedMesh(GEO.dode, new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 0.95, flatShading: true }), 110); let rk = 0;
  for (let tries = 0; tries < 2000 && rk < 110; tries++) {
    const x = srange(-WORLD, WORLD), z = srange(-WORLD, WORLD), wd = waterDist(x, z); if (inField(x, z, 2) || onStreet(x, z, 2) || indoorOf(x, z, 2)) continue;
    if (wd < 9 || (wd > 30 && srnd() < 0.7)) continue;
    const sp = waterPoint(L.start); if (Math.hypot(x - sp.x, z - sp.z) < 12 || Math.hypot(x - L.captive.x, z - L.captive.z) < 14) continue;
    const s = srange(0.3, wd < 22 ? 1.4 : 0.8); const probe = { x, z }; if (COL.resolve(probe, s + 1)) continue;
    let gmn = groundH(x, z); for (let k = 0; k < 6; k++) gmn = Math.min(gmn, groundH(x + Math.cos(k) * s * 1.2, z + Math.sin(k) * s * 1.2)); o.position.set(x, gmn + s * 0.08, z); o.rotation.set(srange(0, 3), srange(0, 3), 0); o.scale.set(s * srange(0.9, 1.5), s * srange(0.6, 1), s); o.updateMatrix(); rocks.setMatrixAt(rk++, o.matrix);
    if (s > 0.8) COL.addCircle(x, z, s * 0.9);
  }
  rocks.count = rk; rocks.castShadow = rocks.receiveShadow = true; worldRoot.add(rocks);
  // boundary jungle and mountains
  const jt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.5, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x4a3f2c, roughness: 1 }), 420);
  const jc = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: sk.night ? 0x1f2c1c : 0x3b5426, roughness: 1, flatShading: true }), 1260); let ji = 0, jci = 0;
  for (let tries = 0; tries < 6000 && ji < 420; tries++) {
    const a = srange(0, TAU), r = srange(WORLD + 6, WORLD + 55); const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.max(Math.abs(x), Math.abs(z)) < WORLD + 5 || waterDist(x, z) < 22) continue;
    const out = Math.max(Math.abs(x), Math.abs(z)) - WORLD; const y = groundH(x, z) + Math.min(out, 45) * 0.32 + fbm(x * 0.05, z * 0.05) * Math.min(out, 20) * 0.4; const h = srange(7, 15);
    o.position.set(x, y - 0.5, z); o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); jt.setMatrixAt(ji++, o.matrix);
    for (let k = 0; k < 3; k++) { const s = srange(2.6, 4.6); o.position.set(x + srange(-2, 2), y + h - 0.5 + srange(-1, 2.5), z + srange(-2, 2)); o.scale.set(s, s * 0.8, s); o.rotation.set(srange(0, 3), srange(0, 3), 0); o.updateMatrix(); jc.setMatrixAt(jci, o.matrix); lc.setHSL(srange(0.2, 0.3), 0.4, srange(0.16, 0.26) * (sk.night ? 0.7 : 1)); jc.setColorAt(jci++, lc); }
  }
  jt.count = ji; jc.count = jci; jt.castShadow = jc.castShadow = true; worldRoot.add(jt, jc);
  const mB = new Builder(); const mc = new THREE.Color(sk.night ? 0x141a20 : 0x56604e);
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + srange(-0.05, 0.05), r = srange(330, 430), h = srange(45, 110), w = srange(70, 120); mB.add(MTN_GEO, mc.clone().offsetHSL(0, 0, srange(-0.04, 0.05)).getHex(), M(Math.cos(a) * r, -6, Math.sin(a) * r, 0, srange(0, 6), 0, w, h, w * srange(0.7, 1.1))); }
  const mtn = mB.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }), false); mtn.receiveShadow = false; worldRoot.add(mtn);
  setShadowRes();
}
