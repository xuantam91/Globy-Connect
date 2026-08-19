from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from api.app.core.database import Base

class XiaozhiAccount(Base):
    __tablename__ = "xiaozhi_accounts"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(255), nullable=False)
    bearer_token = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    devices = relationship("Device", back_populates="account", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    total_usage_seconds = Column(Integer, default=0)
    mac_address = Column(String(100), index=True, nullable=True)
    current_language = Column(String(50), default="en")
    current_voice = Column(String(100), nullable=True)
    ai_prompt_template = Column(Text, nullable=True)
    llm_model = Column(String(100), default="qwen")
    
    # New audio settings and extensions
    asr_speed = Column(String(50), default="normal")
    tts_speech_speed = Column(String(50), default="normal")
    tts_pitch = Column(Integer, default=0)
    mcp_endpoints_json = Column(Text, default="[\"2\", \"104\"]")
    
    # Xiaozhi Device Info fields
    board_name = Column(String(100), nullable=True)
    serial_number = Column(String(255), nullable=True)
    is_auth = Column(Boolean, default=False)
    app_version = Column(String(50), nullable=True)
    agent_id = Column(String(255), nullable=True)
    
    account_id = Column(Integer, ForeignKey("xiaozhi_accounts.id", ondelete="CASCADE"), nullable=True)
    account = relationship("XiaozhiAccount", back_populates="devices")
    
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Preset(Base):
    __tablename__ = "presets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    llm_model = Column(String(100), default="qwen")
    language = Column(String(50), default="en")
    tts_voice = Column(String(100), nullable=True)
    tts_speech_speed = Column(String(50), default="normal")
    asr_speed = Column(String(50), default="normal")
    tts_pitch = Column(Integer, default=0)
    mcp_endpoints_json = Column(Text, default="[\"2\", \"104\"]")
    character_prompt = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    icon = Column(String(50), default="✨")
    version = Column(Integer, default=1)
    sort_order = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    gender = Column(String(20), default="neutral")  # 'male', 'female', 'neutral'
    created_at = Column(DateTime, default=func.now())


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)


