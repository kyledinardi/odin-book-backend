import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { v2 as cloudinary } from 'cloudinary';
import { GraphQLError } from 'graphql';

import type { FileUpload } from 'graphql-upload/processRequest.mjs';

const uploadToCloudinary = async (
  filePromise: Promise<FileUpload>,
): Promise<string> => {
  const image = await filePromise;
  const stream = image.createReadStream();
  const storedFileName = `${Date.now()}-${image.filename}`;
  const storedFileUrl = path.join(__dirname, '../uploads', storedFileName);

  await new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(storedFileUrl);
    writeStream.on('finish', resolve);

    writeStream.on('error', (err) => {
      const handleWriteStreamError = async () => {
        await unlink(storedFileUrl);
        reject(err);
      };

      handleWriteStreamError().catch(async (error) => {
        await unlink(storedFileUrl);

        if (error instanceof Error) {
          throw new GraphQLError(error.message, {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          });
        }
      });
    });

    stream.pipe(writeStream);
  });

  const result = await cloudinary.uploader.upload(storedFileUrl);
  await unlink(storedFileUrl);
  return result.secure_url;
};

export default uploadToCloudinary;
