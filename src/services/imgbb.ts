import axios from 'axios';
import { config } from '../config';

export const uploadToImgBB = async (base64Image: string): Promise<string> => {
  if (!config.imgbb.apiKey) {
    throw new Error('ImgBB API key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.imgbb.com/1/upload',
      new URLSearchParams({
        key: config.imgbb.apiKey,
        image: base64Image,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.success) {
      return response.data.data.url;
    } else {
      throw new Error(response.data.error?.message || 'Image upload failed');
    }
  } catch (error: any) {
    console.error('ImgBB upload error:', error.response?.data || error.message);
    throw new Error('Failed to upload image');
  }
};

export const uploadBufferToImgBB = async (buffer: Buffer): Promise<string> => {
  const base64Image = buffer.toString('base64');
  return uploadToImgBB(base64Image);
};