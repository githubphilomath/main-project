/**
 * Generator for Database (SQLite Schema)
 */
const highlightSql = (sql) => {
    // Basic syntax highlighter for display purposes
    return sql.replace(/(CREATE TABLE|IF NOT EXISTS|INTEGER PRIMARY KEY|TEXT|NOT NULL|BOOLEAN|DEFAULT|TIMESTAMP|FOREIGN KEY|REFERENCES|UNIQUE)/g, '<span style="color:#d946ef">$1</span>');
};

window.DatabaseGenerator = {
    generate: (config) => {
        // Dynamic Resource Naming
        const resName = config.resourceName || 'Item';
        const resNameLower = resName.toLowerCase();
        const resNamePlural = resNameLower + 's';

        const sql = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1
);

-- ${resNamePlural} Table (Dynamic Resource)
CREATE TABLE IF NOT EXISTS ${resNamePlural} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER,
    FOREIGN KEY(owner_id) REFERENCES users(id)
);
`;
        return {
            'schema.sql': sql
        };
    }
};
