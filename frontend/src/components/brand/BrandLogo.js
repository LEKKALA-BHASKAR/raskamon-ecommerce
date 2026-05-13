import React from 'react';

const sizeClasses = {
  sm: {
    image: 'h-10 w-auto',
  },
  md: {
    image: 'h-12 w-auto',
  },
  lg: {
    image: 'h-20 w-auto',
  },
  xl: {
    image: 'h-24 w-auto',
  },
};

const BrandLogo = ({
  centered = false,
  size = 'md',
  className = '',
}) => {
  const styles = sizeClasses[size] || sizeClasses.md;
  const alignment = centered ? 'justify-center' : 'justify-start';

  return (
    <div className={`flex ${alignment} ${className}`}>
      <img
        src="/LOGO-1.jpeg"
        alt="Dr MediScie"
        className={`${styles.image} object-contain`}
      />
    </div>
  );
};

export default BrandLogo;
