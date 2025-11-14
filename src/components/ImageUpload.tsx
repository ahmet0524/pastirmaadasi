// src/components/ImageUpload.tsx
import { useState } from 'react';
import { uploadProductImage } from '../lib/uploadImage';

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded: (imageUrl: string) => void;
  label?: string;
}

export function ImageUpload({
  currentImage = '',
  onImageUploaded,
  label = "Ürün Resmi"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage);
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya validasyonu
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Sadece JPG, PNG veya WEBP formatı desteklenir');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Preview göster
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload et
      const imageUrl = await uploadProductImage(file);

      if (imageUrl) {
        onImageUploaded(imageUrl);
        setPreview(imageUrl);
      } else {
        setError('Resim yüklenemedi. Lütfen tekrar deneyin.');
        setPreview('');
      }
    } catch (err) {
      setError('Bir hata oluştu: ' + (err as Error).message);
      setPreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onImageUploaded('');
    // Input'u temizle
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>

      {/* Preview */}
      {preview && (
        <div style={styles.previewContainer}>
          <img src={preview} alt="Preview" style={styles.previewImage} />
          <button
            type="button"
            style={styles.removeBtn}
            onClick={handleRemove}
            disabled={uploading}
          >
            ❌ Kaldır
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div style={styles.uploadWrapper}>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          id="image-upload"
          style={styles.fileInput}
        />
        <label
          htmlFor="image-upload"
          style={{
            ...styles.fileLabel,
            opacity: uploading ? 0.6 : 1,
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? (
            <>
              <span style={styles.spinner}>⏳</span> Yükleniyor...
            </>
          ) : (
            <>
              📤 {preview ? 'Resmi Değiştir' : 'Resim Seç'}
            </>
          )}
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorMessage}>
          ⚠️ {error}
        </div>
      )}

      {/* Info */}
      <small style={styles.info}>
        JPG, PNG veya WEBP • Max 5MB
      </small>
    </div>
  );
}

// Inline styles
const styles = {
  container: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontWeight: 700,
    marginBottom: '0.75rem',
    color: '#134e4a',
    fontSize: '1rem',
  },
  previewContainer: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '300px',
    marginBottom: '1rem',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '2px solid #e5e7eb',
  },
  previewImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover' as const,
    display: 'block',
  },
  removeBtn: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: 'rgba(239, 68, 68, 0.95)',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 700,
    transition: 'all 0.2s',
  },
  uploadWrapper: {
    position: 'relative' as const,
  },
  fileInput: {
    position: 'absolute' as const,
    opacity: 0,
    width: 0,
    height: 0,
  },
  fileLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    color: 'white',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.3s',
    border: 'none',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  errorMessage: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  info: {
    display: 'block',
    marginTop: '0.5rem',
    color: '#64748b',
    fontSize: '0.875rem',
  },
};