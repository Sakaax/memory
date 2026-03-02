mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_scopes,
            get_current_scope,
            set_current_scope,
            create_scope,
            delete_scope,
            get_memories,
            add_memory,
            update_memory,
            delete_memory,
            move_memory,
            run_learn_json,
            store_inferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
