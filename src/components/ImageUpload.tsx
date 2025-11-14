// src/components/ImageUpload.tsx
import { useState } from 'react';
import { uploadProductImage } from '../lib/uploadImage';

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded: (imageUrl: string) => void;
  label?: string;
}

export function ImageUpload({ currentImage, onImageUploaded, label = "Ürün Resmi" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');
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
      }
    } catch (err) {
      setError('Bir hata oluştu: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-container">
      <label className="upload-label">{label}</label>

      {/* Preview */}
      {preview && (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button
            type="button"
            className="remove-image-btn"
            onClick={() => {
              setPreview('');
              onImageUploaded('');
            }}
          >
            ❌ Kaldır
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div className="upload-input-wrapper">
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          id="image-upload"
          className="file-input"
        />
        <label htmlFor="image-upload" className="file-input-label">
          {uploading ? (
            <>
              <span className="spinner">⏳</span> Yükleniyor...
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
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Info */}
      <small className="upload-info">
        JPG, PNG veya WEBP • Max 5MB
      </small>

      <style jsx>{`
        .image-upload-container {
          margin-bottom: 1.5rem;
        }

        .upload-label {
          display: block;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: #134e4a;
          font-size: 1rem;
        }

        .image-preview {
          position: relative;
          width: 100%;
          max-width: 300px;
          margin-bottom: 1rem;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .image-preview img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }

        .remove-image-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(239, 68, 68, 0.95);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 700;
          transition: all 0.2s;
        }

        .remove-image-btn:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .upload-input-wrapper {
          position: relative;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .file-input-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          color: white;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s;
          border: none;
        }

        .file-input-label:hover {
          background: linear-gradient(135deg, #06b6d4, #22d3ee);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
        }

        .file-input:disabled + .file-input-label {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #991b1b;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .upload-info {
          display: block;
          margin-top: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}