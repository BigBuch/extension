const express = require('express');
const router = express.Router();
const multer = require('multer');
const { searchAssets, searchFolders, uploadFile, searchByKeyword} = require('../services/soapService');
const storage = multer.memoryStorage();


const upload = multer({
    storage,
    limits: {
    fileSize: 50 * 1024 * 1024
}});

const cors = require('cors');


const allowedDomains = ['https://amplience.net'];
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedDomains.includes(origin) || !origin) {
            callback(null, true);
        } else {
            console.log('Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
};

router.use(cors());

router.get('/search-assets', async (req, res) => {
    try {
        const { folderID, page, video } = req.query;
        const result = await searchAssets(folderID, page, video);
        res.send(result);
    } catch (error) {
        res.status(500).send('Error calling SOAP service');
    }
});


router.get('/search-folders', async (req, res) => {
    try {
        const { folderID } = req.query;
        const result = await searchFolders(folderID);
        res.send(result);
    } catch (error) {
        res.status(500).send('Error calling SOAP service');
    }
});

router.post('/upload-file', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'imageFile', maxCount: 1 }]), async (req, res) => {
    try {
        const file = req.files.file ? req.files.file[0] : req.files.imageFile[0];
        const fileName = req.body.fileName || (file ? file.originalname : null);
        const destFolder = req.body.destFolder || '';

        if (!file) {
            console.log('No file uploaded');
            return res.status(400).send('No file uploaded');
        }

        const response = await uploadFile(file.buffer, fileName, destFolder);

        res.status(200).send(response);
    } catch (error) {
        console.error('Error handling upload:', error);
        res.status(500).send('Failed to upload file');
    }
});

router.get('/search-by-text', async (req, res) => {
    try {
        const { keyword, folderPath, page = 1, video} = req.query;
        const result = await searchByKeyword(keyword, folderPath, page, recordsPerPage=10, video);
        res.send(result);
    } catch (error) {
        res.status(500).send('Error calling SOAP service');
    }
});

module.exports = router;
