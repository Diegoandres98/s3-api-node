// app.mjs

import express from 'express';
import aws from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import config from './config.mjs';
import mysql from 'mysql';

const app = express();

// Configurar AWS SDK
aws.config.update({
  signatureVersion: 'v4',
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

const s3 = new aws.S3();

// Configurar conexión a la base de datos MySQL
const dbConnection = mysql.createConnection({
  host: 'database-1.clnhiifguwhv.us-east-2.rds.amazonaws.com',  // Reemplaza con la dirección de tu instancia de RDS
  user: 'testupc',  // Reemplaza con tu usuario de base de datos
  password: 'testupc2',  // Reemplaza con tu contraseña de base de datos
  database: 'registry_data',
});

// Conectar a la base de datos
dbConnection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conexión exitosa a la base de datos');
  }
});

// Configurar Multer para la carga de archivos a S3 en la carpeta 'files-api'
const upload = multer({
  storage: multerS3({
    s3,
    bucket: config.aws.bucketName,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const key = `files-api/${Date.now().toString()}-${file.originalname}`;
      cb(null, key);
    }
  })
});

// Ruta para subir archivos
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Guardar registro en la base de datos
    const nombreArchivo = req.file.originalname;
    const fecha = new Date().toISOString().slice(0, 19).replace("T", " ");
    const insertQuery = `INSERT INTO registros (nombre, fecha) VALUES (?, ?)`;
    
    dbConnection.query(insertQuery, [nombreArchivo, fecha], (error, results) => {
      if (error) {
        console.error('Error al insertar en la base de datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      } else {
        console.log('Registro insertado en la base de datos');
        res.json({ message: 'Archivo subido con éxito', location: req.file.location });
      }
    });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
