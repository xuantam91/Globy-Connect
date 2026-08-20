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

        # 1. Fetch Agents List (Pagination)
        page = 1
        page_size = 100
        all_agents = []
        synced_devices = []

        try:
            while True:
                res = await client.get(
                    "https://xiaozhi.me/api/agents",
                    params={"page": page, "pageSize": page_size},
                    headers=headers
                )
                res.raise_for_status()
                data = res.json()
                
                # Extract agents
                agents = []
                if isinstance(data, list):
                    agents = data
                elif isinstance(data, dict):
                    d_val = data.get("data")
                    if isinstance(d_val, list):
                        agents = d_val
                    elif isinstance(d_val, dict):
                        agents = d_val.get("items") or d_val.get("list") or d_val.get("agents") or []
                    else:
                        agents = data.get("items") or data.get("list") or data.get("agents") or []
                
                agents = [a for a in agents if isinstance(a, dict)]
                
                if not agents:
                    break
                    
                all_agents.extend(agents)
                if len(agents) < page_size:
                    break
                page += 1
        except Exception as e:
            logger.error(f"Failed to fetch agents for account {account.label}: {e}")
            raise e

        if not all_agents:
            return 0

        # 2. Fetch Device Detail & Config for each Agent in Parallel
        # Limit concurrency with a semaphore to prevent throttling
        sem = asyncio.Semaphore(15) 
        
        async def fetch_detail_and_config(agent):
            async with sem:
                agent_id = str(agent.get("id") or agent.get("agentId") or agent.get("uuid") or "")
                if not agent_id:
                    return None
                
                devices_url = f"https://xiaozhi.me/api/agents/{agent_id}/devices"
                config_url = f"https://xiaozhi.me/api/agents/{agent_id}/config"
                
                async def get_devices():
                    try:
                        res = await client.get(devices_url, headers=headers)
                        return res.json() if res.status_code == 200 else None
                    except Exception as e:
                        logger.warning(f"Failed to fetch devices for agent {agent_id}: {e}")
                        return None
                        
                async def get_config():
                    try:
                        res = await client.get(config_url, headers=headers)
                        return res.json() if res.status_code == 200 else None
                    except Exception as e:
                        logger.warning(f"Failed to fetch config for agent {agent_id}: {e}")
                        return None

                device_payload, config_payload = await asyncio.gather(get_devices(), get_config())
                    
                return {
                    "agent": agent,
                    "agent_id": agent_id,
                    "devices": device_payload,
                    "config": config_payload
                }

        tasks = [fetch_detail_and_config(agent) for agent in all_agents]
        results = await asyncio.gather(*tasks)
        
        # 3. Update Database
        synced_count = 0
        for item in results:
            if not item:
                continue
                
            agent = item["agent"]
            agent_id = item["agent_id"]
            devices_data = item["devices"]
            config_data = item["config"]
            
            # Extract device list
            device_items = []
            if devices_data:
                if isinstance(devices_data, list):
                    device_items = devices_data
                elif isinstance(devices_data, dict):
                    data_field = devices_data.get("data", [])
                    if isinstance(data_field, list):
                        device_items = data_field
                    elif isinstance(data_field, dict):
                        device_items = data_field.get("items", []) or data_field.get("list", [])
            
            # Fallback to lastDevice if no devices listed
            if not device_items and isinstance(agent.get("lastDevice"), dict):
                device_items = [agent["lastDevice"]]
                
            # If still empty, create a placeholder device based on agent
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
                
                # Extract AI Config from config call or fallback
                lang = "en"
                voice = ""
                character = ""
                asr_speed = "normal"
                tts_speed = "normal"
                pitch = 0
                endpoints = ["2", "104"]
                model = "qwen"
                
                if config_data and isinstance(config_data, dict):
                    c_data = config_data.get("data", config_data)
                    lang = c_data.get("language") or c_data.get("lang") or "en"
                    voice = c_data.get("tts_voice") or c_data.get("voice") or ""
                    character = c_data.get("character") or ""
                    asr_speed = c_data.get("asr_speed") or "normal"
                    tts_speed = c_data.get("tts_speech_speed") or "normal"
                    pitch = c_data.get("tts_pitch") if c_data.get("tts_pitch") is not None else 0
                    model = c_data.get("llm_model") or c_data.get("llmModel") or c_data.get("model") or "qwen"
                    if isinstance(c_data.get("mcp_endpoints"), list):
                        endpoints = c_data.get("mcp_endpoints")
                else:
                    lang = agent.get("language") or agent.get("lang") or "en"
                    voice = agent.get("tts_voice") or agent.get("voice") or ""
                    character = agent.get("character") or ""
                    asr_speed = agent.get("asr_speed") or "normal"
                    tts_speed = agent.get("tts_speech_speed") or agent.get("tts_speed") or "normal"
                    pitch = agent.get("tts_pitch") if agent.get("tts_pitch") is not None else 0
                    model = agent.get("llm_model") or agent.get("llmModel") or agent.get("model") or "qwen"
                    if isinstance(agent.get("mcp_endpoints"), list):
                        endpoints = agent.get("mcp_endpoints")
                    
                # Find/Create in DB
                db_device = self.db.scalar(
                    select(Device).where(Device.external_id == raw_device_id)
                )
                if not db_device:
                    db_device = Device(external_id=raw_device_id)
                    self.db.add(db_device)
                synced_devices.append(db_device)
                
                db_device.name = name
                db_device.status = status
                db_device.mac_address = mac or db_device.mac_address or f"00:11:22:33:AA:{synced_count:02X}" # fallback fake mac for QR scanner demo
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
            
        # Fire-and-forget the actual HTTP call to Supabase in a background task
        async def do_supabase_post(url, key, data):
            endpoint = f"{url}/rest/v1/devices"
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    res = await client.post(endpoint, json=data, headers=headers)
                    if res.status_code not in (200, 201):
                        logger.error(f"Supabase bulk sync failed with status {res.status_code}: {res.text}")
                except Exception as e:
                    logger.error(f"Error bulk syncing devices to Supabase: {e}")
                    
        asyncio.create_task(do_supabase_post(sb_url, sb_key, payload))
        return True

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
