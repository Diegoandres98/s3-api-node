// app.mjs

import express from 'express';
import aws from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import config from './config.mjs';

const app = express();

// Configurar AWS SDK
aws.config.update({
  signatureVersion: 'v4',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

const s3 = new aws.S3();

// Configurar Multer para la carga de archivos a S3 en la carpeta 'files-api'
const upload = multer({
  storage: multerS3({
    s3,
    bucket: config.aws.bucketName,
    // acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Sube el archivo a la carpeta 'files-api' en S3
      const key = `files-api/${Date.now().toString()}-${file.originalname}`;
      cb(null, key);
    }
  })
});

// Ruta para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'Archivo subido con éxito', location: req.file.location });
});

// Ruta para descargar archivos
app.get('/download/:key', (req, res) => {
  const params = { Bucket: config.aws.bucketName, Key: `files-api/${req.params.key}` };
  const fileStream = s3.getObject(params).createReadStream();
  fileStream.pipe(res);
});

// Nuevo endpoint para listar archivos
app.get('/listar-archivos', async (req, res) => {
  const params = { Bucket: config.aws.bucketName, Prefix: 'files-api/' };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const archivos = data.Contents.map((objeto) => objeto.Key);

    res.json({ archivos });
  } catch (error) {
    console.error('Error al listar archivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
