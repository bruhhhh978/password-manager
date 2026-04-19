import { CONFIG } from "../config";

// Upload dữ liệu đã mã hóa lên Walrus
export async function uploadToWalrus(data: Uint8Array): Promise<string> {
  const response = await fetch(
    `${CONFIG.WALRUS_PUBLISHER}/v1/store?epochs=5`,
    {
      method: "PUT",
      body: data,
    }
  );
  const result = await response.json();
  // Trả về blob ID
  return result.newlyCreated?.blobObject?.blobId || 
         result.alreadyCertified?.blobId;
}

// Download từ Walrus bằng blob ID
export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  const response = await fetch(
    `${CONFIG.WALRUS_AGGREGATOR}/v1/${blobId}`
  );
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
