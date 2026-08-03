import Database from '@tauri-apps/plugin-sql';

let db = null;
let dbPromise = null;

export async function initDB() {
    if (db) return db;
    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
        const connection = await Database.load('sqlite:planner-tasks.db');

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        deadline DATETIME,
        important INTEGER NOT NULL DEFAULT 0,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_interval_minutes INTEGER,
        reminder_next_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Additive migrations for databases created by earlier Licuri versions.
        const tableInfo = await connection.select("PRAGMA table_info(tasks)");
        const hasDeadline = tableInfo.some(col => col.name === 'deadline');
        if (!hasDeadline) {
            try {
                await connection.execute(
                    'ALTER TABLE tasks ADD COLUMN deadline DATETIME',
                );
            } catch (error) {
                if (!String(error).includes('duplicate column name')) throw error;
            }
        }
        const hasImportant = tableInfo.some(col => col.name === 'important');
        if (!hasImportant) {
            try {
                await connection.execute(
                    'ALTER TABLE tasks ADD COLUMN important INTEGER NOT NULL DEFAULT 0',
                );
            } catch (error) {
                if (!String(error).includes('duplicate column name')) throw error;
            }
        }
        const taskMigrations = [
            {
                name: 'reminder_enabled',
                sql: 'ALTER TABLE tasks ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0',
            },
            {
                name: 'reminder_interval_minutes',
                sql: 'ALTER TABLE tasks ADD COLUMN reminder_interval_minutes INTEGER',
            },
            {
                name: 'reminder_next_at',
                sql: 'ALTER TABLE tasks ADD COLUMN reminder_next_at DATETIME',
            },
        ];
        for (const migration of taskMigrations) {
            if (tableInfo.some((col) => col.name === migration.name)) continue;
            try {
                await connection.execute(migration.sql);
            } catch (error) {
                if (!String(error).includes('duplicate column name')) throw error;
            }
        }

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        indent_level INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

        const checklistInfo = await connection.select(
            'PRAGMA table_info(checklist_items)',
        );
        const hasIndentLevel = checklistInfo.some(
            (col) => col.name === 'indent_level',
        );
        if (!hasIndentLevel) {
            try {
                await connection.execute(
                    'ALTER TABLE checklist_items ADD COLUMN indent_level INTEGER NOT NULL DEFAULT 0',
                );
            } catch (error) {
                if (!String(error).includes('duplicate column name')) throw error;
            }
        }

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS task_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        label TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

        await connection.execute(
            'CREATE INDEX IF NOT EXISTS idx_tasks_important_status ON tasks(important, status)',
        );
        await connection.execute(
            'CREATE INDEX IF NOT EXISTS idx_checklist_task_position ON checklist_items(task_id, position)',
        );
        await connection.execute(
            'CREATE INDEX IF NOT EXISTS idx_task_resources_task_created ON task_resources(task_id, created_at, id)',
        );
        await connection.execute(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_task_resources_unique_link
            ON task_resources(task_id, value)
            WHERE type = 'link'
        `);

        db = connection;
        return connection;
    })();

    try {
        return await dbPromise;
    } catch (e) {
        dbPromise = null;
        console.error('[DB] Failed to initialize SQLite:', e);
        throw e;
    }
}

export async function getTasks() {
    const d = await initDB();
    return await d.select('SELECT * FROM tasks ORDER BY created_at DESC');
}

export async function getImportantTasks() {
    const d = await initDB();
    return await d.select(`
        SELECT
            tasks.*,
            COUNT(checklist_items.id) AS item_count,
            COALESCE(
                SUM(CASE WHEN checklist_items.checked != 0 THEN 1 ELSE 0 END),
                0
            ) AS checked_count
        FROM tasks
        LEFT JOIN checklist_items ON checklist_items.task_id = tasks.id
        WHERE tasks.important = 1 AND tasks.status != 'done'
        GROUP BY tasks.id
        ORDER BY
            CASE tasks.status
                WHEN 'expired' THEN 0
                WHEN 'doing' THEN 1
                ELSE 2
            END,
            CASE WHEN tasks.deadline IS NULL THEN 1 ELSE 0 END,
            tasks.deadline ASC,
            tasks.created_at DESC
    `);
}

export async function addTask(name) {
    return addTaskWithItems(name);
}

export async function addTaskWithItems(name, items = [], status = 'todo') {
    const d = await initDB();
    const taskResult = await d.execute(
        'INSERT INTO tasks (name, status) VALUES (?, ?)',
        [name, status],
    );
    const taskId = taskResult.lastInsertId;

    if (taskId === undefined) {
        throw new Error('O banco não retornou o identificador da nova tarefa.');
    }

    const normalizedItems = items
        .map((item, position) => ({
            text: String(item.text ?? '').trim(),
            checked: item.checked ? 1 : 0,
            position,
            indentLevel: Math.max(
                0,
                Math.min(Number(item.indentLevel) || 0, 3),
            ),
        }))
        .filter((item) => item.text.length > 0);

    if (normalizedItems.length === 0) return taskId;

    try {
        const placeholders = normalizedItems
            .map(() => '(?, ?, ?, ?, ?)')
            .join(', ');
        const values = normalizedItems.flatMap((item) => [
            taskId,
            item.text,
            item.checked,
            item.position,
            item.indentLevel,
        ]);

        await d.execute(
            `INSERT INTO checklist_items
                (task_id, text, checked, position, indent_level)
             VALUES ${placeholders}`,
            values,
        );
        return taskId;
    } catch (error) {
        try {
            await d.execute(
                'DELETE FROM checklist_items WHERE task_id = ?',
                [taskId],
            );
            await d.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
        } catch (cleanupError) {
            console.error(
                '[DB] Failed to clean up an incomplete task:',
                cleanupError,
            );
        }
        throw error;
    }
}

export async function updateTaskName(id, name) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET name = ? WHERE id = ?', [name, id]);
}

export async function updateTaskStatus(id, status) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
}

export async function updateTaskImportant(id, important) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET important = ? WHERE id = ?', [
        important ? 1 : 0,
        id,
    ]);
}

export async function deleteTask(id) {
    const d = await initDB();
    await d.execute('DELETE FROM task_resources WHERE task_id = ?', [id]);
    await d.execute('DELETE FROM checklist_items WHERE task_id = ?', [id]);
    await d.execute('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function updateTaskDeadline(id, deadline) {
    const d = await initDB();
    await d.execute('UPDATE tasks SET deadline = ? WHERE id = ?', [deadline, id]);
}

export async function updateTaskReminder(id, intervalMinutes, nextAt) {
    const d = await initDB();
    await d.execute(
        `UPDATE tasks
         SET reminder_enabled = 1,
             reminder_interval_minutes = ?,
             reminder_next_at = ?
         WHERE id = ?`,
        [intervalMinutes, nextAt, id],
    );
}

export async function disableTaskReminder(id) {
    const d = await initDB();
    await d.execute(
        `UPDATE tasks
         SET reminder_enabled = 0,
             reminder_next_at = NULL
         WHERE id = ?`,
        [id],
    );
}

export async function updateTaskReminderNextAt(id, nextAt) {
    const d = await initDB();
    await d.execute(
        `UPDATE tasks
         SET reminder_next_at = ?
         WHERE id = ? AND reminder_enabled = 1`,
        [nextAt, id],
    );
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

export async function getTaskResources(taskId) {
    const d = await initDB();
    return await d.select(
        `SELECT id, type, value, label, created_at AS "createdAt"
         FROM task_resources
         WHERE task_id = ?
         ORDER BY created_at DESC, id DESC`,
        [taskId],
    );
}

export async function addTaskResource(taskId, resource) {
    const d = await initDB();
    const result = await d.execute(
        `INSERT INTO task_resources (task_id, type, value, label)
         VALUES (?, ?, ?, ?)`,
        [taskId, resource.type, resource.value, resource.label],
    );
    const resourceId = result.lastInsertId;

    if (resourceId === undefined) {
        throw new Error('O banco não retornou o identificador do novo recurso.');
    }

    const rows = await d.select(
        `SELECT id, type, value, label, created_at AS "createdAt"
         FROM task_resources
         WHERE id = ? AND task_id = ?`,
        [resourceId, taskId],
    );
    return rows[0];
}

export async function updateTaskResource(taskId, resourceId, resource) {
    const d = await initDB();
    await d.execute(
        `UPDATE task_resources
         SET type = ?, value = ?, label = ?
         WHERE id = ? AND task_id = ?`,
        [resource.type, resource.value, resource.label, resourceId, taskId],
    );

    const rows = await d.select(
        `SELECT id, type, value, label, created_at AS "createdAt"
         FROM task_resources
         WHERE id = ? AND task_id = ?`,
        [resourceId, taskId],
    );
    return rows[0];
}

export async function deleteTaskResource(taskId, resourceId) {
    const d = await initDB();
    await d.execute(
        'DELETE FROM task_resources WHERE id = ? AND task_id = ?',
        [resourceId, taskId],
    );
}
