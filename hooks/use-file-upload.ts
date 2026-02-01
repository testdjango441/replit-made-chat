import { useState } from "react";

const backendUrl = "http://localhost:8000";

export interface UploadedFile {
  filename: string;
  s3_key: string;
  s3_uri: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${backendUrl}/api/upload-file/`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload file");
      const data = await res.json();
      // { filename, s3_key, s3_uri }
      setUploadedFiles((prev) => [...prev, data]);
      return data;
    } catch (e: any) {
      setError(e.message || "Upload failed");
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (s3_uri: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.s3_uri !== s3_uri));
  };

  const resetFiles = () => setUploadedFiles([]);

  return { uploading, uploadedFiles, error, uploadFile, removeFile, resetFiles };
}
