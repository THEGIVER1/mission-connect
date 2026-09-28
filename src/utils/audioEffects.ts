/**
 * Web Audio API Synthesizer Sound Effects
 * 100% Client-side synthetic sound generation (Zero external mp3 dependencies)
 */

class SoundEffectsController {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 1. 힌트 단계 공개 시 신비로운 차임벨 / 하프 아르페지오
  public playHintRevealSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.09 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.5);
    });
  }

  // 2. 3단계 정답 공개 시 팡파레 & 축하 브라스 코드
  public playAnswerFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chords = [
      { time: 0, notes: [523.25, 659.25, 783.99], dur: 0.22 }, // C Maj
      { time: 0.22, notes: [587.33, 698.46, 880.00], dur: 0.22 }, // D min
      { time: 0.44, notes: [659.25, 783.99, 1046.50], dur: 0.22 }, // E min
      { time: 0.68, notes: [783.99, 987.77, 1174.66, 1567.98], dur: 0.8 }, // G/C Grand
    ];

    chords.forEach(c => {
      c.notes.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + c.time);

        gain.gain.setValueAtTime(0, now + c.time);
        gain.gain.linearRampToValueAtTime(0.2, now + c.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + c.time);
        osc.stop(now + c.time + c.dur + 0.05);
      });
    });
  }

  // 3. 시상식 순위 발표 전 긴장감 넘치는 드럼롤
  public playDrumroll(durationSec: number = 1.2) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const hitCount = Math.floor(durationSec * 22);

    for (let i = 0; i < hitCount; i++) {
      const time = now + (i / hitCount) * durationSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + (i % 3) * 15, time);

      gain.gain.setValueAtTime(0.08 + (i / hitCount) * 0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.07);
    }
  }

  // 4. 1위 챔피언 발표 시 웅장한 대관식 팡파레
  public playChampionFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.playAnswerFanfare();
    setTimeout(() => {
      this.playHintRevealSound();
    }, 450);
  }
}

export const soundEffects = new SoundEffectsController();
