export class FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext, width: number, height: number, internalFormat: number, format: number, type: number) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  attach(id: number) {
    this.gl.activeTexture(this.gl.TEXTURE0 + id);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    return id;
  }
}

export class DoubleFBO {
  width: number;
  height: number;
  read: FBO;
  write: FBO;

  constructor(gl: WebGL2RenderingContext, width: number, height: number, internalFormat: number, format: number, type: number) {
    this.width = width;
    this.height = height;
    this.read = new FBO(gl, width, height, internalFormat, format, type);
    this.write = new FBO(gl, width, height, internalFormat, format, type);
  }

  swap() {
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }
}
