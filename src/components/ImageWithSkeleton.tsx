import React, { useState } from 'react';

export function ImageWithSkeleton({
  src,
  alt,
  className,
  wrapperClassName,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { wrapperClassName?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative w-full h-full bg-slate-100 dark:bg-slate-800 overflow-hidden ${wrapperClassName || ''}`}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        {...props}
      />
    </div>
  );
}
