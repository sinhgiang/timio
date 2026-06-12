// Client-side only — never import at module level in server components.

let modelsLoading: Promise<void> | null = null;

export async function ensureModels() {
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    const faceapi = await import("@vladmandic/face-api");
    const MODEL_PATH = "/models";

    await Promise.all([
      faceapi.nets.tinyFaceDetector.isLoaded
        ? Promise.resolve()
        : faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.isLoaded
        ? Promise.resolve()
        : faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.isLoaded
        ? Promise.resolve()
        : faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);

    // Warmup: chạy 1 lần detection trên canvas trắng để TF.js khởi tạo WebGL backend
    // — các lần sau sẽ nhanh hơn nhiều
    const warmup = document.createElement("canvas");
    warmup.width = 224;
    warmup.height = 224;
    try {
      await faceapi.detectSingleFace(
        warmup,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
      );
    } catch {
      // ignore warmup errors (expected: no face found on blank canvas)
    }
  })();

  return modelsLoading;
}

/**
 * Chụp frame hiện tại của video → trả về canvas.
 * Gọi hàm này TRƯỚC khi unmount video (trước setPhase).
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Extract 128-dim face descriptor từ canvas/video.
 * Timeout 12 giây để tránh hang vĩnh viễn.
 */
export async function extractDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<number[] | null> {
  await ensureModels();
  const faceapi = await import("@vladmandic/face-api");

  const detectionPromise = faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout: nhận diện quá 12 giây")), 12000)
  );

  const result = await Promise.race([detectionPromise, timeoutPromise]);
  if (!result) return null;
  return Array.from(result.descriptor);
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect tất cả khuôn mặt trong video, trả về bounding box của mặt LỚN NHẤT.
 * Dùng cho auto-zoom trong FaceCapture.
 */
export async function detectFaceBox(video: HTMLVideoElement): Promise<FaceBox | null> {
  await ensureModels();
  const faceapi = await import("@vladmandic/face-api");

  const detections = await faceapi.detectAllFaces(
    video,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
  );

  if (!detections.length) return null;

  // Chọn mặt có diện tích lớn nhất (gần camera nhất / chủ thể chính)
  const largest = detections.reduce((best, d) =>
    d.box.area > best.box.area ? d : best
  );

  return {
    x: largest.box.x,
    y: largest.box.y,
    width: largest.box.width,
    height: largest.box.height,
  };
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function eyeAspectRatio(pts: { x: number; y: number }[]): number {
  // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
  // pts[0]=corner, pts[1-2]=upper, pts[3]=corner, pts[4-5]=lower
  const A = dist2D(pts[1], pts[5]);
  const B = dist2D(pts[2], pts[4]);
  const C = dist2D(pts[0], pts[3]);
  return (A + B) / (2 * C);
}

/**
 * Tính Eye Aspect Ratio (EAR) từ video.
 * EAR < 0.20 = mắt nhắm (đang chớp). EAR ≈ 0.30 = mắt mở bình thường.
 * Trả về null nếu không tìm thấy khuôn mặt.
 */
export async function detectEAR(video: HTMLVideoElement): Promise<number | null> {
  await ensureModels();
  const faceapi = await import("@vladmandic/face-api");

  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceLandmarks();

  if (!result) return null;

  const pts = result.landmarks.positions;
  // Left eye: landmarks 36-41, Right eye: 42-47
  const leftEye = Array.from({ length: 6 }, (_, i) => ({ x: pts[36 + i].x, y: pts[36 + i].y }));
  const rightEye = Array.from({ length: 6 }, (_, i) => ({ x: pts[42 + i].x, y: pts[42 + i].y }));

  return (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
}

export interface EmployeeFaceData {
  id: string;
  name: string;
  descriptors: number[][];
}

export function findBestMatch(
  descriptor: number[],
  employees: EmployeeFaceData[],
  threshold = 0.5
): { id: string; name: string; distance: number } | null {
  let best: { id: string; name: string; distance: number } | null = null;

  for (const emp of employees) {
    for (const stored of emp.descriptors) {
      const dist = euclidean(descriptor, stored);
      if (!best || dist < best.distance) {
        best = { id: emp.id, name: emp.name, distance: dist };
      }
    }
  }

  return best && best.distance < threshold ? best : null;
}
