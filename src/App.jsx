import { useEffect, useRef, useState } from 'react'

function App() {
  const [audioContext, setAudioContext] = useState(null);
  const audioContextRef = useRef(null);
  const rafIdRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);

  const startAudio = async (type = "bars") => {
    if (audioContextRef.current) return;

    try {
      await startMic(type == "bars" ? 32 : 128);
      
      const analyser = analyserRef.current; 
      if (!analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let x;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const startIndex = 6;
      const endIndex = bufferLength - 3;
      const visibleBars = endIndex - startIndex;
      const gap = 2;
      const totalGap = gap * (visibleBars - 1);
      const barWidth = (canvasWidth - totalGap) / visibleBars;
      const minBarHeight = 5;
      let barHeight;
      ctx.strokeStyle = '#74d4ff';
      ctx.fillStyle = '#74d4ff';

      function wave() {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);        
        ctx.beginPath();

        const sliceWidth = canvasWidth * 1.0 / (bufferLength - 1);
        const time = Date.now() / 200;
        x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const idleWave = Math.sin(i * 0.5 + time) * 0.05;
          let v = (dataArray[i] / 128.0) - 1;
          v = v * 1.5 + idleWave;
          const y = (canvasHeight / 2) + (v * (canvasHeight / 2));

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = x - sliceWidth;
            const prevY = (canvasHeight / 2) + (((dataArray[i-1] / 128.0) - 1) * 1.5 + Math.sin((i-1) * 0.5 + time) * 0.05) * (canvasHeight);

            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
          
          x += sliceWidth;
        }

        const lastV = ((dataArray[bufferLength - 1] / 128.0) - 1) * 1.5 + Math.sin((bufferLength - 1) * 0.5 + time) * 0.05;
        const lastY = (canvasHeight / 2) + (lastV * (canvasHeight / 2));
        ctx.lineTo(canvasWidth, lastY);
        
        ctx.stroke();
        rafIdRef.current = requestAnimationFrame(wave);
      }

      function bars() {
        x = 0;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        analyser.getByteFrequencyData(dataArray);
        for (let i = startIndex; i < bufferLength - 3; i++) {
          barHeight = dataArray[i] + minBarHeight;
          ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
          x += barWidth + gap;
        }
        rafIdRef.current = requestAnimationFrame(bars);
      }

      switch (type) {
        case "wave":
          wave();
          break;
        case "bars":
          bars();
          break;
      }

    } catch (e) {
      console.error("Failed to connect:", e);
    }
  };

  const startMic = async (fft) => {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioCtx;
    mediaStreamRef.current = stream;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyserRef.current = analyser;
    
    setAudioContext(audioCtx);

    analyser.fftSize = fft;
    source.connect(analyser);
  }

  const stopAudio = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setAudioContext(null);
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-screen bg-slate-900">
      <canvas ref={canvasRef} className="w-xs aspect-3/1"/>
      <button 
        className="block bg-sky-300 text-slate-700 px-8 py-4 text-2xl font-semibold rounded cursor-pointer" 
        onClick={() => audioContext ? stopAudio() : startAudio()}
      >
        {audioContext ? 'Stop' : 'Start'} Microphone
      </button>
    </div>
  )
}

export default App