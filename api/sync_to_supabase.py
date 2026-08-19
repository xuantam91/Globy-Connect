import sqlite3
import pg8000
import json

def main():
    # 1. Connect to local SQLite
    sqlite_path = "/Users/tamtran/Documents/Work/Globy-AI/Software/Dev-Build/Temp/Xiaozhi_Dashboard/Xiaozhi_Dashboard_Lite/xiaozhi_lite.db"
    conn_sqlite = sqlite3.connect(sqlite_path)
    cursor_sqlite = conn_sqlite.cursor()

    # Get local presets
    cursor_sqlite.execute("SELECT name, description, llm_model, language, tts_voice, tts_speech_speed, asr_speed, tts_pitch, mcp_endpoints_json, character_prompt, is_public, icon, version, sort_order, is_default, gender FROM presets")
    sqlite_presets = cursor_sqlite.fetchall()
    print(f"Đọc thành công {len(sqlite_presets)} presets từ SQLite cục bộ.")

    # 2. Connect to remote Supabase
    print("Kết nối đến Supabase PostgreSQL...")
    conn_pg = pg8000.dbapi.connect(
        host="aws-0-ap-northeast-1.pooler.supabase.com",
        port=6543,
        user="postgres.oyodshxujblhcvlmlpux",
        password="GlobyConnect2026",
        database="postgres"
    )
    cursor_pg = conn_pg.cursor()

    try:
        # 3. Clear demo data from Vercel/Supabase
        print("Đang xóa dữ liệu thiết bị (devices) cũ trên Supabase...")
        cursor_pg.execute("DELETE FROM devices")
        
        print("Đang xóa dữ liệu tài khoản (xiaozhi_accounts) cũ trên Supabase...")
        cursor_pg.execute("DELETE FROM xiaozhi_accounts")
        
        print("Đang xóa dữ liệu cấu hình mẫu (presets) cũ trên Supabase...")
        cursor_pg.execute("DELETE FROM presets")
        
        # 4. Insert local presets into Supabase
        print("Đang nạp 22 cấu hình chuẩn từ bản local lên Supabase...")
        for p in sqlite_presets:
            cursor_pg.execute(
                """
                INSERT INTO presets (
                    name, description, llm_model, language, tts_voice, 
                    tts_speech_speed, asr_speed, tts_pitch, mcp_endpoints_json, 
                    character_prompt, is_public, icon, version, sort_order, 
                    is_default, gender, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                p
            )
        
        conn_pg.commit()
        print("==================================================")
        print("Đồng bộ dữ liệu lên bản Vercel thành công rực rỡ!")
        print("==================================================")
    except Exception as e:
        conn_pg.rollback()
        print(f"Lỗi xảy ra trong quá trình đồng bộ: {e}")
    finally:
        cursor_pg.close()
        conn_pg.close()
        cursor_sqlite.close()
        conn_sqlite.close()

if __name__ == "__main__":
    main()
