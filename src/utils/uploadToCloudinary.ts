import { FileUpload } from 'graphql-upload/processRequest.mjs';
import path from 'path';
import { createWriteStream, unlink } from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const uploadToCloudinary = async (filePromise: Promise<FileUpload>) => {
  const image = await filePromise;
  const stream = image.createReadStream();
  const storedFileName = `${Date.now()}-${image.filename}`;
  const storedFileUrl = path.join(__dirname, '../uploads', storedFileName);

  await new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(storedFileUrl);
    writeStream.on('finish', resolve);

    writeStream.on('error', (err) => {
      unlink(storedFileUrl, () => {
        reject(err);
      });
    });

    stream.pipe(writeStream);
  });

  const result = await cloudinary.uploader.upload(storedFileUrl);
  unlink(storedFileUrl, () => {});
  return result.secure_url;
};

export default uploadToCloudinary;
