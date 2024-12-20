import { delayMs } from "./delayMs";

function defaultRetryResponse(res: Response) {
  return Promise.resolve(res.status >= 500 && res.status < 600);
}

export async function fetchWithRetries(
  url: string,
  requestInit: RequestInit,
  retryProps: {
    retryError?: (err: Error) => Promise<boolean>;
    retryResponse?: (res: Response) => Promise<boolean>;
  }
) {
  const retryResponse = retryProps.retryResponse || defaultRetryResponse;
  const retryError = retryProps.retryError || (() => Promise.resolve(false));

  let attempt = 0;

  // 5 attempts by default, this could be configurable; and jitter
  const retryDelays = [0, 50, 150, 500];

  let lastReason: string = "not attempted";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rv = await fetch(url, requestInit);
      if (!(await retryResponse(rv))) {
        return rv;
      }
      lastReason = `response with ${rv.status} status code`;
    } catch (err) {
      if (!(err instanceof Error)) {
        throw new Error("fetchWithRetries expected Error object to be thrown");
      }
      if (!(await retryError(err))) {
        throw err;
      }
      lastReason = err.toString();
    }

    await delayMs(retryDelays[attempt]);
  }

  throw new Error("fetch() failed after 5 attempts: " + lastReason);
}
