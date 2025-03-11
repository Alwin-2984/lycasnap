"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import Link from "next/link";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function Home() {
  // Existing refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // New refs for 3D rendering
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);  // Add a camera ref
  const glassesModelRef = useRef(null);

  // Existing state
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [detectionRunning, setDetectionRunning] = useState(false);
  
  // New state for glasses
  const [glassesVisible, setGlassesVisible] = useState(false);
  const [glassesLoaded, setGlassesLoaded] = useState(false);

  // Initialize everything when the component mounts
  useEffect(() => {
    initializeFaceLandmarker();
    initializeThreeJS();
    loadGlassesModel();
    
    // Resize handler for the renderer
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start the webcam once the FaceLandmarker is initialized
  useEffect(() => {
    if (faceLandmarker) {
      startWebcam();
    }
  }, [faceLandmarker]);

  // Function to initialize the FaceLandmarker and set up the canvas context
  const initializeFaceLandmarker = async () => {
    try {
      // Load the necessary files for the FaceLandmarker
      const filesetResolver = await FilesetResolver.forVisionTasks("/models/wasm");

      // Create the FaceLandmarker instance with the specified options
      const faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "/models/face_landmarker.task", // Path to the model file
          delegate: "GPU", // Use GPU for faster processing
        },
        outputFaceBlendshapes: true, // Enable face blendshapes output
        runningMode: "VIDEO", // Set running mode to video for real-time processing
        numFaces: 1, // Detect one face at a time
      });

      // Save the FaceLandmarker instance to the state
      setFaceLandmarker(faceLandmarkerInstance);
      console.log("FaceLandmarker initialized:", faceLandmarkerInstance);

      // Initialize the canvas context
      if (canvasRef.current) {
        const context = canvasRef.current.getContext("2d");
        setCtx(context);
        console.log("Canvas context initialized:", context);
      }
    } catch (error) {
      console.error("Error initializing FaceLandmarker:", error);
    }
  };

  // Function to start the webcam and begin face detection
  const startWebcam = async () => {
    console.log("Attempting to start webcam...");

    // Check if the FaceLandmarker is ready
    if (!faceLandmarker) {
      alert("Face Landmarker is still loading. Please try again.");
      console.error("Face Landmarker not initialized.");
      return;
    }

    const constraints = {
      video: true, // Request access to the user's webcam
    };

    try {
      // Get the video stream from the user's webcam
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream; // Set the video source to the webcam stream
      videoRef.current.style.display = "block"; // Show the video element
      setWebcamRunning(true); // Update the state to indicate that the webcam is running
      console.log("Webcam stream started.");

      // Start face detection once the video data is loaded
      videoRef.current.addEventListener("loadeddata", () => {
        console.log("Video data loaded, starting detection...");
        setDetectionRunning(true); // Set detection running state to true
        detect(); // Start the detection loop
      });
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  // Function to stop the webcam and face detection
  const stopWebcam = () => {
    const stream = videoRef.current.srcObject;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop()); // Stop all tracks (video and audio)
    }
    videoRef.current.style.display = "none"; // Hide the video element
    setWebcamRunning(false); // Update the state to indicate that the webcam is stopped
    setDetectionRunning(false); // Stop the detection loop
    console.log("Webcam stopped.");
  };

  // Function to draw the detected face landmarks on the canvas
  const drawLandmarks = (landmarks, ctx, color) => {
    ctx.fillStyle = color; // Set the color for the landmarks
    ctx.lineWidth = 1; // Set the line width for drawing

    // Loop through each landmark and draw a point on the canvas
    landmarks.forEach((landmark) => {
      const x = landmark.x * canvasRef.current.width; // Scale x-coordinate to canvas width
      const y = landmark.y * canvasRef.current.height; // Scale y-coordinate to canvas height
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 1 * Math.PI); // Draw a small circle at the landmark position
      ctx.fill(); // Fill the circle with the specified color
    });
  };

  // Function to continuously detect face landmarks in the video stream
  const detect = async () => {
    // Existing checks remain the same
    if (!faceLandmarker || !ctx || !videoRef.current || !detectionRunning) {
      console.log("Detection prerequisites not met or detection stopped.");
      return;
    }

    // Make sure video and canvas have dimensions before proceeding
    if (
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      requestAnimationFrame(detect);
      return;
    }
    
    // Set canvas dimensions to match video if they don't match
    if (canvasRef.current && 
        (canvasRef.current.width !== videoRef.current.videoWidth ||
         canvasRef.current.height !== videoRef.current.videoHeight)) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
    }

    // Run face landmark detection
    const results = faceLandmarker.detectForVideo(videoRef.current, performance.now());

    // Clear the canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw video frame onto canvas (makes video visible)
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Process landmarks if detected
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      results.faceLandmarks.forEach((landmarks) => {
        drawLandmarks(landmarks, ctx, "#ffffff");
        
        if (glassesModelRef.current && glassesVisible) {
          positionGlasses(landmarks);
        }
      });
    }
    
    // Render 3D scene with the stored camera
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    // Continue detection loop
    if (webcamRunning) {
      requestAnimationFrame(detect);
    }
  };

  // Function to take a snapshot of the current video frame and landmarks
  const takeSnapshot = () => {
    if (!canvasRef.current || !ctx) return;

    // Redraw the video frame and the landmarks on the canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Draw landmarks again before taking the snapshot
    if (faceLandmarker) {
      const results = faceLandmarker.detectForVideo(
        videoRef.current,
        performance.now()
      );

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        results.faceLandmarks.forEach((landmarks) => {
          drawLandmarks(landmarks, ctx, "#00FF00"); // Draw the landmarks in green for the snapshot
        });
      }
    }

    // Convert the canvas content to a PNG image and trigger a download
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "snapshot.png"; // Set the filename for the snapshot
    link.click(); // Trigger the download
  };

  // Start the detection loop if detectionRunning is true
  useEffect(() => {
    if (detectionRunning) {
      detect();
    }
  }, [detectionRunning]);

 // Initialize Three.js scene
const initializeThreeJS = () => {
  // Create a scene
  const scene = new THREE.Scene();
  sceneRef.current = scene;
  
  // Create a camera once and store it in a ref - use an orthographic camera
  // This makes positioning easier since we're matching a 2D video
  const aspectRatio = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(
    45,  // Use a more natural field of view
    aspectRatio,
    0.1,
    1000
  );
  camera.position.z = 5;  // Position the camera at a reasonable distance
  cameraRef.current = camera;
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
  
  // Create renderer with proper size matching the video
  const renderer = new THREE.WebGLRenderer({ 
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);  // Transparent background
  
  // Add renderer to the document
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '15';
  renderer.domElement.style.pointerEvents = 'none';
  document.body.appendChild(renderer.domElement);
  
  rendererRef.current = renderer;
};

  // Load the glasses 3D model
  const loadGlassesModel = () => {
    const loader = new GLTFLoader();
    
    // Make sure this path is correct
    loader.load(
      '/models/glasses.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Adjust the initial scale - try larger value first
        model.scale.set(0.1, 0.1, 0.1);
        model.visible = false;
        
        // Center the model's pivot point if needed
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        sceneRef.current.add(model);
        glassesModelRef.current = model;
        setGlassesLoaded(true);
        console.log('Glasses model loaded successfully');
      },
      (progress) => {
        console.log('Loading glasses model:', (progress.loaded / progress.total) * 100, '% loaded');
      },
      (error) => {
        console.error('Error loading glasses model:', error);
      }
    );
  };

  // Function to toggle glasses visibility
  const toggleGlasses = () => {
    if (glassesLoaded) {
      const newVisibility = !glassesVisible;
      setGlassesVisible(newVisibility);
      if (glassesModelRef.current) {
        glassesModelRef.current.visible = newVisibility;
        console.log(`Glasses visibility set to: ${newVisibility}`);
      }
    } else {
      alert("Glasses model is still loading. Please wait.");
    }
  };

  // Function to position the glasses based on face landmarks
  const positionGlasses = (landmarks) => {
    if (!glassesModelRef.current || !videoRef.current || !cameraRef.current) return;
  
    // Get key facial landmarks for glasses positioning
    const leftEye = landmarks[33];   // Left eye
    const rightEye = landmarks[263];  // Right eye
    const noseBridge = landmarks[168]; // Nose bridge
  
    // Calculate eye distance for scaling purposes
    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + 
      Math.pow(rightEye.y - leftEye.y, 2)
    );
  
    // Convert the normalized nose bridge coordinate to NDC (Normalized Device Coordinates)
    // NDC values range from -1 to 1. 
    const ndc = new THREE.Vector3(
      noseBridge.x * 2 - 1,
      -(noseBridge.y * 2 - 1),
      0.5 // using 0.5 as an approximation for depth; adjust if necessary
    );
    
    // Use the camera's projection matrix to convert NDC to world coordinates
    ndc.unproject(cameraRef.current);
    
    // Update the glasses model position based on the unprojected vector
    glassesModelRef.current.position.copy(ndc);
  
    // Scale the glasses based on eye distance - adjust the multiplier as needed
    const scale = eyeDistance * 10;
    glassesModelRef.current.scale.set(scale, scale, scale);
  
    // Calculate rotation based on face orientation
    const faceAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    glassesModelRef.current.rotation.z = -faceAngle;
  
    // Additional rotation adjustments using forehead and chin landmarks
    const foreheadPoint = landmarks[10];
    const chinPoint = landmarks[152];
    const faceTilt = Math.atan2(foreheadPoint.z - chinPoint.z, foreheadPoint.y - chinPoint.y);
    glassesModelRef.current.rotation.x = faceTilt;
    
    // Y-rotation adjustment based on face pose
    const leftRightTilt = Math.atan2(rightEye.z - leftEye.z, rightEye.x - leftEye.x);
    glassesModelRef.current.rotation.y = leftRightTilt;
    
    // Logging for debugging
    console.log(`Glasses positioned at: (${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}, ${ndc.z.toFixed(2)}), Scale: ${scale.toFixed(2)}`);
  };
  

  return (
    <div className="relative overflow-hidden flex items-center justify-center h-screen bg-[#F16B5E] cursor-default">
      {/* Particle Animation Background */}
      <div className="absolute inset-0 z-0">
        {[...Array(50)].map((_, i) => (
          <div key={i} className={`particle-animation particle-${i % 5}`}></div>
        ))}
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        {/* Title */}
        <h1 className="text-xl md:text-2xl text-white tracking-wider mb-10">
          Face Landmarker
        </h1>
        <div className="relative inline-block">
          {/* Video element for webcam feed */}
<video
  ref={videoRef}
  id="webcam"
  style={{
    width: "640px",  // Set specific dimensions
    height: "480px",
    position: "relative",
    zIndex: 5,
  }}
  autoPlay
  playsInline
></video>
          {/* Canvas element for drawing face landmarks */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              pointerEvents: "none",
              width: "100%",
              height: "100%",
            }}
          ></canvas>
        </div>
        <div className='flex flex-col md:flex-row space-x-0 md:space-x-5'>
          {/* Button to take a snapshot */}
          <button
            onClick={takeSnapshot}
            className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 ease-in-out mt-5"
            style={{ boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.2)' }}
          >
            Take Snapshot
          </button>
          {/* Button to toggle glasses */}
          <button
            onClick={toggleGlasses}
            className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 ease-in-out mt-5"
            style={{ boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.2)' }}
          >
            {glassesVisible ? 'Remove Glasses' : 'Try Glasses'}
          </button>
          {/* Link to go back to the home page */}
          <Link
            href='/'
            className="bg-[#F16B5E] text-white font-bold py-3 px-10 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition duration-300 ease-in-out mt-5"
            style={{ boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.2)' }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
