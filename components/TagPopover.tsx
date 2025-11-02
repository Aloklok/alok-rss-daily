// components/TagPopover.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Article, Tag } from '../types';

interface TagPopoverProps {
    article: Article;
    availableUserTags: Tag[]; // 【修改】只接收纯净的用户标签列表
    onClose: () => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
}

const TagPopover: React.FC<TagPopoverProps> = ({ article, availableUserTags, onClose, onStateChange }) => {
    // 1. 【核心修复】我们唯一的“事实来源”是 availableUserTags。创建一个 Set 用于高效查找。
    const validUserTagIds = useMemo(() => 
        new Set(availableUserTags.map(t => t.id))
    , [availableUserTags]);

    // 2. 【核心修复】通过比对“事实来源”，从文章的所有标签中过滤出真正的用户标签。
    const originalUserTags = useMemo(() => new Set(
        (article.tags || []).filter(tagOnArticle => validUserTagIds.has(tagOnArticle))
    ), [article.tags, validUserTagIds]);

    const [selectedTags, setSelectedTags] = useState<Set<string>>(originalUserTags);
    const [isSaving, setIsSaving] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedTags(originalUserTags);
    }, [originalUserTags]);

    const handleTagChange = (tagId: string) => {
        setSelectedTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) newSet.delete(tagId);
            else newSet.add(tagId);
            return newSet;
        });
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        const tagsToAdd = [...selectedTags].filter(t => !originalUserTags.has(t));
        const tagsToRemove = [...originalUserTags].filter(t => !selectedTags.has(t));

        try {
            await onStateChange(article.id, tagsToAdd, tagsToRemove);
            onClose();
        } catch (error) {
            console.error("Failed to save tags", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div ref={popoverRef} className="absolute bottom-full mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 right-0" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b"><h4 className="font-semibold text-gray-800">编辑标签</h4></div>
            {(!availableUserTags || availableUserTags.length === 0) ? (
                <div className="p-4 text-center text-gray-500">暂无可用标签。</div>
            ) : (
                <div className="p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                        {availableUserTags.map(tag => (
                            <label key={tag.id} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedTags.has(tag.id)}
                                    onChange={() => handleTagChange(tag.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-700">{tag.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <div className="p-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">取消</button>
                <button onClick={handleConfirm} disabled={isSaving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? '保存中...' : '确认'}</button>
            </div>
        </div>
    );
};

export default TagPopover;