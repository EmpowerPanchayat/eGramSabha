const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const { Readable } = require('stream');

module.exports = {
  async uploadImage(buffer, filename, metadata) {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db);
    const stream = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    return new Promise((resolve, reject) => {
      stream.pipe(uploadStream)
        .on('finish', () => resolve(uploadStream.id))
        .on('error', reject);
    });
  },
  async getImageStream(fileId) {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db);
    return bucket.openDownloadStream(fileId);
  },
  async deleteImage(fileId) {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db);
    return bucket.delete(fileId);
  }
};