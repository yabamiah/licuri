use std::{
    collections::HashMap,
    sync::Mutex,
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

#[cfg(target_os = "macos")]
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewWindow,
};
use tauri_plugin_positioner::{Position, WindowExt};

const QUICK_WINDOW_LABEL: &str = "quick-tasks";
const MAIN_WINDOW_LABEL: &str = "main";
const QUICK_OPENED_EVENT: &str = "licuri://quick-opened";
const REMINDER_FIRED_EVENT: &str = "licuri://reminder-fired";
const REMINDER_FAILED_EVENT: &str = "licuri://reminder-failed";
const TRAY_BLUR_GRACE_PERIOD: Duration = Duration::from_millis(250);
const REMINDER_POLL_INTERVAL: Duration = Duration::from_secs(15);

#[derive(Default)]
struct QuickWindowState {
    last_blurred_at: Mutex<Option<Instant>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskReminderInput {
    task_id: i64,
    task_name: String,
    interval_minutes: u64,
    next_at_ms: u64,
}

#[derive(Debug, Clone)]
struct TaskReminder {
    task_id: i64,
    task_name: String,
    interval_minutes: u64,
    next_at_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReminderFiredPayload {
    task_id: i64,
    next_at_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationOperationResult {
    ok: bool,
    backend: String,
    reason: Option<String>,
    detail: Option<String>,
    warning: Option<String>,
}

impl NotificationOperationResult {
    fn success(backend: &str) -> Self {
        Self {
            ok: true,
            backend: backend.to_string(),
            reason: None,
            detail: None,
            warning: None,
        }
    }

    fn success_with_warning(backend: &str, warning: &str) -> Self {
        Self {
            warning: Some(warning.to_string()),
            ..Self::success(backend)
        }
    }

    fn failure(backend: &str, reason: &str, detail: impl Into<String>) -> Self {
        Self {
            ok: false,
            backend: backend.to_string(),
            reason: Some(reason.to_string()),
            detail: Some(detail.into()),
            warning: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReminderFailedPayload {
    task_id: i64,
    task_name: String,
    reason: String,
    detail: Option<String>,
}

#[derive(Default)]
struct ReminderSchedulerState {
    reminders: Mutex<HashMap<i64, TaskReminder>>,
}

fn now_epoch_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn next_occurrence_after(next_at_ms: u64, interval_minutes: u64, now_ms: u64) -> u64 {
    if next_at_ms > now_ms {
        return next_at_ms;
    }

    let interval_ms = interval_minutes.max(1).saturating_mul(60_000);
    let elapsed = now_ms.saturating_sub(next_at_ms);
    let intervals_to_skip = elapsed / interval_ms + 1;

    next_at_ms.saturating_add(intervals_to_skip.saturating_mul(interval_ms))
}

#[cfg(target_os = "macos")]
fn macos_notification_permission(request_if_needed: bool) -> NotificationOperationResult {
    use mac_usernotifications::{blocking, AuthorizationStatus, Error, NotificationSettingStatus};

    if tauri::is_dev() {
        return NotificationOperationResult::success_with_warning(
            "macos-dev",
            "development-fallback",
        );
    }

    let read_settings = || {
        blocking::get_notification_settings().map_err(|error| match error {
            Error::NoBundleIdentifier => {
                NotificationOperationResult::failure("macos-un", "no-bundle", error.to_string())
            }
            _ => NotificationOperationResult::failure(
                "macos-un",
                "permission-error",
                error.to_string(),
            ),
        })
    };

    let mut settings = match read_settings() {
        Ok(settings) => settings,
        Err(failure) => return failure,
    };

    if settings.authorization_status == AuthorizationStatus::NotDetermined {
        if !request_if_needed {
            return NotificationOperationResult::failure(
                "macos-un",
                "permission-required",
                "O Licuri ainda não recebeu autorização para enviar notificações.",
            );
        }

        match blocking::request_auth() {
            Ok(true) => match read_settings() {
                Ok(updated_settings) => settings = updated_settings,
                Err(failure) => return failure,
            },
            Ok(false) => {
                return NotificationOperationResult::failure(
                    "macos-un",
                    "denied",
                    "O macOS negou a autorização de notificações para o Licuri.",
                );
            }
            Err(error) => {
                return NotificationOperationResult::failure(
                    "macos-un",
                    "permission-error",
                    error.to_string(),
                );
            }
        }
    }

    match settings.authorization_status {
        AuthorizationStatus::Authorized
        | AuthorizationStatus::Provisional
        | AuthorizationStatus::Ephemeral => {}
        AuthorizationStatus::Denied => {
            return NotificationOperationResult::failure(
                "macos-un",
                "denied",
                "As notificações do Licuri estão bloqueadas no macOS.",
            );
        }
        AuthorizationStatus::NotDetermined | AuthorizationStatus::Unknown => {
            return NotificationOperationResult::failure(
                "macos-un",
                "permission-error",
                "O macOS não informou uma autorização válida para notificações.",
            );
        }
    }

    if settings.alert_enabled == NotificationSettingStatus::Disabled {
        return NotificationOperationResult::failure(
            "macos-un",
            "alerts-disabled",
            "Os banners de notificação do Licuri estão desativados no macOS.",
        );
    }

    NotificationOperationResult::success("macos-un")
}

#[cfg(not(target_os = "macos"))]
fn system_notification_permission(_request_if_needed: bool) -> NotificationOperationResult {
    NotificationOperationResult::success(if cfg!(windows) {
        "windows-toast"
    } else {
        "linux-dbus"
    })
}

#[cfg(target_os = "macos")]
fn system_notification_permission(request_if_needed: bool) -> NotificationOperationResult {
    macos_notification_permission(request_if_needed)
}

#[cfg(target_os = "macos")]
fn deliver_macos_development_notification(title: &str, body: &str) -> NotificationOperationResult {
    let script = concat!(
        "on run argv\n",
        "display notification (item 2 of argv) with title (item 1 of argv)\n",
        "end run",
    );

    match Command::new("/usr/bin/osascript")
        .args(["-e", script, "--", title, body])
        .output()
    {
        Ok(output) if output.status.success() => {
            NotificationOperationResult::success_with_warning("macos-dev", "development-fallback")
        }
        Ok(output) => NotificationOperationResult::failure(
            "macos-dev",
            "delivery-error",
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ),
        Err(error) => {
            NotificationOperationResult::failure("macos-dev", "delivery-error", error.to_string())
        }
    }
}

#[cfg(target_os = "macos")]
fn deliver_system_notification(
    _app: &AppHandle,
    title: &str,
    body: &str,
) -> NotificationOperationResult {
    if tauri::is_dev() {
        return deliver_macos_development_notification(title, body);
    }

    let permission = macos_notification_permission(false);
    if !permission.ok {
        return permission;
    }

    let notification = mac_usernotifications::Notification::new()
        .title(title)
        .message(body)
        .default_sound();

    match mac_usernotifications::blocking::send(notification) {
        Ok(_) => NotificationOperationResult::success("macos-un"),
        Err(error) => {
            NotificationOperationResult::failure("macos-un", "delivery-error", error.to_string())
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn deliver_system_notification(
    app: &AppHandle,
    title: &str,
    body: &str,
) -> NotificationOperationResult {
    let mut notification = notify_rust::Notification::new();
    notification
        .summary(title)
        .body(body)
        .appname("Licuri")
        .auto_icon();

    #[cfg(windows)]
    {
        use std::path::MAIN_SEPARATOR as SEP;

        if let Ok(executable) = std::env::current_exe() {
            let executable_directory = executable
                .parent()
                .map(|path| path.display().to_string())
                .unwrap_or_default();
            let is_development_binary = executable_directory
                .ends_with(format!("{SEP}target{SEP}debug").as_str())
                || executable_directory.ends_with(format!("{SEP}target{SEP}release").as_str());

            if !is_development_binary {
                notification.app_id(&app.config().identifier);
            }
        }
    }

    match notification.show() {
        Ok(_) => NotificationOperationResult::success(if cfg!(windows) {
            "windows-toast"
        } else {
            "linux-dbus"
        }),
        Err(error) => NotificationOperationResult::failure(
            if cfg!(windows) {
                "windows-toast"
            } else {
                "linux-dbus"
            },
            "delivery-error",
            error.to_string(),
        ),
    }
}

fn start_reminder_scheduler(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(REMINDER_POLL_INTERVAL);
        let now_ms = now_epoch_millis();
        let due_reminders = {
            let state = app.state::<ReminderSchedulerState>();
            let Ok(mut reminders) = state.reminders.lock() else {
                continue;
            };

            reminders
                .values_mut()
                .filter_map(|reminder| {
                    if reminder.next_at_ms > now_ms {
                        return None;
                    }

                    reminder.next_at_ms = next_occurrence_after(
                        reminder.next_at_ms,
                        reminder.interval_minutes,
                        now_ms,
                    );
                    Some(reminder.clone())
                })
                .collect::<Vec<_>>()
        };

        for reminder in due_reminders {
            let delivery = deliver_system_notification(
                &app,
                "Lembrete do Licuri",
                &format!("Hora de retomar: {}", reminder.task_name),
            );

            if !delivery.ok {
                let _ = app.emit(
                    REMINDER_FAILED_EVENT,
                    ReminderFailedPayload {
                        task_id: reminder.task_id,
                        task_name: reminder.task_name.clone(),
                        reason: delivery
                            .reason
                            .unwrap_or_else(|| "delivery-error".to_string()),
                        detail: delivery.detail,
                    },
                );
            }

            let _ = app.emit(
                REMINDER_FIRED_EVENT,
                ReminderFiredPayload {
                    task_id: reminder.task_id,
                    next_at_ms: reminder.next_at_ms,
                },
            );
        }
    });
}

#[tauri::command]
fn sync_task_reminders(
    state: State<'_, ReminderSchedulerState>,
    reminders: Vec<TaskReminderInput>,
) -> Result<(), String> {
    let mut scheduled = state
        .reminders
        .lock()
        .map_err(|_| "Não foi possível acessar o agendador de lembretes.".to_string())?;

    *scheduled = reminders
        .into_iter()
        .filter(|reminder| reminder.next_at_ms > 0)
        .map(|reminder| {
            let task_id = reminder.task_id;
            (
                task_id,
                TaskReminder {
                    task_id,
                    task_name: reminder.task_name,
                    interval_minutes: reminder.interval_minutes.max(1),
                    next_at_ms: reminder.next_at_ms,
                },
            )
        })
        .collect();

    Ok(())
}

#[tauri::command]
fn ensure_notification_permission() -> NotificationOperationResult {
    system_notification_permission(true)
}

#[tauri::command]
fn test_task_reminder(app: AppHandle, task_name: String) -> NotificationOperationResult {
    let permission = system_notification_permission(true);
    if !permission.ok {
        return permission;
    }

    deliver_system_notification(
        &app,
        "Teste de lembrete do Licuri",
        &format!("As notificações estão funcionando para: {task_name}"),
    )
}

#[cfg(not(target_os = "linux"))]
fn position_quick_window(_app: &AppHandle, window: &WebviewWindow) -> tauri::Result<()> {
    window.move_window_constrained(Position::TrayCenter)
}

#[cfg(target_os = "linux")]
fn position_quick_window(app: &AppHandle, window: &WebviewWindow) -> tauri::Result<()> {
    let cursor = app.cursor_position()?;
    let monitor = app
        .monitor_from_point(cursor.x, cursor.y)?
        .or(app.primary_monitor()?);

    let Some(monitor) = monitor else {
        return window.move_window(Position::TopRight);
    };

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size()?;
    let gap = 10.0;

    let min_x = monitor_position.x as f64 + gap;
    let max_x =
        monitor_position.x as f64 + monitor_size.width as f64 - window_size.width as f64 - gap;
    let min_y = monitor_position.y as f64 + gap;
    let max_y =
        monitor_position.y as f64 + monitor_size.height as f64 - window_size.height as f64 - gap;

    let x = (cursor.x - window_size.width as f64 / 2.0)
        .max(min_x)
        .min(max_x.max(min_x));
    let monitor_midpoint = monitor_position.y as f64 + monitor_size.height as f64 / 2.0;
    let preferred_y = if cursor.y < monitor_midpoint {
        cursor.y + gap
    } else {
        cursor.y - window_size.height as f64 - gap
    };
    let y = preferred_y.max(min_y).min(max_y.max(min_y));

    window.set_position(tauri::PhysicalPosition::new(
        x.round() as i32,
        y.round() as i32,
    ))
}

fn show_quick_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(QUICK_WINDOW_LABEL) else {
        return;
    };

    let _ = position_quick_window(app, &window);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit(QUICK_OPENED_EVENT, ());
}

fn hide_quick_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(QUICK_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

fn quick_window_was_just_blurred(app: &AppHandle) -> bool {
    app.state::<QuickWindowState>()
        .last_blurred_at
        .lock()
        .ok()
        .and_then(|last_blurred_at| *last_blurred_at)
        .is_some_and(|instant| instant.elapsed() <= TRAY_BLUR_GRACE_PERIOD)
}

#[cfg(not(target_os = "linux"))]
fn toggle_quick_window(app: &AppHandle) {
    let is_visible = app
        .get_webview_window(QUICK_WINDOW_LABEL)
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false);

    if is_visible || quick_window_was_just_blurred(app) {
        hide_quick_window(app);
    } else {
        show_quick_window(app);
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    hide_quick_window(&app);

    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(QuickWindowState::default())
        .manage(ReminderSchedulerState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            sync_task_reminders,
            ensure_notification_permission,
            test_task_reminder
        ])
        .setup(|app| {
            start_reminder_scheduler(app.handle().clone());

            let quick_i =
                MenuItem::with_id(app, "quick", "Tarefas importantes", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Abrir Licuri", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quick_i, &show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("licuri-tray")
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Licuri — tarefas importantes")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick" => show_quick_window(app),
                    "show" => show_main_window(app.clone()),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    #[cfg(not(target_os = "linux"))]
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_quick_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            tauri::WindowEvent::Focused(false) if window.label() == QUICK_WINDOW_LABEL => {
                if let Ok(mut last_blurred_at) = window
                    .app_handle()
                    .state::<QuickWindowState>()
                    .last_blurred_at
                    .lock()
                {
                    *last_blurred_at = Some(Instant::now());
                }
                let _ = window.hide();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::next_occurrence_after;

    #[test]
    fn keeps_future_occurrence_unchanged() {
        assert_eq!(next_occurrence_after(180_000, 1, 120_000), 180_000);
    }

    #[test]
    fn advances_an_occurrence_that_is_due_now() {
        assert_eq!(next_occurrence_after(120_000, 3, 120_000), 300_000);
    }

    #[test]
    fn skips_missed_occurrences_after_sleep() {
        assert_eq!(next_occurrence_after(60_000, 1, 250_000), 300_000);
    }
}
