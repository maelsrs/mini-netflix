const Database = require('better-sqlite3');
const db = new Database('miniflix.db');

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            filename TEXT NOT NULL,
            originalname TEXT NOT NULL,
            filepath TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function insertVideo(videoInfo) {
    const stmt = db.prepare(`
        INSERT INTO videos (title, filename, originalname, filepath, mimetype, size)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
        videoInfo.title,
        videoInfo.filename,
        videoInfo.originalname,
        videoInfo.path,
        videoInfo.mimetype,
        videoInfo.size
    );
    return info.lastInsertRowid;
}

function getAllVideos() {
    const statement = db.prepare('SELECT * FROM videos ORDER BY upload_date DESC');
    return statement.all();
}

function getVideoById(id) {
    const statement = db.prepare('SELECT * FROM videos WHERE id = ?');
    return statement.get(id);
}

function deleteVideoById(id) {
    const statement = db.prepare('DELETE FROM videos WHERE id = ?');
    const info = statement.run(id);
    return info.changes > 0;
}

initializeDatabase();

module.exports = {
    insertVideo,
    getAllVideos,
    getVideoById,
    deleteVideoById
};
