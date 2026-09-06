import type { ParticleConfig } from '../../types/schema';
import { createShader, createProgram } from './glUtils';
import { 
  particleVertexShader, 
  particleFragmentShader
} from './shaders';
import { smokeVertexShader, smokeFragmentShader } from './smokeShaders';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private config: ParticleConfig;
  private particles: Particle[] = [];
  
  // Particle Resources
  private particleProgram: WebGLProgram | null = null;
  private particleVao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private sizeBuffer: WebGLBuffer | null = null;
  private alphaBuffer: WebGLBuffer | null = null;
  private uParticleResLoc: WebGLUniformLocation | null = null;
  private uParticleColorLoc: WebGLUniformLocation | null = null;

  // Smoke Resources (Volumetric)
  private smokeProgram: WebGLProgram | null = null;
  private uSmokeRes: WebGLUniformLocation | null = null;
  private uSmokeTime: WebGLUniformLocation | null = null;
  private uSmokeDensity: WebGLUniformLocation | null = null;
  private uSmokeWarp: WebGLUniformLocation | null = null;
  private uSmokeSpeed: WebGLUniformLocation | null = null;
  private uSmokeSteps: WebGLUniformLocation | null = null;
  private uSmokeColor: WebGLUniformLocation | null = null;
  private startTime: number = 0;

  // Shared Resources
  private quadVao: WebGLVertexArrayObject | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  public static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2', { alpha: true });
    } catch {
      return false;
    }
  }

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig) {
    this.canvas = canvas;
    this.config = config;
    this.startTime = performance.now();
    
    // Check support before attempting init
    if (!WebGLEngine.isSupported()) {
      return;
    }

    const gl = canvas.getContext('webgl2', { 
      alpha: true,
      antialias: true,
      depth: false, 
      stencil: false,
      premultipliedAlpha: false
    });

    if (!gl) {
      throw new Error('WebGL 2 not supported');
    }
    this.gl = gl;

    // Handle Context Loss
    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    // Enable extensions if needed
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    this.initCommon();
    this.initParticles();
    this.initSmoke();
    this.resize();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
  };

  private handleContextRestored = () => {
    this.initCommon();
    this.initParticles();
    this.initSmoke();
    this.start();
  };

  public resize() {
    if (!this.gl) return;
    
    const dpr = Math.min(window.devicePixelRatio, 2); 
    const renderScale = 0.8; // Reduce resolution for performance, matching example
    const displayWidth = Math.floor(this.canvas.clientWidth * dpr * renderScale);
    const displayHeight = Math.floor(this.canvas.clientHeight * dpr * renderScale);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      const oldWidth = this.canvas.width;
      const oldHeight = this.canvas.height;
      
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      
      // Rescale particle positions to match new dimensions
      if (this.particles.length > 0 && oldWidth > 0 && oldHeight > 0) {
        const scaleX = displayWidth / oldWidth;
        const scaleY = displayHeight / oldHeight;
        for (const p of this.particles) {
          p.x *= scaleX;
          p.y *= scaleY;
        }
      }
    }
    
    if (this.gl && this.smokeProgram) {
        this.gl.useProgram(this.smokeProgram);
        this.gl.uniform2f(this.uSmokeRes, this.canvas.width, this.canvas.height);
    }
  }

  private initCommon() {
      const gl = this.gl;
      if (!gl) return;

      // Quad VAO for rendering full screen effects
      this.quadVao = gl.createVertexArray();
      gl.bindVertexArray(this.quadVao);
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      // Triangle strip for full screen quad (-1 to 1)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]), gl.STATIC_DRAW);
  }

  private initSmoke() {
      const gl = this.gl;
      if (!gl) return;

      try {
        const vs = createShader(gl, gl.VERTEX_SHADER, smokeVertexShader);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, smokeFragmentShader);
        this.smokeProgram = createProgram(gl, vs, fs);

        this.uSmokeRes = gl.getUniformLocation(this.smokeProgram, 'uRes');
        this.uSmokeTime = gl.getUniformLocation(this.smokeProgram, 'uTime');
        this.uSmokeDensity = gl.getUniformLocation(this.smokeProgram, 'uDensity');
        this.uSmokeWarp = gl.getUniformLocation(this.smokeProgram, 'uWarp');
        this.uSmokeSpeed = gl.getUniformLocation(this.smokeProgram, 'uSpeed');
        this.uSmokeSteps = gl.getUniformLocation(this.smokeProgram, 'uSteps');
        this.uSmokeColor = gl.getUniformLocation(this.smokeProgram, 'uColor');

        // Bind VAO for smoke (re-use quadVao)
        gl.bindVertexArray(this.quadVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const posLoc = gl.getAttribLocation(this.smokeProgram, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      } catch (e) {
          console.error("Failed to init smoke shaders", e);
      }
  }

  private initParticles() {
    const gl = this.gl;
    if (!gl) return;

    this.particleProgram = createProgram(gl, 
      createShader(gl, gl.VERTEX_SHADER, particleVertexShader), 
      createShader(gl, gl.FRAGMENT_SHADER, particleFragmentShader)
    );

    this.uParticleResLoc = gl.getUniformLocation(this.particleProgram, 'u_resolution');
    this.uParticleColorLoc = gl.getUniformLocation(this.particleProgram, 'u_color');

    this.particleVao = gl.createVertexArray();
    gl.bindVertexArray(this.particleVao);

    this.positionBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer();
    this.alphaBuffer = gl.createBuffer();

    // Bind particle attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const pPosLoc = gl.getAttribLocation(this.particleProgram, 'a_position');
    gl.enableVertexAttribArray(pPosLoc);
    gl.vertexAttribPointer(pPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    const pSizeLoc = gl.getAttribLocation(this.particleProgram, 'a_size');
    gl.enableVertexAttribArray(pSizeLoc);
    gl.vertexAttribPointer(pSizeLoc, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
    const pAlphaLoc = gl.getAttribLocation(this.particleProgram, 'a_alpha');
    gl.enableVertexAttribArray(pAlphaLoc);
    gl.vertexAttribPointer(pAlphaLoc, 1, gl.FLOAT, false, 0, 0);

    // Initial population
    this.resetParticles();
  }

  private resetParticles() {
    const count = this.config.density * 5; 
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const { width, height } = this.canvas;
    const { effectType, speed } = this.config;
    const baseSize = this.config.particleSize ?? 10;

    const particle: Particle = {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      size: Math.random() * baseSize * 0.5 + baseSize * 0.5,
      alpha: Math.random() * 0.5 + 0.5
    };

    switch (effectType) {
      case 'snow':
        particle.vy = Math.random() * speed + 0.5;
        particle.vx = Math.random() * 0.5 - 0.25;
        break;
      case 'rain':
        particle.vy = Math.random() * speed * 5 + 5;
        particle.vx = Math.random() * 0.2;
        particle.size = Math.random() * Math.max(baseSize * 0.3, 1) + 1;
        break;
      case 'leaves':
        particle.vy = Math.random() * speed + 0.5;
        particle.vx = Math.sin(Math.random() * Math.PI * 2) * speed;
        particle.alpha = Math.random() * 0.5 + 0.5;
        break;
      case 'hearts':
      case 'stars':
        particle.vy = Math.random() * speed + 0.3;
        particle.vx = Math.random() * 0.6 - 0.3;
        break;
      default:
        particle.vx = Math.random() * speed - speed / 2;
        particle.vy = Math.random() * speed - speed / 2;
        break;
    }
    return particle;
  }

  public updateConfig(newConfig: ParticleConfig) {
    const oldType = this.config.effectType;
    const oldSize = this.config.particleSize;
    this.config = newConfig;
    
    // Check if we switched from smoke/none to particles or vice versa to manage particle init
    const wasParticle = oldType !== 'smoke' && oldType !== 'none';
    const isParticle = newConfig.effectType !== 'smoke' && newConfig.effectType !== 'none';
    const sizeChanged = oldSize !== newConfig.particleSize;

    if (oldType !== newConfig.effectType) {
      if (isParticle) {
          // If we are now particles, ensure they are reset/ready
          if (!wasParticle || Math.abs(this.particles.length - newConfig.density * 5) > 10) {
             this.resetParticles();
          }
      }
      this.resize();
    } else if (isParticle && (Math.abs(this.particles.length - newConfig.density * 5) > 10 || sizeChanged)) {
      this.resetParticles();
    }

    this.updateBlendMode();
  }

  private updateBlendMode() {
    const gl = this.gl;
    if (!gl) return;
    const { config } = this;
    
    gl.enable(gl.BLEND);
    if (config.blendMode === 'screen') {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    } else if (config.blendMode === 'overlay') {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.render();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public handlePointerDown() {}
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public handlePointerMove(_x: number, _y: number, _dx: number, _dy: number) {
      if (this.config.effectType === 'smoke') {
          // Add input force - future implementation
      }
  }

  public handlePointerUp() {}

  private renderSmoke() {
      const gl = this.gl;
      if (!gl || !this.smokeProgram) return;

      gl.useProgram(this.smokeProgram);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);

      const now = performance.now();
      const t = (now - this.startTime) * 0.001;

      // Map config to uniforms
      // Config Density: 0 to 100 usually. Shader expects ~0.7. Map 0-100 to 0-2.0
      const density = this.config.density / 50.0 * 0.7; 
      // Config Speed: 0.1 to 5.0. Shader expects ~0.7. Map 
      const speed = this.config.speed * 0.5;
      
      const [r, g, b] = this.config.color || [235, 240, 248]; 

      gl.uniform1f(this.uSmokeTime, t);
      gl.uniform1f(this.uSmokeDensity, density);
      gl.uniform1f(this.uSmokeWarp, 0.6); 
      gl.uniform1f(this.uSmokeSpeed, speed);
      gl.uniform1i(this.uSmokeSteps, 30); // Reduced from 70 for performance
      gl.uniform3f(this.uSmokeColor, r/255, g/255, b/255);
      gl.uniform2f(this.uSmokeRes, this.canvas.width, this.canvas.height);

      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private renderParticles() {
    const gl = this.gl;
    if (!gl || !this.particleProgram) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.particleProgram);
    
    // Uniforms
    gl.uniform2f(this.uParticleResLoc, this.canvas.width, this.canvas.height);
    if (Array.isArray(this.config.color) && this.config.color.length === 4) {
       const [r, g, b, a] = this.config.color;
       gl.uniform4f(this.uParticleColorLoc, r/255, g/255, b/255, a);
    } else {
       gl.uniform4f(this.uParticleColorLoc, 1, 1, 1, 1);
    }

    // Pass effect type for shape rendering
    const uEffectTypeLoc = gl.getUniformLocation(this.particleProgram, 'u_effectType');
    let effectTypeId = 0;
    if (this.config.effectType === 'hearts') effectTypeId = 1;
    if (this.config.effectType === 'stars') effectTypeId = 2;
    if (this.config.effectType === 'leaves') effectTypeId = 3;
    gl.uniform1i(uEffectTypeLoc, effectTypeId);

    // Pass rotation angle (convert degrees to radians)
    const uRotationLoc = gl.getUniformLocation(this.particleProgram, 'u_rotation');
    const angleDeg = this.config.particleAngle ?? 0;
    gl.uniform1f(uRotationLoc, angleDeg * Math.PI / 180.0);

    // Update Particles
    this.updateParticlesPhysics();

    // Upload Data
    const positions = new Float32Array(this.particles.flatMap(p => [p.x, p.y]));
    const sizes = new Float32Array(this.particles.map(p => p.size));
    const alphas = new Float32Array(this.particles.map(p => p.alpha));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);

    // Draw
    gl.enable(gl.BLEND);
    if (this.config.blendMode === 'screen') {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    gl.bindVertexArray(this.particleVao);
    gl.drawArrays(gl.POINTS, 0, this.particles.length);
  }

  private updateParticlesPhysics() {
    const { width, height } = this.canvas;
    const { effectType, speed } = this.config;

    for (const p of this.particles) {
      if (effectType === 'leaves') {
        p.x += (p.vx + Math.sin(p.y * 0.01 + performance.now() * 0.001) * 0.5) * speed;
      } else {
        p.x += p.vx * speed;
      }
      p.y += p.vy * speed;

      if (p.x > width) p.x = 0;
      if (p.x < 0) p.x = width;
      if (p.y > height) p.y = 0;
      if (p.y < 0) p.y = height;
    }
  }

  private render = () => {
    if (!this.isRunning) return;
    const gl = this.gl;
    if (!gl) return;

    // Clear Screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render based on effect type
    if (this.config.effectType === 'smoke') {
      this.renderSmoke();
    } else if (this.config.effectType !== 'none') {
      this.renderParticles();
    }

    this.animationFrameId = requestAnimationFrame(this.render);
  };

  public dispose() {
    this.stop();
    
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }

    if (this.gl) {
      const gl = this.gl;
      gl.deleteProgram(this.smokeProgram);
      gl.deleteProgram(this.particleProgram);
      
      gl.deleteBuffer(this.positionBuffer);
      gl.deleteBuffer(this.sizeBuffer);
      gl.deleteBuffer(this.alphaBuffer);
      gl.deleteBuffer(this.quadBuffer);
      gl.deleteVertexArray(this.particleVao);
      gl.deleteVertexArray(this.quadVao);
    }
  }
}
