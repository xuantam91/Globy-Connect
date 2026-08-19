import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Globe, Mic, CheckCircle, RefreshCw, Cpu, Volume2, Sliders, Sun, Moon, ArrowLeft, Heart, Home, Sparkles } from 'lucide-react';

// Group presets by base name (strip Nam/Nữ suffix)
function groupPresets(presets) {
  const map = {};
  presets.forEach(p => {
    const baseName = p.name.replace(/\s*\((Nam|Nữ|Male|Female)\)\s*$/i, '').replace(/\s+/g, ' ').trim();
    if (!map[baseName]) {
      map[baseName] = {
        baseName,
        icon: p.icon || '✨',
        description: p.description || '',
        language: p.language,
        model: p.llm_model,
        variants: []
      };
    }
    let gender = p.gender;
    if (!gender || gender === 'neutral') {
      const nameLower = p.name.toLowerCase();
      gender = nameLower.includes('(nam)') || nameLower.includes('(male)') ? 'male'
        : nameLower.includes('(nữ)') || nameLower.includes('(female)') ? 'female'
        : 'neutral';
    }
    map[baseName].variants.push({ ...p, gender });
    // Use the first variant's icon/description as group defaults
    if (!map[baseName].icon || map[baseName].icon === '✨') {
      map[baseName].icon = p.icon || '✨';
    }
  });
  return Object.values(map);
}

export default function QrLanding() {
  const navigate = useNavigate();
  const { mac: macParam } = useParams();
  const [searchParams] = useSearchParams();
  const mac = macParam || searchParams.get('mac') || '';

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState(false);

  const [presets, setPresets] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced customization state
  const [llmModel, setLlmModel] = useState('qwen');
  const [language, setLanguage] = useState('en');
  const [ttsVoice, setTtsVoice] = useState('zh_female_shuangkuaisisi_moon_bigtts');
  const [ttsSpeechSpeed, setTtsSpeechSpeed] = useState('normal');
  const [asrSpeed, setAsrSpeed] = useState('normal');
  const [ttsPitch, setTtsPitch] = useState(0);
  const [extensions, setExtensions] = useState(['2', '104']);
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [contribute, setContribute] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (mac) fetchDeviceStatus();
    fetchPresets();
  }, [mac]);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'custom') {
      const activePreset = presets.find(p => String(p.id) === String(selectedTemplate));
      if (activePreset) {
        setLlmModel(activePreset.llm_model || 'qwen');
        setLanguage(activePreset.language || 'en');
        setTtsVoice(activePreset.tts_voice || '');
        setTtsSpeechSpeed(activePreset.tts_speech_speed || 'normal');
        setAsrSpeed(activePreset.asr_speed || 'normal');
        setTtsPitch(activePreset.tts_pitch ?? 0);
        setExtensions(activePreset.mcp_endpoints || ['2', '104']);
        setCharacterPrompt(activePreset.character || '');
      }
    }
  }, [selectedTemplate, presets]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const fetchDeviceStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/devices/by-mac?mac=${encodeURIComponent(mac)}`);
      const data = await res.json();
      if (data.success) setDeviceInfo(data.data);
    } catch (err) {
      console.error('Failed to load device info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (data.success) {
        setPresets(data.data);
        if (data.data.length > 0) setSelectedTemplate(data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    let payload = { mac_address: mac, template_id: selectedTemplate };
    if (selectedTemplate === 'custom') {
      payload = {
        ...payload,
        llm_model: llmModel, language, tts_voice: ttsVoice,
        tts_speech_speed: ttsSpeechSpeed, asr_speed: asrSpeed,
        tts_pitch: ttsPitch, mcp_endpoints: extensions,
        character: characterPrompt, contribute
      };
    }
    try {
      const res = await fetch('/api/qr/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert(data.message || 'Không áp dụng được cấu hình.');
      }
    } catch {
      alert('Đã xảy ra lỗi khi gửi yêu cầu.');
    } finally {
      setApplying(false);
    }
  };

  const handleExtensionToggle = (id) => {
    setExtensions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const models = [
    { id: 'xz-lite', name: 'Xiaozhi Lite' },
    { id: 'qwen', name: 'Qwen' },
    { id: 'deepseek', name: 'DeepSeek V4' },
    { id: 'doubao', name: 'DouBao Seed 2.0' },
    { id: 'gpt-5', name: 'GPT-5' }
  ];
  const languages = [
    { code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'Tiếng Anh' },
    { code: 'zh', name: 'Tiếng Trung' }, { code: 'ja', name: 'Tiếng Nhật' }
  ];
  const voices = {
    vi: [{ id: 'vi-VN-HoaiMyNeural', name: 'Hoài Mỹ (Nữ)' }, { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam)' }],
    en: [
      { id: 'zh_female_shuangkuaisisi_moon_bigtts', name: 'Skye (Female)' },
      { id: 'zh_male_jingqiangkanye_moon_bigtts', name: 'Harmony (Male)' },
      { id: 'zh_female_mengyatou_mars_bigtts', name: 'Cutey (Child)' },
      { id: 'zh_male_shaonianzixin_moon_bigtts', name: 'Brayan (Teen)' },
      { id: 'zh_male_wennuanahu_moon_bigtts', name: 'Alvin (Male)' }
    ],
    zh: [{ id: 'zh_female_wanwanxiaohe_moon_bigtts', name: '湾湾小何' }, { id: 'zh_female_linjianvhai_moon_bigtts', name: '邻家女孩' }],
    ja: [{ id: 'ja_female_1_v1', name: 'Sakura (Nữ)' }, { id: 'ja_male_1_v1', name: 'Kenji (Nam)' }]
  };
  const speedOptions = ['slow', 'normal', 'fast'];
  const pitchOptions = [-2, 0, 2];

  // --- STYLES (mobile-first) ---
  const s = {
    page: {
      padding: '0', margin: '0 auto', maxWidth: '480px', height: '100vh',
      display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)',
    },
    backBtn: {
      background: 'transparent', border: 'none', color: 'var(--text-primary)',
      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem',
      cursor: 'pointer', padding: '8px 4px',
    },
    themeBtn: {
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      color: 'var(--text-primary)', padding: '8px', borderRadius: '50%', cursor: 'pointer',
    },
    deviceBar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', margin: '0 16px 4px', borderRadius: '12px',
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      marginTop: '12px',
    },
    deviceName: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' },
    macLabel: {
      fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)',
      padding: '3px 8px', borderRadius: '20px', border: '1px solid var(--border-color)',
      fontFamily: 'monospace',
    },
    sectionTitle: {
      fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600,
      padding: '12px 16px 8px', textTransform: 'uppercase', letterSpacing: '0.03em',
    },
    scrollArea: {
      flex: 1, overflowY: 'auto', padding: '0 12px 12px',
      WebkitOverflowScrolling: 'touch',
    },
    // Group card
    groupCard: (isSelected) => ({
      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
      background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
      borderRadius: '14px', padding: '12px', marginBottom: '10px',
      transition: 'all 0.15s ease',
      boxShadow: isSelected ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
    }),
    groupHeader: {
      display: 'flex', alignItems: 'center', gap: '10px',
    },
    groupIcon: {
      fontSize: '1.6rem', width: '42px', height: '42px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
      background: 'rgba(99,102,241,0.1)', flexShrink: 0,
    },
    groupInfo: { flex: 1, minWidth: 0 },
    groupName: {
      fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)',
      lineHeight: 1.3, marginBottom: '2px',
    },
    groupDesc: {
      fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4,
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    },
    groupMeta: {
      display: 'flex', gap: '10px', fontSize: '0.65rem', color: 'var(--text-muted)',
      marginTop: '4px',
    },
    metaItem: { display: 'flex', alignItems: 'center', gap: '3px' },
    // Gender toggle pills
    genderRow: {
      display: 'flex', gap: '6px', marginTop: '10px',
    },
    genderPill: (active) => ({
      flex: 1, padding: '8px 0', borderRadius: '10px', textAlign: 'center',
      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
      border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-secondary)',
    }),
    // Single preset (no male/female variants)
    singleCard: (isSelected) => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
      background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
      borderRadius: '14px', padding: '12px', marginBottom: '10px',
      cursor: 'pointer', transition: 'all 0.15s ease',
      boxShadow: isSelected ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
    }),
    // Bottom action
    bottomBar: {
      padding: '12px 16px', borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-primary)', position: 'sticky', bottom: 0, zIndex: 10,
    },
    applyBtn: (disabled) => ({
      width: '100%', background: 'linear-gradient(135deg, #6366f1, #10b981)',
      color: 'white', padding: '14px', borderRadius: '14px', fontWeight: 700,
      fontSize: '0.95rem', display: 'flex', justifyContent: 'center',
      alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
      opacity: disabled ? 0.6 : 1, transition: 'opacity 0.2s',
    }),
    advancedLink: {
      background: 'transparent', border: 'none', color: 'var(--primary)',
      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
      width: '100%', textDecoration: 'none',
    },
    footer: {
      textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)',
      padding: '8px 16px 16px',
    },
  };

  // --- RENDER ---
  if (loading) {
    return (
      <div style={{ ...s.page, justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <RefreshCw size={36} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Đang kết nối tới Loa...</p>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="animated-fade-in" style={{ ...s.page, justifyContent: 'center', alignItems: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
          <Sliders size={56} style={{ stroke: '#ef4444' }} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>Không Tìm Thấy Loa ⚠️</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto 28px' }}>
          Loa có địa chỉ MAC <strong>{mac}</strong> chưa được đăng ký hoặc đồng bộ trên hệ thống Globy AI Connect.
          <br /><br />
          Vui lòng kiểm tra lại thiết bị hoặc truy cập trang quản trị để đồng bộ tài khoản Xiaozhi trước.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(to right, #6366f1, #4f46e5)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
          }}
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="animated-fade-in" style={{ ...s.page, justifyContent: 'center', alignItems: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
          <CheckCircle size={56} style={{ stroke: '#10b981' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Thành công! 🎉</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Loa <strong>{deviceInfo?.name || 'Xiaozhi'}</strong> đã sẵn sàng với cấu hình mới.
        </p>
        <button
          onClick={() => { setSuccess(false); fetchPresets(); }}
          style={{ ...s.applyBtn(false), maxWidth: '300px' }}
        >
          Đổi cấu hình khác
        </button>
      </div>
    );
  }

  const groups = groupPresets(presets);
  const isCustom = selectedTemplate === 'custom';

  const langLabel = (code) => {
    const map = { vi: 'Việt', en: 'Anh', zh: 'Trung', ja: 'Nhật', ko: 'Hàn' };
    return map[code] || code;
  };

  const getVoiceDisplayName = (voiceId) => {
    if (!voiceId) return 'Chưa thiết lập';
    for (const langKey in voices) {
      const match = voices[langKey].find(v => v.id === voiceId);
      if (match) return match.name;
    }
    const specialMappings = {
      'Vietnamese_kindhearted_girl': 'Hoài Mỹ (Nữ)',
      'Vietnamese_Serene_Man': 'Nam Minh (Nam)',
      'vi-VN-HoaiMyNeural': 'Hoài Mỹ (Nữ)',
      'vi-VN-NamMinhNeural': 'Nam Minh (Nam)'
    };
    if (specialMappings[voiceId]) return specialMappings[voiceId];
    return voiceId;
  };

  const getDevicePresetInfo = () => {
    if (!deviceInfo) return { name: 'Chưa thiết lập', lang: '', gender: '' };
    
    // 1. Try to find a matching preset by voice & language
    let matched = presets.find(p => 
      p.tts_voice === deviceInfo.current_voice && 
      p.language === deviceInfo.current_language
    );

    let name = 'Tùy chỉnh';
    let lang = langLabel(deviceInfo.current_language);
    let gender = 'Chung';

    if (matched) {
      name = matched.name.replace(/\s*\((Nam|Nữ|Male|Female)\)\s*$/i, '').replace(/\s+/g, ' ').trim();
      gender = matched.gender === 'male' ? 'Giọng Nam' : matched.gender === 'female' ? 'Giọng Nữ' : 'Chung';
    } else {
      const voice = (deviceInfo.current_voice || '').toLowerCase();
      if (voice.includes('female') || voice.includes('girl') || voice.includes('lady') || voice.includes('hoaimy')) {
        gender = 'Giọng Nữ';
      } else if (voice.includes('male') || voice.includes('boy') || voice.includes('man') || voice.includes('namminh')) {
        gender = 'Giọng Nam';
      }
    }

    return { name, lang, gender };
  };

  const currentInfo = getDevicePresetInfo();

  return (
    <div className="animated-fade-in" style={s.page}>
      {/* Sticky header */}
      <div style={{
        ...s.header,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px'
      }}>
        {/* Left: Home Button */}
        <button 
          onClick={() => navigate('/')} 
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
          title="Về trang chủ"
        >
          <Home size={20} />
        </button>

        {/* Center: Title with AI Sparkles effect */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 800,
          fontSize: '1.05rem',
          letterSpacing: '-0.3px',
          background: 'linear-gradient(135deg, #818cf8, #34d399)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          <Sparkles size={16} style={{ stroke: '#818cf8', fill: '#818cf8' }} />
          <span>Thiết lập cấu hình AI</span>
        </div>

        {/* Right: Theme Toggle */}
        <button onClick={toggleTheme} style={s.themeBtn}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* Device info bar */}
      <div style={s.deviceBar}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Tên thiết bị</div>
          <div style={s.deviceName}>{deviceInfo?.name || 'Loa thông minh'}</div>
        </div>
        <span style={s.macLabel}>{mac}</span>
      </div>

      {/* Current Configuration Card */}
      {deviceInfo && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '10px 14px',
          margin: '0 16px 10px',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary)',
          flexShrink: 0
        }}>
          <Volume2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Đang dùng:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{currentInfo.name}</strong>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <strong style={{ color: 'var(--text-primary)' }}>{currentInfo.lang}</strong>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <strong style={{ color: 'var(--text-primary)' }}>{currentInfo.gender}</strong>
        </div>
      )}

      {/* Presets list or custom form */}
      {!isCustom ? (
        <>
          <div style={s.sectionTitle}>Chọn chế độ:</div>
          <div style={s.scrollArea}>
            {groups.map((group) => {
              const hasGenderVariants = group.variants.length > 1 && group.variants.some(v => v.gender !== 'neutral');
              const isGroupSelected = group.variants.some(v => String(v.id) === String(selectedTemplate));

              if (hasGenderVariants) {
                // Grouped card with gender toggle
                return (
                  <div key={group.baseName} style={s.groupCard(isGroupSelected)}>
                    <div style={s.groupHeader}>
                      <div style={s.groupIcon}>{group.icon}</div>
                      <div style={s.groupInfo}>
                        <div style={s.groupName}>{group.baseName}</div>
                        <div style={s.groupDesc}>{group.description}</div>
                        <div style={s.groupMeta}>
                          <span style={s.metaItem}><Globe size={10} /> {langLabel(group.language)}</span>
                          <span style={s.metaItem}><Cpu size={10} /> {(group.model || '').toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div style={s.genderRow}>
                      {group.variants.map(v => {
                        const isActive = String(v.id) === String(selectedTemplate);
                        const label = v.gender === 'male' ? '👨 Giọng Nam'
                          : v.gender === 'female' ? '👩 Giọng Nữ'
                          : v.name;
                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedTemplate(v.id)}
                            style={s.genderPill(isActive)}
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                // Single variant card
                const variant = group.variants[0];
                const isActive = String(variant.id) === String(selectedTemplate);
                return (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedTemplate(variant.id)}
                    style={s.singleCard(isActive)}
                  >
                    <div style={s.groupIcon}>{group.icon}</div>
                    <div style={s.groupInfo}>
                      <div style={s.groupName}>{group.baseName}</div>
                      <div style={s.groupDesc}>{group.description}</div>
                      <div style={s.groupMeta}>
                        <span style={s.metaItem}><Globe size={10} /> {langLabel(group.language)}</span>
                        <span style={s.metaItem}><Cpu size={10} /> {(group.model || '').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </>
      ) : (
        /* ADVANCED CUSTOM FORM */
        <div className="animated-fade-in" style={{ ...s.scrollArea, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={s.sectionTitle}>Tùy chỉnh nâng cao:</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mô hình AI</label>
              <select value={llmModel} onChange={e => setLlmModel(e.target.value)} style={{ padding: '10px', fontSize: '0.85rem', borderRadius: '10px' }}>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ngôn ngữ</label>
              <select value={language} onChange={e => {
                setLanguage(e.target.value);
                const vl = voices[e.target.value] || [];
                if (vl.length > 0) setTtsVoice(vl[0].id);
              }} style={{ padding: '10px', fontSize: '0.85rem', borderRadius: '10px' }}>
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Giọng nói</label>
            <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)} style={{ padding: '10px', fontSize: '0.85rem', borderRadius: '10px' }}>
              {(voices[language] || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {/* Speed/Pitch sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '12px' }}>
            {[
              { label: 'Nhận diện', icon: <Mic size={12} style={{ color: '#818cf8' }} />, value: speedOptions.indexOf(asrSpeed), setter: v => setAsrSpeed(speedOptions[v]), labels: ['Chậm', 'Thường', 'Nhanh'] },
              { label: 'Tốc độ nói', icon: <Volume2 size={12} style={{ color: '#38bdf8' }} />, value: speedOptions.indexOf(ttsSpeechSpeed), setter: v => setTtsSpeechSpeed(speedOptions[v]), labels: ['Chậm', 'Thường', 'Nhanh'] },
              { label: 'Cao độ', icon: <Sliders size={12} style={{ color: '#f43f5e' }} />, value: pitchOptions.indexOf(ttsPitch), setter: v => setTtsPitch(pitchOptions[v]), labels: ['Thấp', 'Thường', 'Cao'] },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 600 }}>
                  {s.icon} <span>{s.label}</span>
                </div>
                <input type="range" min="0" max="2" step="1" value={s.value}
                  onChange={e => s.setter(parseInt(e.target.value))}
                  style={{ width: '100%', height: '4px', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                  {s.labels.map((l, j) => <span key={j}>{l}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* Extensions */}
          <div style={{ border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tiện ích mở rộng</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[{ id: '2', label: '🌦️ Thời tiết' }, { id: '9', label: '🎶 Âm nhạc' }, { id: '104', label: '📚 Tri thức' }].map(ext => (
                <label key={ext.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={extensions.includes(ext.id)} onChange={() => handleExtensionToggle(ext.id)} />
                  {ext.label}
                </label>
              ))}
            </div>
          </div>

          {/* Character prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Prompt nhân vật</label>
            <textarea rows="3" value={characterPrompt} onChange={e => setCharacterPrompt(e.target.value)}
              style={{ fontSize: '0.78rem', resize: 'vertical', borderRadius: '10px', padding: '10px' }}
            />
          </div>

          {/* Contribute */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
            <input type="checkbox" id="contributeCheck" checked={contribute}
              onChange={e => setContribute(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="contributeCheck" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <Heart size={12} style={{ fill: contribute ? '#ef4444' : 'none', stroke: '#ef4444' }} />
              Đóng góp cấu hình cho cộng đồng
            </label>
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div style={s.bottomBar}>
        <button
          onClick={() => {
            if (!isCustom) setSelectedTemplate('custom');
            else setSelectedTemplate(presets.length > 0 ? presets[0].id : '');
          }}
          style={s.advancedLink}
        >
          <Sliders size={13} />
          {isCustom ? '← Quay lại cấu hình mẫu' : 'Tùy chỉnh nâng cao'}
        </button>
        <button onClick={handleApply} disabled={applying} style={s.applyBtn(applying)}>
          {applying ? (
            <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Đang áp dụng...</>
          ) : (
            '✨ Áp dụng cấu hình'
          )}
        </button>
      </div>

      <div style={s.footer}>
        &copy; {new Date().getFullYear()} Globy AI Connect
      </div>
    </div>
  );
}
