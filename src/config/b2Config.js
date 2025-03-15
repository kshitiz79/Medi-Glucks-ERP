// s3Config.js (v2)
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.B2_S3_ACCESS_KEY,
  secretAccessKey: process.env.B2_S3_SECRET_KEY,
  endpoint: process.env.B2_S3_ENDPOINT,
  region: 'us-east-005',
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
});

module.exports = s3;
