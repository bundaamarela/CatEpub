use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct FolderChange {
    pub path: String,
    pub kind: String,
}

fn collect_epubs(dir: &Path) -> Vec<String> {
    let mut result = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return result;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            result.extend(collect_epubs(&p));
        } else if p.extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("epub"))
        {
            result.push(p.to_string_lossy().into_owned());
        }
    }
    result
}

#[tauri::command]
fn scan_library_folder(path: String) -> Vec<String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Vec::new();
    }
    collect_epubs(p)
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn read_epub_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_temp_file(data: Vec<u8>, name: String) -> Result<String, String> {
    let dir = std::env::temp_dir().join("cat-epub-convert");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&name);
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn convert_to_epub(input_path: String, output_dir: String) -> Result<String, String> {
    let input = Path::new(&input_path);
    let stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "output".to_string());
    let out = Path::new(&output_dir).join(format!("{}.epub", stem));

    let status = std::process::Command::new("pandoc")
        .arg(&input_path)
        .arg("-o")
        .arg(&out)
        .arg("--epub-title")
        .arg(&stem)
        .status()
        .map_err(|e| format!("Pandoc não encontrado: {}", e))?;

    if !status.success() {
        return Err(format!(
            "Pandoc falhou com código {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(out.to_string_lossy().into_owned())
}

static WATCHER_GEN: AtomicU64 = AtomicU64::new(0);
static WATCHER: OnceLock<Mutex<Option<RecommendedWatcher>>> = OnceLock::new();

#[tauri::command]
fn watch_library_folder(path: String, app: AppHandle) -> Result<(), String> {
    let gen = WATCHER_GEN.fetch_add(1, Ordering::SeqCst) + 1;

    let slot = WATCHER.get_or_init(|| Mutex::new(None));
    if let Ok(mut g) = slot.lock() {
        *g = None;
    }

    std::thread::spawn(move || {
        loop {
            if WATCHER_GEN.load(Ordering::SeqCst) != gen {
                return;
            }

            if Path::new(&path).exists() {
                let app_for_watcher = app.clone();
                let watcher_result = notify::recommended_watcher(
                    move |res: notify::Result<Event>| {
                        let Ok(event) = res else { return };
                        let kind_str = match event.kind {
                            EventKind::Create(_) => "added",
                            EventKind::Remove(_) => "removed",
                            _ => return,
                        };
                        for p in &event.paths {
                            if p.extension()
                                .and_then(|e| e.to_str())
                                .is_some_and(|e| e.eq_ignore_ascii_case("epub"))
                            {
                                let payload = FolderChange {
                                    path: p.to_string_lossy().into_owned(),
                                    kind: kind_str.to_string(),
                                };
                                let _ = app_for_watcher.emit("library-folder-changed", payload);
                            }
                        }
                    },
                );

                if let Ok(mut watcher) = watcher_result {
                    if watcher
                        .watch(Path::new(&path), RecursiveMode::Recursive)
                        .is_ok()
                    {
                        if let Ok(mut g) = slot.lock() {
                            *g = Some(watcher);
                        }
                        return;
                    }
                }
            }

            std::thread::sleep(Duration::from_secs(30));
        }
    });

    Ok(())
}

#[tauri::command]
async fn pick_folder(app: AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    app.dialog()
        .file()
        .set_title("Escolher pasta de livros")
        .blocking_pick_folder()
        .map(|f| f.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_library_folder,
            watch_library_folder,
            pick_folder,
            path_exists,
            read_epub_file,
            save_temp_file,
            convert_to_epub,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
