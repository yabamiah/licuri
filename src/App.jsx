import { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import Titlebar from './components/Titlebar';
import TaskSidebar from './components/TaskSidebar';
import TaskView from './components/TaskView';
import CreateTaskDialog from './components/CreateTaskDialog';
import ReminderDeliveryAlert from './components/ReminderDeliveryAlert';

export default function App() {
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const {
        tasks,
        selectedTask,
        selectedTaskId,
        setSelectedTaskId,
        items,
        loading,
        reminderDeliveryError,
        clearReminderDeliveryError,
        createTask,
        removeTask,
        changeStatus,
        renameTask,
        updateDeadline,
        setTaskImportant,
        setTaskReminder,
        disableTaskReminder,
        testTaskReminder,
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
            <ReminderDeliveryAlert
                failure={reminderDeliveryError}
                onDismiss={clearReminderDeliveryError}
            />
            <div className="app-body">
                <TaskSidebar
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    onSelect={setSelectedTaskId}
                    onRequestCreate={() => setCreateTaskOpen(true)}
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
                    onSetImportant={setTaskImportant}
                    onSetReminder={setTaskReminder}
                    onDisableReminder={disableTaskReminder}
                    onTestReminder={testTaskReminder}
                />
            </div>
            <CreateTaskDialog
                open={createTaskOpen}
                onClose={() => setCreateTaskOpen(false)}
                onCreate={createTask}
            />
        </div>
    );
}
