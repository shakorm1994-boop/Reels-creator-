import { VideoClip } from '../types/editor';

/**
 * Generates an in-memory test video clip with an animated vertical gradient,
 * floating particle graphics, timecode, and audio chime.
 * This allows instant testing of 6s looping, 10s multi-clip, and 20s trimming!
 */
export async function generateDemoVideo(
  durationSeconds = 6,
  title = 'Demo Reel Clip'
): Promise<VideoClip> {
  const width = 720;
  const height = 1280;
  const fps = 30;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create AudioContext for a subtle synth tone
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  
  // Oscillator for subtle background chime
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  // soft pulse
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks()
  ]);

  // Determine supported mimeType for recording demo
  let mimeType = 'video/webm;codecs=vp8,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 3_000_000
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = Math.round(durationSeconds * fps);
  let frame = 0;

  const drawFrame = () => {
    const progress = frame / totalFrames;
    const t = frame / fps;

    // Cinematic deep vertical gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    const hue1 = (progress * 120 + 240) % 360; // Blue to purple to amber
    const hue2 = (hue1 + 60) % 360;
    grad.addColorStop(0, `hsl(${hue1}, 75%, 15%)`);
    grad.addColorStop(0.5, `hsl(${(hue1 + 30) % 360}, 65%, 22%)`);
    grad.addColorStop(1, `hsl(${hue2}, 80%, 10%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative ambient circles
    for (let i = 0; i < 5; i++) {
      const cx = width * (0.2 + 0.6 * Math.sin(t * 0.8 + i));
      const cy = height * (0.2 + 0.6 * Math.cos(t * 0.6 + i * 1.5));
      const r = 120 + 40 * Math.sin(t + i);
      const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      radGrad.addColorStop(0, `hsla(${(hue1 + i * 40) % 360}, 90%, 65%, 0.35)`);
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines for cinematic feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 100; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Centered Badge / Label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const boxW = 540;
    const boxH = 260;
    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2 - 80;
    
    // Rounded rect
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'; // Amber outline
    ctx.lineWidth = 2;
    ctx.stroke();

    // App Branding & Title
    ctx.fillStyle = '#F59E0B'; // Amber
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REEL STUDIO DEMO', width / 2, boxY + 65);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(title, width / 2, boxY + 130);

    // Dynamic Timecode
    const timecode = `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}s / ${durationSeconds.toFixed(1)}s`;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 28px monospace';
    ctx.fillText(`DURATION: ${timecode}`, width / 2, boxY + 190);

    // Frame progress bar at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(60, height - 140, width - 120, 10);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(60, height - 140, (width - 120) * progress, 10);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('9:16 VERTICAL HD (720x1280)', width / 2, height - 90);
  };

  return new Promise<VideoClip>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      try {
        osc.stop();
        audioCtx.close();
      } catch {
        // ignore cleanup error
      }
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      resolve({
        id: 'demo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: `${title.toLowerCase().replace(/\s+/g, '_')}_${durationSeconds}s.mp4`,
        url,
        duration: durationSeconds,
        width,
        height,
      });
    };

    mediaRecorder.onerror = (err) => {
      reject(err);
    };

    mediaRecorder.start(100);

    const interval = 1000 / fps;
    const renderLoop = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }
      drawFrame();
      frame++;
      setTimeout(renderLoop, interval / 2); // faster than real time for quick generation
    };

    renderLoop();
  });
}
