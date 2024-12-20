export function range(
  start: number,
  stop: number | null = null,
  step: number | null = null
): number[] {
  if (stop === null) {
    stop = start;
    start = 0;
  }

  if (step === null) {
    step = 1;
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return [];
  }

  const result = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }
  return result;
}
