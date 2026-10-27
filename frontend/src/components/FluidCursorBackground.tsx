import { useEffect, useRef } from "react";

// WebGL fluid-simulation cursor effect (user spec, 2026-10-07): soft pastel
// ink pours out of the cursor and swirls through the page like smoke in
// water, curling, drifting, and fading within a second or two; clicking
// drops a bigger burst of colour. Ported from the standalone vanilla-JS
// build delivered earlier in this session (fluid-cursor.js) into a React
// component so its lifecycle (mount once, clean up on unmount) is managed
// by React instead of a manually-appended <script> tag. The simulation
// itself -- classic Jos Stam "stable fluids" on the GPU: curl -> vorticity
// confinement -> divergence -> a 20-iteration Jacobi pressure solve ->
// gradient subtraction -> advect velocity -> advect dye -- is unchanged
// from that file.
//
// Placement (per user decision, 2026-10-07): mounted ONCE in App.tsx,
// alongside PreferencesEffects/AuthBootstrap, outside <Routes> -- so it
// persists across every route/page rather than remounting (and losing its
// trail) on every navigation, matching "the whole site" scope the user
// chose.
//
// Respects prefers-reduced-motion by simply not starting at all (checked
// once via matchMedia, the same convention HeroNeuralField's own canvas
// loop uses) -- an ink trail chasing the cursor is exactly the kind of
// motion that preference exists to suppress, and there's no meaningful
// "static" version of a fluid simulation to fall back to.

const CONFIG = {
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1440,
  DENSITY_DISSIPATION: 3.5,
  VELOCITY_DISSIPATION: 2,
  PRESSURE: 0.1,
  PRESSURE_ITERATIONS: 20,
  CURL: 3,
  SPLAT_RADIUS: 0.2,
  SPLAT_FORCE: 6000,
  CLICK_FORCE_MULTIPLIER: 10,
  COLOR_UPDATE_SPEED: 10,
  COLOR_INTENSITY: 0.55,
  PALETTE: ["#FFCBE1", "#D6E5BD", "#F9E1A8", "#BCD8EC", "#DCCCEC", "#FFDAB4"],
  SHADING: true,
  TRANSPARENT: true,
  MAX_DELTA_TIME: 1 / 30,
};

type GL = WebGLRenderingContext | WebGL2RenderingContext;

interface GLExt {
  formatRGBA: { internalFormat: number; format: number };
  halfFloatTexType: number;
  supportLinearFiltering: boolean;
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: RGB;
  colorTimer: number;
}

export default function FluidCursorBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sim = createFluidCursor(canvas);
    return () => sim.destroy();
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ filter: "contrast(1.12) brightness(1.06)" }}
      />
    </div>
  );
}

function createFluidCursor(canvas: HTMLCanvasElement) {
  const { gl, ext } = getWebGLContext(canvas);

  function compileShader(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("fluid-cursor: could not create shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("fluid-cursor: shader compile error", gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error("fluid-cursor: could not create program.");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("fluid-cursor: program link error", gl.getProgramInfoLog(program));
    }
    return program;
  }

  function getUniforms(program: WebGLProgram): Record<string, WebGLUniformLocation | null> {
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return uniforms;
  }

  class Program {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
    constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      this.program = createProgram(vertexShader, fragmentShader);
      this.uniforms = getUniforms(this.program);
    }
    bind() {
      gl.useProgram(this.program);
    }
  }

  // ---- shaders --------------------------------------------------------------
  // Plain GLSL ES 1.00 (attribute/varying/gl_FragColor, texture2D) throughout
  // -- WebGL2 contexts accept this style directly for simple sampler2D work,
  // so one shader set serves both WebGL1 and WebGL2.

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `
  );

  const copyShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    void main () { gl_FragColor = texture2D(uTexture, vUv); }
  `
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
  `
  );

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;
    uniform float manualFiltering;
    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = manualFiltering > 0.5 ? bilerp(uSource, coord, dyeTexelSize) : texture2D(uSource, coord);
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
  `
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `
  );

  const displayShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float uShading;
    uniform vec2 texelSize;
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      if (uShading > 0.5) {
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;
        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
        float diffuse = clamp(dot(n, lightDir), 0.4, 1.0);
        c *= diffuse;
      }
      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
    }
  `
  );

  const copyProgram = new Program(baseVertexShader, copyShader);
  const clearProgram = new Program(baseVertexShader, clearShader);
  const splatProgram = new Program(baseVertexShader, splatShader);
  const advectionProgram = new Program(baseVertexShader, advectionShader);
  const divergenceProgram = new Program(baseVertexShader, divergenceShader);
  const curlProgram = new Program(baseVertexShader, curlShader);
  const vorticityProgram = new Program(baseVertexShader, vorticityShader);
  const pressureProgram = new Program(baseVertexShader, pressureShader);
  const gradientSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
  const displayProgram = new Program(baseVertexShader, displayShader);
  void copyProgram; // reserved (parity with the standalone build's copy pass); not currently blitted anywhere in step()/render()

  // ---- full-screen quad -----------------------------------------------------

  const quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const quadEbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadEbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function blit(target: FBO | null) {
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } else {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // ---- framebuffers -----------------------------------------------------------

  let dye: DoubleFBO;
  let velocity: DoubleFBO;
  let divergence: FBO;
  let curl: FBO;
  let pressure: DoubleFBO;

  function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    if (!texture) throw new Error("fluid-cursor: could not create texture.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error("fluid-cursor: could not create framebuffer.");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      get write() {
        return fbo2;
      },
      swap() {
        const tmp = fbo1;
        fbo1 = fbo2;
        fbo2 = tmp;
      },
    };
  }

  function getResolution(resolution: number) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
    return { width: min, height: max };
  }

  function initFramebuffers() {
    const simRes = getResolution(CONFIG.SIM_RESOLUTION);
    const dyeRes = getResolution(CONFIG.DYE_RESOLUTION);
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    velocity = createDoubleFBO(simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    divergence = createFBO(simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
  }

  function resizeCanvas(): boolean {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  // ---- splats -----------------------------------------------------------------

  function splat(x: number, y: number, dx: number, dy: number, color: RGB) {
    gl.viewport(0, 0, velocity.width, velocity.height);
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, CONFIG.SPLAT_RADIUS / 100.0);
    blit(velocity.write);
    velocity.swap();

    gl.viewport(0, 0, dye.width, dye.height);
    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
  }

  function splatPointer(pointer: Pointer) {
    const dx = pointer.deltaX * CONFIG.SPLAT_FORCE;
    const dy = pointer.deltaY * CONFIG.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  function clickSplat(pointer: Pointer) {
    const angle = Math.random() * Math.PI * 2;
    const jitter = 0.18;
    const dx = Math.cos(angle) * jitter * CONFIG.SPLAT_FORCE * CONFIG.CLICK_FORCE_MULTIPLIER;
    const dy = Math.sin(angle) * jitter * CONFIG.SPLAT_FORCE * CONFIG.CLICK_FORCE_MULTIPLIER;
    const color = generateColor();
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, {
      r: color.r * CONFIG.CLICK_FORCE_MULTIPLIER,
      g: color.g * CONFIG.CLICK_FORCE_MULTIPLIER,
      b: color.b * CONFIG.CLICK_FORCE_MULTIPLIER,
    });
  }

  function hexToRgb(hex: string): RGB {
    const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return parsed
      ? { r: parseInt(parsed[1], 16) / 255, g: parseInt(parsed[2], 16) / 255, b: parseInt(parsed[3], 16) / 255 }
      : { r: 1, g: 1, b: 1 };
  }

  function generateColor(): RGB {
    const hex = CONFIG.PALETTE[(Math.random() * CONFIG.PALETTE.length) | 0];
    const c = hexToRgb(hex);
    return { r: c.r * CONFIG.COLOR_INTENSITY, g: c.g * CONFIG.COLOR_INTENSITY, b: c.b * CONFIG.COLOR_INTENSITY };
  }

  // ---- pointers -----------------------------------------------------------

  function makePointer(): Pointer {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: generateColor(),
      colorTimer: 0,
    };
  }

  const pointers: Pointer[] = [makePointer()];

  function findPointerById(id: number) {
    return pointers.find((p) => p.id === id);
  }

  function correctDeltaX(delta: number) {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio < 1 ? delta * aspectRatio : delta;
  }

  function correctDeltaY(delta: number) {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio > 1 ? delta / aspectRatio : delta;
  }

  function updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  function updatePointerMoveData(pointer: Pointer, posX: number, posY: number) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  }

  function updatePointerUpData(pointer: Pointer) {
    pointer.down = false;
  }

  function clientToCanvas(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr };
  }

  function onMouseDown(e: MouseEvent) {
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    const pointer = pointers[0];
    updatePointerDownData(pointer, -1, x, y);
    clickSplat(pointer);
  }

  function onMouseMove(e: MouseEvent) {
    const pointer = pointers[0];
    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    updatePointerMoveData(pointer, x, y);
  }

  function onMouseUp() {
    updatePointerUpData(pointers[0]);
  }

  function onTouchStart(e: TouchEvent) {
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      let pointer = findPointerById(touches[i].identifier);
      if (!pointer) {
        pointer = makePointer();
        pointers.push(pointer);
      }
      const { x, y } = clientToCanvas(touches[i].clientX, touches[i].clientY);
      updatePointerDownData(pointer, touches[i].identifier, x, y);
      clickSplat(pointer);
    }
  }

  function onTouchMove(e: TouchEvent) {
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      const pointer = findPointerById(touches[i].identifier);
      if (!pointer) continue;
      const { x, y } = clientToCanvas(touches[i].clientX, touches[i].clientY);
      updatePointerMoveData(pointer, x, y);
    }
  }

  function onTouchEnd(e: TouchEvent) {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      const pointer = findPointerById(touches[i].identifier);
      if (pointer) updatePointerUpData(pointer);
    }
  }

  function onResize() {
    if (resizeCanvas()) initFramebuffers();
  }

  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("resize", onResize);

  // ---- simulation step --------------------------------------------------------

  function step(dt: number) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, CONFIG.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, CONFIG.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write);
      pressure.swap();
    }

    gradientSubtractProgram.bind();
    gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1f(advectionProgram.uniforms.manualFiltering, ext.supportLinearFiltering ? 0.0 : 1.0);
    const velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, CONFIG.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1f(advectionProgram.uniforms.dissipation, CONFIG.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
  }

  function render(target: FBO | null) {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    gl.clearColor(0, 0, 0, CONFIG.TRANSPARENT ? 0 : 1);
    if (target == null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    displayProgram.bind();
    gl.uniform1f(displayProgram.uniforms.uShading, CONFIG.SHADING ? 1.0 : 0.0);
    gl.uniform2f(displayProgram.uniforms.texelSize, 1 / canvas.width, 1 / canvas.height);
    gl.uniform1i(displayProgram.uniforms.uTexture, dye.read.attach(0));
    blit(target);
  }

  // ---- main loop ----------------------------------------------------------

  let lastTime = performance.now();
  let rafId: number | null = null;
  let destroyed = false;

  function calcDeltaTime(now: number) {
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, CONFIG.MAX_DELTA_TIME);
    lastTime = now;
    return dt;
  }

  function updateColors(dt: number) {
    for (const pointer of pointers) {
      pointer.colorTimer += dt * CONFIG.COLOR_UPDATE_SPEED;
      if (pointer.colorTimer >= 1) {
        pointer.colorTimer = 0;
        pointer.color = generateColor();
      }
    }
  }

  function applyInputs() {
    for (const pointer of pointers) {
      if (pointer.moved) {
        pointer.moved = false;
        splatPointer(pointer);
      }
    }
  }

  function frame(now: number) {
    if (destroyed) return;
    const dt = calcDeltaTime(now);
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    step(dt);
    render(null);
    rafId = requestAnimationFrame(frame);
  }

  resizeCanvas();
  initFramebuffers();
  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
    },
  };
}

// ---- WebGL context acquisition -------------------------------------------
// WebGL2 preferred, WebGL1 fallback; prefers half-float textures + linear
// filtering, degrading gracefully (lower-precision formats, or a manual
// bilinear sample in the advection shader) rather than failing.

function getWebGLContext(canvas: HTMLCanvasElement): { gl: GL; ext: GLExt } {
  const params: WebGLContextAttributes = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

  let gl: GL | null = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl;
  if (!gl) {
    gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGLRenderingContext | null;
  }
  if (!gl) {
    throw new Error("fluid-cursor: WebGL is not supported in this browser.");
  }

  let halfFloat: { HALF_FLOAT_OES: number } | null = null;
  let supportLinearFiltering = false;

  if (isWebGL2) {
    gl.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
  } else {
    halfFloat = gl.getExtension("OES_texture_half_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;

  let formatRGBA: { internalFormat: number; format: number };
  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    formatRGBA = getSupportedFormat(gl, gl2.RGBA16F, gl2.RGBA, gl2.HALF_FLOAT);
  } else {
    formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA };
  }

  return {
    gl,
    ext: {
      formatRGBA,
      halfFloatTexType: halfFloatTexType ?? gl.UNSIGNED_BYTE,
      supportLinearFiltering,
    },
  };
}

function getSupportedFormat(gl: GL, internalFormat: number, format: number, type: number): { internalFormat: number; format: number } {
  if (!checkFramebufferSupport(gl, internalFormat, format, type)) {
    const gl2 = gl as WebGL2RenderingContext;
    if ("RGBA16F" in gl2 && internalFormat === gl2.RGBA16F) {
      return getSupportedFormat(gl, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    }
    return { internalFormat: gl.RGBA, format: gl.RGBA };
  }
  return { internalFormat, format };
}

function checkFramebufferSupport(gl: GL, internalFormat: number, format: number, type: number): boolean {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

  gl.deleteTexture(texture);
  gl.deleteFramebuffer(fbo);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return status === gl.FRAMEBUFFER_COMPLETE;
}
