import React, { useEffect, useRef } from 'react';

interface SettingsPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
    lineHeight: number;
    onLineHeightChange: (height: number) => void;
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
    isOpen,
    onClose,
    theme,
    onThemeChange,
    fontSize,
    onFontSizeChange,
    lineHeight,
    onLineHeightChange
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const fontSizes = [14, 15, 16, 17];
    const lineHeights = [1.5, 1.7, 1.9, 2.1];

    const handleFontSizeIncrease = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex < fontSizes.length - 1) {
            onFontSizeChange(fontSizes[currentIndex + 1]);
        }
    };

    const handleFontSizeDecrease = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        if (currentIndex > 0) {
            onFontSizeChange(fontSizes[currentIndex - 1]);
        }
    };
    
    const handleLineHeightIncrease = () => {
        const currentIndex = lineHeights.indexOf(lineHeight);
        if (currentIndex < lineHeights.length - 1) {
            onLineHeightChange(lineHeights[currentIndex + 1]);
        }
    };
    
    const handleLineHeightDecrease = () => {
         const currentIndex = lineHeights.indexOf(lineHeight);
        if (currentIndex > 0) {
            onLineHeightChange(lineHeights[currentIndex - 1]);
        }
    };

    return (
        <div ref={popoverRef} className="absolute top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-10">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="dark-mode-toggle" className="font-semibold text-gray-800 dark:text-gray-200">暗黑模式</label>
                    <button
                        id="dark-mode-toggle"
                        onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">字体大小</span>
                    <div className="flex items-center gap-1">
                        <button onClick={handleFontSizeDecrease} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">- A</button>
                        <button onClick={handleFontSizeIncrease} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">A +</button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">行距</span>
                     <div className="flex items-center gap-1">
                        <button onClick={handleLineHeightDecrease} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7M4 18h3" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 18l-3-3m0 0l3-3m-3 3h10" />
                            </svg>
                        </button>
                        <button onClick={handleLineHeightIncrease} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7M4 18h3" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l-3 3m0 0l3 3m-3-3h10" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPopover;
