import { useEffect, useRef } from 'react';

interface DungeonRewardAnimationProps {
  xpEarned: number;
  goldEarned: number;
  onComplete: () => void;
}

/**
 * DungeonRewardAnimation — plays after dungeon workout completion.
 *
 * Flow:
 * 1. Force header visible
 * 2. Highlight XP bar area with cyan glow
 * 3. Fly 12 cyan orbs from center → #navbar-xp-bar
 * 4. Show floating "+XP" label
 * 5. Slide gold counter down from top
 * 6. Fly 10 gold crystal images from center → counter
 * 7. Counter exits, cleanup, onComplete
 *
 * Renders nothing — all animation is imperative DOM manipulation.
 * Tracks all created DOM elements and timeouts for proper cleanup on unmount.
 */
const DungeonRewardAnimation: React.FC<DungeonRewardAnimationProps> = ({
  xpEarned,
  goldEarned,
  onComplete,
}) => {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current || (xpEarned <= 0 && goldEarned <= 0)) {
      onComplete();
      return;
    }
    ranRef.current = true;

    // ── Cleanup tracking ──
    let cancelled = false;
    const domElements: HTMLElement[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const animations: Animation[] = [];

    const track = (el: HTMLElement) => { domElements.push(el); return el; };
    const delay = (fn: () => void, ms: number) => {
      const id = setTimeout(() => { if (!cancelled) fn(); }, ms);
      timers.push(id);
      return id;
    };
    // Safety: if .onfinish doesn't fire (tab backgrounded), force after duration + buffer
    const safeAnimate = (el: HTMLElement, keyframes: Keyframe[], opts: KeyframeAnimationOptions, onFinish: () => void) => {
      const anim = el.animate(keyframes, opts);
      animations.push(anim);
      let finished = false;
      const done = () => { if (!finished && !cancelled) { finished = true; onFinish(); } };
      anim.onfinish = done;
      // Fallback timer: duration + delay + 200ms buffer
      const dur = (typeof opts.duration === 'number' ? opts.duration : 600) + (typeof opts.delay === 'number' ? opts.delay : 0) + 200;
      delay(done, dur);
    };

    const safeComplete = () => { if (!cancelled) onComplete(); };

    // Force header visible
    window.dispatchEvent(new CustomEvent('reforge:force-header', { detail: { duration: 5000 } }));

    const startAfter = () => {
      const bar = document.getElementById('navbar-xp-bar');
      if (bar) {
        runAnimation(bar);
      } else {
        delay(() => {
          const bar2 = document.getElementById('navbar-xp-bar');
          if (bar2) runAnimation(bar2);
          else safeComplete();
        }, 250);
      }
    };

    // Small delay to let ActiveWorkoutPlayer unmount cleanly
    delay(startAfter, 300);

    function runAnimation(barEl: HTMLElement) {
      if (cancelled) return;
      if (xpEarned > 0) {
        highlightXpBar(barEl, true);
        flyXpOrbs(barEl, xpEarned, () => {
          delay(() => highlightXpBar(barEl, false), 800);
          if (goldEarned > 0) {
            delay(() => runGoldPhase(), 400);
          } else {
            delay(safeComplete, 600);
          }
        });
      } else if (goldEarned > 0) {
        runGoldPhase();
      } else {
        safeComplete();
      }
    }

    function runGoldPhase() {
      if (cancelled) return;
      const counter = createGoldCounter();
      track(counter);
      document.body.appendChild(counter);

      requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          counter.classList.add('drga-visible');
        });
      });

      delay(() => {
        flyGoldCrystals(counter, goldEarned, () => {
          delay(() => {
            counter.classList.remove('drga-visible');
            counter.classList.add('drga-exit');
            delay(safeComplete, 500);
          }, 1200);
        });
      }, 500);
    }

    // ── XP BAR HIGHLIGHT ──
    function highlightXpBar(bar: HTMLElement, on: boolean) {
      if (cancelled) return;
      if (on) {
        bar.style.transition = 'box-shadow 0.3s';
        bar.style.boxShadow = '0 0 16px rgba(0,212,255,0.6), 0 0 6px rgba(0,212,255,0.8), 0 0 30px rgba(0,212,255,0.2)';
      } else {
        bar.style.boxShadow = '';
        delay(() => { bar.style.transition = ''; }, 350);
      }
    }

    // ── FLY XP ORBS ──
    function flyXpOrbs(barEl: HTMLElement, totalXp: number, onDone: () => void) {
      if (cancelled) return;
      const barRect = barEl.getBoundingClientRect();
      const tx = barRect.left + barRect.width / 2;
      const ty = barRect.top + barRect.height / 2;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const count = 12;
      let landed = 0;

      const label = track(document.createElement('div'));
      label.className = 'drga-float-label';
      label.textContent = `+${totalXp} XP`;
      label.style.left = `${barRect.right + 8}px`;
      label.style.top = `${barRect.top - 4}px`;
      label.style.color = '#00d4ff';
      label.style.textShadow = '0 0 10px rgba(0,212,255,0.7)';
      document.body.appendChild(label);

      let labelShown = false;

      for (let i = 0; i < count; i++) {
        const orb = track(document.createElement('div'));
        orb.className = 'drga-xp-orb';
        const sx = cx + (Math.random() - 0.5) * 100;
        const sy = cy + (Math.random() - 0.5) * 70;
        orb.style.left = `${sx}px`;
        orb.style.top = `${sy}px`;
        document.body.appendChild(orb);

        const orbDelay = i * 22;
        const dur = 380 + Math.random() * 120;
        const cpx = (sx + tx) / 2 + (Math.random() - 0.5) * 60;
        const cpy = Math.min(sy, ty) - 30 - Math.random() * 50;

        delay(() => {
          if (cancelled) return;
          safeAnimate(orb, [
            { left: `${sx}px`, top: `${sy}px`, opacity: '1', transform: 'scale(1)' },
            { left: `${cpx}px`, top: `${cpy}px`, opacity: '1', transform: 'scale(1.2)', offset: 0.4 },
            { left: `${tx}px`, top: `${ty}px`, opacity: '0.4', transform: 'scale(0.3)' },
          ], { duration: dur, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' }, () => {
            orb.remove();
            landed++;

            // Pulse bar
            barEl.animate([
              { boxShadow: '0 0 14px rgba(0,212,255,0.7), 0 0 6px rgba(0,212,255,0.4) inset' },
              { boxShadow: '0 0 2px rgba(0,212,255,0.1)' },
            ], { duration: 150, easing: 'ease-out' });

            if (landed >= 3 && !labelShown) {
              labelShown = true;
              label.style.opacity = '1';
              label.style.transform = 'translateY(0)';
            }

            if (landed >= count) {
              delay(() => {
                label.style.opacity = '0';
                label.style.transform = 'translateY(-8px)';
                delay(() => { label.remove(); onDone(); }, 250);
              }, 350);
            }
          });
        }, orbDelay);
      }
    }

    // ── GOLD COUNTER ──
    function createGoldCounter(): HTMLDivElement {
      const counter = document.createElement('div');
      counter.className = 'drga-gold-counter';
      counter.id = 'drga-gold-counter';
      counter.innerHTML = `
        <img src="/assets/gold-coin.png" class="drga-gc-img" alt="" />
        <div class="drga-gc-info">
          <div class="drga-gc-value" id="drga-gc-value">0</div>
          <div class="drga-gc-label">GOLD EARNED</div>
        </div>
      `;
      return counter;
    }

    // ── FLY GOLD CRYSTALS ──
    function flyGoldCrystals(counterEl: HTMLElement, totalGold: number, onDone: () => void) {
      if (cancelled) return;
      const tRect = counterEl.getBoundingClientRect();
      const tx = tRect.left + tRect.width / 2;
      const ty = tRect.top + tRect.height / 2;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const count = 10;
      let landed = 0;
      const perCrystal = Math.ceil(totalGold / count);
      let accumulated = 0;

      for (let i = 0; i < count; i++) {
        const orb = track(document.createElement('div'));
        orb.className = 'drga-gold-orb';
        const img = document.createElement('img');
        img.src = '/assets/gold-coin.png';
        orb.appendChild(img);

        const sx = cx + (Math.random() - 0.5) * 120;
        const sy = cy + (Math.random() - 0.5) * 80;
        orb.style.left = `${sx}px`;
        orb.style.top = `${sy}px`;
        document.body.appendChild(orb);

        const orbDelay = i * 40;
        const dur = 380 + Math.random() * 180;
        const cpx = (sx + tx) / 2 + (Math.random() - 0.5) * 50;
        const cpy = Math.min(sy, ty) - 20 - Math.random() * 40;

        delay(() => {
          if (cancelled) return;
          safeAnimate(orb, [
            { left: `${sx}px`, top: `${sy}px`, opacity: '1', transform: 'scale(1)' },
            { left: `${cpx}px`, top: `${cpy}px`, opacity: '1', transform: 'scale(1.15)', offset: 0.4 },
            { left: `${tx}px`, top: `${ty}px`, opacity: '0.5', transform: 'scale(0.3)' },
          ], { duration: dur, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' }, () => {
            orb.remove();
            landed++;

            accumulated = Math.min(accumulated + perCrystal, totalGold);
            const valEl = document.getElementById('drga-gc-value');
            if (valEl) valEl.textContent = String(accumulated);

            counterEl.style.animation = 'none';
            void counterEl.offsetWidth;
            counterEl.style.animation = 'drga-bump 0.2s ease';

            if (landed >= count) {
              if (valEl) valEl.textContent = String(totalGold);

              const floatLabel = track(document.createElement('div'));
              floatLabel.className = 'drga-float-label drga-float-show';
              floatLabel.textContent = `+${totalGold}`;
              floatLabel.style.left = `${tx - 20}px`;
              floatLabel.style.top = `${ty + 30}px`;
              floatLabel.style.color = '#C8A84E';
              floatLabel.style.textShadow = '0 0 8px rgba(200,168,78,0.5)';
              document.body.appendChild(floatLabel);
              delay(() => floatLabel.remove(), 1500);

              onDone();
            }
          });
        }, orbDelay);
      }
    }

    // Inject styles
    injectStyles();

    // ── CLEANUP on unmount ──
    return () => {
      cancelled = true;
      // Cancel all pending timeouts
      timers.forEach(clearTimeout);
      // Cancel all running animations
      animations.forEach(a => { try { a.cancel(); } catch {} });
      // Remove all tracked DOM elements still in the document
      domElements.forEach(el => { try { el.remove(); } catch {} });
      // Clean up navbar style overrides
      const bar = document.getElementById('navbar-xp-bar');
      if (bar) { bar.style.boxShadow = ''; bar.style.transition = ''; }
      // Fire onComplete so parent state gets cleaned up
      onComplete();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// ── INJECT STYLES (idempotent) ──

const STYLE_ID = 'drga-styles';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .drga-xp-orb {
      position: fixed; z-index: 9999; pointer-events: none;
      width: 8px; height: 8px; border-radius: 50%;
      background: #00d4ff;
      box-shadow: 0 0 5px rgba(0,212,255,0.5), 0 0 10px rgba(0,212,255,0.2);
    }

    .drga-gold-orb {
      position: fixed; z-index: 9999; pointer-events: none;
      width: 20px; height: 20px;
    }
    .drga-gold-orb img {
      width: 100%; height: 100%; object-fit: contain; border-radius: 4px;
      filter: drop-shadow(0 0 3px rgba(200,168,78,0.4));
    }

    .drga-gold-counter {
      position: fixed; z-index: 9998;
      top: 60px; left: 50%;
      transform: translateX(-50%) translateY(-80px);
      display: flex; align-items: center; gap: 10px;
      padding: 10px 20px; border-radius: 14px;
      background: rgba(12,12,20,0.95);
      border: 1px solid rgba(200,168,78,0.15);
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(200,168,78,0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      opacity: 0; pointer-events: none;
      transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s;
    }
    .drga-gold-counter.drga-visible {
      opacity: 1; pointer-events: all;
      transform: translateX(-50%) translateY(0);
    }
    .drga-gold-counter.drga-exit {
      opacity: 0;
      transform: translateX(-50%) translateY(-40px);
      transition: transform 0.4s ease-in, opacity 0.3s;
    }

    .drga-gc-img {
      width: 28px; height: 28px; object-fit: contain; border-radius: 6px;
    }
    .drga-gc-info { display: flex; flex-direction: column; gap: 1px; }
    .drga-gc-value {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-weight: 900; font-size: 24px; color: #C8A84E;
      min-width: 40px;
    }
    .drga-gc-label {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-weight: 700; font-size: 8px; color: #6b7280;
      letter-spacing: 0.1em;
    }

    .drga-float-label {
      position: fixed; z-index: 10000; pointer-events: none;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-weight: 900; font-size: 14px;
      opacity: 0; transform: translateY(4px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .drga-float-show {
      animation: drga-floatUp 1.4s ease-out forwards;
    }

    @keyframes drga-floatUp {
      0% { opacity: 0; transform: translateY(0) scale(0.6); }
      15% { opacity: 1; transform: translateY(-8px) scale(1); }
      75% { opacity: 1; transform: translateY(-35px); }
      100% { opacity: 0; transform: translateY(-50px); }
    }

    @keyframes drga-bump {
      0% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.06); }
      100% { transform: translateX(-50%) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

export default DungeonRewardAnimation;
