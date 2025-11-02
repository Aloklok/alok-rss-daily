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
        const fetchInitialFilterData = async () => {
            // Always default to today's date on initial load for a fresh start.
            const today = getTodayInShanghai();
            if (today) {
                const initialFilter = { type: 'date' as const, value: today };
                setActiveFilter(initialFilter);
                sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(initialFilter));

                // Try to load the last selected month for calendar view consistency.
                try {
                    const cachedSelectedMonth = sessionStorage.getItem(CACHE_KEY_SELECTED_MONTH);
                    if (cachedSelectedMonth) {
                        setSelectedMonth(JSON.parse(cachedSelectedMonth));
                    } else {
                        setSelectedMonth(today.substring(0, 7));
                        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
                    }
                } catch (error) {
                    // If cache fails, default to current month
                    setSelectedMonth(today.substring(0, 7));
                    sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
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
        setSelectedMonth(today.substring(0, 7));
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(resetFilter));
        sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(today.substring(0, 7)));
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
