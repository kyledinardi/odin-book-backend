const path = require('path');
const { createWriteStream, unlink } = require('fs');
const cloudinary = require('cloudinary').v2;

module.exports = async function uploadToCloudinary(filePromise) {
  const image = await filePromise;
  const stream = image.createReadStream();
  const storedFileName = `${Date.now()}-${image.filename}`;
  const storedFileUrl = path.join(__dirname, '../uploads', storedFileName);

  await new Promise((resolve, reject) => {
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
