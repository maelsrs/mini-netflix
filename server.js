const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

const fileFilter = function (req, file, cb) {
    if (file.mimetype === 'video/mp4' || 
        file.mimetype === 'video/webm' || 
        file.mimetype === 'video/ogg' || 
        file.mimetype === 'video/quicktime') {
        cb(null, true);
    } else {
        req.fileValidationError = 'Only .mp4, .webm, .ogg, and .mov formats are allowed!';
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 256 * 1024 * 1024
    }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/upload', (req, res) => {
    res.render('upload.ejs');
});

app.post('/upload', upload.single('video'), (req, res) => {
    try {
        if (req.fileValidationError) {
            return res.render('upload.ejs', { error: req.fileValidationError });
        }
        
        if (!req.file) {
            return res.render('upload.ejs', { error: 'Please select a video file to upload' });
        }

        const videoInfo = {
            title: req.body.title || 'Untitled Video',
            path: req.file.path,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        console.log('Video uploaded:', videoInfo);

        return res.render('upload.ejs', { 
            success: 'Video uploaded successfully!',
            videoInfo: videoInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.render('upload.ejs', { error: error.message });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.render('upload.ejs', { error: 'File size exceeds the limit of 256MB' });
        }
        return res.render('upload.ejs', { error: err.message });
    }
    next(err);
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});