const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export interface FileUploadResponse {
  id: string;
  filename: string;
  meta: {
    name: string;
    content_type: string;
    size: number;
    path: string;
  };
}

export async function uploadFile(token: string, file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/files/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

export async function getFile(token: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/content`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get file');
  }

  return response.blob();
}

