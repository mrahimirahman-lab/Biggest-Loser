export const MAX_ACTIVITY_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 256 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateActivityFile(file) {
  if (!file || !IMAGE_TYPES.includes(file.type)) {
    throw new Error('Pilih gambar PNG, JPG atau WEBP.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_ACTIVITY_FILE_BYTES) {
    throw new Error('Saiz gambar mestilah lebih daripada 0 dan maksimum 10 MB.');
  }
}

function encodeJPEG(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal memampatkan gambar. Cuba gambar lain.')), 'image/jpeg', quality);
  });
}

function readDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareActivityImage(file) {
  validateActivityFile(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Gambar tidak dapat dibaca. Pilih fail PNG, JPG atau WEBP yang sah.');
  }
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Pelayar tidak dapat memproses gambar ini.');
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.86, 0.74, 0.62]) {
        const blob = await encodeJPEG(canvas, quality);
        if (blob.size <= MAX_STORED_IMAGE_BYTES) {
          return { data: await readDataURL(blob), storedSize: blob.size, width: canvas.width, height: canvas.height };
        }
      }
      scale *= 0.8;
    }
    throw new Error('Gambar belum dapat dimampatkan. Cuba gambar dengan resolusi lebih kecil.');
  } finally {
    bitmap.close();
  }
}
