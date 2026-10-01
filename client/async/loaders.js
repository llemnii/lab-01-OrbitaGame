const DEFAULT_ATTEMPTS = 3;

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function canRetry(error) {
  return error?.status == null || error.status >= 500;
}

async function withRetry(task, { signal, attempts = DEFAULT_ATTEMPTS } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !canRetry(error)) throw error;
      const backoff = 100 * 2 ** attempt + Math.random() * 80;
      await wait(backoff, signal);
    }
  }
  throw lastError;
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error(`Не вдалося завантажити ${url}: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function loadJson(url, options = {}) {
  return withRetry(() => fetchJson(url, options), options);
}

export async function loadImage(url, options = {}) {
  return withRetry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error(`Не вдалося завантажити ${url}: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const blob = await response.blob();
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error(`Некоректне зображення: ${url}`));
      options.signal?.addEventListener(
        "abort",
        () => {
          image.src = "";
          reject(options.signal.reason ?? new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
      image.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    return image;
  }, options);
}

export async function loadAudio(url, audioContext, options = {}) {
  if (!audioContext) throw new Error("Web Audio недоступний у цьому браузері");
  return withRetry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error(`Не вдалося завантажити ${url}: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const bytes = await response.arrayBuffer();
    return audioContext.decodeAudioData(bytes);
  }, options);
}

export async function loadAll(manifest, options = {}) {
  const entries = Object.entries(manifest);
  let completed = 0;
  const report = (name, status) => {
    completed += 1;
    options.onProgress?.({ name, status, completed, total: entries.length });
  };

  const results = await Promise.all(
    entries.map(async ([name, item]) => {
      try {
        let value;
        if (item.type === "json") value = await loadJson(item.url, options);
        else if (item.type === "image") value = await loadImage(item.url, options);
        else if (item.type === "audio") {
          value = await loadAudio(item.url, options.audioContext, options);
        } else throw new Error(`Невідомий тип asset: ${item.type}`);
        report(name, "loaded");
        return [name, value];
      } catch (error) {
        report(name, "failed");
        throw error;
      }
    })
  );

  return Object.fromEntries(results);
}
