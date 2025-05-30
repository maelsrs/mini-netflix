require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const cookieParser = require('cookie-parser');
const db = require('./db/database.js');
const jwt = require('jsonwebtoken');
const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jwt';
const ADMIN_JWT_COOKIE = 'admin_jwt';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin"

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
        file.mimetype === 'video/quicktime') {
        cb(null, true);
    } else {
        req.fileValidationError = 'Only .mp4, .webm, and .mov formats are allowed!';
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

function generateThumbnail(videoPath) {
    return new Promise((resolve, reject) => {
        const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '.png');
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['00:00:01'],
                filename: path.basename(thumbnailPath),
                folder: path.dirname(thumbnailPath),
            })
            .on('end', () => resolve(thumbnailPath))
            .on('error', (err) => reject(err));
    });
}

function isAdmin(req, res, next) {
    const token = req.cookies[ADMIN_JWT_COOKIE];
    if (!token) {
        return res.redirect('/admin/login');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.role === 'admin') {
            req.admin = decoded;
            return next();
        }
    } catch (err) {
    }
    return res.redirect('/admin/login');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    const videos = db.getAllVideos();
    res.render('index', { videos });
});

app.get('/upload', (req, res) => {
    res.render('upload.ejs');
});

app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (req.fileValidationError) {
            return res.render('upload.ejs', { error: req.fileValidationError });
        }
        
        if (!req.file) {
            return res.render('upload.ejs', { error: 'Please select a video file to upload' });
        }

        try {
            await generateThumbnail(req.file.path);
        } catch (error) {
            console.error('Thumbnail generation error:', error);
        }

        const videoInfo = {
            title: req.body.title || 'No title provided',
            path: req.file.path,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        db.insertVideo(videoInfo);
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

app.get('/video/:id', (req, res) => {
    const videoId = parseInt(req.params.id);
    const video = db.getVideoById(videoId);
    
    if (!video) {
        return res.status(404).send('Video not found');
    }
    
    res.render('video.ejs', { video });
});

app.get('/admin', isAdmin, (req, res) => {
    const videos = db.getAllVideos();
    res.render('admin.ejs', { videos, message: null });
});

app.post('/admin/delete/:id', isAdmin, (req, res) => {
    const videoId = parseInt(req.params.id);
    const video = db.getVideoById(videoId);
    
    if (!video) {
        return res.render('admin.ejs', { 
            videos: db.getAllVideos(),
            message: { type: 'error', text: 'Video not found' }
        });
    }
    
    try {
        if (fs.existsSync(video.filepath)) {
            fs.unlinkSync(video.filepath);
        }
        
        const thumbnailPath = video.filepath.replace(/\.[^/.]+$/, '.png');
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }
        
        const deleted = db.deleteVideoById(videoId);
        
        if (deleted) {
            return res.render('admin.ejs', { 
                videos: db.getAllVideos(),
                message: { type: 'success', text: 'Video deleted successfully' }
            });
        } else {
            return res.render('admin.ejs', { 
                videos: db.getAllVideos(),
                message: { type: 'error', text: 'Error deleting video from database' }
            });
        }
    } catch (error) {
        console.error('Delete error:', error);
        return res.render('admin.ejs', { 
            videos: db.getAllVideos(),
            message: { type: 'error', text: `Error: ${error.message}` }
        });
    }
});

app.get('/admin/login', (req, res) => {
    res.render('admin-login.ejs');
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
        res.cookie(ADMIN_JWT_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: false });
        return res.redirect('/admin');
    } else {
        return res.render('admin-login.ejs', { error: 'Invalid username or password' });
    }
});

app.post('/admin/logout', isAdmin, (req, res) => {
    res.clearCookie(ADMIN_JWT_COOKIE);
    res.redirect('/admin/login');
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