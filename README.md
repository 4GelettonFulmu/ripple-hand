# Hand-Tracking Ripple Effect

An interactive webcam application that creates transparent water ripple effects based on hand movements. The program uses MediaPipe Hands for real-time hand tracking and WebGL shaders for realistic ripple distortion effects.

## Features

- **Real-time hand tracking** - Detects up to 2 hands simultaneously using MediaPipe
- **3D water ripple effects** - Creates realistic three-dimensional water ripples with depth
- **Advanced lighting** - Specular highlights, shadows, and Fresnel effects for realism
- **Normal mapping** - Dynamic surface normals calculated from wave displacement
- **Chromatic aberration** - Subtle color separation for authentic light refraction
- **Physics-based simulation** - Ripples spread naturally with realistic wave propagation
- **WebGL-powered rendering** - Smooth, GPU-accelerated visual effects
- **Movement-based activation** - Ripples appear when hands move in front of the camera

## How It Works

1. The application captures live video from your webcam
2. MediaPipe Hands tracks hand positions and movements in real-time
3. When a hand moves, ripples are generated at the hand's position
4. WebGL fragment shaders distort the camera image based on the ripple waves
5. The ripples spread outward, creating a transparent water-like effect that warps the view

## Technical Details

### Architecture

- **Frontend**: Pure HTML5, CSS3, and JavaScript (no build tools required)
- **Hand Tracking**: MediaPipe Hands library
- **Graphics**: WebGL with custom fragment shaders
- **Ripple Physics**: Time-based wave propagation with exponential decay

### 3D Ripple Effect

The three-dimensional ripple effect is achieved through advanced shader techniques:

**Surface Geometry:**
- **Normal mapping**: Surface normals calculated from wave height gradients
- **Wave height fields**: Combined displacement from multiple ripple sources
- **Displacement mapping**: UV coordinates offset based on ripple waves

**Lighting & Shading:**
- **Blinn-Phong shading**: Realistic diffuse and specular lighting
- **Directional lighting**: Virtual light source from top-right
- **Specular highlights**: Bright reflections on wave crests
- **Shadow/depth**: Darker troughs create depth perception
- **Fresnel effect**: Angle-dependent reflections for water-like appearance

**Visual Realism:**
- **Chromatic aberration**: RGB color channel separation for lens-like refraction
- **Edge highlights**: Bright blue-white glow at wave peaks
- **Edge glow**: Soft luminance around ripple rings
- **Refraction tint**: Subtle blue coloring in displaced areas

**Physics:**
- **Sinusoidal waves**: Natural wave propagation pattern
- **Exponential decay**: Ripples fade over time and distance
- **Wave interference**: Multiple ripples combine realistically

## Usage

### Running Locally

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, or Safari)
2. Grant webcam permissions when prompted
3. Wait for hand tracking to initialize
4. Move your hands in front of the camera to create ripples

### Using a Local Server (Recommended)

For better performance and security, use a local web server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Browser Requirements

- Modern browser with WebGL support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Webcam access
- JavaScript enabled
- Stable internet connection (for MediaPipe CDN)

## Configuration

You can modify the ripple behavior by adjusting parameters in `app.js`:

```javascript
// Maximum number of simultaneous ripples
this.maxRipples = 50;

// Ripple wave parameters (in fragment shader)
float rippleSpeed = 0.8;        // How fast ripples spread
float rippleFrequency = 15.0;   // Wave density
float rippleRadius = rippleTime * rippleSpeed;

// Displacement strength
displacement += direction * wave * 0.03;  // Adjust 0.03 for stronger/weaker distortion
```

## Performance Tips

- Close other applications to free up GPU resources
- Use a well-lit environment for better hand tracking
- Reduce `maxRipples` if experiencing lag
- Lower webcam resolution if needed (modify in `setupWebcam()`)

## Troubleshooting

### Webcam not working
- Ensure webcam permissions are granted
- Check if another application is using the webcam
- Try refreshing the page

### Hand tracking not detecting
- Ensure hands are clearly visible
- Improve lighting conditions
- Keep hands within camera frame
- Try moving hands more slowly

### Poor performance
- Close browser tabs and applications
- Lower webcam resolution in code
- Reduce `maxRipples` value
- Update graphics drivers

### Ripples not appearing
- Move hands more noticeably (faster movements create more ripples)
- Check browser console for errors
- Ensure WebGL is supported and enabled

## File Structure

```
ripple-hand/
├── index.html          # Main HTML structure and UI
├── app.js             # Application logic, WebGL shaders, and hand tracking
└── README.md          # Documentation
```

## How to Extend

### Add More Ripple Triggers

Modify the `onHandsDetected()` method to track other landmarks:

```javascript
// Add ripple at wrist
const wrist = landmarks[0];
this.addRipple(wrist.x, 1 - wrist.y);
```

### Customize Ripple Colors

Edit the fragment shader highlight section:

```javascript
// Change RGB values for different colors
color.rgb += vec3(highlight * 0.5, highlight * 0.2, highlight * 0.8);  // Purple ripples
```

### Adjust Movement Sensitivity

Modify the movement threshold in `onHandsDetected()`:

```javascript
// Lower value = more sensitive (more ripples)
if (movement > 0.002) {  // Default is 0.005
    this.addRipple(palmCenter.x, 1 - palmCenter.y);
}
```

## License

This project is open source and available for educational and personal use.

## Credits

- **MediaPipe Hands** - Google's hand tracking solution
- **WebGL** - Graphics rendering
- **getUserMedia API** - Webcam access
