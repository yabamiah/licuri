import { useTasks } from './hooks/useTasks';
import Titlebar from './components/Titlebar';
import TaskSidebar from './components/TaskSidebar';
import TaskView from './components/TaskView';

export default function App() {
    const {
        tasks,
        selectedTask,
        selectedTaskId,
        setSelectedTaskId,
        items,
        loading,
        createTask,
        removeTask,
        changeStatus,
        renameTask,
        updateDeadline,
        createItem,
        toggleItemCheck,
        removeItem,
    } = useTasks();

    if (loading) {
        return (
            <div className="app">
                <Titlebar />
                <div className="loading-screen">
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Titlebar />
            <div className="app-body">
                <TaskSidebar
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    onSelect={setSelectedTaskId}
                    onCreateTask={createTask}
                    onDeleteTask={removeTask}
                />
                <TaskView
                    task={selectedTask}
                    items={items}
                    onChangeStatus={changeStatus}
                    onAddItem={createItem}
                    onToggleItem={toggleItemCheck}
                    onDeleteItem={removeItem}
                    onRenameTask={renameTask}
                    onUpdateDeadline={updateDeadline}
                />
            </div>
        </div>
    );
}
