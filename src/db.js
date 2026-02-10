import Database from '@tauri-apps/plugin-sql';

let db = null;

export async function initDB() {
    if (db) return db;
    try {
        db = await Database.load('sqlite:planner-tasks.db');

        await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await db.execute(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

        return db;
    } catch (e) {
        console.error('[DB] Failed to initialize SQLite:', e);
        throw e;
    }
}

export async function getTasks() {
    const d = await initDB();
    return await d.select('SELECT * FROM tasks ORDER BY created_at DESC');
}

export async function addTask(name) {
    const d = await initDB();
    const result = await d.execute('INSERT INTO tasks (name) VALUES (?)', [name]);
    return result.lastInsertId;
}

export async function updateTaskName(id, name) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET name = ? WHERE id = ?', [name, id]);
}

export async function updateTaskStatus(id, status) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteTask(id) {
    const d = await initDB();
    await d.execute('DELETE FROM checklist_items WHERE task_id = ?', [id]);
    await d.execute('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function getItems(taskId) {
    const d = await initDB();
    return await d.select(
        'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY position ASC',
        [taskId],
    );
}

export async function addItem(taskId, text) {
    const d = await initDB();
    const rows = await d.select(
        'SELECT MAX(position) as maxPos FROM checklist_items WHERE task_id = ?',
        [taskId],
    );
    const position = (rows[0]?.maxPos ?? -1) + 1;
    const result = await d.execute(
        'INSERT INTO checklist_items (task_id, text, position) VALUES (?, ?, ?)',
        [taskId, text, position],
    );
    return result.lastInsertId;
}

export async function toggleItem(id) {
    const d = await initDB();
    await d.execute(
        'UPDATE checklist_items SET checked = CASE WHEN checked = 0 THEN 1 ELSE 0 END WHERE id = ?',
        [id],
    );
}

export async function deleteItem(id) {
    const d = await initDB();
    await d.execute('DELETE FROM checklist_items WHERE id = ?', [id]);
}
