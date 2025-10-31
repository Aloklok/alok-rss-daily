import React, { useEffect } from 'react';
import { CleanArticleContent } from '../types';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

interface ReaderViewProps {
    isVisible: boolean;
    isLoading: boolean;
    content: CleanArticleContent | null;
    onClose: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ isVisible, isLoading, content, onClose }) => {
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);
    
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isVisible]);

    return (
        <>
            <div 
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ease-in-out ${
                    isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
                    isVisible ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                        {isLoading ? (
                            <div className="h-6 bg-gray-200 rounded-md w-1/2 animate-pulse"></div>
                        ) : (
                            <h3 className="text-lg font-semibold text-gray-800 truncate">{content?.title || '阅读模式'}</h3>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-800"
                            aria-label="Close reader view"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        {isLoading ? (
                           <LoadingSpinner />
                        ) : content ? (
                            <article className="p-6 md:p-8">
                                <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 mb-2">{content.title}</h1>
                                <p className="text-gray-500 mb-6 border-b pb-4">来源: {content.source}</p>
                                <div 
                                    className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: content.content }} 
                                />
                                <script
                                  dangerouslySetInnerHTML={{
                                    __html: `
                                      // Ensure images have width and height attributes to prevent CLS
                                      document.addEventListener('DOMContentLoaded', function() {
                                        const images = document.querySelectorAll('.prose img');
                                        images.forEach(img => {
                                          if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
                                            img.setAttribute('loading', 'lazy');
                                            img.style.width = '100%';
                                            img.style.height = 'auto';
                                          }
                                        });
                                      });
                                    `,
                                  }}
                                />
                            </article>
                        ) : (
                             <div className="p-8 text-center text-gray-500">
                                <p>无法加载文章内容。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ReaderView;