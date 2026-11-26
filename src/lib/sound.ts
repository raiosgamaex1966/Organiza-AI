// Sinal sonoro suave usando Web Audio API (sem dependência de arquivos externos)
export function playNotificationSound(type: "success" | "alert" = "success") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    if (type === "success") {
      playTone(587.33, 0, 0.14); // D5
      playTone(880.0, 0.1, 0.22); // A5
    } else {
      playTone(523.25, 0, 0.15); // C5
      playTone(659.25, 0.14, 0.15); // E5
      playTone(783.99, 0.28, 0.25); // G5
    }
  } catch {
    // Ignora se o navegador bloquear áudio antes de interação do usuário
  }
}
