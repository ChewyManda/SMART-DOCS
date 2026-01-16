import React, { useState, useRef, useEffect } from 'react';
import { BsPlayFill, BsPauseFill, BsVolumeUpFill, BsVolumeMuteFill, BsFullscreen, BsFullscreenExit } from 'react-icons/bs';
import { BiSkipPrevious, BiSkipNext } from 'react-icons/bi';

const AudioPlayer = ({ src, fileName, onNext, onPrevious, hasNext, hasPrevious }) => {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Format time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
    };
  }, [src]);

  // Handle play/pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const audio = audioRef.current;
      const progress = progressRef.current;
      if (!audio || !progress) return;

      const rect = progress.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = percent * duration;
      setCurrentTime(percent * duration);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  // Handle playback speed
  const changePlaybackRate = (rate) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!isHovering && isPlaying) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowControls(true);
    }
  }, [isHovering, isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Only handle if not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          audio.currentTime = Math.max(0, audio.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          audio.currentTime = Math.min(duration, audio.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          audio.volume = Math.min(1, audio.volume + 0.1);
          setVolume(audio.volume);
          break;
        case 'ArrowDown':
          e.preventDefault();
          audio.volume = Math.max(0, audio.volume - 0.1);
          setVolume(audio.volume);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, duration]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="youtube-audio-player"
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
    >
      <audio ref={audioRef} src={src} />

      {/* Audio Image/Thumbnail - Square music image */}
      <div className="youtube-audio-image-container">
        <div className="youtube-audio-image">
          <div className="youtube-audio-image-placeholder">
            <i className="bi bi-music-note-beamed"></i>
          </div>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className={`youtube-controls-overlay ${showControls || isHovering ? 'show' : ''}`}>
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="youtube-progress-container"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
        >
          <div className="youtube-progress-bar">
            <div
              className="youtube-progress-filled"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="youtube-progress-thumb"></div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="youtube-controls-bottom">
          <div className="youtube-controls-left">
            {/* Play/Pause */}
            <button className="youtube-control-btn" onClick={togglePlay} title="Play/Pause (Space)">
              {isPlaying ? <BsPauseFill /> : <BsPlayFill />}
            </button>

            {/* Previous/Next (if available) */}
            {onPrevious && (
              <button
                className="youtube-control-btn"
                onClick={onPrevious}
                disabled={!hasPrevious}
                title="Previous"
              >
                <BiSkipPrevious />
              </button>
            )}
            {onNext && (
              <button
                className="youtube-control-btn"
                onClick={onNext}
                disabled={!hasNext}
                title="Next"
              >
                <BiSkipNext />
              </button>
            )}

            {/* Volume */}
            <div
              className="youtube-volume-container"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                className="youtube-control-btn"
                onClick={toggleMute}
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? <BsVolumeMuteFill /> : <BsVolumeUpFill />}
              </button>
              <div 
                className={`youtube-volume-slider ${showVolumeSlider ? 'show' : ''}`}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <input
                  ref={volumeRef}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="youtube-volume-range"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="youtube-time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="youtube-controls-right">
            {/* Playback Speed */}
            <div className="youtube-speed-menu-container">
              <button
                className="youtube-control-btn"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="Playback Speed"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="youtube-speed-menu">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button
                      key={rate}
                      className={`youtube-speed-option ${playbackRate === rate ? 'active' : ''}`}
                      onClick={() => changePlaybackRate(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              className="youtube-control-btn"
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <BsFullscreenExit /> : <BsFullscreen />}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AudioPlayer;
