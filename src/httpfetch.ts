export function httpFetch(rootUrl: string) {
  let loading = false;

  let chunks: Uint8Array[] = [];
  let results: Uint8Array | null = null;
  let error = null;

  let controller: AbortController | null = null;

  const get = async (path, options) => {
    _resetLocals();
    if (!controller) {
      controller = new AbortController();
    }
    let signal = controller.signal;
    loading = true;

    try {
      const response = await fetch(rootUrl + path, { signal, ...options });
      if (response.status >= 200 && response.status < 300) {
        results = await _readBody(response);
        return results;
      } else {
        throw new Error(response.statusText);
      }
    } catch (err) {
      error = err;
      results = null;
      return error;
    } finally {
      loading = false;
    }
  };

  const _readBody = async (response: Response): Promise<Uint8Array> => {
    const reader = response.body!.getReader();
    const length: number = +response.headers.get("content-length")!;
    let received: number = 0;

    // Loop through the response stream and extract data chunks
    while (loading) {
      const { done, value }: ReadableStreamReadResult<Uint8Array> = await reader
        .read();
      const payload = { detail: { received, length, loading } };
      const onProgress = new CustomEvent("fetch-progress", payload);
      const onFinished = new CustomEvent("fetch-finished", payload);

      if (done) {
        loading = false;
        window.dispatchEvent(onFinished);
      } else {
        chunks.push(value);
        received += value.length;
        window.dispatchEvent(onProgress);
      }
    }
    // Concat the chinks into a single array
    let body = new Uint8Array(received);
    let position = 0;

    // Order the chunks by their respective position
    for (let chunk of chunks) {
      body.set(chunk, position);
      position += chunk.length;
    }

    loading = false;
    // Decode the response and return it
    return body; // new TextDecoder('utf-8').decode(body);
  };
  const _resetLocals = () => {
    loading = false;

    chunks = [];
    results = null;
    error = null;

    controller = new AbortController();
  };

  const cancel = () => {
    _resetLocals();
    if (controller) {
      controller.abort();
    }
  };

  return { get, cancel };
}
