/**
 * Native Web Stream Compression Utilities (Gzip)
 * Zero external dependencies: Uses native CompressionStream and DecompressionStream.
 * Compresses database JSON payloads and sync batches by up to 80% to save bandwidth in rural school networks.
 */

export async function compressGzip(rawString: string): Promise<Uint8Array> {
  const byteArray = new TextEncoder().encode(rawString);

  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(byteArray);
    writer.close();

    const outputChunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) outputChunks.push(value);
    }

    const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of outputChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  // Fallback: uncompressed representation
  return byteArray;
}

export async function decompressGzip(compressedBytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(compressedBytes);
      writer.close();

      const outputChunks: Uint8Array[] = [];
      const reader = ds.readable.getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) outputChunks.push(value);
      }

      const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of outputChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return new TextDecoder().decode(result);
    } catch {
      // Fallback decode
      return new TextDecoder().decode(compressedBytes);
    }
  }

  return new TextDecoder().decode(compressedBytes);
}

export async function compressJson(obj: any): Promise<Uint8Array> {
  const jsonStr = JSON.stringify(obj);
  return await compressGzip(jsonStr);
}

export async function decompressJson<T = any>(compressedBytes: Uint8Array): Promise<T> {
  const jsonStr = await decompressGzip(compressedBytes);
  return JSON.parse(jsonStr) as T;
}
