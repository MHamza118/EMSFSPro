import { useState } from 'react';

const Logo = ({
  height = 'auto',
  width = '200px',
  className = '',
  style = {},
  showFallback = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    console.warn('Logo image failed to load, showing fallback');
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Fallback component when image fails to load
  const LogoFallback = () => (
    <div
      style={{
        height: height === 'auto' ? '50px' : height,
        width,
        backgroundColor: '#3498db',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        ...style
      }}
      className={className}
      title="FSPro - Employee Management System"
    >
      FSPro
    </div>
  );

  // Show fallback if image failed to load and fallback is enabled
  if (imageError && showFallback) {
    return <LogoFallback />;
  }

  return (
    <div
      className={`logo-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        maxWidth: width,
        height: 'auto'
      }}>
      <img
        src="/images/fsprologo.png"
        alt="FSPro - Employee Management System"
        style={{
          height,
          width: '100%',
          maxWidth: width,
          opacity: imageLoaded ? 1 : 0.7,
          transition: 'opacity 0.3s ease, transform 0.2s ease',
          display: 'block',
          objectFit: 'contain',
          ...style
        }}
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
      {/* Show loading state */}
      {!imageLoaded && !imageError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: height === 'auto' ? '50px' : height,
            width,
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          <div
            style={{
              width: '60%',
              height: '60%',
              backgroundColor: '#e9ecef',
              borderRadius: '2px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Logo;
