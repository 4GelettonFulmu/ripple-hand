// Ripple Hand Tracking Application
class RippleApp {
    constructor() {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('canvas');
        this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true });

        this.ripples = [];
        this.maxRipples = 50;
        this.handPositions = new Map();
        this.lastHandPositions = new Map();

        this.videoReady = false;
        this.handsReady = false;

        // Initialize
        this.init();
    }

    async init() {
        try {
            await this.setupWebcam();
            this.setupWebGL();
            this.setupHandTracking();
            this.updateStatus('Ready', 'ready');
            document.getElementById('loading').style.display = 'none';
            this.render();
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error: ' + error.message, 'error');
        }
    }

    async setupWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1280,
                    height: 720,
                    facingMode: 'user'
                }
            });

            this.video.srcObject = stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    this.videoReady = true;
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('Webcam access denied or not available');
        }
    }

    setupWebGL() {
        const gl = this.gl;

        if (!gl) {
            throw new Error('WebGL not supported');
        }

        // Vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // Fragment shader with ripple distortion effect
        const fragmentShaderSource = `
            precision mediump float;

            uniform sampler2D u_texture;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform vec3 u_ripples[${this.maxRipples}];
            uniform int u_rippleCount;

            varying vec2 v_texCoord;

            void main() {
                vec2 uv = v_texCoord;
                vec2 displacement = vec2(0.0);

                // Apply ripple effects
                for (int i = 0; i < ${this.maxRipples}; i++) {
                    if (i >= u_rippleCount) break;

                    vec3 ripple = u_ripples[i];
                    vec2 ripplePos = ripple.xy;
                    float rippleTime = ripple.z;

                    vec2 diff = uv - ripplePos;
                    float dist = length(diff * u_resolution / u_resolution.y);

                    // Ripple wave parameters
                    float rippleSpeed = 0.8;
                    float rippleFrequency = 15.0;
                    float rippleRadius = rippleTime * rippleSpeed;

                    // Calculate wave
                    if (dist < rippleRadius && rippleRadius > 0.0) {
                        float wave = sin((dist - rippleRadius) * rippleFrequency) *
                                    exp(-rippleRadius * 2.0) *
                                    exp(-abs(dist - rippleRadius) * 8.0);

                        // Create displacement
                        vec2 direction = normalize(diff);
                        displacement += direction * wave * 0.03;
                    }
                }

                // Apply displacement to create distortion
                vec2 distortedUV = uv + displacement;

                // Clamp to prevent sampling outside texture
                distortedUV = clamp(distortedUV, 0.0, 1.0);

                // Sample the webcam texture
                vec4 color = texture2D(u_texture, distortedUV);

                // Add subtle ripple highlights
                float highlight = 0.0;
                for (int i = 0; i < ${this.maxRipples}; i++) {
                    if (i >= u_rippleCount) break;

                    vec3 ripple = u_ripples[i];
                    vec2 ripplePos = ripple.xy;
                    float rippleTime = ripple.z;

                    vec2 diff = uv - ripplePos;
                    float dist = length(diff * u_resolution / u_resolution.y);
                    float rippleRadius = rippleTime * 0.8;

                    if (abs(dist - rippleRadius) < 0.015 && rippleRadius < 0.5) {
                        highlight += (0.015 - abs(dist - rippleRadius)) *
                                    exp(-rippleRadius * 3.0) * 20.0;
                    }
                }

                // Add highlight to create transparent ripple effect
                color.rgb += vec3(highlight * 0.3, highlight * 0.4, highlight * 0.5);

                gl_FragColor = color;
            }
        `;

        // Compile shaders
        const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Program linking failed: ' + gl.getProgramInfoLog(this.program));
        }

        gl.useProgram(this.program);

        // Create vertex buffer
        const positions = new Float32Array([
            -1, -1,  0, 1,
             1, -1,  1, 1,
            -1,  1,  0, 0,
             1,  1,  1, 0
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Setup attributes
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

        // Setup texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Get uniform locations
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            ripples: gl.getUniformLocation(this.program, 'u_ripples'),
            rippleCount: gl.getUniformLocation(this.program, 'u_rippleCount')
        };

        this.startTime = Date.now();
    }

    compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compilation failed: ' + info);
        }

        return shader;
    }

    setupHandTracking() {
        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults((results) => this.onHandsDetected(results));

        const camera = new Camera(this.video, {
            onFrame: async () => {
                await hands.send({ image: this.video });
            },
            width: 1280,
            height: 720
        });

        camera.start();
        this.handsReady = true;
    }

    onHandsDetected(results) {
        const currentHandIds = new Set();

        if (results.multiHandLandmarks) {
            document.getElementById('handCount').textContent = results.multiHandLandmarks.length;

            results.multiHandLandmarks.forEach((landmarks, handIndex) => {
                const handId = `hand_${handIndex}`;
                currentHandIds.add(handId);

                // Use palm center (landmark 0) and middle finger tip (landmark 12) for ripple generation
                const palmCenter = landmarks[0];
                const middleFingerTip = landmarks[12];
                const indexFingerTip = landmarks[8];

                // Check for movement
                const currentPos = {
                    x: palmCenter.x,
                    y: palmCenter.y
                };

                const lastPos = this.lastHandPositions.get(handId);

                if (lastPos) {
                    const dx = currentPos.x - lastPos.x;
                    const dy = currentPos.y - lastPos.y;
                    const movement = Math.sqrt(dx * dx + dy * dy);

                    // Create ripples on movement
                    if (movement > 0.005) {
                        this.addRipple(palmCenter.x, 1 - palmCenter.y);

                        // Add ripples at finger tips for more effect
                        if (movement > 0.01) {
                            this.addRipple(middleFingerTip.x, 1 - middleFingerTip.y);
                            this.addRipple(indexFingerTip.x, 1 - indexFingerTip.y);
                        }
                    }
                }

                this.lastHandPositions.set(handId, currentPos);
                this.handPositions.set(handId, landmarks);
            });
        } else {
            document.getElementById('handCount').textContent = '0';
        }

        // Clean up positions for hands that are no longer detected
        for (const handId of this.lastHandPositions.keys()) {
            if (!currentHandIds.has(handId)) {
                this.lastHandPositions.delete(handId);
                this.handPositions.delete(handId);
            }
        }
    }

    addRipple(x, y) {
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift();
        }

        this.ripples.push({
            x: x,
            y: y,
            time: 0,
            startTime: Date.now()
        });
    }

    updateRipples() {
        const currentTime = Date.now();

        // Update ripple times and remove old ones
        this.ripples = this.ripples.filter(ripple => {
            ripple.time = (currentTime - ripple.startTime) / 1000.0;
            return ripple.time < 1.5; // Remove ripples after 1.5 seconds
        });

        document.getElementById('rippleCount').textContent = this.ripples.length;
    }

    render() {
        if (!this.videoReady || !this.handsReady) {
            requestAnimationFrame(() => this.render());
            return;
        }

        const gl = this.gl;

        // Update texture with video frame
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);

        // Update ripples
        this.updateRipples();

        // Set uniforms
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.time, (Date.now() - this.startTime) / 1000.0);

        // Pass ripple data to shader
        const rippleData = new Float32Array(this.maxRipples * 3);
        this.ripples.forEach((ripple, i) => {
            rippleData[i * 3] = ripple.x;
            rippleData[i * 3 + 1] = ripple.y;
            rippleData[i * 3 + 2] = ripple.time;
        });

        gl.uniform3fv(this.uniforms.ripples, rippleData);
        gl.uniform1i(this.uniforms.rippleCount, this.ripples.length);

        // Draw
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(() => this.render());
    }

    updateStatus(message, className) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = className;
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new RippleApp());
} else {
    new RippleApp();
}
