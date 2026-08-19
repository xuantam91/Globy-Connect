import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, User, Shield, Camera, Link, Moon, Sun, ArrowRight, Sparkles, RefreshCw, Key, Hash, Sliders, Volume2 } from 'lucide-react';


export default function Home() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  // New user modals
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const [activationDigits, setActivationDigits] = useState(['', '', '', '', '', '']);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [configInput, setConfigInput] = useState('');
  
  // Modals / Scanner state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Admin form state
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const speakGuidance = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Vui lòng nhập sáu chữ số hiển thị trên màn hình của loa để kích hoạt thiết bị.");
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...activationDigits];
    newDigits[index] = value;
    setActivationDigits(newDigits);
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !activationDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
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
      const timer = setTimeout(() => {
        speakGuidance();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showActivationModal]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleConnectMac = (macAddress) => {
    const cleanMac = macAddress.trim();
    if (!cleanMac) return;
    navigate(`/role?mac=${encodeURIComponent(cleanMac)}`);
  };

  const handleSearchAndConnect = async (input) => {
    const cleanInput = input.trim();
    if (!cleanInput) return;
    
    // If it looks like a MAC (hex characters with optional colons), go direct
    if (/^[0-9a-fA-F:]+$/.test(cleanInput.replace(/:/g, ''))) {
      navigate(`/role?mac=${encodeURIComponent(cleanInput)}`);
      return;
    }
    
    // Otherwise check if it is a speaker name in the database
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find(d => d.name && d.name.toLowerCase().includes(cleanInput.toLowerCase()));
        if (found) {
          navigate(`/role?mac=${encodeURIComponent(found.mac_address)}`);
          setShowConfigModal(false);
        } else {
          // fallback direct MAC
          navigate(`/role?mac=${encodeURIComponent(cleanInput)}`);
        }
      } else {
        navigate(`/role?mac=${encodeURIComponent(cleanInput)}`);
      }
    } catch (err) {
      navigate(`/role?mac=${encodeURIComponent(cleanInput)}`);
    }
  };

  const handleActivateDevice = async () => {
    const cleanCode = activationDigits.join('').trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      alert("Vui lòng nhập đúng dãy 6 chữ số hiển thị trên loa!");
      return;
    }
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
      if (data.success) {
        alert(`Kích hoạt thành công ${data.name}! Hệ thống sẽ đưa bạn đến trang thiết lập.`);
        setShowActivationModal(false);
        setActivationDigits(['', '', '', '', '', '']);
        setNewDeviceName('');
        navigate(`/role?mac=${encodeURIComponent(data.mac_address)}`);
      } else {
        alert(data.detail || "Kích hoạt thất bại. Vui lòng kiểm tra lại mã.");
      }
    } catch (err) {
      alert("Lỗi kết nối khi gửi yêu cầu kích hoạt.");
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

  const startScannerSimulation = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      // Automatically redirect to a mock device
      navigate('/role?mac=VI:01:23:45:67:89');
    }, 2500); // 2.5s scanning effect
  };

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
            <Sparkles size={12} /> CÔNG NGHỆ LOA THÔNG MINH CHO TRẺ EM
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '800px'
        }}>
          
          {/* Card 1: Kích hoạt loa mới */}
          <div className="glass-panel" style={{
            padding: '28px 24px',
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
              <Key size={24} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Kích hoạt loa mới</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Kết nối Wi-Fi cho loa và nhập dãy 6 chữ số hiển thị để kích hoạt sử dụng.
            </p>
            <button 
              onClick={() => setShowActivationModal(true)}
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
              Kích hoạt ngay
            </button>
          </div>

          {/* Card 2: Thay đổi cấu hình */}
          <div className="glass-panel" style={{
            padding: '28px 24px',
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
              Quét mã QR dán trên thân loa hoặc nhập thông số để điều chỉnh ngôn ngữ, giọng nói của bé.
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

          {/* Card 3: Quản trị hệ thống */}
          <div className="glass-panel" style={{
            padding: '28px 24px',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid var(--border-color)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Shield size={24} style={{ color: 'var(--text-primary)' }} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>Quản trị viên</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '20px', flex: 1 }}>
              Đăng nhập trang quản trị để đồng bộ danh sách, cài đặt nâng cao và nạp Preset mẫu.
            </p>
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
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              Đăng nhập
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

            {/* Prominent Kid-Friendly Alert Banner with TTS guidance */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15))',
              border: '1px solid rgba(99,102,241,0.25)',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.45', flex: 1, fontWeight: 550 }}>
                🔔 Nhập đúng 6 chữ số đang hiển thị trên màn hình của loa để thực hiện liên kết kích hoạt.
              </span>
              <button 
                onClick={speakGuidance}
                type="button"
                title="Đọc to thông báo"
                style={{
                  background: 'var(--primary)',
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
                  transition: 'transform 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Volume2 size={16} />
              </button>
            </div>

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
                      style={{
                        width: '100%',
                        height: '48px',
                        fontSize: '1.3rem',
                        textAlign: 'center',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: '2px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.15)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  ))}
                </div>
              </div>

              {/* Optional Speaker Name input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tên gợi nhớ của loa (Tùy chọn)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Loa của bé, Loa phòng khách..."
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  style={{
                    padding: '12px',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.15)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    setShowActivationModal(false);
                    setActivationDigits(['', '', '', '', '', '']);
                    setNewDeviceName('');
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
                  onClick={handleActivateDevice}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--secondary)',
                    color: 'white',
                    fontWeight: 600,
                    boxShadow: '0 4px 15px var(--secondary-glow)',
                    cursor: 'pointer'
                  }}
                >
                  Kích hoạt ngay
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
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>Vào cấu hình Loa của bé</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px', textAlign: 'center' }}>
              Hãy quét mã QR dán trên thân loa hoặc nhập thông số để kết nối
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              
              {/* Simulated Camera Viewfinder */}
              <div style={{
                width: '200px',
                height: '200px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '24px',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '12px', left: '12px', width: '15px', height: '15px', borderLeft: '3px solid #6366f1', borderTop: '3px solid #6366f1' }}></div>
                <div style={{ position: 'absolute', top: '12px', right: '12px', width: '15px', height: '15px', borderRight: '3px solid #6366f1', borderTop: '3px solid #6366f1' }}></div>
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '15px', height: '15px', borderLeft: '3px solid #6366f1', borderBottom: '3px solid #6366f1' }}></div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '15px', height: '15px', borderRight: '3px solid #6366f1', borderBottom: '3px solid #6366f1' }}></div>
                
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '3px',
                  background: 'linear-gradient(to right, transparent, #6366f1, transparent)',
                  boxShadow: '0 0 10px #6366f1',
                  animation: 'scanVertical 2s linear infinite'
                }}></div>

                {scanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw className="spin" size={24} style={{ color: '#6366f1', animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>Quét...</span>
                  </div>
                ) : (
                  <button 
                    onClick={startScannerSimulation}
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid #6366f1',
                      color: '#6366f1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Simulate QR Scan
                  </button>
                )}
              </div>

              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyText: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>— hoặc Nhập thông số thủ công —</span>
              </div>

              {/* Manual input for MAC or Name */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nhập địa chỉ MAC hoặc Tên Loa</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: VI:01:23:45:67:89 hoặc Loa Phòng Khách"
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
              </div>

              <div style={{ width: '100%', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={() => {
                    setShowConfigModal(false);
                    setConfigInput('');
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
        &copy; {new Date().getFullYear()} Globy AI Connect. Hỗ trợ hệ điều hành Xiaozhi Dashboard Lite.
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
