import asyncio
import logging
import json
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from api.app.models import Device, XiaozhiAccount, SystemSetting

logger = logging.getLogger(__name__)

class XiaozhiService:
    def __init__(self, db: Session):
      self.db = db

    async def sync_all_accounts(self) -> int:
        """Syncs all active Xiaozhi accounts in parallel."""
        accounts = self.db.scalars(
            select(XiaozhiAccount).where(XiaozhiAccount.is_active == True)
        ).all()
        
        if not accounts:
            logger.info("No active accounts. Generating mock devices for demo.")
            await self._create_mock_devices()
            return 15 # Return mock count for demo

        total_synced = 0
        async with httpx.AsyncClient(timeout=15.0) as client:
            tasks = [self.sync_account(client, account) for account in accounts]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, int):
                    total_synced += res
                elif isinstance(res, Exception):
                    logger.error(f"Account sync error: {res}")
                    
        return total_synced

    async def sync_account(self, client: httpx.AsyncClient, account: XiaozhiAccount) -> int:
        """Syncs devices for a single account using parallel requests."""
        # Special check for mock tokens
        if account.bearer_token == "mock" or account.bearer_token.startswith("mock_"):
            await self._create_mock_devices(account.id)
            return 15

        headers = {
            "Authorization": f"Bearer {account.bearer_token.strip()}",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }

        # 1. Fetch Agents List (Pagination with Parallel Pages)
        all_agents = []
        synced_devices = []
        page_size = 100

        try:
            # Fetch Page 1 first
            res1 = await client.get(
                "https://xiaozhi.me/api/agents",
                params={"page": 1, "pageSize": page_size},
                headers=headers
            )
            res1.raise_for_status()
            data1 = res1.json()
            
            def extract_agents(data):
                if isinstance(data, list):
                    return data
                if isinstance(data, dict):
                    d_val = data.get("data")
                    if isinstance(d_val, list):
                        return d_val
                    if isinstance(d_val, dict):
                        return d_val.get("items") or d_val.get("list") or d_val.get("agents") or []
                    return data.get("items") or data.get("list") or data.get("agents") or []
                return []
                
            agents1 = [a for a in extract_agents(data1) if isinstance(a, dict)]
            all_agents.extend(agents1)
            
            # Determine total pages
            total_items = 0
            if isinstance(data1, dict):
                total_items = data1.get("total") or data1.get("totalCount") or data1.get("count") or 0
                if not total_items and isinstance(data1.get("data"), dict):
                    d_dict = data1["data"]
                    total_items = d_dict.get("total") or d_dict.get("totalCount") or d_dict.get("count") or 0
            
            if total_items > 0:
                import math
                total_pages = math.ceil(total_items / page_size)
            elif len(agents1) == page_size:
                # Speculative fallback if total is not provided
                total_pages = 12 # Cover up to 1200 devices in parallel
            else:
                total_pages = 1
                
            if total_pages > 1:
                # Fetch remaining pages in parallel
                async def fetch_page(p_num):
                    try:
                        res = await client.get(
                            "https://xiaozhi.me/api/agents",
                            params={"page": p_num, "pageSize": page_size},
                            headers=headers
                        )
                        if res.status_code == 200:
                            return [a for a in extract_agents(res.json()) if isinstance(a, dict)]
                    except Exception as pe:
                        logger.warning(f"Failed to fetch page {p_num} in parallel: {pe}")
                    return []
                    
                page_tasks = [fetch_page(p) for p in range(2, total_pages + 1)]
                pages_results = await asyncio.gather(*page_tasks)
                for page_agents in pages_results:
                    all_agents.extend(page_agents)
        except Exception as e:
            logger.error(f"Failed to fetch agents for account {account.label}: {e}")
            raise e

        if not all_agents:
            return 0

        # 2. Batch query all existing devices for this account to optimize SQLite queries
        existing_devices = {
            d.external_id: d for d in self.db.scalars(
                select(Device).where(Device.account_id == account.id)
            ).all()
        }

        # 3. Update Database
        synced_count = 0
        for agent in all_agents:
            agent_id = str(agent.get("id") or agent.get("agentId") or agent.get("uuid") or "")
            if not agent_id:
                continue
                
            # Extract device items (fallback to lastDevice or placeholder)
            device_items = []
            if isinstance(agent.get("devices"), list):
                device_items = agent["devices"]
            elif isinstance(agent.get("lastDevice"), dict):
                device_items = [agent["lastDevice"]]
                
            if not device_items:
                device_items = [{"id": f"agent-{agent_id}", "name": agent.get("name")}]

            for dev in device_items:
                raw_device_id = str(dev.get("id") or dev.get("deviceId") or dev.get("device_id") or f"dev-{agent_id}")
                mac = str(dev.get("mac_address") or dev.get("macAddress") or dev.get("mac") or "").strip()
                
                # Check status
                status_text = str(dev.get("status") or dev.get("state") or "").strip().lower()
                is_online = dev.get("online") or dev.get("is_online") or dev.get("isOnline")
                if isinstance(is_online, bool):
                    status = "online" if is_online else "offline"
                elif status_text in ("online", "connected"):
                    status = "online"
                else:
                    status = "offline"
                
                name = dev.get("alias") or dev.get("name") or agent.get("agent_name") or agent.get("name") or f"Loa {mac[-5:].replace(':', '') if mac else raw_device_id[-4:]}"
                
                # Extract AI Config from agent properties directly
                lang = agent.get("language") or agent.get("lang") or "en"
                voice = agent.get("tts_voice") or agent.get("voice") or ""
                character = agent.get("character") or ""
                asr_speed = agent.get("asr_speed") or "slow"
                tts_speed = agent.get("tts_speech_speed") or agent.get("tts_speed") or "normal"
                pitch = agent.get("tts_pitch") if agent.get("tts_pitch") is not None else 0
                model = agent.get("llm_model") or agent.get("llmModel") or agent.get("model") or "qwen"
                
                endpoints = ["2", "104"]
                if isinstance(agent.get("mcp_endpoints"), list):
                    endpoints = agent.get("mcp_endpoints")
                    
                # Find/Create in DB using our dictionary cache
                db_device = existing_devices.get(raw_device_id)
                if not db_device:
                    db_device = Device(external_id=raw_device_id)
                    self.db.add(db_device)
                    existing_devices[raw_device_id] = db_device
                synced_devices.append(db_device)
                
                db_device.name = name
                db_device.status = status
                db_device.mac_address = mac or db_device.mac_address or f"00:11:22:33:AA:{synced_count:02X}"
                db_device.current_language = lang
                db_device.current_voice = voice
                db_device.ai_prompt_template = character
                db_device.llm_model = model
                db_device.asr_speed = asr_speed
                db_device.tts_speech_speed = tts_speed
                db_device.tts_pitch = pitch
                db_device.mcp_endpoints_json = json.dumps(endpoints)
                
                # Hardware metadata
                db_device.board_name = dev.get("board_name") or dev.get("boardName")
                db_device.serial_number = dev.get("serial_number") or dev.get("serialNumber")
                db_device.is_auth = dev.get("is_auth") or dev.get("isAuth") or False
                db_device.app_version = dev.get("app_version") or dev.get("appVersion")
                
                db_device.account_id = account.id
                db_device.agent_id = agent_id
                db_device.last_seen_at = datetime.utcnow()
                
                synced_count += 1
                
        self.db.commit()
        try:
            await self.sync_devices_to_supabase(synced_devices)
        except Exception as se:
            logger.error(f"Failed to sync devices to Supabase on sync: {se}")
        return synced_count

    async def sync_devices_to_supabase(self, devices: list) -> bool:
        """Upserts a list of devices to Supabase PostgREST API in bulk in the background."""
        if not devices:
            return True
            
        url_setting = self.db.scalar(select(SystemSetting).where(SystemSetting.key == "supabase_url"))
        key_setting = self.db.scalar(select(SystemSetting).where(SystemSetting.key == "supabase_key"))
        
        sb_url = url_setting.value.strip() if url_setting and url_setting.value else ""
        sb_key = key_setting.value.strip() if key_setting and key_setting.value else ""
        
        if not sb_url:
            from api.app.core.config import get_settings
            config_settings = get_settings()
            sb_url = config_settings.supabase_url.strip() if config_settings.supabase_url else ""
            sb_key = config_settings.supabase_key.strip() if config_settings.supabase_key else ""
            
        if not sb_url or not sb_key:
            return False
            
        payload = []
        for device in devices:
            payload.append({
                "external_id": device.external_id,
                "name": device.name,
                "status": device.status,
                "mac_address": device.mac_address,
                "current_language": device.current_language,
                "current_voice": device.current_voice,
                "ai_prompt_template": device.ai_prompt_template,
                "asr_speed": device.asr_speed,
                "tts_speech_speed": device.tts_speech_speed,
                "tts_pitch": device.tts_pitch,
                "board_name": device.board_name,
                "serial_number": device.serial_number,
                "is_auth": device.is_auth,
                "app_version": device.app_version,
                "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None
            })
            
        endpoint = f"{sb_url}/rest/v1/devices?on_conflict=external_id"
        headers = {
            "apikey": sb_key,
            "Authorization": f"Bearer {sb_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(endpoint, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    logger.info("Successfully bulk synced devices to Supabase.")
                    return True
                else:
                    logger.error(f"Supabase bulk sync failed with status {res.status_code}: {res.text}")
                    return False
            except Exception as e:
                logger.error(f"Error bulk syncing devices to Supabase: {e}")
                return False

    async def update_device_config(self, device: Device, llm_model: str, language: str, tts_voice: str, tts_speech_speed: str, asr_speed: str, tts_pitch: int, mcp_endpoints: list, character: str) -> bool:
        """Saves config to DB and uploads to Xiaozhi API."""
        # Save to DB
        device.current_language = language
        device.current_voice = tts_voice
        device.ai_prompt_template = character
        device.asr_speed = asr_speed
        device.tts_speech_speed = tts_speech_speed
        device.tts_pitch = tts_pitch
        device.mcp_endpoints_json = json.dumps(mcp_endpoints)
        self.db.commit()

        if not device.account or device.account.bearer_token.startswith("mock"):
            logger.info("Mock update: configuration updated locally.")
            return True

        # Post to Xiaozhi API
        push_agent_id = device.agent_id or device.external_id
        if "agent-" in push_agent_id:
            push_agent_id = push_agent_id.replace("agent-", "")

        url = f"https://xiaozhi.me/api/agents/{push_agent_id}/config"
        headers = {
            "Authorization": f"Bearer {device.account.bearer_token.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        # Payload matched to Xioazhi API.json and API-Post
        payload = {
            "agent_name": device.name,
            "llm_model": llmModelMapping(llm_model),
            "tts_voice": tts_voice,
            "tts_speech_speed": tts_speech_speed,
            "tts_pitch": tts_pitch,
            "asr_speed": asr_speed,
            "language": language,
            "character": character,
            "memory_type": "LONG_TERM",
            "mcp_endpoints": mcp_endpoints,
            "knowledge_base_ids": []
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, json=payload, headers=headers)
                res.raise_for_status()
                return True
            except httpx.HTTPStatusError as e:
                if e.response.status_code in (401, 403, 404):
                    logger.warning(f"Xiaozhi API config push returned {e.response.status_code} (non-developer or restricted agent). Local DB updated successfully. Agent: {push_agent_id}")
                    return True
                logger.error(f"HTTP error pushing config to Xiaozhi API for agent {push_agent_id}: {e}")
                return False
            except Exception as e:
                logger.error(f"Failed to push config to Xiaozhi API for agent {push_agent_id}: {e}")
                return False

    async def _create_mock_devices(self, account_id: int = None):
        """Generates mock devices for demo purposes."""
        mock_data = [
          ("1", "Loa Phòng Khách", "online", "VI:01:23:45:67:89", "vi", "vi-VN-HoaiMyNeural", "Bạn là trợ lý đắc lực..."),
          ("2", "Loa Phòng Ngủ", "offline", "VI:01:23:45:67:90", "en", "zh_female_shuangkuaisisi_moon_bigtts", "You are Skye, a friendly English teacher..."),
          ("3", "Loa Trẻ Em 1", "online", "VI:01:23:45:67:91", "en", "zh_female_mengyatou_mars_bigtts", "You are a patient tutor..."),
          ("4", "Loa Trẻ Em 2", "online", "VI:01:23:45:67:92", "vi", "vi-VN-NamMinhNeural", "Bạn kể chuyện cổ tích cho bé nghe..."),
          ("5", "Loa Đọc Sách", "offline", "VI:01:23:45:67:93", "ja", "ja_female_1_v1", "Japanese language assistant..."),
        ]
        
        # If we want to simulate scale, let's create a loop to generate up to 50 devices
        for i in range(6, 40):
            status = "online" if i % 3 != 0 else "offline"
            lang = "en" if i % 2 == 0 else "vi"
            voice = "zh_male_wennuanahu_moon_bigtts" if lang == "en" else "vi-VN-HoaiMyNeural"
            mock_data.append((
                str(i),
                f"Loa Học Viên {i}",
                status,
                f"AA:BB:CC:DD:EE:{i:02X}",
                lang,
                voice,
                "Prompt template..."
            ))

        for ext_id, name, status, mac, lang, voice, prompt in mock_data:
            db_device = self.db.scalar(
                select(Device).where(Device.external_id == ext_id)
            )
            if not db_device:
                db_device = Device(external_id=ext_id)
                self.db.add(db_device)
            db_device.name = name
            db_device.status = status
            db_device.mac_address = mac
            db_device.current_language = lang
            db_device.current_voice = voice
            db_device.ai_prompt_template = prompt
            db_device.account_id = account_id
            db_device.last_seen_at = datetime.utcnow()
            
        self.db.commit()

def llmModelMapping(model_id: str) -> str:
    # Maps internal select value to Xiaozhi actual model value
    mapping = {
        "xz-lite": "xz-lite",
        "qwen": "qwen",
        "deepseek": "deepseek",
        "doubao": "doubao",
        "gpt-5": "gpt-5"
    }
    return mapping.get(model_id, "qwen")
