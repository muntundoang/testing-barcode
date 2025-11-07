# QR Code Scanner

A modern QR code scanner built with Next.js that supports both camera scanning and image file uploads.

## Features

### 📷 Camera Scanner
- **Real-time scanning**: Scan QR codes using your webcam or phone camera
- **Camera switching**: Toggle between front and back cameras on mobile devices
- **Smart scanning**: Prevents duplicate scans and provides audio feedback
- **Mobile optimized**: Works great on both desktop and mobile devices

### 📁 File Upload
- Drag and drop support for image files
- Support for JPG, PNG, GIF, and WebP formats
- Automatic QR code detection and decoding

### 📊 Data Processing
- Raw data display with copy-to-clipboard functionality
- Automatic parsing of URL-encoded JSON data
- Structured display for parsed item information

## How to Use

### Camera Scanning
1. Click "Start Camera" to access your camera
2. Allow camera permissions when prompted
3. Point your camera at a QR code
4. Click "Start Scanning" to begin automatic detection
5. Use "Switch Camera" to toggle between front/back cameras on mobile
6. The scanner will automatically stop and display results when a QR code is detected

### File Upload
1. Either drag and drop an image file onto the upload area
2. Or click "Choose File" to select an image from your device
3. The QR code will be automatically detected and decoded

## Camera Permissions

For the camera scanner to work, you'll need to:
- Grant camera permissions when prompted by your browser
- Ensure you're accessing the app via HTTPS in production
- For local development, `localhost` is automatically trusted by most browsers

## Supported Browsers

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Mobile Usage

The app is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Automatic camera selection (back camera by default)
- Camera switching capability
- Responsive button layout
