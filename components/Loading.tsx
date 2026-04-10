'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <p className="text-purple-600 text-lg mb-4">Loading...</p>
          
          {/* Loading Dots */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
  );
}