/**
 * Platform-specific functionality.
 * Copyright Metrological, 2017
 */
class WebAdapter {

    init(stage) {
        this.stage = stage;
        this.canvas = null;
        this._looping = false;
        this._awaitingLoop = false;
    }

    startLoop() {
        this._looping = true;
        if (!this._awaitingLoop) {
            this.loop();
        }
    }

    stopLoop() {
        this._looping = false;
    }

    loop() {
        let self = this;
        let lp = function() {
            self._awaitingLoop = false;
            if (self._looping) {
                self.stage.drawFrame();
                requestAnimationFrame(lp);
                self._awaitingLoop = true;
            }
        }
        lp();
    }

    uploadGlTexture(gl, textureSource, source, hasAlpha) {
        let format = hasAlpha ? gl.RGBA : gl.RGB;

        if (source instanceof ImageData || source instanceof HTMLImageElement || source instanceof HTMLCanvasElement || source instanceof HTMLVideoElement || (window.ImageBitmap && source instanceof ImageBitmap)) {
            // Web-specific data types.
            gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, source);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, format, textureSource.w, textureSource.h, 0, format, gl.UNSIGNED_BYTE, source);
        }
    }

    loadSrcTexture(src, ts, sync, cb) {
        let isPng = (src.indexOf(".png") >= 0)
        if (window.OffthreadImage && OffthreadImage.available) {
            // For offthread support: simply include https://github.com/GoogleChrome/offthread-image/blob/master/dist/offthread-img.js
            // Possible optimisation: do not paint on canvas, but directly pass ImageData to texImage2d.
            let element = document.createElement('DIV');
            element.setAttribute('alt', '.');
            let image = new OffthreadImage(element);
            element.addEventListener('painted', function () {
                let canvas = element.childNodes[0];
                // Because a canvas stores all in RGBA alpha-premultiplied, GPU upload is fastest with those settings.
                cb(null, canvas, {renderInfo: {src}, hasAlpha: true, premultiplyAlpha: true});
            });
            image.src = src;
        } else {
            let image = new Image();
            if (!(src.substr(0,5) == "data:")) {
                // Base64.
                image.crossOrigin = "Anonymous";
            }
            image.onerror = function(err) {
                return cb("Image load error");
            };
            image.onload = function() {
                cb(null, image, {renderInfo: {src: src}, hasAlpha: isPng});
            };
            image.src = src;
        }
    }

    loadTextTexture(settings, ts, sync, cb) {
        // Generate the image.
        let tr = new TextRenderer(this.getDrawingCanvas(), settings);
        let rval = tr.draw();
        let renderInfo = rval.renderInfo;

        let options = {renderInfo: renderInfo, precision: rval.renderInfo.precision};
        let data = rval.canvas;
        cb(null, data, options);
    }

    createWebGLContext(w, h) {
        let canvas = this.stage.options.canvas || document.createElement('canvas');

        canvas.width = w;
        canvas.height = h;

        let opts = {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            stencil: true,
            preserveDrawingBuffer: false
        };

        let gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
        if (!gl) {
            throw new Error('This browser does not support webGL.');
        }

        this.canvas = canvas;

        return gl;
    }

    getWebGLCanvas() {
        return this.canvas;
    }

    getHrTime() {
        return window.performance ? window.performance.now() : (new Date()).getTime();
    }

    getDrawingCanvas() {
        if (!this.drawingCanvas) {
            this.drawingCanvas = document.createElement('canvas');
        }
        return this.drawingCanvas;
    }

    nextFrame(changes) {
        /* WebGL blits automatically */
    }

}

module.exports = WebAdapter;

let TextRenderer = require('../core/TextRenderer');