import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, User, Shield, Camera, Link, Moon, Sun, ArrowRight, Sparkles, RefreshCw, Key, Hash, Sliders, Volume2, Wifi, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';


export default function Home() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  // New user modals
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [wifiStepIndex, setWifiStepIndex] = useState(0);
  
  const [activationDigits, setActivationDigits] = useState(['', '', '', '', '', '']);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [configInput, setConfigInput] = useState('');
  const [activationError, setActivationError] = useState(null);
  const [activating, setActivating] = useState(false);
  
  // Modals / Scanner state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Admin form state
  const [adminToken, setAdminToken] = useState('');

  // Speaker TTS / Guidance states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakerPulsing, setIsSpeakerPulsing] = useState(false);
  const [autoSpeakTimerId, setAutoSpeakTimerId] = useState(null);

  useEffect(() => {
    let intervalId;
    if (showWifiModal) {
      // Load YouTube Iframe API if not already present
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.head.appendChild(tag);
        }
      }

      // Initialize the YT Player when YT is ready
      const initPlayer = () => {
        if (window.YT && window.YT.Player) {
          try {
            const player = new window.YT.Player('wifiTutorialVideo', {
              height: '100%',
              width: '100%',
              videoId: '7zajRupzURM',
              playerVars: {
                'playsinline': 1,
                'rel': 0,
                'enablejsapi': 1,
                'modestbranding': 1
              },
              events: {
                'onStateChange': (event) => {
                  if (event.data === window.YT.PlayerState.PLAYING) {
                    clearInterval(intervalId);
                    intervalId = setInterval(() => {
                      const time = player.getCurrentTime();
                      let targetStep = 0;
                      if (time >= 30) {
                        targetStep = 3;
                      } else if (time >= 20) {
                        targetStep = 2;
                      } else if (time >= 10) {
                        targetStep = 1;
                      } else {
                        targetStep = 0;
                      }
                      setWifiStepIndex(targetStep);
                    }, 500);
                  } else {
                    clearInterval(intervalId);
                  }
                }
              }
            });
            window.wifiPlayer = player;
          } catch (err) {
            console.error("Lỗi khởi tạo YouTube player:", err);
          }
        } else {
          setTimeout(initPlayer, 100);
        }
      };

      setTimeout(initPlayer, 200);
    }

    return () => {
      clearInterval(intervalId);
      if (window.wifiPlayer && typeof window.wifiPlayer.destroy === 'function') {
        try {
          window.wifiPlayer.destroy();
        } catch (destroyErr) {
          console.error("Lỗi destroy YouTube player:", destroyErr);
        }
        window.wifiPlayer = null;
      }
    };
  }, [showWifiModal]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync with system theme live changes if no user override is saved
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  const speakGuidance = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Vui lòng nhập sáu chữ số hiển thị trên màn hình của loa để kích hoạt thiết bị.");
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05;
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsSpeakerPulsing(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsSpeakerPulsing(false);
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopGuidance = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsSpeakerPulsing(false);
  };

  const handleSpeakerClick = () => {
    if (isSpeaking) {
      stopGuidance();
    } else {
      speakGuidance();
    }
  };

  const handleWifiStepChange = (newIdx) => {
    if (newIdx < 0 || newIdx > 3) return;
    setWifiStepIndex(newIdx);
    if (window.wifiPlayer && typeof window.wifiPlayer.seekTo === 'function') {
      try {
        window.wifiPlayer.seekTo(newIdx * 10, true);
      } catch (err) {
        console.error("Lỗi seek YouTube video:", err);
      }
    }
  };

  const handleDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    
    setActivationError(null);
    // Clear auto-speak timer and stop pulsing if user starts typing
    if (autoSpeakTimerId) {
      clearTimeout(autoSpeakTimerId);
      setAutoSpeakTimerId(null);
    }
    setIsSpeakerPulsing(false);

    const newDigits = [...activationDigits];
    newDigits[index] = value;
    setActivationDigits(newDigits);
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    setActivationError(null);
    if (autoSpeakTimerId) {
      clearTimeout(autoSpeakTimerId);
      setAutoSpeakTimerId(null);
    }
    setIsSpeakerPulsing(false);

    if (e.key === 'Backspace' && !activationDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    setActivationError(null);
    if (autoSpeakTimerId) {
      clearTimeout(autoSpeakTimerId);
      setAutoSpeakTimerId(null);
    }
    setIsSpeakerPulsing(false);

    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setActivationDigits(pasted.split(''));
      const lastInput = document.getElementById('digit-input-5');
      if (lastInput) lastInput.focus();
    }
  };

  useEffect(() => {
    if (showActivationModal) {
      setActivationDigits(['', '', '', '', '', '']);
      setIsSpeaking(false);
      setIsSpeakerPulsing(false);
      setActivationError(null);
      
      // 1. Focus the first input box
      const focusTimer = setTimeout(() => {
        const firstInput = document.getElementById('digit-input-0');
        if (firstInput) firstInput.focus();
      }, 150);

      // 2. Start the 9-second inactivity timer for auto voice alert
      const speakTimer = setTimeout(() => {
        setIsSpeakerPulsing(true);
        speakGuidance();
      }, 9000);
      
      setAutoSpeakTimerId(speakTimer);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(speakTimer);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, [showActivationModal]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleConnectMac = (macAddress) => {
    const cleanMac = macAddress.trim();
    if (!cleanMac) return;
    navigate(`/role?mac=${encodeURIComponent(cleanMac)}`);
  };

  const handleSearchAndConnect = async (input) => {
    const cleanInput = input.trim();
    if (!cleanInput) return;
    
    const flatInput = cleanInput.replace(/[:-\s]/g, '').toLowerCase();

    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      
      let foundDevice = null;
      if (data.success && data.data) {
        foundDevice = data.data.find(d => {
          const flatMac = (d.mac_address || '').replace(/[:-\s]/g, '').toLowerCase();
          return (
            flatMac === flatInput ||
            String(d.external_id) === cleanInput ||
            (d.name && d.name.toLowerCase() === cleanInput.toLowerCase())
          );
        });
      }

      if (foundDevice) {
        const cleanMac = (foundDevice.mac_address || '').replace(/[:-\s]/g, '').toLowerCase();
        navigate(`/role?mac=${encodeURIComponent(cleanMac)}`);
        setShowConfigModal(false);
        setConfigInput('');
      } else {
        navigate(`/role?mac=${encodeURIComponent(flatInput)}`);
        setShowConfigModal(false);
        setConfigInput('');
      }
    } catch (err) {
      navigate(`/role?mac=${encodeURIComponent(flatInput)}`);
      setShowConfigModal(false);
      setConfigInput('');
    }
  };

  const handleResetForm = () => {
    setActivationDigits(['', '', '', '', '', '']);
    setActivationError(null);
    setIsSpeaking(false);
    setIsSpeakerPulsing(false);
    
    // Auto-focus the first cell
    setTimeout(() => {
      const firstInput = document.getElementById('digit-input-0');
      if (firstInput) firstInput.focus();
    }, 50);
  };

  const handleActivateDevice = async () => {
    const cleanCode = activationDigits.join('').trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setActivationError("Vui lòng nhập đúng dãy 6 chữ số hiển thị trên loa!");
      return;
    }
    setActivationError(null);
    setActivating(true);
    try {
      const res = await fetch('/api/devices/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: cleanCode,
          name: newDeviceName.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowActivationModal(false);
        setActivationDigits(['', '', '', '', '', '']);
        setNewDeviceName('');
        const cleanMac = (data.mac_address || '').replace(/[:-\s]/g, '').toLowerCase();
        navigate(`/role?mac=${encodeURIComponent(cleanMac)}`);
      } else {
        setActivationError(data.detail || "Mã kích hoạt không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại.");
      }
    } catch (err) {
      setActivationError("Lỗi kết nối khi gửi yêu cầu kích hoạt.");
    } finally {
      setActivating(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminToken })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setAdminToken('');
        setShowAdminLogin(false);
        navigate('/admin');
      } else {
        alert(data.message || 'Mật khẩu không chính xác!');
      }
    } catch (err) {
      alert('Lỗi kết nối đến máy chủ.');
    }
  };

  useEffect(() => {
    let html5QrcodeScanner = null;

    if (showConfigModal && scanning) {
      const containerId = "qr-reader-container";
      
      const timer = setTimeout(() => {
        const element = document.getElementById(containerId);
        if (!element) return;

        html5QrcodeScanner = new Html5Qrcode(containerId);
        html5QrcodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.75;
              return { width: size, height: size };
            }
          },
          (decodedText, decodedResult) => {
            html5QrcodeScanner.stop().then(() => {
              const rawText = decodedText.trim();
              let mac = rawText;
              
              if (rawText.includes('mac=')) {
                try {
                  let urlString = rawText;
                  if (!/^https?:\/\//i.test(urlString)) {
                    urlString = "http://" + urlString;
                  }
                  const url = new URL(urlString);
                  mac = url.searchParams.get('mac') || rawText;
                } catch (e) {
                  const match = rawText.match(/mac=([^&]+)/);
                  if (match) mac = match[1];
                }
              } else {
                const urlMatch = rawText.match(/\/role\/([a-fA-F0-9:-]+)/);
                if (urlMatch) {
                  mac = urlMatch[1];
                }
              }

              // Clean MAC address (remove colons, dashes, spaces)
              const cleanMac = mac.replace(/[:-\s]/g, '').toLowerCase();

              navigate(`/role?mac=${encodeURIComponent(cleanMac)}`);
              setShowConfigModal(false);
              setScanning(false);
            }).catch(err => {
              console.error("Failed to stop scanner", err);
            });
          },
          (errorMessage) => {
            // ignore scan errors
          }
        ).catch(err => {
          console.error("Error starting camera", err);
          alert("Không thể truy cập camera. Vui lòng cấp quyền camera cho trình duyệt hoặc tự nhập thông số thủ công bên dưới.");
          setScanning(false);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner) {
          if (html5QrcodeScanner.isScanning) {
            html5QrcodeScanner.stop().catch(err => console.error("Error stopping scanner on unmount", err));
          }
        }
      };
    }
  }, [scanning, showConfigModal]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <style>{`
        @keyframes pulseGlow {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
          }
          70% {
            transform: scale(1.1);
            box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
        @keyframes scanVertical {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulseProgress {
          0% { left: -30%; width: 30%; }
          50% { width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        #qr-reader-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important;
        }
        #qr-reader-container canvas {
          display: none !important;
        }
      `}</style>
      
      {/* Background glowing effects for Kid/AI theme */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }}></div>

      {/* Header bar */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #10b981)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
          }}>
            <Cpu size={22} style={{ color: 'white' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', background: 'linear-gradient(to right, #6366f1, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Globy AI Connect
          </span>
        </div>

        {/* Actions bar (Admin + Theme) */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Admin login button */}
          <button 
            onClick={() => {
              const token = localStorage.getItem('admin_token');
              if (token === 'xiaozhi-admin-session-token') {
                navigate('/admin');
              } else {
                setShowAdminLogin(true);
              }
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '10px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease'
            }}
            title="Đăng nhập trang quản trị"
          >
            <Shield size={16} style={{ color: '#6366f1' }} />
            <span>Quản trị viên</span>
          </button>

          {/* Theme toggle button */}
          <button 
            onClick={toggleTheme} 
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '10px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
        zIndex: 10
      }}>
        
        {/* Slogan */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <Sparkles size={12} /> CÔNG NGHỆ LOA THÔNG MINH CHO GIAO TIẾP NGOẠI NGỮ
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Cấu hình Trí tuệ Nhân tạo <br/>
            <span style={{ background: 'linear-gradient(to right, #6366f1, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              chỉ trong một chạm
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Chào mừng bạn đến với hệ thống quản lý loa Globy AI. Hãy lựa chọn vai trò của bạn bên dưới để bắt đầu cấu hình.
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '1000px'
        }}>
          
          {/* Card 1: Kết nối Wi-Fi */}
          <div className="glass-panel" style={{
            padding: '28px 20px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid rgba(16, 185, 129, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Wifi size={24} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Kết nối Wi-Fi</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Xem hướng dẫn chi tiết bằng hình ảnh và video để thiết lập mạng Wi-Fi cho Loa Globy.
            </p>
            <button 
              onClick={() => setShowWifiModal(true)}
              style={{
                background: 'linear-gradient(to right, #10b981, #059669)',
                color: 'white',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                width: '100%',
                boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                cursor: 'pointer'
              }}
            >
              Hướng dẫn kết nối
            </button>
          </div>

          {/* Card 2: Kích hoạt loa */}
          <div className="glass-panel" style={{
            padding: '28px 20px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid rgba(5, 150, 105, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(5, 150, 105, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Key size={24} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Kích hoạt loa</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Nhập dãy 6 chữ số hiển thị trên màn hình loa để thực hiện liên kết kích hoạt thiết bị.
            </p>
            <button 
              onClick={() => setShowActivationModal(true)}
              style={{
                background: 'linear-gradient(to right, #059669, #047857)',
                color: 'white',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                width: '100%',
                boxShadow: '0 4px 12px rgba(5,150,105,0.15)',
                cursor: 'pointer'
              }}
            >
              Kích hoạt ngay
            </button>
          </div>

          {/* Card 3: Thay đổi cấu hình */}
          <div className="glass-panel" style={{
            padding: '28px 20px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid rgba(99, 102, 241, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Sliders size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Thay đổi cấu hình</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Quét mã QR dán trên thân loa hoặc nhập thông số để điều chỉnh cấu hình và ngôn ngữ giao tiếp.
            </p>
            <button 
              onClick={() => setShowConfigModal(true)}
              style={{
                background: 'linear-gradient(to right, #6366f1, #4f46e5)',
                color: 'white',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                width: '100%',
                boxShadow: '0 4px 12px rgba(99,102,241,0.15)',
                cursor: 'pointer'
              }}
            >
              Vào thiết lập
            </button>
          </div>

          {/* Card 4: Các tính năng chính */}
          <div className="glass-panel" style={{
            padding: '28px 20px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid rgba(139, 92, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Sparkles size={24} style={{ color: '#8b5cf6' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Tính năng chính</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Khám phá các tính năng chính của loa như AI đa ngôn ngữ, nhạc thẻ nhớ, đài radio, giải toán...
            </p>
            <button 
              onClick={() => setShowFeaturesModal(true)}
              style={{
                background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
                color: 'white',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                width: '100%',
                boxShadow: '0 4px 12px rgba(139,92,246,0.15)',
                cursor: 'pointer'
              }}
            >
              Khám phá ngay
            </button>
          </div>

        </div>
      </main>

      {/* ACTIVATION MODAL (6 DIGIT CODE + SPEAKER NAME) */}
      {showActivationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <Key size={24} style={{ color: 'var(--secondary)' }} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}>Kích hoạt loa thông minh</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center', marginTop: '4px' }}>
                Nhập mã số hiển thị trên loa để kích hoạt liên kết
              </p>
            </div>

            {activationError ? (
              <div className="animated-fade-in" style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '12px 16px',
                borderRadius: '12px',
                color: '#ef4444',
                fontSize: '0.82rem',
                lineHeight: '1.45',
                fontWeight: 600,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(239,68,68,0.08)'
              }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <span style={{ flex: 1 }}>{activationError}</span>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                padding: '12px 16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.45', flex: 1, fontWeight: 550 }}>
                  🔔 Nhập đúng 6 chữ số đang hiển thị trên màn hình của loa để thực hiện liên kết kích hoạt.
                </span>
                <button 
                  onClick={handleSpeakerClick}
                  type="button"
                  title={isSpeaking ? "Ngưng đọc hướng dẫn" : "Đọc to hướng dẫn"}
                  style={{
                    background: isSpeaking ? '#ef4444' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--primary-glow)',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                    animation: isSpeakerPulsing ? 'pulseGlow 1.2s infinite alternate' : 'none'
                  }}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Split Activation code inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mã kích hoạt (6 chữ số)</label>
                <div 
                  onPaste={handleDigitPaste}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginTop: '4px' }}
                >
                  {activationDigits.map((digit, idx) => (
                    <input 
                      key={idx}
                      id={`digit-input-${idx}`}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={digit}
                      onChange={e => handleDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(idx, e)}
                      disabled={activating}
                      style={{
                        width: '100%',
                        height: '48px',
                        fontSize: '1.3rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: activationError ? '2px solid #ef4444' : '2px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.15)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                        opacity: activating ? 0.6 : 1
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = activationError ? '#ef4444' : 'var(--border-color)'}
                    />
                  ))}
                </div>
              </div>

              {/* Optional Speaker Name input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tên gợi nhớ của loa (Tùy chọn)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Loa phòng khách, Loa cá nhân..."
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  disabled={activating}
                  style={{
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.15)',
                    color: 'var(--text-primary)',
                    opacity: activating ? 0.6 : 1
                  }}
                />
              </div>

              {activating && (
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(to right, #6366f1, #10b981)',
                    width: '30%',
                    borderRadius: '2px',
                    position: 'absolute',
                    animation: 'pulseProgress 1.5s infinite ease-in-out'
                  }}></div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    setShowActivationModal(false);
                    setActivationDigits(['', '', '', '', '', '']);
                    setNewDeviceName('');
                    setActivationError(null);
                  }}
                  disabled={activating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: activating ? 'not-allowed' : 'pointer',
                    opacity: activating ? 0.5 : 1
                  }}
                >
                  Đóng lại
                </button>
                <button 
                  onClick={activationError ? handleResetForm : handleActivateDevice}
                  disabled={activating}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: activating 
                      ? 'linear-gradient(to right, #4b5563, #374151)'
                      : activationError
                        ? 'linear-gradient(to right, #f59e0b, #d97706)'
                        : 'linear-gradient(to right, #10b981, #059669)',
                    color: 'white',
                    fontWeight: 600,
                    boxShadow: activating
                      ? 'none'
                      : activationError
                        ? '0 4px 12px rgba(245,158,11,0.2)'
                        : '0 4px 12px rgba(16,185,129,0.2)',
                    cursor: activating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {activating ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Đang liên kết...</span>
                    </>
                  ) : activationError ? (
                    <span>Nhập lại mã</span>
                  ) : (
                    <span>Kích hoạt ngay</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG CONFIGURATION MODAL (SCAN QR / MANUAL MAC OR NAME) */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>Vào cấu hình Loa giao tiếp ngoại ngữ</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px', textAlign: 'center' }}>
              Hãy quét mã QR dán trên thân loa hoặc nhập thông số để kết nối
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              
              {/* Real Camera Viewfinder */}
              <div style={{
                width: '250px',
                height: '250px',
                border: '2px solid var(--border-color)',
                borderRadius: '24px',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '12px', left: '12px', width: '15px', height: '15px', borderLeft: '3px solid #6366f1', borderTop: '3px solid #6366f1', zIndex: 5 }}></div>
                <div style={{ position: 'absolute', top: '12px', right: '12px', width: '15px', height: '15px', borderRight: '3px solid #6366f1', borderTop: '3px solid #6366f1', zIndex: 5 }}></div>
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '15px', height: '15px', borderLeft: '3px solid #6366f1', borderBottom: '3px solid #6366f1', zIndex: 5 }}></div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '15px', height: '15px', borderRight: '3px solid #6366f1', borderBottom: '3px solid #6366f1', zIndex: 5 }}></div>
                
                {scanning && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '3px',
                    background: 'linear-gradient(to right, transparent, #6366f1, transparent)',
                    boxShadow: '0 0 10px #6366f1',
                    animation: 'scanVertical 2s linear infinite',
                    zIndex: 4
                  }}></div>
                )}

                {scanning ? (
                  <div id="qr-reader-container" style={{ width: '100%', height: '100%', objectFit: 'cover' }}></div>
                ) : (
                  <button 
                    onClick={() => setScanning(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))',
                      border: '1px solid var(--primary)',
                      color: 'var(--text-primary)',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                    }}
                  >
                    <Camera size={16} style={{ color: 'var(--primary)' }} />
                    Bật Camera quét mã
                  </button>
                )}
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyText: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>— hoặc Nhập thông số thủ công —</span>
              </div>

              {/* Manual input for MAC or Device ID */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nhập địa chỉ MAC hoặc ID Thiết bị</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: 80b54ec7bc10 hoặc 2562180"
                    value={configInput}
                    onChange={e => setConfigInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '0.85rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(0,0,0,0.15)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button 
                    onClick={() => handleSearchAndConnect(configInput)}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Vào
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  💡 Hướng dẫn: Truy cập vào mục <strong>Settings ➔ About speaker</strong> trên màn hình của loa để lấy địa chỉ MAC hoặc ID thiết bị.
                </span>
              </div>

              <div style={{ width: '100%', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    setShowConfigModal(false);
                    setConfigInput('');
                    setScanning(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* WI-FI CONNECTION GUIDE MODAL */}
      {showWifiModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          overflowY: 'auto',
          padding: '20px 0'
        }}>
          <div className="glass-panel animated-fade-in" style={{
            padding: '24px',
            maxWidth: '560px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Wifi size={18} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Hướng dẫn kết nối Wi-Fi</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Làm theo các bước bên dưới để liên kết loa với internet</p>
              </div>
            </div>

            {/* Part 1: Video player tutorial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>🎥 Video hướng dẫn trực quan</span>
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'black',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                aspectRatio: '16/9'
              }}>
                <div 
                  id="wifiTutorialVideo"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>

            {/* Part 2: Step-by-Step interactive guide */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Stepper indicator dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bước {wifiStepIndex + 1} / 4
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 1, 2, 3].map(idx => (
                    <div 
                      key={idx}
                      onClick={() => handleWifiStepChange(idx)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: idx === wifiStepIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Images preview container */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                height: '180px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                overflow: 'hidden',
                padding: '8px'
              }}>
                {wifiStepIndex === 0 && (
                  <img 
                    src="/image-guide/Step 1.jpg" 
                    alt="Step 1" 
                    style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                )}
                {wifiStepIndex === 1 && (
                  <>
                    <img 
                      src="/image-guide/Step 2.jpg" 
                      alt="Step 2" 
                      style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px', maxWidth: '48%' }} 
                    />
                    <img 
                      src="/image-guide/Step 3-1.jpg" 
                      alt="Step 3-1" 
                      style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px', maxWidth: '48%' }} 
                    />
                  </>
                )}
                {wifiStepIndex === 2 && (
                  <img 
                    src="/image-guide/Step 3-2.jpg" 
                    alt="Step 3-2" 
                    style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                )}
                {wifiStepIndex === 3 && (
                  <img 
                    src="/image-guide/Step 4.jpg" 
                    alt="Step 4" 
                    style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                )}
              </div>

              {/* Instruction texts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {wifiStepIndex === 0 && (
                  <>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>1. Khởi động loa và chế độ kết nối</h5>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Bật nguồn loa bằng cách nhấn nút nguồn (nút trên cùng), sau đó nhấn nút Vol- (nút dưới cùng) để loa chuyển sang chế độ thiết lập kết nối Wi-Fi.
                    </p>
                  </>
                )}
                {wifiStepIndex === 1 && (
                  <>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>2. Quét QR loa và kết nối Wifi phát ra</h5>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Dùng điện thoại quét mã QR dán trên thân loa (sử dụng ứng dụng Zalo hoặc Camera điện thoại) và chọn kết nối vào mạng Wi-Fi phát ra từ loa (mạng có tên bắt đầu bằng <code style={{color:'#10b981',fontWeight:'bold'}}>GLOBY-</code>).
                    </p>
                  </>
                )}
                {wifiStepIndex === 2 && (
                  <>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>3. Chọn Wifi nhà và điền mật khẩu</h5>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Trên màn hình điện thoại tự động hiển thị, chọn mạng Wi-Fi gia đình bạn (lưu ý dùng băng tần 2.4GHz), nhập chính xác mật khẩu Wi-Fi rồi nhấn nút <strong style={{color:'#6366f1'}}>Connect</strong>.
                    </p>
                  </>
                )}
                {wifiStepIndex === 3 && (
                  <>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>4. Hoàn thành kết nối mạng</h5>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Chờ trong giây lát để thiết bị tiến hành kết nối. Khi màn hình loa hiển thị thông báo kết nối thành công và hiện lời chào kèm mã kích hoạt 6 chữ số, bạn đã kết nối thành công!
                    </p>
                  </>
                )}
              </div>

              {/* Steps navigation controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <button
                  disabled={wifiStepIndex === 0}
                  onClick={() => handleWifiStepChange(wifiStepIndex - 1)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: wifiStepIndex === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: wifiStepIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ChevronLeft size={14} /> Trước đó
                </button>
                <button
                  disabled={wifiStepIndex === 3}
                  onClick={() => handleWifiStepChange(wifiStepIndex + 1)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: wifiStepIndex === 3 ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: wifiStepIndex === 3 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Tiếp tục <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
              <button 
                onClick={() => {
                  setShowWifiModal(false);
                  setWifiStepIndex(0);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng lại
              </button>
              <button 
                onClick={() => {
                  setShowWifiModal(false);
                  setWifiStepIndex(0);
                  setShowActivationModal(true);
                }}
                style={{
                  flex: 1.5,
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(to right, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                }}
              >
                Tôi đã kết nối xong ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEY FEATURES EXPLORE MODAL */}
      {showFeaturesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{
            padding: '28px',
            maxWidth: '450px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.15)',
            maxHeight: '85vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} style={{ color: '#8b5cf6' }} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Các tính năng của Loa Globy AI</h4>
            </div>

            {/* List of features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: "🗣️", title: "Giao tiếp AI đa ngôn ngữ", desc: "Trò chuyện tự nhiên bằng tiếng Anh, tiếng Việt, tiếng Trung, tiếng Nhật... để rèn luyện phản xạ ngoại ngữ trôi chảy." },
                { icon: "💾", title: "Nghe nhạc từ thẻ nhớ", desc: "Phát nhạc chất lượng cao trực tiếp từ thẻ nhớ Micro SD của bạn thông qua các phím bấm vật lý dễ thao tác." },
                { icon: "📻", title: "Nghe Radio trực tuyến", desc: "Cập nhật các chương trình thời sự, tin tức, và các kênh đài phát thanh trực tuyến mọi lúc mọi nơi." },
                { icon: "⏰", title: "Đặt báo thức thông minh", desc: "Thiết lập thời gian biểu, hẹn giờ thức dậy một cách khoa học bằng giọng nói hoặc qua dashboard quản lý." },
                { icon: "🧮", title: "Hỏi đáp Toán học", desc: "Hỗ trợ giải nhanh các phép tính toán học cơ bản và trả lời câu hỏi khoa học thường thức." },
                { icon: "🧠", title: "Trò chơi học tập (Quiz & Guess Words)", desc: "Tham gia các trò chơi trả lời câu đố và đoán từ vựng vui nhộn để nâng cao vốn từ vựng ngoại ngữ." },
                { icon: "⚙️", title: "Thiết lập loa tiện lợi", desc: "Tự do điều chỉnh âm lượng, độ nhạy micro, tốc độ phát âm thanh và tông giọng của AI theo ý muốn." }
              ].map((f, i) => (
                <div 
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '12px',
                    borderRadius: '10px',
                    alignItems: 'flex-start'
                  }}
                >
                  <span style={{ fontSize: '1.3rem', lineHeight: '1', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>{f.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowFeaturesModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel animated-fade-in" style={{
            padding: '32px',
            maxWidth: '380px',
            width: '90%',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>Đăng nhập quản trị viên</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px', textAlign: 'center' }}>Hãy nhập mã bí mật để xác thực quản trị hệ thống</p>
            
            <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Mật khẩu / Admin token</label>
                <input 
                  type="password"
                  placeholder="••••••••••••••"
                  value={adminToken}
                  onChange={e => setAdminToken(e.target.value)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.2)'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  Đóng lại
                </button>
                <button 
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    boxShadow: '0 4px 15px var(--primary-glow)'
                  }}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        zIndex: 10
      }}>
        &copy; {new Date().getFullYear()} Globy AI Connect. Hỗ trợ hệ điều hành loa Globy.
      </footer>

      {/* Embedded CSS animations for scanning line */}
      <style>{`
        @keyframes scanVertical {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>

    </div>
  );
}
