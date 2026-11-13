/* gl.js - the 3D luxury villa. Plain WebGL, no libraries, works offline.
   RE.house.create(canvas, options) draws a modern villa at dusk that you can drag to turn. */
(function () {
  'use strict';
  const RE = window.RE;

  /* ---------- tiny math ---------- */
  const m4 = {
    persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), nf = 1 / (n - fa); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) * nf, -1, 0, 0, 2 * fa * n * nf, 0]; },
    look(e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    },
    mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  };
  const hex = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ---------- geometry (everything baked in world space) ---------- */
  function Mesh() { this.v = []; }
  Mesh.prototype.vtx = function (p, n, c, em, mat) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], em, mat); };
  Mesh.prototype.quad = function (a, b, c, d, n, col, em, mat) {
    [a, b, c, a, c, d].forEach((p) => this.vtx(p, n, col, em, mat));
  };
  Mesh.prototype.box = function (cx, cy, cz, sx, sy, sz, color, em, mat) {
    const c = hex(color); em = em || 0; mat = mat || 0;
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], c, em, mat);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], c, em, mat);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], c, em, mat);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], c, em, mat);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], c, em, mat);
  };
  Mesh.prototype.cone = function (cx, y0, cz, r0, r1, h, seg, color, em, mat) {
    const c = hex(color), sl = (r0 - r1) / h;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const nl = Math.hypot(1, sl), n = [Math.cos(am) / nl, sl / nl, Math.sin(am) / nl];
      const p = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
      this.quad(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y0 + h), p(a0, r1, y0 + h), n, c, em || 0, mat || 0);
    }
  };
  Mesh.prototype.ell = function (cx, cy, cz, rx, ry, rz, color, em, mat) {
    const c = hex(color), LA = 6, LO = 9;
    const pt = (i, j) => { const ph = (Math.PI * i) / LA, th = (Math.PI * 2 * j) / LO; const nx = Math.sin(ph) * Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph) * Math.sin(th); return { p: [cx + rx * nx, cy + ry * ny, cz + rz * nz], n: [nx / rx, ny / ry, nz / rz].map((v, k, arr) => v / (Math.hypot(arr[0], arr[1], arr[2]) || 1)) }; };
    for (let i = 0; i < LA; i++) for (let j = 0; j < LO; j++) {
      const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
      [a, b, e, a, e, d].forEach((q) => this.vtx(q.p, q.n, c, em || 0, mat || 0));
    }
  };

  /* ---------- the villa ---------- */
  function buildScene() {
    const M = new Mesh(), P = [], R = rng(11);
    const K = { plaster: 0xe9e4da, greige: 0xcbc4b6, char: 0x2a2f3a, stone: 0x3a404c, slab: 0xb9b2a4, timber: 0xa8743f, timber2: 0x6f4527, glass: 0xffbe78, lawn: 0x2a4434, fol: 0x2c5842, fol2: 0x3a6d4f, cyp: 0x1d4230, water: 0x14738d, coping: 0xd9d3c7, amber: 0xffb561, drive: 0x4a4f5a, white: 0xf2f0ea };
    const B = (...a) => M.box(...a);
    const light = (x, y, z, c, s) => P.push(x, y, z, c[0], c[1], c[2], s);

    // ground (material 1 adds soft shadow + light spill in the shader)
    M.quad([-150, 0, 150], [150, 0, 150], [150, 0, -150], [-150, 0, -150], [0, 1, 0], hex(K.lawn), 0, 1);

    // plinth + ground floor
    B(0, 0.15, 0.5, 22, 0.3, 12, K.slab);
    B(-1.5, 1.95, 0, 15, 3.3, 8.5, K.plaster);
    // ground-floor glazing (front)
    B(-5, 1.9, 4.27, 6.2, 2.7, 0.08, K.glass, 0.95, 3);
    for (let x = -8; x <= -2; x += 1.55) B(x, 1.9, 4.33, 0.09, 2.8, 0.08, K.char);
    B(-5, 3.28, 4.33, 6.3, 0.09, 0.08, K.char); B(-5, 0.52, 4.33, 6.3, 0.09, 0.08, K.char);
    B(0.8, 1.75, 4.3, 1.4, 2.5, 0.12, K.timber2); // door
    B(0.8, 1.75, 4.38, 0.05, 2.5, 0.05, K.amber, 1);
    B(3.9, 1.9, 4.27, 3.2, 2.7, 0.08, K.glass, 0.55, 3);
    for (let x = 2.3; x <= 5.5; x += 1.6) B(x, 1.9, 4.33, 0.08, 2.8, 0.08, K.char);
    // ground-floor roof slab with a glowing edge
    B(-1.5, 3.78, 0.75, 17, 0.3, 10.5, K.plaster);
    B(-1.5, 3.6, 5.95, 16.6, 0.06, 0.1, K.amber, 1);
    // roof terrace railing
    B(-6.5, 4.35, 5.9, 7.2, 0.9, 0.05, 0x9fb6d3, 0.15, 3);
    B(-6.5, 4.82, 5.9, 7.3, 0.05, 0.08, K.char);
    // stone feature wall + chimney
    B(-9.5, 2.5, 1.4, 1.5, 5.0, 3.2, K.stone);
    B(-5.0, 5.0, -2.6, 1.4, 2.4, 1.4, K.stone);
    // upper floor (cantilevers over the pool side)
    B(2.5, 5.55, -0.1, 13, 3.1, 8.1, K.char);
    B(1.4, 5.5, 4.02, 7.6, 1.9, 0.08, K.glass, 0.78, 3);
    for (let x = -2.2; x <= 5.2; x += 1.9) B(x, 5.5, 4.08, 0.08, 2.0, 0.08, K.char);
    for (let x = 6.1; x <= 8.9; x += 0.3) B(x, 5.55, 4.1, 0.13, 2.95, 0.12, K.timber);
    B(2.5, 7.3, -0.1, 14.2, 0.3, 9.0, K.plaster);
    B(2.5, 7.1, 4.4, 13.8, 0.05, 0.09, K.amber, 1);
    // side + rear glazing so it reads from every angle
    B(6.03, 1.9, 0, 0.08, 2.5, 5.2, K.glass, 0.6, 3);
    B(9.03, 5.5, -0.1, 0.08, 1.9, 5.4, K.glass, 0.7, 3);
    B(-3, 1.9, -4.27, 8, 2.6, 0.08, K.glass, 0.6, 3);
    B(2.5, 5.5, -4.17, 8, 1.8, 0.08, K.glass, 0.7, 3);
    B(-9.27, 1.9, -1.8, 0.08, 2.4, 3, K.glass, 0.45, 3);

    // pool, deck, loungers
    B(7.2, 0.1, 9.35, 10.8, 0.2, 5.2, K.coping);
    M.quad([2.2, 0.22, 11.5], [12.2, 0.22, 11.5], [12.2, 0.22, 7.2], [2.2, 0.22, 7.2], [0, 1, 0], hex(K.water), 0.55, 2);
    B(7.5, 0.06, 13.4, 14, 0.12, 2.8, K.timber);
    B(4.6, 0.32, 13.3, 0.8, 0.26, 2.0, K.white); B(6.0, 0.32, 13.3, 0.8, 0.26, 2.0, K.white);
    B(4.6, 0.6, 12.4, 0.8, 0.36, 0.1, K.white);

    // path, lamps, driveway, car
    for (let i = 0; i < 8; i++) B(0.8, 0.04, 5.2 + i * 1.55, 1.4, 0.08, 0.9, K.slab);
    [[-0.9, 6], [2.5, 6], [-0.9, 9.6], [2.5, 9.6], [-0.9, 13.2], [2.5, 13.2]].forEach((q) => { B(q[0], 0.35, q[1], 0.14, 0.7, 0.14, K.char); B(q[0], 0.72, q[1], 0.18, 0.06, 0.18, K.amber, 1); light(q[0], 0.78, q[1], [1, 0.72, 0.38], 1.5); });
    B(-13.5, 0.03, 9, 5.6, 0.06, 20, K.drive);
    B(-13.5, 0.55, 9, 1.95, 0.55, 4.5, 0x8f98aa); B(-13.5, 1.07, 8.8, 1.65, 0.5, 2.3, 0x1a2133);
    [[-14.4, 7.6], [-12.6, 7.6], [-14.4, 10.5], [-12.6, 10.5]].forEach((w) => B(w[0], 0.3, w[1], 0.22, 0.6, 0.7, 0x14171d));
    B(-14.3, 0.62, 11.27, 0.4, 0.14, 0.05, 0xfff2d0, 1); B(-12.7, 0.62, 11.27, 0.4, 0.14, 0.05, 0xfff2d0, 1);
    B(-14.3, 0.62, 6.73, 0.4, 0.12, 0.05, 0xff3b30, 1); B(-12.7, 0.62, 6.73, 0.4, 0.12, 0.05, 0xff3b30, 1);
    light(-14.3, 0.7, 11.6, [1, 0.94, 0.8], 1.4); light(-12.7, 0.7, 11.6, [1, 0.94, 0.8], 1.4);

    // planting
    B(-5, 0.45, 5.6, 9.6, 0.9, 0.8, K.fol); B(3.6, 0.4, 5.5, 3.2, 0.8, 0.8, K.fol2);
    const cyp = (x, z, h) => { M.cone(x, 0, z, 0.1, 0.1, 0.5, 5, 0x4a3320); M.cone(x, 0.4, z, 0.95 + R() * 0.3, 0.05, h, 9, R() < 0.5 ? K.cyp : 0x24503a); };
    const rnd = (x, z, s) => { M.cone(x, 0, z, 0.18 * s, 0.14 * s, 1.6 * s, 6, 0x4a3320); M.ell(x, 1.6 * s + s * 1.2, z, s * 1.5, s * 1.25, s * 1.5, R() < 0.5 ? K.fol : K.fol2); };
    const shr = (x, z, s) => M.ell(x, s * 0.55, z, s, s * 0.6, s, K.fol2);
    const zone = (x, z) => (x > -18 && x < 16 && z > -8 && z < 19) || (Math.hypot(x, z) > 25 && Math.hypot(x, z) < 46);
    for (let x = -22; x <= 20; x += 3.3) cyp(x + (R() - 0.5) * 1.2, -10.5 + (R() - 0.5) * 1.6, 6 + R() * 3.5);
    for (let z = -8; z <= 17; z += 4) { cyp(-20 + (R() - 0.5), z, 5 + R() * 3); cyp(19 + (R() - 0.5), z, 5 + R() * 3); }
    for (let i = 0; i < 90; i++) {
      const x = (R() - 0.5) * 100, z = (R() - 0.5) * 100 - 4; if (zone(x, z)) continue;
      const t = R(); if (t < 0.4) cyp(x, z, 4.5 + R() * 5); else if (t < 0.82) rnd(x, z, 1.1 + R() * 1.2); else shr(x, z, 0.7 + R() * 0.7);
    }
    rnd(-15.5, 1.5, 1.7); rnd(13, 3.5, 1.4); shr(-12, 5.2, 0.8); shr(11.5, 5.4, 0.7); shr(14.2, 9, 0.9);

    // lights (additive glows)
    light(-5, 2, 4.8, [0.5, 0.32, 0.15], 8); light(1.4, 5.5, 4.8, [0.45, 0.28, 0.12], 7); light(3.9, 1.9, 4.8, [0.3, 0.19, 0.09], 4.5); light(0.8, 3.2, 4.8, [0.5, 0.35, 0.18], 2.4);
    [[2.6, 7.6], [11.8, 7.6], [2.6, 11], [11.8, 11], [7.2, 9.35]].forEach((q) => light(q[0], 0.35, q[1], [0.2, 0.85, 1], q[0] === 7.2 ? 5 : 1.8));
    for (let i = 0; i < 300; i++) { // stars
      const a = R() * Math.PI * 2, e = 0.2 + R() * 1.3, r = 90, s = 0.18 + R() * 0.5, b = 0.5 + R() * 0.5;
      P.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r, b, b, b * 1.05, s * 2.2);
    }
    return { mesh: new Float32Array(M.v), points: new Float32Array(P) };
  }

  /* ---------- shaders ---------- */
  const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const VS_MESH = 'attribute vec3 a_pos;attribute vec3 a_nrm;attribute vec3 a_col;attribute vec2 a_mat;uniform mat4 u_vp;varying vec3 v_pos;varying vec3 v_nrm;varying vec3 v_col;varying vec2 v_mat;void main(){v_pos=a_pos;v_nrm=a_nrm;v_col=a_col;v_mat=a_mat;gl_Position=u_vp*vec4(a_pos,1.0);}';
  const FS_MESH = PREC + [
    'uniform vec3 u_eye,u_sunDir,u_sunCol,u_skyCol,u_gndCol,u_fogCol;uniform float u_time,u_fogNear,u_fogFar;',
    'varying vec3 v_pos;varying vec3 v_nrm;varying vec3 v_col;varying vec2 v_mat;',
    'void main(){',
    ' vec3 n=normalize(v_nrm);float mat=v_mat.y;float em=v_mat.x;vec3 V=normalize(u_eye-v_pos);',
    ' vec3 amb=mix(u_gndCol,u_skyCol,n.y*0.5+0.5);float ndl=max(dot(n,u_sunDir),0.0);',
    ' vec3 col=v_col*(amb+u_sunCol*ndl);',
    ' if(mat>0.5&&mat<1.5){',
    '  vec2 q=abs(v_pos.xz-vec2(0.0,0.5))-vec2(11.0,6.0);float d=length(max(q,0.0))+min(max(q.x,q.y),0.0);',
    '  col*=mix(0.5,1.0,smoothstep(-0.5,8.0,d));',
    '  col+=vec3(1.0,0.7,0.38)*exp(-pow(max(d,0.0)*0.2,2.0))*0.16*v_col;',
    ' }else if(mat>1.5&&mat<2.5){',
    '  vec3 R=reflect(-V,n);float fr=pow(1.0-max(dot(V,n),0.0),3.0);',
    '  float rip=sin(v_pos.x*3.1+u_time*1.3)*sin(v_pos.z*2.7-u_time*0.9)*0.5+0.5;',
    '  vec3 sky=mix(u_fogCol,u_skyCol*1.7,clamp(R.y,0.0,1.0));',
    '  col=mix(v_col*(0.65+0.35*rip),sky,fr*0.75+0.05);col+=vec3(0.1,0.65,0.8)*em*(0.55+0.45*rip);',
    '  col+=u_sunCol*pow(max(dot(R,u_sunDir),0.0),60.0)*0.8;',
    ' }else if(mat>2.5){',
    '  vec3 R=reflect(-V,n);float fr=pow(1.0-max(dot(V,n),0.0),2.0);',
    '  vec3 sky=mix(u_fogCol,u_skyCol*1.8,clamp(R.y*0.5+0.5,0.0,1.0));',
    '  vec3 inside=v_col*(0.28+em*1.15);col=mix(inside,sky,0.16+0.5*fr);',
    ' }else{col+=v_col*em*0.95;}',
    ' float f=smoothstep(u_fogNear,u_fogFar,length(u_eye-v_pos));col=mix(col,u_fogCol,f);',
    ' gl_FragColor=vec4(min(col,vec3(1.0)),1.0);}',
  ].join('\n');
  const VS_PT = 'attribute vec3 a_pos;attribute vec4 a_col;uniform mat4 u_vp;uniform float u_scale,u_time;varying vec3 v_c;varying float v_tw;void main(){vec4 p=u_vp*vec4(a_pos,1.0);gl_Position=p;gl_PointSize=clamp(a_col.w*u_scale/max(p.w,1.0),1.0,160.0);v_c=a_col.rgb;v_tw=0.78+0.22*sin(u_time*1.8+a_pos.x*12.9+a_pos.z*7.3);}';
  const FS_PT = PREC + 'varying vec3 v_c;varying float v_tw;void main(){float r=length(gl_PointCoord-0.5)*2.0;float a=clamp(1.0-r,0.0,1.0);a*=a;gl_FragColor=vec4(v_c*a*v_tw,a);}';
  const VS_SKY = 'attribute vec2 a_p;void main(){gl_Position=vec4(a_p,0.9999,1.0);}';
  const FS_SKY = PREC + [
    'uniform vec2 u_res;uniform float u_hor,u_sunX,u_vis;',
    'void main(){vec2 uv=gl_FragCoord.xy/u_res;float t=uv.y-u_hor;float h=clamp(t/0.85,0.0,1.0);',
    ' vec3 top=vec3(0.035,0.06,0.14),mid=vec3(0.13,0.19,0.40),low=vec3(0.30,0.34,0.52);',
    ' vec3 c=mix(low,mid,smoothstep(0.0,0.38,h));c=mix(c,top,smoothstep(0.3,1.0,h));',
    ' float band=exp(-max(t,0.0)*7.0);vec2 d=vec2((uv.x-u_sunX)*u_res.x/u_res.y,t);d*=vec2(0.9,2.6);',
    ' float g=exp(-dot(d,d)*1.6)*u_vis;c+=vec3(1.0,0.55,0.30)*(g*0.85+band*0.10*u_vis)+vec3(0.9,0.45,0.3)*band*0.07;',
    ' gl_FragColor=vec4(c,1.0);}',
  ].join('\n');

  function program(gl, vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  RE.house = {
    create(canvas, options) {
      const o = Object.assign({ interactive: true, preserve: false, yaw: 0.62, pitch: 0.2, dist: 38, autoRotate: true, fixed: false, fov: 34, shiftFn: null }, options);
      const gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: o.preserve }) || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL is not available');
      const scene = buildScene();
      const pm = program(gl, VS_MESH, FS_MESH), pp = program(gl, VS_PT, FS_PT), ps = program(gl, VS_SKY, FS_SKY);
      const bufM = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufM); gl.bufferData(gl.ARRAY_BUFFER, scene.mesh, gl.STATIC_DRAW);
      const bufP = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufP); gl.bufferData(gl.ARRAY_BUFFER, scene.points, gl.STATIC_DRAW);
      const bufS = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufS); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const nMesh = scene.mesh.length / 11, nPts = scene.points.length / 7;
      const U = (p, n) => gl.getUniformLocation(p, n), A = (p, n) => gl.getAttribLocation(p, n);
      const view = { yaw: o.yaw, pitch: o.pitch, dist: o.dist };
      const SUN = (() => { const v = [-0.55, 0.22, 0.7], l = Math.hypot(...v); return v.map((x) => x / l); })();
      const T = [0, 2.4, 0], FOG = [0.30, 0.34, 0.52];
      let shift = { x: 0, y: 0 };
      const half = Math.tan((o.fov * Math.PI) / 360);

      function resize() {
        if (o.fixed) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
      function draw(t) {
        resize();
        const W = canvas.width, H = canvas.height, asp = W / H;
        gl.viewport(0, 0, W, H);
        shift = o.shiftFn ? o.shiftFn(asp) : { x: 0, y: 0 };
        const dist = Math.max(view.dist, 27 / (2 * half * Math.min(asp, 1.6)));
        const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
        const eye = [T[0] + dist * Math.sin(view.yaw) * cp, T[1] + dist * sp, T[2] + dist * Math.cos(view.yaw) * cp];
        const proj = m4.persp((o.fov * Math.PI) / 180, asp, 0.5, 280);
        proj[8] = -shift.x; proj[9] = -shift.y;
        const vp = m4.mul(proj, m4.look(eye, T, [0, 1, 0]));
        gl.clearColor(FOG[0], FOG[1], FOG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // sky
        const hy = 0.5 + 0.5 * (Math.tan(view.pitch) / half + shift.y);
        const hx = -Math.sin(view.yaw), hz = -Math.cos(view.yaw), sl = Math.hypot(SUN[0], SUN[2]), sx = SUN[0] / sl, sz = SUN[2] / sl;
        const dh = sx * hx + sz * hz, dr = sx * hz * -1 + sz * hx; // r = (-hz, hx)
        const sunX = 0.5 + 0.5 * (dr / Math.max(dh, 0.05) / (asp * half) + shift.x);
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(ps);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufS); const ap = A(ps, 'a_p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(U(ps, 'u_res'), W, H); gl.uniform1f(U(ps, 'u_hor'), hy); gl.uniform1f(U(ps, 'u_sunX'), RE.clamp(sunX, -3, 3)); gl.uniform1f(U(ps, 'u_vis'), RE.clamp(dh * 2.2, 0, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(ap);

        // world
        gl.enable(gl.DEPTH_TEST); gl.useProgram(pm);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufM);
        const S = 44, loc = { p: A(pm, 'a_pos'), n: A(pm, 'a_nrm'), c: A(pm, 'a_col'), m: A(pm, 'a_mat') };
        gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, S, 0);
        gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, S, 12);
        gl.enableVertexAttribArray(loc.c); gl.vertexAttribPointer(loc.c, 3, gl.FLOAT, false, S, 24);
        gl.enableVertexAttribArray(loc.m); gl.vertexAttribPointer(loc.m, 2, gl.FLOAT, false, S, 36);
        gl.uniformMatrix4fv(U(pm, 'u_vp'), false, new Float32Array(vp));
        gl.uniform3fv(U(pm, 'u_eye'), eye); gl.uniform3fv(U(pm, 'u_sunDir'), SUN);
        gl.uniform3f(U(pm, 'u_sunCol'), 0.98, 0.62, 0.40); gl.uniform3f(U(pm, 'u_skyCol'), 0.34, 0.42, 0.66); gl.uniform3f(U(pm, 'u_gndCol'), 0.17, 0.14, 0.15);
        gl.uniform3fv(U(pm, 'u_fogCol'), FOG); gl.uniform1f(U(pm, 'u_time'), t || 0); gl.uniform1f(U(pm, 'u_fogNear'), 38); gl.uniform1f(U(pm, 'u_fogFar'), 120);
        gl.drawArrays(gl.TRIANGLES, 0, nMesh);
        [loc.p, loc.n, loc.c, loc.m].forEach((l) => gl.disableVertexAttribArray(l));

        // glows + stars (additive)
        gl.useProgram(pp); gl.bindBuffer(gl.ARRAY_BUFFER, bufP);
        const lp = A(pp, 'a_pos'), lc = A(pp, 'a_col');
        gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 4, gl.FLOAT, false, 28, 12);
        gl.uniformMatrix4fv(U(pp, 'u_vp'), false, new Float32Array(vp));
        gl.uniform1f(U(pp, 'u_scale'), H / (2 * half)); gl.uniform1f(U(pp, 'u_time'), t || 0);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.drawArrays(gl.POINTS, 0, nPts);
        gl.depthMask(true); gl.disable(gl.BLEND); gl.disableVertexAttribArray(lp); gl.disableVertexAttribArray(lc);
      }

      /* ---------- interaction + loop ---------- */
      let raf = 0, visible = true, dragging = false, lx = 0, ly = 0, vx = 0, idle = 0, last = 0, t0 = performance.now(), dead = false;
      const cleanup = [];
      const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); cleanup.push(() => el.removeEventListener(ev, fn, opt)); };
      if (o.interactive) {
        canvas.style.touchAction = 'pan-y'; canvas.style.cursor = 'grab'; canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Interactive 3D villa. Drag left or right to turn it, or use the arrow keys.');
        on(canvas, 'pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; vx = 0; try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } canvas.style.cursor = 'grabbing'; if (o.onInteract) o.onInteract(); });
        on(canvas, 'pointermove', (e) => {
          if (!dragging) return;
          const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
          view.yaw -= dx * 0.0065; vx = -dx * 0.0065;
          if (e.pointerType !== 'touch') view.pitch = RE.clamp(view.pitch + dy * 0.004, 0.04, 0.8);
        });
        const end = () => { dragging = false; canvas.style.cursor = 'grab'; idle = performance.now(); };
        on(canvas, 'pointerup', end); on(canvas, 'pointercancel', end); on(canvas, 'lostpointercapture', end);
        on(canvas, 'keydown', (e) => {
          const k = e.key; if (k === 'ArrowLeft') view.yaw -= 0.12; else if (k === 'ArrowRight') view.yaw += 0.12; else if (k === 'ArrowUp') view.pitch = RE.clamp(view.pitch - 0.05, 0.04, 0.8); else if (k === 'ArrowDown') view.pitch = RE.clamp(view.pitch + 0.05, 0.04, 0.8); else return;
          e.preventDefault(); idle = performance.now();
        });
      }
      function tick(now) {
        if (dead) return;
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
        if (!dragging) {
          view.yaw += vx; vx *= 0.94; if (Math.abs(vx) < 0.0002) vx = 0;
          if (o.autoRotate && !RE.reducedMotion() && vx === 0 && now - idle > 1800) view.yaw += dt * 0.075;
        }
        draw((now - t0) / 1000);
      }
      if (o.interactive) {
        if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.01 }); io.observe(canvas); cleanup.push(() => io.disconnect()); }
        raf = requestAnimationFrame(tick);
      }
      draw(0);
      return {
        view, draw, resize,
        destroy() {
          dead = true; cancelAnimationFrame(raf); cleanup.forEach((f) => f());
          const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
        },
      };
    },
  };
})();
