export function delayMs(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}
