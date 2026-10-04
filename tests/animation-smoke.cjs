function verifyAnimation(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Page inline script was not found");
  const frames = [];
  const timers = [];
  const events = {};
  let clearCount = 0;
  let strokeCount = 0;
  let pointerUpdates = 0;
  const gradient = () => ({ addColorStop() {} });
  const ctx = {
    beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {},
    stroke() { strokeCount++; },
    save() {}, translate() {}, restore() {}, fillText() {},
    clearRect() { clearCount++; },
    createRadialGradient: gradient,
    createLinearGradient: gradient
  };
  const canvas = { getContext: () => ctx };
  const document = {
    visibilityState: "visible",
    getElementById(id) {
      if (id !== "cvs") throw new Error("Unexpected element lookup: " + id);
      return canvas;
    },
    addEventListener(type, callback) { events[type] = callback; }
  };
  const window = {
    addEventListener(type, callback) { events["window:" + type] = callback; }
  };
  let seed = 1;
  const math = Object.create(Math);
  math.random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const scheduleFrame = callback => {
    frames.push(callback);
    return frames.length;
  };
  const scheduleTimer = (callback, delay) => {
    timers.push({ callback, delay });
    return timers.length;
  };
  new Function("window", "document", "innerWidth", "innerHeight",
    "requestAnimationFrame", "setTimeout", "Math", match[1])(
      window, document, 1280, 720, scheduleFrame, scheduleTimer, math
    );
  if (canvas.width !== 1280 || canvas.height !== 720) {
    throw new Error("Canvas was not initialized with the viewport dimensions");
  }
  for (let i = 0; i < 3; i++) {
    if (frames.length !== 1) throw new Error("Expected one animation frame");
    if (i === 1) {
      events.mousemove({ clientX: 200, clientY: 100 });
      pointerUpdates++;
      events["window:resize"]();
    }
    frames.shift()(16 * (i + 1));
  }
  if (frames.length !== 1 || clearCount !== 3 || strokeCount === 0) {
    throw new Error("Animation failed to keep drawing and scheduling frames");
  }
  return { frames: clearCount, drawnLines: strokeCount, pointerUpdates,
    nextFrames: frames.length };
}

module.exports = verifyAnimation;
if (require.main === module) {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  console.log(JSON.stringify(verifyAnimation(html)));
}
