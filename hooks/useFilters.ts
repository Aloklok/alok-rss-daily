import { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, AvailableFilters } from '../types';
import { getAvailableDates, getAvailableFilters, getTodayInShanghai } from '../services/api';

// Cache keys for UI state only
const CACHE_KEY_ACTIVE_FILTER = 'cachedActiveFilter';
const CACHE_KEY_SELECTED_MONTH = 'cachedSelectedMonth';

export const useFilters = () => {
    const [dates, setDates] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        const loadUiStateFromCache = () => {
            try {
                const cachedActiveFilter = sessionStorage.getItem(CACHE_KEY_ACTIVE_FILTER);
                const cachedSelectedMonth = sessionStorage.getItem(CACHE_KEY_SELECTED_MONTH);

                if (cachedActiveFilter && cachedSelectedMonth) {
                    setActiveFilter(JSON.parse(cachedActiveFilter));
                    setSelectedMonth(JSON.parse(cachedSelectedMonth));
                    console.log('useFilters: Loaded UI state from cache.');
                    return true;
                }
            } catch (error) {
                console.error('Failed to load UI state from cache', error);
                sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
                sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
            }
            return false;
        };

        const fetchInitialFilterData = async () => {
            // Load UI state from cache, but always fetch fresh data.
            // The service worker will return cached data instantly if available.
            if (!loadUiStateFromCache()) {
                // If no UI state in cache, set to today's date by default
                const today = getTodayInShanghai();
                if (today) {
                    const initialFilter = { type: 'date' as const, value: today };
                    setActiveFilter(initialFilter);
                    setSelectedMonth(today.substring(0, 7));
                    sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(initialFilter));
                    sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
                    console.log('fetchInitialFilterData: Initial UI state set to today', today);
                }
            }

            try {
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(),
                    getAvailableFilters()
                ]);

                const sortedDates = availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                setDates(sortedDates);
                setAvailableFilters(filters);
                console.log('fetchInitialFilterData: Fresh filter data fetched and set.');

            } catch (error) {
                console.error("Failed to fetch initial filter data", error);
            } finally {
                setIsInitialLoad(false);
                console.log('fetchInitialFilterData: Initial load finished');
            }
        };
        fetchInitialFilterData();
    }, []);

    const refreshFilters = useCallback(async () => {
        // Clear only UI state cache. Service worker manages its own cache.
        sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
        console.log('refreshFilters: UI state cache cleared.');

        try {
            // Refetch data. The service worker will handle the request.
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(),
                getAvailableFilters()
            ]);
            const sortedDates = availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setDates(sortedDates);
            setAvailableFilters(filtersNew);
            console.log('refreshFilters: Filter data refreshed');
        } catch (error) {
            console.error('Failed to refresh sidebar data', error);
        }
    }, []);

    const availableMonths = useMemo(() => {
        if (dates.length === 0) return [];
        const monthSet = new Set<string>();
        dates.forEach(date => monthSet.add(date.substring(0, 7)));
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [dates]);

    const datesForMonth = useMemo(() => {
        if (!selectedMonth) return [];
        return dates.filter(date => date.startsWith(selectedMonth));
    }, [dates, selectedMonth]);

    const handleFilterChange = (filter: Filter) => {
        setActiveFilter(filter);
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(filter));
        if (filter.type === 'date') {
            const newMonth = filter.value.substring(0, 7);
            setSelectedMonth(newMonth);
            sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(newMonth));
        }
        console.log('handleFilterChange: activeFilter updated to', filter);
    };
    
    const handleResetFilter = () => {
        const today = getTodayInShanghai();
        if (!today) return;
        const resetFilter = { type: 'date' as const, value: today };
        setActiveFilter(resetFilter);
        setSelectedMonth(today.substring(0, 0));
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(resetFilter));
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 0)));
        console.log('handleResetFilter: activeFilter and selectedMonth reset to today', today);
    };

    const clearActiveFilterAndCache = useCallback(() => {
        setActiveFilter(null);
        // Do NOT clear selectedMonth here. It should remain to show the calendar list.
        sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
        console.log('clearActiveFilterAndCache: activeFilter cleared, selectedMonth retained.');
    }, []);

    return {
        isInitialLoad,
        datesForMonth,
        activeFilter,
        availableFilters,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        handleFilterChange,
        handleResetFilter,
        refreshFilters,
        clearActiveFilterAndCache, // Expose the new function
    };
};
