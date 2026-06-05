// Procedural 3D character & prop models for Hippo Heist.
// Each builder returns a THREE.Group. Animatable sub-parts are stored on
// group.userData.parts so the renderer can drive walk/idle animations.
// Models are authored in "world units" (1 unit ~ 10 game pixels; see Render.S).
const Models = {
    mat(color, opts = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness ?? 0.85,
            metalness: opts.metalness ?? 0.0,
            map: opts.map || null,
            emissive: opts.emissive || 0x000000,
            emissiveIntensity: opts.emissiveIntensity ?? 1,
            flatShading: opts.flat || false,
            transparent: opts.transparent || false,
            opacity: opts.opacity ?? 1
        });
    },

    // Rounded box via slightly beveled BoxGeometry (cheap + soft look)
    box(w, h, d, mat) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    },
    sphere(r, mat, wseg = 16, hseg = 12) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, wseg, hseg), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    },
    cyl(rt, rb, h, mat, seg = 14) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    },
    cone(r, h, mat, seg = 14) {
        const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    },

    // ---------------- HIPPO (player) ----------------
    hippo() {
        const g = new THREE.Group();
        const parts = {};
        const skin = this.mat(0x6f7bd6, { roughness: 0.65 });
        const skinDark = this.mat(0x4d5aae, { roughness: 0.65 });
        const belly = this.mat(0x95a0e4, { roughness: 0.55 });

        // Body
        const body = this.sphere(1.9, skin, 20, 16);
        body.scale.set(1.5, 1.0, 1.15);
        body.position.y = 1.5;
        g.add(body);

        const bellyM = this.sphere(1.55, belly, 18, 14);
        bellyM.scale.set(1.35, 0.7, 1.0);
        bellyM.position.set(0, 1.0, 0.2);
        g.add(bellyM);

        // Head group (front is +Z)
        const head = new THREE.Group();
        head.position.set(0, 1.7, 2.0);
        const skull = this.sphere(1.35, skin, 18, 14);
        skull.scale.set(1.1, 0.95, 1.0);
        head.add(skull);
        // snout / muzzle
        const muzzle = this.sphere(1.15, skin, 16, 12);
        muzzle.scale.set(1.15, 0.8, 0.9);
        muzzle.position.set(0, -0.45, 0.95);
        head.add(muzzle);
        // jaw (animatable for chomp)
        const jaw = new THREE.Group();
        jaw.position.set(0, -0.7, 0.6);
        const jawMesh = this.sphere(1.0, skinDark, 14, 10);
        jawMesh.scale.set(1.1, 0.45, 0.85);
        jawMesh.position.set(0, -0.15, 0.5);
        jaw.add(jawMesh);
        head.add(jaw);
        parts.jaw = jaw;
        // nostrils
        const nostrilMat = this.mat(0x4a548f);
        for (const sx of [-0.45, 0.45]) {
            const n = this.sphere(0.16, nostrilMat, 8, 6);
            n.position.set(sx, -0.1, 1.85);
            head.add(n);
        }
        // eyes
        const eyeW = this.mat(0xffffff, { roughness: 0.2 });
        const eyeB = this.mat(0x10131a, { roughness: 0.1 });
        parts.eyes = [];
        for (const sx of [-0.7, 0.7]) {
            const e = new THREE.Group();
            e.position.set(sx, 0.85, 0.55);
            const w = this.sphere(0.38, eyeW, 12, 10); e.add(w);
            const p = this.sphere(0.2, eyeB, 10, 8); p.position.z = 0.26; e.add(p);
            head.add(e);
            parts.eyes.push(e);
        }
        // ears
        const earMat = skinDark;
        for (const sx of [-0.95, 0.95]) {
            const ear = this.sphere(0.42, earMat, 10, 8);
            ear.scale.set(1, 1.2, 0.6);
            ear.position.set(sx, 1.15, -0.2);
            head.add(ear);
            const inner = this.sphere(0.22, this.mat(0xc59be0), 8, 6);
            inner.scale.set(1, 1.2, 0.6);
            inner.position.set(sx, 1.15, -0.05);
            head.add(inner);
        }
        g.add(head);
        parts.head = head;

        // Legs (4) - animatable
        parts.legs = [];
        const legPos = [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.2], [1.0, -1.2]];
        for (const [lx, lz] of legPos) {
            const leg = new THREE.Group();
            leg.position.set(lx, 0.8, lz);
            const l = this.cyl(0.5, 0.55, 1.4, skinDark, 10);
            l.position.y = -0.5;
            leg.add(l);
            const foot = this.sphere(0.55, skinDark, 10, 8);
            foot.scale.set(1, 0.6, 1.1);
            foot.position.y = -1.15;
            leg.add(foot);
            g.add(leg);
            parts.legs.push(leg);
        }

        // tiny tail
        const tail = this.cyl(0.12, 0.2, 0.7, skinDark, 6);
        tail.position.set(0, 1.4, -2.5);
        tail.rotation.x = Math.PI / 2.4;
        g.add(tail);

        g.userData.parts = parts;
        g.userData.kind = 'hippo';
        return g;
    },

    // ---------------- LEOPARD ----------------
    leopard() {
        const g = new THREE.Group();
        const parts = {};
        const fur = this.mat(0xf0b44e, { roughness: 0.7, map: Tex.leopard() });
        const furDark = this.mat(0xd89b34, { roughness: 0.7 });
        const cream = this.mat(0xfbe9c4, { roughness: 0.6 });

        const body = this.sphere(1.5, fur, 20, 16);
        body.scale.set(1.0, 0.95, 1.9);
        body.position.y = 1.5;
        g.add(body);

        const chest = this.sphere(1.25, fur, 16, 12);
        chest.scale.set(1.0, 1.0, 1.0);
        chest.position.set(0, 1.55, 1.6);
        g.add(chest);

        // neck + head (front +Z)
        const head = new THREE.Group();
        head.position.set(0, 2.0, 2.6);
        const skull = this.sphere(1.0, fur, 16, 12);
        skull.scale.set(1.0, 0.95, 1.0);
        head.add(skull);
        const snout = this.sphere(0.6, cream, 12, 10);
        snout.scale.set(0.9, 0.75, 1.0);
        snout.position.set(0, -0.25, 0.85);
        head.add(snout);
        const nose = this.sphere(0.18, this.mat(0x3a2a20), 8, 6);
        nose.position.set(0, -0.1, 1.4);
        head.add(nose);
        // ears
        for (const sx of [-0.55, 0.55]) {
            const ear = this.cone(0.42, 0.7, furDark, 8);
            ear.position.set(sx, 0.95, -0.05);
            head.add(ear);
        }
        // eyes (green, glowing slightly)
        const eyeMat = this.mat(0x4caf50, { emissive: 0x2e7d32, emissiveIntensity: 0.6, roughness: 0.2 });
        const pupil = this.mat(0x101010);
        parts.eyes = [];
        for (const sx of [-0.42, 0.42]) {
            const e = new THREE.Group();
            e.position.set(sx, 0.18, 0.78);
            const w = this.sphere(0.26, eyeMat, 10, 8); w.scale.set(1, 1.2, 1); e.add(w);
            const p = this.sphere(0.1, pupil, 8, 6); p.position.z = 0.2; p.scale.set(0.5, 1.4, 1); e.add(p);
            head.add(e);
            parts.eyes.push(e);
        }
        g.add(head);
        parts.head = head;

        // legs
        parts.legs = [];
        const legPos = [[-0.85, 1.5], [0.85, 1.5], [-0.85, -1.3], [0.85, -1.3]];
        for (const [lx, lz] of legPos) {
            const leg = new THREE.Group();
            leg.position.set(lx, 1.0, lz);
            const l = this.cyl(0.32, 0.4, 1.6, fur, 8);
            l.position.y = -0.7;
            leg.add(l);
            const paw = this.sphere(0.4, cream, 8, 6);
            paw.scale.set(1, 0.7, 1.2);
            paw.position.y = -1.5;
            leg.add(paw);
            g.add(leg);
            parts.legs.push(leg);
        }

        // tail (animatable, multi-segment)
        const tail = new THREE.Group();
        tail.position.set(0, 1.6, -1.9);
        let prev = tail;
        parts.tailSegs = [];
        for (let i = 0; i < 4; i++) {
            const seg = new THREE.Group();
            seg.position.z = -0.7;
            const m = this.cyl(0.22 - i * 0.03, 0.26 - i * 0.03, 0.7, i === 3 ? furDark : fur, 7);
            m.rotation.x = Math.PI / 2;
            m.position.z = -0.35;
            seg.add(m);
            prev.add(seg);
            prev = seg;
            parts.tailSegs.push(seg);
        }
        g.add(tail);
        parts.tail = tail;

        g.userData.parts = parts;
        g.userData.kind = 'leopard';
        return g;
    },

    // ---------------- FARMER ----------------
    farmer() {
        const g = new THREE.Group();
        const parts = {};
        const shirt = this.mat(0xe74c3c, { roughness: 0.8 });
        const overalls = this.mat(0x2e5a86, { roughness: 0.85 });
        const skin = this.mat(0xf3c79c, { roughness: 0.7 });
        const strawY = this.mat(0xe8c659, { roughness: 0.9 });
        const wood = this.mat(0x8a6a3a, { roughness: 0.9, map: Tex.bark ? null : null });

        // torso
        const torso = this.box(1.4, 1.6, 0.9, shirt);
        torso.position.y = 2.4;
        g.add(torso);
        // overalls front
        const bib = this.box(1.0, 1.3, 0.2, overalls);
        bib.position.set(0, 2.2, 0.5);
        g.add(bib);
        // hips
        const hips = this.box(1.3, 0.7, 0.9, overalls);
        hips.position.y = 1.5;
        g.add(hips);

        // head
        const head = new THREE.Group();
        head.position.set(0, 3.6, 0);
        const face = this.sphere(0.7, skin, 14, 12);
        head.add(face);
        // eyes + angry brows (brows animatable visibility)
        const eyeB = this.mat(0x222222);
        for (const sx of [-0.28, 0.28]) {
            const e = this.sphere(0.1, eyeB, 8, 6);
            e.position.set(sx, 0.1, 0.62);
            head.add(e);
        }
        parts.brows = [];
        for (const sx of [-0.28, 0.28]) {
            const b = this.box(0.28, 0.07, 0.08, eyeB);
            b.position.set(sx, 0.28, 0.64);
            b.rotation.z = sx < 0 ? -0.4 : 0.4;
            b.visible = false;
            head.add(b);
            parts.brows.push(b);
        }
        // mustache
        const mustache = this.box(0.5, 0.12, 0.1, this.mat(0x6b4423));
        mustache.position.set(0, -0.18, 0.62);
        head.add(mustache);
        // straw hat
        const brim = this.cyl(0.95, 0.95, 0.1, strawY, 16);
        brim.position.y = 0.55;
        head.add(brim);
        const crown = this.cyl(0.5, 0.6, 0.5, strawY, 16);
        crown.position.y = 0.8;
        head.add(crown);
        const band = this.cyl(0.61, 0.61, 0.16, this.mat(0x8a3b2a), 16);
        band.position.y = 0.62;
        head.add(band);
        g.add(head);
        parts.head = head;

        // arms (animatable) - right arm holds pitchfork
        parts.arms = [];
        for (const sx of [-0.95, 0.95]) {
            const arm = new THREE.Group();
            arm.position.set(sx, 3.0, 0);
            const a = this.cyl(0.22, 0.22, 1.3, shirt, 8);
            a.position.y = -0.65;
            arm.add(a);
            const hand = this.sphere(0.25, skin, 8, 6);
            hand.position.y = -1.35;
            arm.add(hand);
            g.add(arm);
            parts.arms.push(arm);
        }
        // pitchfork in right hand
        const fork = new THREE.Group();
        const shaft = this.cyl(0.08, 0.08, 3.0, wood, 6);
        fork.add(shaft);
        const tineMat = this.mat(0xb8c0c8, { metalness: 0.6, roughness: 0.4 });
        for (const tx of [-0.25, 0, 0.25]) {
            const t = this.cyl(0.04, 0.05, 0.7, tineMat, 5);
            t.position.set(tx, 1.85, 0);
            fork.add(t);
        }
        fork.position.set(0.95, 2.6, 0.2);
        fork.rotation.x = 0.15;
        g.add(fork);
        parts.fork = fork;

        // legs (animatable)
        parts.legs = [];
        for (const sx of [-0.45, 0.45]) {
            const leg = new THREE.Group();
            leg.position.set(sx, 1.2, 0);
            const l = this.cyl(0.28, 0.3, 1.2, overalls, 8);
            l.position.y = -0.6;
            leg.add(l);
            const boot = this.box(0.5, 0.4, 0.8, this.mat(0x4a3826));
            boot.position.set(0, -1.3, 0.15);
            leg.add(boot);
            g.add(leg);
            parts.legs.push(leg);
        }

        g.userData.parts = parts;
        g.userData.kind = 'farmer';
        return g;
    },

    // ---------------- BANANA TREE ----------------
    tree(seed = 0) {
        const g = new THREE.Group();
        const parts = {};
        const barkMat = this.mat(0x8a6a3a, { roughness: 0.95, map: Tex.bark() });
        const leafMat = this.mat(0x2f9e44, { roughness: 0.8, flat: true });
        const leafMat2 = this.mat(0x3fb95a, { roughness: 0.8, flat: true });

        // curved trunk (a few stacked segments)
        const trunk = new THREE.Group();
        let y = 0, lean = (seed % 5 - 2) * 0.04;
        let node = trunk;
        for (let i = 0; i < 4; i++) {
            const seg = new THREE.Group();
            seg.position.y = i === 0 ? 0 : 1.3;
            seg.rotation.z = lean;
            const m = this.cyl(0.32 - i * 0.04, 0.4 - i * 0.04, 1.35, barkMat, 8);
            m.position.y = 0.65;
            seg.add(m);
            node.add(seg);
            node = seg;
        }
        g.add(trunk);
        const crown = new THREE.Group();
        // crown sits atop last node ~5.2 high
        node.add(crown);
        crown.position.y = 1.0;

        // big banana/palm fronds - arching UP and outward
        parts.fronds = [];
        const frondGeo = new THREE.SphereGeometry(1.0, 8, 6);
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            const frond = new THREE.Group();
            // each frond = an elongated blade tilted up at the base, drooping at the tip
            const blade = new THREE.Mesh(frondGeo, i % 2 ? leafMat2 : leafMat);
            blade.castShadow = true;
            blade.scale.set(0.55, 0.2, 2.6);   // long in local +Z
            blade.position.z = 1.7;
            frond.add(blade);
            // tip droop
            const tip = new THREE.Mesh(frondGeo, leafMat);
            tip.castShadow = true;
            tip.scale.set(0.4, 0.16, 1.2);
            tip.position.set(0, -0.5, 3.2);
            frond.add(tip);
            frond.rotation.y = a;
            frond.rotation.x = -0.7;            // lift the base upward (palm crown)
            frond.position.y = 0.6;
            crown.add(frond);
            parts.fronds.push(frond);
        }
        // central crown ball
        const tuft = this.sphere(0.9, leafMat, 12, 10);
        tuft.scale.set(1, 0.8, 1);
        tuft.position.y = 0.7;
        crown.add(tuft);

        // banana bunch (toggle via setBananas)
        const bunch = new THREE.Group();
        bunch.position.set(0, -0.3, 0.8);
        const bananaMat = this.mat(0xf1c40f, { roughness: 0.5, emissive: 0x3a3000, emissiveIntensity: 0.3 });
        for (let i = 0; i < 5; i++) {
            // curved banana = partial torus (CapsuleGeometry isn't in three r137)
            const b = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 6, 9, Math.PI * 1.2), bananaMat);
            b.castShadow = true;
            const a = (i / 5) * Math.PI * 2;
            b.position.set(Math.cos(a) * 0.45, -i * 0.06, Math.sin(a) * 0.45);
            b.rotation.z = 0.5 + Math.cos(a) * 0.3;
            b.rotation.x = Math.sin(a) * 0.3;
            bunch.add(b);
        }
        crown.add(bunch);
        parts.bunch = bunch;
        parts.crown = crown;

        g.userData.parts = parts;
        g.userData.kind = 'tree';
        return g;
    },

    setTreeBananas(treeGroup, has) {
        const p = treeGroup.userData.parts;
        if (p && p.bunch) p.bunch.visible = has;
    },

    // ---------------- CAGE ----------------
    cage() {
        const g = new THREE.Group();
        const barMat = this.mat(0x9aa3a8, { metalness: 0.7, roughness: 0.4 });
        const r = 3.2, h = 4.2, n = 10;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const bar = this.cyl(0.12, 0.12, h, barMat, 6);
            bar.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
            g.add(bar);
        }
        // rings
        for (const ry of [0.2, h / 2, h - 0.2]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 8, 24), barMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = ry;
            ring.castShadow = true;
            g.add(ring);
        }
        // top dome cap
        const cap = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, 0.1, 6, 18), barMat);
        cap.rotation.x = Math.PI / 2;
        cap.position.y = h;
        g.add(cap);
        g.userData.kind = 'cage';
        return g;
    },

    // single floating banana (carried indicator / pickup particle)
    banana(scale = 1) {
        const bananaMat = this.mat(0xf1c40f, { roughness: 0.5, emissive: 0x4a3d00, emissiveIntensity: 0.4 });
        const b = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 6, 10, Math.PI * 1.2), bananaMat);
        b.castShadow = true;
        b.scale.setScalar(scale);
        b.rotation.z = 0.6;
        return b;
    },

    // bush / rock scatter for decoration
    bush() {
        const g = new THREE.Group();
        const m = this.mat(0x2f8a3e, { roughness: 0.9, flat: true });
        for (let i = 0; i < 3; i++) {
            const s = this.sphere(0.6 + Math.random() * 0.4, m, 8, 6);
            s.position.set((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.2, (Math.random() - 0.5) * 0.8);
            g.add(s);
        }
        g.userData.kind = 'bush';
        return g;
    },

    rock() {
        const m = this.mat(0x7a7d82, { roughness: 0.95, flat: true, map: Tex.rock() });
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 0), m);
        r.castShadow = true; r.receiveShadow = true;
        r.rotation.set(Math.random(), Math.random(), Math.random());
        r.scale.y = 0.7;
        return r;
    }
};
