// hooks/useFilters.ts

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, AvailableFilters } from '../types';
import { getAvailableDates, getAvailableFilters, getTodayInShanghai } from '../services/api';

const CACHE_KEY_ACTIVE_FILTER = 'cachedActiveFilter';
const CACHE_KEY_SELECTED_MONTH = 'cachedSelectedMonth';

export const useFilters = () => {
    const [dates, setDates] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    // 1. 【核心修改】新增 isRefreshing 状态
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const fetchInitialFilterData = async () => {
            const today = getTodayInShanghai();
            if (today) {
                const initialFilter = { type: 'date' as const, value: today };
                setActiveFilter(initialFilter);
                sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(initialFilter));
                const cachedMonth = sessionStorage.getItem(CACHE_KEY_SELECTED_MONTH);
                setSelectedMonth(cachedMonth ? JSON.parse(cachedMonth) : today.substring(0, 7));
            }

            try {
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(),
                    getAvailableFilters()
                ]);
                setDates(availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
                setAvailableFilters(filters);
            } catch (error) {
                console.error("Failed to fetch initial filter data", error);
            } finally {
                setIsInitialLoad(false);
            }
        };
        fetchInitialFilterData();
    }, []);

    // 2. 【核心修改】重写 refreshFilters 函数
    const refreshFilters = useCallback(async () => {
        setIsRefreshing(true); // 开始刷新
        sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
        try {
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(),
                getAvailableFilters()
            ]);
            setDates(availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
            setAvailableFilters(filtersNew);
        } catch (error) {
            console.error('Failed to refresh sidebar data', error);
        } finally {
            setIsRefreshing(false); // 结束刷新
        }
    }, []);

    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        dates.forEach(date => monthSet.add(date.substring(0, 7)));
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [dates]);

    const datesForMonth = useMemo(() => {
        return dates.filter(date => date.startsWith(selectedMonth));
    }, [dates, selectedMonth]);

    const handleFilterChange = (filter: Filter | null) => {
        setActiveFilter(filter);
        if (filter) {
            sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(filter));
            if (filter.type === 'date') {
                const newMonth = filter.value.substring(0, 7);
                setSelectedMonth(newMonth);
                sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(newMonth));
            }
        } else {
            sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        }
    };
    
    const handleResetFilter = () => {
        const today = getTodayInShanghai();
        if (!today) return;
        const resetFilter = { type: 'date' as const, value: today };
        setActiveFilter(resetFilter);
        setSelectedMonth(today.substring(0, 7));
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(resetFilter));
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
    };

    return {
        isInitialLoad,
        isRefreshing, // 3. 【核心修改】导出 isRefreshing 状态
        datesForMonth,
        activeFilter,
        availableFilters,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        handleFilterChange,
        handleResetFilter,
        refreshFilters,
    };
};