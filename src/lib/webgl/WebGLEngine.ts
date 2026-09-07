import type { ParticleConfig } from '../../types/schema';
import { normalizeAtmosphere, QUALITY_BUDGETS, renderSize, seededRandom } from '../../../functions/src/cinematic/catalog';
import { createShader, createProgram } from './glUtils';
import { particleVertexShader, particleFragmentShader } from './shaders';
import { smokeVertexShader, smokeFragmentShader } from './smokeShaders';

/** Bounded, frame-rate-independent decorative renderer. It never emits campaign events. */
export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private config: ReturnType<typeof normalizeAtmosphere>;
  private wanted = false;
  private lost = false;
  private disposed = false;
  private frame: number | null = null;
  private lastTick = 0;
  private elapsed = 0;
  private time = 0;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private buffers: WebGLBuffer[] = [];
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private positions = new Float32Array(0);
  private sizes = new Float32Array(0);
  private alphas = new Float32Array(0);
  private velocities = new Float32Array(0);
  private renderedFrames = 0;

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig) {
    this.canvas = canvas;
    this.config = normalizeAtmosphere(config);
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL 2 unavailable');
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    try { this.resize(); this.initialize(); }
    catch (error) { this.dispose(); throw error; }
  }

  static isSupported(): boolean {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return false;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch { return false; }
  }
  private get budget() { return QUALITY_BUDGETS[this.config.quality || 'standard']; }
  getDiagnostics() {
    return { effect: this.config.effectType, particleCount: this.sizes.length, width: this.canvas.width, height: this.canvas.height,
      frames: this.renderedFrames, running: this.frame !== null, contextLost: this.lost, ...this.budget };
  }
  private onLost = (event: Event) => {
    event.preventDefault(); this.lost = true; this.pause(); this.canvas.dataset.atmosphereState = 'context-lost';
  };
  private onRestored = () => {
    if (this.disposed) return;
    this.lost = false;
    // Context restoration invalidates every old GPU object.
    this.program = null; this.vao = null; this.buffers = []; this.uniforms = {};
    try { this.resize(); this.initialize(); if (this.wanted) this.start(); }
    catch { this.stop(); this.canvas.dataset.atmosphereState = 'unavailable'; }
  };
  private releaseResources() {
    this.gl.deleteProgram(this.program); this.gl.deleteVertexArray(this.vao);
    this.buffers.forEach(buffer => this.gl.deleteBuffer(buffer));
    this.program = null; this.vao = null; this.buffers = []; this.uniforms = {};
  }
  private initialize() {
    const gl = this.gl, smoke = this.config.effectType === 'smoke';
    if (this.config.effectType === 'none') return;
    let vertex: WebGLShader | null = null, fragment: WebGLShader | null = null;
    try {
      vertex = createShader(gl, gl.VERTEX_SHADER, smoke ? smokeVertexShader : particleVertexShader);
      fragment = createShader(gl, gl.FRAGMENT_SHADER, smoke ? smokeFragmentShader : particleFragmentShader);
      this.program = createProgram(gl, vertex, fragment);
    } finally { if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment); }
    this.vao = gl.createVertexArray();
    if (!this.vao) throw new Error('Could not allocate atmosphere geometry');
    gl.bindVertexArray(this.vao);
    const attributes: [string, number][] = smoke ? [['a_position', 2]] : [['a_position', 2], ['a_size', 1], ['a_alpha', 1]];
    attributes.forEach(([name, size]) => {
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Could not allocate atmosphere buffer');
      this.buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const location = gl.getAttribLocation(this.program!, name);
      if (location < 0) throw new Error(`Missing atmosphere attribute ${name}`);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      if (smoke) gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    });
    const names = smoke ? ['uRes', 'uTime', 'uDensity', 'uWarp', 'uSpeed', 'uSteps', 'uColor', 'uOpacity', 'uEmitter']
      : ['u_resolution', 'u_color', 'u_effectType', 'u_rotation'];
    names.forEach(name => { this.uniforms[name] = gl.getUniformLocation(this.program!, name); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.resetParticles();
    this.canvas.dataset.atmosphereState = 'ready';
  }
  private resetParticles() {
    const config = this.config;
    const count = config.effectType === 'none' || config.effectType === 'smoke' ? 0 : Math.min(this.budget.maxParticles, Math.round(config.density * 5));
    this.positions = new Float32Array(count * 2); this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count); this.alphas = new Float32Array(count);
    const random = seededRandom(config.seed ?? 731), sizeScale = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    for (let i = 0; i < count; i++) {
      this.positions[2 * i] = random() * this.canvas.width; this.positions[2 * i + 1] = random() * this.canvas.height;
      this.velocities[2 * i] = (random() - 0.5) * 22 * sizeScale;
      this.velocities[2 * i + 1] = (config.effectType === 'rain' ? 250 + random() * 150 : 18 + random() * 35) * sizeScale;
      this.sizes[i] = (config.particleSize || 10) * (0.55 + random() * 0.45) * sizeScale;
      this.alphas[i] = 0.45 + random() * 0.55;
    }
  }
  resize() {
    const size = renderSize(this.canvas.clientWidth, this.canvas.clientHeight, window.devicePixelRatio, this.config.quality || 'standard');
    if (size.width === this.canvas.width && size.height === this.canvas.height) return;
    this.canvas.width = size.width; this.canvas.height = size.height;
    this.resetParticles();
  }
  updateConfig(input: ParticleConfig) {
    const next = normalizeAtmosphere(input), typeChanged = next.effectType !== this.config.effectType;
    this.config = next; this.resize();
    if (this.lost || this.disposed) return;
    if (typeChanged) { this.releaseResources(); this.initialize(); }
    else this.resetParticles();
  }
  start() {
    this.wanted = true;
    if (this.disposed || this.lost || this.frame !== null || this.config.effectType === 'none') return;
    this.lastTick = 0; this.elapsed = 0;
    this.frame = requestAnimationFrame(this.render);
  }
  private pause() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null; this.lastTick = 0; this.elapsed = 0;
  }
  stop() { this.wanted = false; this.pause(); }
  private render = (timestamp: number) => {
    this.frame = null;
    if (!this.wanted || this.lost || this.disposed) return;
    this.elapsed += this.lastTick ? Math.min((timestamp - this.lastTick) / 1000, 0.1) : 1 / this.budget.fps;
    this.lastTick = timestamp;
    if (this.elapsed + 0.0001 >= 1 / this.budget.fps) {
      const dt = this.elapsed; this.elapsed = 0; this.time += dt;
      this.draw(dt); this.renderedFrames++;
    }
    this.frame = requestAnimationFrame(this.render);
  };
  private draw(dt: number) {
    const gl = this.gl, config = this.config, u = this.uniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!this.program) return;
    gl.useProgram(this.program); gl.bindVertexArray(this.vao);
    const [r, g, b, a] = config.color;
    if (config.effectType === 'smoke') {
      gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height); gl.uniform1f(u.uTime, this.time);
      gl.uniform1f(u.uDensity, config.density / 50 * 0.7); gl.uniform1f(u.uSpeed, config.speed * 0.5);
      gl.uniform1f(u.uWarp, config.vorticity / 5); gl.uniform1i(u.uSteps, this.budget.smokeSteps);
      gl.uniform3f(u.uColor, r / 255, g / 255, b / 255); gl.uniform1f(u.uOpacity, a);
      gl.uniform2f(u.uEmitter, config.emitterPosition.x, config.emitterPosition.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return;
    }
    gl.uniform2f(u.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform4f(u.u_color, r / 255, g / 255, b / 255, a);
    gl.uniform1i(u.u_effectType, ({ hearts: 1, stars: 2, leaves: 3, rain: 4 } as Record<string, number>)[config.effectType] || 0);
    gl.uniform1f(u.u_rotation, (config.particleAngle || 0) * Math.PI / 180);
    for (let i = 0; i < this.sizes.length; i++) {
      const drift = config.effectType === 'leaves' ? Math.sin(this.time + i) * 12 : 0;
      this.positions[2 * i] = (this.positions[2 * i] + (this.velocities[2 * i] + drift) * config.speed * dt + this.canvas.width) % this.canvas.width;
      this.positions[2 * i + 1] = (this.positions[2 * i + 1] + this.velocities[2 * i + 1] * config.speed * dt) % this.canvas.height;
    }
    [this.positions, this.sizes, this.alphas].forEach((values, i) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]); gl.bufferData(gl.ARRAY_BUFFER, values, gl.DYNAMIC_DRAW);
    });
    gl.drawArrays(gl.POINTS, 0, this.sizes.length);
  }
  dispose() {
    this.stop(); this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    if (!this.lost) this.releaseResources();
    this.positions = new Float32Array(0); this.sizes = new Float32Array(0); this.velocities = new Float32Array(0); this.alphas = new Float32Array(0);
  }
}
