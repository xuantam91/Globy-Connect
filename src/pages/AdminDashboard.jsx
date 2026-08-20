import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Sliders, Cpu, Globe, Volume2, QrCode, CheckCircle, FileText, Trash2, ChevronDown, ChevronUp, Music as MusicIcon, Cloud, BookOpen, AlertCircle, Mic, Sun, Moon, Upload, Plus, Layers, ArrowLeft, Code, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token !== 'xiaozhi-admin-session-token') {
      alert('Vui lòng đăng nhập bằng mật khẩu quản trị trước!');
      navigate('/');
    }
  }, [navigate]);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('config'); // config | presets | accounts
  
  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [newAccountToken, setNewAccountToken] = useState('');

  // Presets Database State
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [hasSupabaseKey, setHasSupabaseKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Pagination & Layout States
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  // Admin Preset Creator Form State
  const [presetFormMode, setPresetFormMode] = useState('create'); // 'create' | 'edit'
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [presetIcon, setPresetIcon] = useState('✨');
  const [presetLlmModel, setPresetLlmModel] = useState('qwen');
  const [presetLanguage, setPresetLanguage] = useState('en');
  const [presetTtsVoice, setPresetTtsVoice] = useState('zh_female_shuangkuaisisi_moon_bigtts');
  const [presetTtsSpeechSpeed, setPresetTtsSpeechSpeed] = useState('normal');
  const [presetAsrSpeed, setPresetAsrSpeed] = useState('normal');
  const [presetTtsPitch, setPresetTtsPitch] = useState(0);
  const [presetExtensions, setPresetExtensions] = useState(['2', '104']);
  const [presetCharacterPrompt, setPresetCharacterPrompt] = useState('You are Lily, a friendly teacher...');
  const [presetGender, setPresetGender] = useState('neutral');
  const [showPresetAdvancedOptions, setShowPresetAdvancedOptions] = useState(false);
  const [showPresetVoiceSettings, setShowPresetVoiceSettings] = useState(true);
  const [viewingPreset, setViewingPreset] = useState(null);

  // AI Configuration Form State
  const [llmModel, setLlmModel] = useState('qwen');
  const [language, setLanguage] = useState('en');
  const [ttsVoice, setTtsVoice] = useState('zh_female_shuangkuaisisi_moon_bigtts');
  const [ttsSpeechSpeed, setTtsSpeechSpeed] = useState('normal'); // slow | normal | fast
  
  // Voice Settings (Sliders)
  const [asrSpeed, setAsrSpeed] = useState('normal'); // slow | normal | fast
  const [ttsPitch, setTtsPitch] = useState(0); // -2 (Low), 0 (Standard), 2 (High)
  const [showVoiceSettings, setShowVoiceSettings] = useState(true);

  // Extensions (Weather: 2, Music: 9, Knowledge base: 104)
  const [extensions, setExtensions] = useState(['2', '104']); // Default: music (9) is unchecked

  const [characterPrompt, setCharacterPrompt] = useState(
    `Your name is Lily. You are a friendly, patient, and native English teacher.\nSpeak in short, clear, and simple sentences.\nAlways keep the conversation going with a follow-up question.`
  );

  // Status message
  const [notification, setNotification] = useState(null);
  const [selectedQrCode, setSelectedQrCode] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchDevices();
    fetchAccounts();
    fetchPresets();
    fetchSettings();
  }, []);

  // Autofill form if exactly one device is selected
  useEffect(() => {
    if (selectedIds.length === 1) {
      const d = devices.find(x => x.id === selectedIds[0]);
      if (d) {
        setLlmModel(d.llm_model || 'qwen');
        setLanguage(d.current_language || 'en');
        setTtsVoice(d.current_voice || '');
        setTtsSpeechSpeed(d.tts_speech_speed || 'normal');
        setAsrSpeed(d.asr_speed || 'normal');
        setTtsPitch(d.tts_pitch !== undefined ? d.tts_pitch : 0);
        
        let mcpList = ['2', '104'];
        try {
          if (d.mcp_endpoints_json) {
            mcpList = JSON.parse(d.mcp_endpoints_json);
          } else if (d.mcp_endpoints) {
            mcpList = d.mcp_endpoints;
          }
        } catch(e) {}
        setExtensions(mcpList);
        setCharacterPrompt(d.ai_prompt_template || '');
        
        // Find matching preset based on voice and character prompt
        const matched = presets.find(p => 
          p.tts_voice === d.current_voice && 
          p.language === d.current_language
        );
        setSelectedPreset(matched ? matched.id : ''); 
      }
    }
  }, [selectedIds, devices, presets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const list = voices[presetLanguage] || [];
    if (list.length > 0) {
      if (!list.some(v => v.id === presetTtsVoice)) {
        setPresetTtsVoice(list[0].id);
      }
    }
  }, [presetLanguage]);

  const getAccountRole = (token) => {
    if (!token) return 'user';
    if (token.startsWith('mock')) return 'user';
    try {
      const parts = token.replace('Bearer ', '').trim().split('.');
      if (parts.length < 2) return 'user';
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const parsed = JSON.parse(jsonPayload);
      return parsed.role || 'user';
    } catch (e) {
      return 'user';
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSupabaseUrl(data.data.supabase_url || '');
        setHasSupabaseKey(data.data.has_key);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: supabaseUrl,
          supabase_key: supabaseKey || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Đã lưu cấu hình Supabase!');
        setSupabaseKey('');
        fetchSettings();
      } else {
        alert(data.detail || 'Lỗi lưu cấu hình.');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
      return;
    }
    
    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Đã đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(data.message || 'Lỗi đổi mật khẩu.');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (data.success) {
        setPresets(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    showNotification('Đang đồng bộ dữ liệu từ Xiaozhi...', 'info');
    try {
      const res = await fetch('/api/devices/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification(`Đồng bộ thành công! Đã cập nhật ${data.records_fetched || 0} thiết bị.`);
        fetchDevices();
      } else {
        showNotification(data.message || 'Đồng bộ thất bại.', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối khi đồng bộ.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredDevices.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectDevice = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId) {
      const p = presets.find(x => x.id === presetId);
      if (p) {
        setLlmModel(p.llm_model);
        setLanguage(p.language);
        setTtsVoice(p.tts_voice);
        setTtsSpeechSpeed(p.tts_speech_speed);
        setAsrSpeed(p.asr_speed);
        setTtsPitch(p.tts_pitch);
        setExtensions(p.mcp_endpoints);
        setCharacterPrompt(p.character);
      }
    }
  };

  const handleExtensionToggle = (id) => {
    if (extensions.includes(id)) {
      setExtensions(extensions.filter(x => x !== id));
    } else {
      setExtensions([...extensions, id]);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountLabel || !newAccountToken) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newAccountLabel, bearer_token: newAccountToken })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Thêm tài khoản thành công!');
        setNewAccountLabel('');
        setNewAccountToken('');
        fetchAccounts();
      } else {
        showNotification(data.message || 'Thêm thất bại', 'error');
      }
    } catch (err) {
      showNotification('Lỗi thêm tài khoản', 'error');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('Đã xóa tài khoản!');
        fetchAccounts();
        fetchDevices();
      }
    } catch (err) {
      showNotification('Lỗi xóa tài khoản', 'error');
    }
  };

  const handleCreatePreset = async (e) => {
    e.preventDefault();
    if (!newPresetName) return;

    const payload = {
      name: newPresetName,
      description: newPresetDesc,
      llm_model: presetLlmModel,
      language: presetLanguage,
      tts_voice: presetTtsVoice,
      tts_speech_speed: presetTtsSpeechSpeed,
      asr_speed: presetAsrSpeed,
      tts_pitch: presetTtsPitch,
      mcp_endpoints: presetExtensions,
      character_prompt: presetCharacterPrompt,
      icon: presetIcon,
      gender: presetGender
    };

    const isEdit = presetFormMode === 'edit';
    const url = isEdit ? `/api/presets/${editingPresetId}` : '/api/presets';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(isEdit ? 'Đã cập nhật Preset thành công (tự động tăng version)!' : 'Đã tạo Preset mẫu thành công!');
        setPresetFormMode('create');
        setEditingPresetId(null);
        setNewPresetName('');
        setNewPresetDesc('');
        setPresetIcon('✨');
        setPresetLlmModel('qwen');
        setPresetLanguage('en');
        setPresetTtsVoice('zh_female_shuangkuaisisi_moon_bigtts');
        setPresetAsrSpeed('normal');
        setPresetTtsSpeechSpeed('normal');
        setPresetTtsPitch(0);
        setPresetGender('neutral');
        setPresetExtensions(['2', '104']);
        setPresetCharacterPrompt('You are Lily, a friendly teacher...');
        fetchPresets();
      }
    } catch (err) {
      showNotification('Lỗi lưu cấu hình mẫu', 'error');
    }
  };

  const handleEditPreset = (p) => {
    setPresetFormMode('edit');
    setEditingPresetId(p.id);
    setNewPresetName(p.name);
    setNewPresetDesc(p.description || '');
    setPresetIcon(p.icon || '✨');
    setPresetLlmModel(p.llm_model || 'qwen');
    setPresetLanguage(p.language || 'en');
    // We set voice list matching
    const voiceList = voices[p.language] || [];
    setPresetTtsVoice(p.tts_voice || (voiceList.length > 0 ? voiceList[0].id : ''));
    setPresetAsrSpeed(p.asr_speed || 'normal');
    setPresetTtsSpeechSpeed(p.tts_speech_speed || 'normal');
    setPresetTtsPitch(p.tts_pitch ?? 0);
    setPresetGender(p.gender || 'neutral');
    setPresetExtensions(p.mcp_endpoints || ['2', '104']);
    setPresetCharacterPrompt(p.character || '');
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Preset này?')) return;
    try {
      const res = await fetch(`/api/presets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('Đã xóa preset mẫu!');
        fetchPresets();
      }
    } catch (err) {
      showNotification('Lỗi xóa preset mẫu', 'error');
    }
  };

  const handleMovePreset = async (index, direction) => {
    const newList = [...presets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setPresets(newList);
    try {
      await fetch('/api/presets/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: newList.map(p => p.id) })
      });
    } catch (err) {
      showNotification('Lỗi sắp xếp', 'error');
      fetchPresets();
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await fetch(`/api/presets/${id}/set-default`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('Đã đặt làm cấu hình mặc định! ⭐');
        fetchPresets();
      }
    } catch (err) {
      showNotification('Lỗi đặt mặc định', 'error');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showNotification('Đang nhập dữ liệu tệp...', 'info');
    try {
      const res = await fetch('/api/presets/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Đã nhập thành công ${data.imported_count} cấu hình mẫu!`);
        fetchPresets();
      } else {
        showNotification(data.detail || 'Nhập tệp thất bại.', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối khi tải tệp lên.', 'error');
    }
    // Reset file input
    e.target.value = null;
  };

  const handleApplyConfig = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      showNotification('Vui lòng chọn ít nhất một thiết bị!', 'error');
      return;
    }

    const payload = {
      device_ids: selectedIds,
      llm_model: llmModel,
      language: language,
      tts_voice: ttsVoice,
      tts_speech_speed: ttsSpeechSpeed,
      asr_speed: asrSpeed,
      tts_pitch: ttsPitch,
      mcp_endpoints: extensions,
      character: characterPrompt
    };

    showNotification('Đang đổ cấu hình lên Xiaozhi API...', 'info');
    try {
      const res = await fetch('/api/devices/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Đã cập nhật cấu hình thành công cho ${selectedIds.length} thiết bị.`);
        fetchDevices();
        setSelectedIds([]);
      } else {
        showNotification(data.message || 'Cập nhật thất bại.', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối khi cập nhật cấu hình.', 'error');
    }
  };

  const filteredDevices = devices.filter(d => 
    (d.name && d.name.toLowerCase().includes(search.toLowerCase())) ||
    (d.mac_address && d.mac_address.toLowerCase().includes(search.toLowerCase())) ||
    (d.external_id && d.external_id.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const devicesPerPage = 4;
  const totalPages = Math.ceil(filteredDevices.length / devicesPerPage);
  const indexOfLastDevice = currentPage * devicesPerPage;
  const indexOfFirstDevice = indexOfLastDevice - devicesPerPage;
  const currentDevices = filteredDevices.slice(indexOfFirstDevice, indexOfLastDevice);

  // Lists
  const models = [
    { id: 'xz-lite', name: 'Xiaozhi Lite' },
    { id: 'qwen', name: 'Qwen' },
    { id: 'deepseek', name: 'DeepSeek V4' },
    { id: 'doubao', name: 'DouBao Seed 2.0' },
    { id: 'gpt-5', name: 'GPT-5 (Testing)' }
  ];

  const languages = [
    { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
    { code: 'en', name: 'Tiếng Anh (English)' },
    { code: 'zh', name: 'Tiếng Trung (Chinese)' },
    { code: 'ja', name: 'Tiếng Nhật (Japanese)' }
  ];

  const voices = {
    vi: [
      { id: 'Vietnamese_kindhearted_girl', name: 'Hoài Mỹ (Nữ - vi)' },
      { id: 'Vietnamese_Serene_Man', name: 'Nam Minh (Nam - vi)' }
    ],
    en: [
      { id: 'zh_female_shuangkuaisisi_moon_bigtts', name: 'Skye (en-US)' },
      { id: 'zh_male_jingqiangkanye_moon_bigtts', name: 'Harmony (en-US)' },
      { id: 'zh_female_mengyatou_mars_bigtts', name: 'Cutey (en-US)' },
      { id: 'zh_male_shaonianzixin_moon_bigtts', name: 'Brayan (en-US)' },
      { id: 'zh_male_wennuanahu_moon_bigtts', name: 'Alvin (en-US)' }
    ],
    zh: [
      { id: 'zh_female_wanwanxiaohe_moon_bigtts', name: 'Harmony (zh-CN)' },
      { id: 'zh_female_linjianvhai_moon_bigtts', name: 'Girl (zh-CN)' },
      { id: 'zh_male_yuanboxiaoshu_moon_bigtts', name: 'Uncle (zh-CN)' }
    ],
    ja: [
      { id: 'ja_female_1_v1', name: 'Sakura (ja)' },
      { id: 'ja_male_1_v1', name: 'Kenji (ja)' }
    ]
  };

  const getVoiceDisplayName = (voiceId) => {
    if (!voiceId) return 'Chưa thiết lập';
    for (const langKey in voices) {
      const match = voices[langKey].find(v => v.id === voiceId);
      if (match) return match.name;
    }
    const specialMappings = {
      'zh_female_shuangkuaisisi_moon_bigtts': 'Skye (en-US)',
      'zh_male_jingqiangkanye_moon_bigtts': 'Harmony (en-US)',
      'zh_female_mengyatou_mars_bigtts': 'Cutey (en-US)',
      'zh_male_shaonianzixin_moon_bigtts': 'Brayan (en-US)',
      'zh_male_wennuanahu_moon_bigtts': 'Alvin (en-US)',
      'zh_female_wanwanxiaohe_moon_bigtts': 'Harmony (zh-CN)',
      'zh_female_linjianvhai_moon_bigtts': 'Girl (zh-CN)',
      'zh_male_yuanboxiaoshu_moon_bigtts': 'Uncle (zh-CN)',
      'Vietnamese_kindhearted_girl': 'Hoài Mỹ (Nữ - vi)',
      'Vietnamese_Serene_Man': 'Nam Minh (Nam - vi)'
    };
    if (specialMappings[voiceId]) return specialMappings[voiceId];
    
    let name = voiceId;
    if (voiceId.startsWith('zh_female_') || voiceId.startsWith('zh_male_')) {
      const parts = voiceId.split('_');
      if (parts.length >= 3) {
        name = parts[2];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
    return name;
  };

  const getLangDisplayName = (code) => {
    if (!code) return 'Chưa chọn';
    const match = languages.find(l => l.code === code);
    return match ? match.name.split(' ')[0] : code;
  };

  const getDevicePresetName = (d) => {
    if (!d.current_voice && !d.ai_prompt_template) {
      return 'Default';
    }

    const normalizeVoice = (id) => {
      if (!id) return '';
      if (id === 'vi-VN-HoaiMyNeural' || id === 'Vietnamese_kindhearted_girl') {
        return 'vi_female';
      }
      if (id === 'vi-VN-NamMinhNeural' || id === 'Vietnamese_Serene_Man' || id === 'Vietnamese_gentle_boy') {
        return 'vi_male';
      }
      return id.toLowerCase();
    };

    // Try to match with database presets
    const match = presets.find(p => {
      const pPrompt = (p.character || '').trim().toLowerCase();
      const dPrompt = (d.ai_prompt_template || '').trim().toLowerCase();
      
      return (
        p.language === d.current_language &&
        normalizeVoice(p.tts_voice) === normalizeVoice(d.current_voice) &&
        p.llm_model === d.llm_model &&
        pPrompt === dPrompt
      );
    });

    if (match) return match.name;

    // Try to match with backup static presets
    const backups = {
      'english_lily': {
        name: 'Lily (English)',
        llm_model: 'qwen',
        language: 'en',
        tts_voice: 'zh_female_shuangkuaisisi_moon_bigtts'
      },
      'vietnamese_story': {
        name: 'Truyện cổ tích',
        llm_model: 'qwen',
        language: 'vi',
        tts_voice: 'Vietnamese_kindhearted_girl'
      },
      'bilingual_tutor': {
        name: 'Gia sư song ngữ',
        llm_model: 'qwen',
        language: 'vi',
        tts_voice: 'Vietnamese_kindhearted_girl'
      }
    };

    for (const key in backups) {
      const b = backups[key];
      if (
        b.language === d.current_language && 
        normalizeVoice(b.tts_voice) === normalizeVoice(d.current_voice) && 
        b.llm_model === d.llm_model
      ) {
        return b.name;
      }
    }

    return 'Custom';
  };

  const getQRLink = (mac) => {
    const cleanMac = (mac || '').replace(/[:-\s]/g, '').toLowerCase();
    return `${window.location.origin}/role?mac=${cleanMac}`;
  };

  const speedOptions = ['slow', 'normal', 'fast'];
  const pitchOptions = [-2, 0, 2];

  return (
    <div className="animated-fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', transition: 'all 0.3s ease' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(to right, #6366f1, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Cpu size={34} style={{ stroke: '#6366f1' }} /> Globy Admin Console
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>Quản trị hệ thống loa AI cho trẻ em và đồng bộ hóa dynamic presets</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => navigate('/')} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Trang Chủ
          </button>
          <button 
            onClick={() => setActiveTab('config')} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: 'var(--text-primary)', background: activeTab === 'config' ? 'var(--primary-glow)' : 'transparent', borderColor: activeTab === 'config' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
          >
            Cấu hình loa
          </button>
          <button 
            onClick={() => setActiveTab('presets')} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: 'var(--text-primary)', background: activeTab === 'presets' ? 'var(--primary-glow)' : 'transparent', borderColor: activeTab === 'presets' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
          >
            Quản lý Presets
          </button>
          <button 
            onClick={() => setActiveTab('accounts')} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: 'var(--text-primary)', background: activeTab === 'accounts' ? 'var(--primary-glow)' : 'transparent', borderColor: activeTab === 'accounts' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
          >
            Tài Khoản
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: 'var(--text-primary)', background: activeTab === 'settings' ? 'var(--primary-glow)' : 'transparent', borderColor: activeTab === 'settings' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
          >
            Cài đặt
          </button>
          
          {/* Theme toggler */}
          <button 
            onClick={toggleTheme} 
            className="glass-panel" 
            style={{ padding: '10px', borderRadius: '50%', color: 'var(--text-primary)' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Logout Button */}
          <button 
            onClick={() => {
              localStorage.removeItem('admin_token');
              showNotification('Đã đăng xuất tài khoản quản trị!');
              navigate('/');
            }} 
            className="glass-panel" 
            style={{ padding: '10px 16px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)', fontSize: '0.85rem', fontWeight: 600 }}
            title="Đăng xuất"
          >
            Đăng xuất
          </button>
          
          <button 
            onClick={handleSync} 
            disabled={isSyncing} 
            style={{ background: 'linear-gradient(to right, #6366f1, #4f46e5)', color: 'white', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} className={isSyncing ? 'spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Đồng bộ...' : 'Đồng bộ loa'}
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          background: notification.type === 'error' ? 'var(--accent)' : notification.type === 'info' ? 'var(--primary)' : 'var(--secondary)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 500 }}>{notification.message}</span>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'accounts' ? (
        /* ACCOUNTS MANAGER TAB */
        <div className="glass-panel animated-fade-in" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
            Quản lý tài khoản Xiaozhi (Bearer Tokens)
          </h2>
          
          <form onSubmit={handleAddAccount} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', marginBottom: '32px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tên gợi nhớ (Label)</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Tài khoản Chính, Account 2..." 
                value={newAccountLabel}
                onChange={e => setNewAccountLabel(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bearer Token từ xiaozhi.me</label>
              <input 
                type="text" 
                placeholder="Bearer eyJhbGciOiJFUzI1Ni..." 
                value={newAccountToken}
                onChange={e => setNewAccountToken(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={{ background: 'var(--secondary)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}>
              Thêm tài khoản
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px' }}>Tên gợi nhớ</th>
                  <th style={{ padding: '16px' }}>Bearer Token (Rút gọn)</th>
                  <th style={{ padding: '16px', textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có tài khoản nào được kết nối. Hãy thêm tài khoản để bắt đầu đồng bộ.
                    </td>
                  </tr>
                ) : (
                  accounts.map(acc => (
                    <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px', fontWeight: 600, color: '#6366f1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{acc.label}</span>
                          {getAccountRole(acc.bearer_token) === 'developer' && (
                            <span style={{ 
                              background: 'linear-gradient(to right, #6366f1, #3b82f6)', 
                              color: 'white', 
                              fontSize: '0.65rem', 
                              padding: '2px 8px', 
                              borderRadius: '20px', 
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Code size={10} /> DEV
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {acc.bearer_token.substring(0, 40)}...
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteAccount(acc.id)} 
                          style={{ background: 'transparent', color: 'var(--accent)', padding: '6px', border: 'none', cursor: 'pointer' }}
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'presets' ? (
        /* PRESETS DATABASE TAB */
        <div className="glass-panel animated-fade-in" style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', minHeight: '680px' }}>
          
          {/* Left Column: Preset Management Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '620px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={22} style={{ color: 'var(--primary)' }} /> Danh sách Preset ({presets.length})
              </h2>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Tải Excel Mẫu */}
                <button
                  onClick={() => window.open('/api/presets/template')}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--secondary)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                  type="button"
                >
                  <FileText size={13} style={{ color: 'var(--secondary)' }} /> Tải mẫu
                </button>

                {/* Nhập Excel / JSON */}
                <label style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px dashed var(--primary)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  <Upload size={13} /> Nhập tệp
                  <input 
                    type="file" 
                    accept=".json,.csv,.xlsx" 
                    onChange={handleImportFile} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', maxHeight: '520px' }}>
              {presets.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                  <Layers size={32} style={{ margin: '0 auto 12px', strokeWidth: 1.5 }} />
                  <p>Chưa có Preset nào. Hãy tạo mới bên phải hoặc nhập từ Excel/JSON.</p>
                </div>
              ) : (
                presets.map((p, idx) => (
                  <div key={p.id} style={{
                    background: p.is_default ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.02)',
                    border: p.is_default ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    position: 'relative'
                  }}>
                    {/* Row 1: Icon + Name + Reorder arrows */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem' }}>{p.icon || '✨'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ fontSize: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, flexShrink: 0 }}>
                          v{p.version || 1}
                        </span>
                        {p.is_default && (
                          <span style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, flexShrink: 0 }}>
                            ⭐ Mặc định
                          </span>
                        )}
                      </div>
                      {/* Reorder arrows */}
                      <div style={{ display: 'flex', gap: '2px', flexShrink: 0, marginLeft: '8px' }}>
                        <button
                          onClick={() => handleMovePreset(idx, 'up')}
                          disabled={idx === 0}
                          style={{ background: 'rgba(255,255,255,0.06)', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', cursor: idx === 0 ? 'default' : 'pointer', border: 'none', opacity: idx === 0 ? 0.3 : 1 }}
                          type="button" title="Di chuyển lên"
                        >↑</button>
                        <button
                          onClick={() => handleMovePreset(idx, 'down')}
                          disabled={idx === presets.length - 1}
                          style={{ background: 'rgba(255,255,255,0.06)', color: idx === presets.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', cursor: idx === presets.length - 1 ? 'default' : 'pointer', border: 'none', opacity: idx === presets.length - 1 ? 0.3 : 1 }}
                          type="button" title="Di chuyển xuống"
                        >↓</button>
                      </div>
                    </div>
                    {p.description && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{p.description}</p>
                    )}
                    {/* Row 2: Meta + Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span>{p.llm_model}</span>
                        <span>{p.language?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                          onClick={() => handleSetDefault(p.id)}
                          style={{ background: p.is_default ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', color: p.is_default ? '#10b981' : 'var(--text-muted)', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', border: 'none' }}
                          type="button" title="Đặt làm mặc định"
                        >⭐</button>
                        <button
                          onClick={() => setViewingPreset(p)}
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', border: 'none' }}
                          type="button"
                        >Xem</button>
                        <button
                          onClick={() => handleEditPreset(p)}
                          style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, border: 'none' }}
                          type="button"
                        >Sửa</button>
                        <button
                          onClick={() => handleDeletePreset(p.id)}
                          style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', padding: '3px 7px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', border: 'none' }}
                          type="button"
                        >Xóa</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Preset Creator Form */}
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '32px', display: 'flex', flexDirection: 'column', height: '620px', justifyContent: 'space-between', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} style={{ color: presetFormMode === 'edit' ? 'var(--primary)' : 'var(--secondary)' }} />
              {presetFormMode === 'edit' ? 'Cập nhật Preset mẫu' : 'Lưu thiết lập thành Preset Mẫu'}
            </h3>
            
            <form onSubmit={handleCreatePreset} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', overflow: 'hidden' }}>
              <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px', marginBottom: '16px' }}>
                
                {/* Row 1: Name and Icon */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tên Preset mẫu</label>
                    <input 
                      type="text" 
                      placeholder="Ví dụ: Kể chuyện cổ tích..." 
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Icon</label>
                    <input 
                      type="text" 
                      placeholder="📚" 
                      value={presetIcon}
                      onChange={e => setPresetIcon(e.target.value)}
                      style={{ textAlign: 'center' }}
                    />
                  </div>
                </div>

                {/* Quick select icons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chọn nhanh:</span>
                  {['✨', '📚', '👩‍🏫', '🤖', '🧠', '🎶', '🌦️', '🗣️', '🧸', '🎮'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setPresetIcon(emoji)}
                      style={{
                        background: presetIcon === emoji ? 'var(--primary-glow)' : 'rgba(255,255,255,0.03)',
                        border: presetIcon === emoji ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '2px 6px',
                        lineHeight: '1.2',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mô tả ngắn</label>
                  <textarea 
                    rows="2"
                    placeholder="Mô tả công dụng của Preset..." 
                    value={newPresetDesc}
                    onChange={e => setNewPresetDesc(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Model & Language */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mô hình AI</label>
                    <select value={presetLlmModel} onChange={e => setPresetLlmModel(e.target.value)}>
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ngôn ngữ loa</label>
                    <select value={presetLanguage} onChange={e => setPresetLanguage(e.target.value)}>
                      {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Voice & Gender */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Giọng nói Assistant</label>
                    <select value={presetTtsVoice} onChange={e => setPresetTtsVoice(e.target.value)}>
                      {(voices[presetLanguage] || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Giới tính</label>
                    <select value={presetGender} onChange={e => setPresetGender(e.target.value)}>
                      <option value="neutral">Chung</option>
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Options Accordion */}
                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <button 
                    type="button"
                    onClick={() => setShowPresetAdvancedOptions(!showPresetAdvancedOptions)}
                    style={{ 
                      background: 'transparent', 
                      color: 'var(--primary)', 
                      fontSize: '0.82rem', 
                      fontWeight: 600, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      textDecoration: 'underline', 
                      cursor: 'pointer', 
                      border: 'none',
                      padding: '4px 6px'
                    }}
                  >
                    <Sliders size={13} />
                    {showPresetAdvancedOptions ? 'Ẩn cấu hình nâng cao' : 'Hiện cấu hình nâng cao (Prompt, Voice, Extensions)'}
                  </button>
                </div>

                {showPresetAdvancedOptions && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                    
                    {/* Voice Sliders */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                      <div 
                        onClick={() => setShowPresetVoiceSettings(!showPresetVoiceSettings)}
                        style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderBottom: showPresetVoiceSettings ? '1px solid var(--border-color)' : 'none' }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Volume2 size={15} style={{ color: 'var(--primary)' }} /> Voice settings
                        </span>
                        {showPresetVoiceSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>

                      {showPresetVoiceSettings && (
                        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* ASR speed */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                              <Mic size={13} style={{ color: '#818cf8' }} />
                              <span>Recognition speed</span>
                            </div>
                            <input 
                              type="range" min="0" max="2" step="1"
                              value={speedOptions.indexOf(presetAsrSpeed)}
                              onChange={e => setPresetAsrSpeed(speedOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              <span>Slow</span><span>Standard</span><span>Fast</span>
                            </div>
                          </div>

                          {/* TTS speed */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                              <Volume2 size={13} style={{ color: '#38bdf8' }} />
                              <span>Reply speed</span>
                            </div>
                            <input 
                              type="range" min="0" max="2" step="1"
                              value={speedOptions.indexOf(presetTtsSpeechSpeed)}
                              onChange={e => setPresetTtsSpeechSpeed(speedOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              <span>Slow</span><span>Standard</span><span>Fast</span>
                            </div>
                          </div>

                          {/* TTS Pitch */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}>
                              <Sliders size={13} style={{ color: '#f43f5e' }} />
                              <span>Reply pitch</span>
                            </div>
                            <input 
                              type="range" min="0" max="2" step="1"
                              value={pitchOptions.indexOf(presetTtsPitch)}
                              onChange={e => setPresetTtsPitch(pitchOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '4px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              <span>Low</span><span>Standard</span><span>High</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extensions */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                        Dịch vụ mở rộng (Extensions)
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" checked={presetExtensions.includes('2')} 
                            onChange={() => {
                              if (presetExtensions.includes('2')) setPresetExtensions(presetExtensions.filter(x => x !== '2'));
                              else setPresetExtensions([...presetExtensions, '2']);
                            }}
                          />
                          <Cloud size={14} style={{ color: '#38bdf8' }} /> Thời tiết (Weather)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" checked={presetExtensions.includes('9')} 
                            onChange={() => {
                              if (presetExtensions.includes('9')) setPresetExtensions(presetExtensions.filter(x => x !== '9'));
                              else setPresetExtensions([...presetExtensions, '9']);
                            }}
                          />
                          <MusicIcon size={14} style={{ color: '#ec4899' }} /> Âm nhạc (Music)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" checked={presetExtensions.includes('104')} 
                            onChange={() => {
                              if (presetExtensions.includes('104')) setPresetExtensions(presetExtensions.filter(x => x !== '104'));
                              else setPresetExtensions([...presetExtensions, '104']);
                            }}
                          />
                          <BookOpen size={14} style={{ color: '#10b981' }} /> Cơ sở tri thức (Knowledge Base)
                        </label>
                      </div>
                    </div>

                    {/* Character Prompt */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prompt Character (System Role)</label>
                      <textarea 
                        rows="3" 
                        value={presetCharacterPrompt} 
                        onChange={e => setPresetCharacterPrompt(e.target.value)}
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {presetFormMode === 'edit' && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setPresetFormMode('create');
                      setEditingPresetId(null);
                      setNewPresetName('');
                      setNewPresetDesc('');
                      setPresetIcon('✨');
                      setPresetLlmModel('qwen');
                      setPresetLanguage('en');
                      setPresetTtsVoice('');
                      setPresetAsrSpeed('normal');
                      setPresetTtsSpeechSpeed('normal');
                      setPresetTtsPitch(0);
                      setPresetExtensions(['2', '104']);
                      setPresetCharacterPrompt('You are Lily, a friendly teacher...');
                    }}
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', padding: '12px', borderRadius: '8px', fontWeight: 600, flex: 1 }}
                  >
                    Hủy
                  </button>
                )}
                <button type="submit" style={{ background: 'linear-gradient(to right, #6366f1, #10b981)', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flex: 2 }}>
                  <Plus size={18} /> {presetFormMode === 'edit' ? 'Cập nhật Preset' : 'Tạo Preset Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        /* SUPABASE SETTINGS TAB [NEW] */
        <div className="glass-panel animated-fade-in" style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          
          {/* Left Side: Configuration Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Cấu hình dự án Supabase</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Điền thông tin API của dự án Supabase để tự động đồng bộ hóa thông tin thiết bị (MAC, Tên, Trạng thái online/offline, Thông số cấu hình) mỗi khi kích hoạt hoặc lưu QR Code mới.
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Supabase URL (REST Endpoint)</label>
                <input 
                  type="url" 
                  placeholder="Ví dụ: https://xxxx.supabase.co" 
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Supabase Anon/Service Key</label>
                <input 
                  type="password" 
                  placeholder={hasSupabaseKey ? "•••••••••••••••• (Đã lưu)" : "Nhập token API Supabase Key..."} 
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  * Để trống nếu không muốn thay đổi Key đã lưu.
                </span>
              </div>

              <button 
                type="submit" 
                disabled={savingSettings}
                style={{ 
                  background: 'linear-gradient(to right, #6366f1, #10b981)', 
                  color: 'white', 
                  padding: '12px 20px', 
                  borderRadius: '8px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  alignSelf: 'flex-start',
                  cursor: 'pointer'
                }}
              >
                {savingSettings ? 'Đang lưu...' : 'Lưu cấu hình Supabase'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} style={{ color: '#10b981' }} /> Bảo mật tài khoản Admin
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Thay đổi mật khẩu đăng nhập vào bảng điều khiển quản trị (Admin Console). Mật khẩu mặc định ban đầu là `admin`.
            </p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  placeholder="Nhập mật khẩu hiện tại..." 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mật khẩu mới</label>
                  <input 
                    type="password" 
                    placeholder="Mật khẩu mới..." 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    placeholder="Xác nhận mật khẩu..." 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={changingPassword}
                style={{ 
                  background: 'linear-gradient(to right, #10b981, #3b82f6)', 
                  color: 'white', 
                  padding: '12px 20px', 
                  borderRadius: '8px', 
                  fontWeight: 600, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  alignSelf: 'flex-start',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                {changingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu Admin'}
              </button>
            </form>
          </div>

          {/* Right Side: SQL Setup Script Instruction */}
          <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} style={{ color: 'var(--primary)' }} /> SQL Setup Script
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Bạn cần chạy câu lệnh SQL này trong mục **SQL Editor** trên trang quản trị Supabase của bạn để khởi tạo bảng `devices` tương thích:
            </p>

            <pre style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '12px', 
              borderRadius: '8px', 
              fontFamily: 'monospace', 
              fontSize: '0.75rem', 
              overflowX: 'auto', 
              color: '#34d399',
              border: '1px solid rgba(255,255,255,0.05)',
              whiteSpace: 'pre-wrap'
            }}>
{`create table devices (
  external_id text primary key,
  name text,
  status text,
  mac_address text,
  current_language text,
  current_voice text,
  ai_prompt_template text,
  asr_speed text,
  tts_speech_speed text,
  tts_pitch integer,
  board_name text,
  serial_number text,
  is_auth boolean,
  app_version text,
  last_seen_at timestamp with time zone default timezone('utc'::text, now())
);`}
            </pre>
          </div>

        </div>
      ) : (
        /* MAIN DASHBOARD & BULK CONFIG TAB */
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px' }}>
          
          {/* LEFT: Devices List */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '680px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Danh sách thiết bị ({filteredDevices.length})</h3>
              <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span>Đã chọn: <strong style={{ color: 'var(--primary)' }}>{selectedIds.length}</strong> thiết bị</span>
              </div>
            </div>

            {/* Filter Search */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm bằng Tên thiết bị, MAC address hoặc ID..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '40px' }}
              />
            </div>

            {/* Table Container */}
            <div style={{ overflowX: 'auto', maxHeight: '460px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                    <th style={{ padding: '12px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={filteredDevices.length > 0 && selectedIds.length === filteredDevices.length} 
                      />
                    </th>
                    <th style={{ padding: '12px' }}>Thiết bị / Phần cứng</th>
                    <th style={{ padding: '12px' }}>Trạng thái & Tài khoản</th>
                    <th style={{ padding: '12px' }}>Cấu hình AI</th>
                    <th style={{ padding: '12px' }}>Preset & Phiên bản</th>
                    <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDevices.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Không tìm thấy thiết bị nào. Vui lòng thử đồng bộ hoặc thay đổi bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    currentDevices.map(d => {
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: selectedIds.includes(d.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                          <td style={{ padding: '12px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(d.id)}
                              onChange={() => handleSelectDevice(d.id)}
                            />
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || 'Loa Xiaozhi'}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{ flexShrink: 0 }}>ID: <strong style={{ color: 'var(--text-secondary)' }}>{d.external_id}</strong></span>
                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.board_name}>
                                  Board: <strong style={{ color: 'var(--text-secondary)' }}>{d.board_name || 'N/A'}</strong>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {d.status === 'online' ? (
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Online</span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>Offline</span>
                                )}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.mac_address}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.account_label}>
                                Acc: <strong style={{ color: 'var(--text-secondary)' }}>{d.account_label || 'Chưa liên kết'}</strong>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
                                  {d.llm_model || 'qwen'}
                                </span>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                  {d.current_language || 'en'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getVoiceDisplayName(d.current_voice)}>
                                Voice: {getVoiceDisplayName(d.current_voice)}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.8rem', 
                                  color: 'var(--text-primary)', 
                                  fontWeight: 500,
                                  maxWidth: '120px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={getDevicePresetName(d)}
                              >
                                {getDevicePresetName(d)}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Ver: <strong style={{ color: 'var(--text-secondary)' }}>{d.app_version || 'N/A'}</strong>
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                              {d.is_auth ? (
                                <ShieldCheck 
                                  size={18} 
                                  style={{ color: '#10b981', flexShrink: 0 }} 
                                  title="Official License" 
                                />
                              ) : (
                                <div style={{ width: '18px', height: '18px' }} /> // Spacer to keep alignment perfect
                              )}
                              <button 
                                onClick={() => setSelectedQrCode(d)}
                                style={{ 
                                  background: 'transparent', 
                                  color: 'var(--primary)', 
                                  padding: '6px', 
                                  borderRadius: '6px', 
                                  border: '1px solid rgba(255,255,255,0.08)', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                                title="Xem mã QR"
                                type="button"
                              >
                                <QrCode size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Trang {currentPage} / {totalPages} (Tổng {filteredDevices.length} thiết bị)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="glass-panel"
                    type="button"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Trước
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="glass-panel"
                    type="button"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: AI Bulk Configuration Form */}
          <div className="glass-panel" style={{ padding: '28px', height: '680px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} style={{ color: '#6366f1' }} /> Đổ cấu hình AI hàng loạt
            </h3>

            {selectedIds.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', margin: 'auto 0' }}>
                <Cpu size={32} style={{ margin: '0 auto 12px', strokeWidth: 1.5 }} />
                <p>Hãy chọn một hoặc nhiều thiết bị ở danh sách bên trái để bắt đầu cấu hình.</p>
              </div>
            ) : (
              <form onSubmit={handleApplyConfig} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', overflow: 'hidden' }}>
                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    Đang thiết lập cho <strong>{selectedIds.length}</strong> thiết bị đã chọn.
                  </div>

                  {selectedIds.length === 1 && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px dashed var(--border-color)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Volume2 size={14} /> Cấu hình hiện tại của loa:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <div>Mô hình: <strong style={{ color: 'var(--text-primary)' }}>{(devices.find(x => x.id === selectedIds[0])?.llm_model || 'qwen').toUpperCase()}</strong></div>
                        <div>Ngôn ngữ: <strong style={{ color: 'var(--text-primary)' }}>{getLangDisplayName(devices.find(x => x.id === selectedIds[0])?.current_language)}</strong></div>
                        <div style={{ gridColumn: 'span 2' }}>
                          Giọng nói: <strong style={{ color: 'var(--text-primary)' }}>{getVoiceDisplayName(devices.find(x => x.id === selectedIds[0])?.current_voice)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Preset Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chọn nhanh cấu hình mẫu (Presets)</label>
                  <select 
                    value={selectedPreset} 
                    onChange={e => handlePresetChange(e.target.value)}
                    style={{ border: '1px solid var(--primary)', background: 'rgba(99,102,241,0.05)' }}
                  >
                    <option value="">-- Tùy chỉnh (Custom) --</option>
                    {/* Render DB Presets */}
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {/* Static backups in case DB is empty */}
                    {presets.length === 0 && (
                      <>
                        <option value="english_lily">Học tiếng Anh với cô Lily 👩‍🏫 (Backup)</option>
                        <option value="vietnamese_story">Kể chuyện cổ tích tiếng Việt 📚 (Backup)</option>
                        <option value="bilingual_tutor">Gia sư song ngữ Anh - Việt 🧠 (Backup)</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mô hình AI</label>
                    <select value={llmModel} onChange={e => setLlmModel(e.target.value)}>
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ngôn ngữ loa</label>
                    <select value={language} onChange={e => {
                      setLanguage(e.target.value);
                      const voiceList = voices[e.target.value] || [];
                      if (voiceList.length > 0) setTtsVoice(voiceList[0].id);
                    }}>
                      {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Giọng nói Assistant</label>
                  <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
                    {(voices[language] || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                {/* Advanced Options Accordion Toggle */}
                <div style={{ textAlign: 'center', margin: '4px 0' }}>
                  <button 
                    type="button"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    style={{ 
                      background: 'transparent', 
                      color: 'var(--primary)', 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      textDecoration: 'underline', 
                      cursor: 'pointer', 
                      border: 'none',
                      padding: '4px 8px'
                    }}
                  >
                    <Sliders size={14} />
                    {showAdvancedOptions ? 'Ẩn cấu hình nâng cao' : 'Hiện cấu hình nâng cao (Prompt, Voice, Extensions)'}
                  </button>
                </div>

                {showAdvancedOptions && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                    {/* Voice Settings Accordion (Horizontal Sliders) */}
                    <div style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.01)'
                    }}>
                      <div 
                        onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                        style={{ 
                          padding: '12px 16px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.03)',
                          borderBottom: showVoiceSettings ? '1px solid var(--border-color)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Volume2 size={16} style={{ color: 'var(--primary)' }} /> Voice settings (Cấu hình Giọng nói)
                        </span>
                        {showVoiceSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>

                      {showVoiceSettings && (
                        <div style={{ 
                          padding: '20px', 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                          gap: '24px'
                        }}>
                          
                          {/* Recognition speed */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                              <Mic size={14} style={{ color: '#818cf8' }} />
                              <span style={{ color: 'var(--text-primary)' }}>Recognition speed</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="2" 
                              step="1"
                              value={speedOptions.indexOf(asrSpeed)}
                              onChange={e => setAsrSpeed(speedOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '5px', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              <span>Slow</span>
                              <span>Standard</span>
                              <span>Fast</span>
                            </div>
                          </div>

                          {/* Reply speed */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                              <Volume2 size={14} style={{ color: '#38bdf8' }} />
                              <span style={{ color: 'var(--text-primary)' }}>Reply speed</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="2" 
                              step="1"
                              value={speedOptions.indexOf(ttsSpeechSpeed)}
                              onChange={e => setTtsSpeechSpeed(speedOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '5px', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              <span>Slow</span>
                              <span>Standard</span>
                              <span>Fast</span>
                            </div>
                          </div>

                          {/* Reply pitch */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                              <Sliders size={14} style={{ color: '#f43f5e' }} />
                              <span style={{ color: 'var(--text-primary)' }}>Reply pitch</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="2" 
                              step="1"
                              value={pitchOptions.indexOf(ttsPitch)}
                              onChange={e => setTtsPitch(pitchOptions[parseInt(e.target.value)])}
                              style={{ width: '100%', height: '5px', borderRadius: '3px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              <span>Low</span>
                              <span>Standard</span>
                              <span>High</span>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Extensions Configuration */}
                    <div style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '12px', 
                      padding: '16px',
                      background: 'rgba(255,255,255,0.01)'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
                        Dịch vụ mở rộng (Extensions)
                      </span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Weather */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={extensions.includes('2')} 
                            onChange={() => handleExtensionToggle('2')}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <Cloud size={16} style={{ color: '#38bdf8' }} /> Thời tiết (Weather)
                        </label>

                        {/* Music */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={extensions.includes('9')} 
                            onChange={() => handleExtensionToggle('9')}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <MusicIcon size={16} style={{ color: '#ec4899' }} /> Âm nhạc (Music)
                        </label>

                        {/* Knowledge base */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={extensions.includes('104')} 
                            onChange={() => handleExtensionToggle('104')}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <BookOpen size={16} style={{ color: '#10b981' }} /> Cơ sở tri thức (Knowledge Base)
                        </label>
                      </div>
                    </div>

                    {/* Prompt Character */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Prompt Character (System Role)</label>
                      <textarea 
                        rows="4" 
                        value={characterPrompt} 
                        onChange={e => setCharacterPrompt(e.target.value)}
                        style={{ resize: 'vertical', width: '100%', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                  </div>
                )}

                </div>

                <button type="submit" style={{ background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '10px', width: '100%' }}>
                  <FileText size={18} /> Đổ cấu hình xuống Loa
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR Code Detail Modal */}
      {selectedQrCode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{ padding: '32px', width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Mã QR của thiết bị</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 600 }}>{selectedQrCode.name || 'Loa Xiaozhi'}</p>
            
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRLink(selectedQrCode.mac_address))}`} 
                alt="Device QR" 
                style={{ width: '200px', height: '200px' }}
              />
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>MAC Address:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedQrCode.mac_address}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Link quét:</span>
                <a href={getQRLink(selectedQrCode.mac_address)} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getQRLink(selectedQrCode.mac_address)}
                </a>
              </div>
            </div>

            <button 
              onClick={() => setSelectedQrCode(null)}
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, width: '100%' }}
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* Preset Details Modal */}
      {viewingPreset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{ padding: '32px', width: '480px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>{viewingPreset.icon || '✨'}</span>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{viewingPreset.name}</h4>
                  <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>Phiên bản v{viewingPreset.version || 1}</span>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                {viewingPreset.language}
              </span>
            </div>

            {viewingPreset.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
                {viewingPreset.description}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mô hình AI:</span>
                <span style={{ fontWeight: 600 }}>{viewingPreset.llm_model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Giọng nói:</span>
                <span style={{ fontWeight: 600 }}>{getVoiceDisplayName(viewingPreset.tts_voice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Recognition speed (ASR):</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewingPreset.asr_speed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reply speed (TTS):</span>
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewingPreset.tts_speech_speed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pitch:</span>
                <span style={{ fontWeight: 600 }}>{viewingPreset.tts_pitch === 0 ? 'Standard' : viewingPreset.tts_pitch > 0 ? 'High' : 'Low'} ({viewingPreset.tts_pitch})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>MCP Endpoints (Extensions):</span>
                <span style={{ fontWeight: 600 }}>{viewingPreset.mcp_endpoints?.join(', ') || 'None'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Prompt Character (System Role):</span>
              <textarea 
                readOnly
                rows="4" 
                value={viewingPreset.character || ''} 
                style={{ width: '100%', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', cursor: 'default', resize: 'none' }}
              />
            </div>

            <button 
              onClick={() => setViewingPreset(null)}
              style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, width: '100%', cursor: 'pointer', border: 'none', marginTop: '8px' }}
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 24px 8px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        zIndex: 10
      }}>
        &copy; {new Date().getFullYear()} Globy AI Connect. Hỗ trợ hệ điều hành Xiaozhi Dashboard Lite.
      </footer>

      {/* CSS Spin effect for loader */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
