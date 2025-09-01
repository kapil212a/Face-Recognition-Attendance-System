const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const attendanceList = document.getElementById("attendance-list");
const clearBtn = document.getElementById("clear-btn");
let detectedNames = new Set();

// models
async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromUri("models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("models");
  console.log(" Models loaded");
  startCamera();
}

// Start camera
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error("Camera error:", err));
}

// Load images
async function loadLabeledImages() {
  const labels = [
    { name: "Aman", file: "Aman.jpg" },
    { name: "Rohit", file: "Rohit.jpg" }
  ];
  return Promise.all(
    labels.map(async ({ name, file }) => {
      const img = await faceapi.fetchImage(`${file}?v=${Date.now()}`);
      const det = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        console.warn(` No face detected in ${file}`);
        return null;
      }

      return new faceapi.LabeledFaceDescriptors(name, [det.descriptor]);
    })
  ).then(results => results.filter(r => r !== null));
}

// Recognize faces 
video.addEventListener("play", async () => {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(overlay, displaySize);

  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resized = faceapi.resizeResults(detections, displaySize);
    overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);

    resized.forEach((detection, i) => {
      const match = faceMatcher.findBestMatch(detection.descriptor);
      const box = detection.detection.box;
      new faceapi.draw.DrawBox(box, { label: match.toString() }).draw(overlay);

      const name = match.label;
      if (name !== "unknown" && !detectedNames.has(name)) {
        detectedNames.add(name);
        const li = document.createElement("li");
        li.textContent = `${name} (${new Date().toLocaleTimeString()})`;
        attendanceList.appendChild(li);
      }
    });
  }, 200);
});

// Clear attendance list
clearBtn.addEventListener("click", () => {
  attendanceList.innerHTML = "";
  detectedNames.clear();
  console.log("Attendance cleared");
});

loadModels();
