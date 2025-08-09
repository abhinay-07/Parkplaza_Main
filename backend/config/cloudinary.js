const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
const uploadImage = async (buffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'parkplaza',
          transformation: options.transformation || [
            { width: 800, height: 600, crop: 'fill' },
            { quality: 'auto' }
          ],
          ...options
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage
};