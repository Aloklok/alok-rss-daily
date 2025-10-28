import React, { useEffect } from 'react';

interface ArticlePreviewModalProps {
    url: string | null;
    onClose: () => void;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({ url, onClose }) => {

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (url) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [url, onClose]);

    if (!url) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
                    <div className="text-sm text-gray-500 truncate">{url}</div>
                    <div className="flex items-center gap-2">
                        <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                            在新标签页中打开
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 rounded-full hover:bg-gray-200"
                            aria-label="Close preview"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <iframe 
                    src={url} 
                    title="Article Preview"
                    className="w-full flex-grow border-0"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
        </div>
    );
};

export default ArticlePreviewModal;