import { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, AvailableFilters } from '../types';
import { getAvailableDates, getAvailableFilters, getTodayInShanghai } from '../services/api';

const CACHE_KEY_DATES = 'cachedDates';
const CACHE_KEY_FILTERS = 'cachedAvailableFilters';
const CACHE_KEY_ACTIVE_FILTER = 'cachedActiveFilter';
const CACHE_KEY_SELECTED_MONTH = 'cachedSelectedMonth';

export const useFilters = () => {
    const [dates, setDates] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        const loadFromCache = () => {
            try {
                const cachedDates = sessionStorage.getItem(CACHE_KEY_DATES);
                const cachedFilters = sessionStorage.getItem(CACHE_KEY_FILTERS);
                const cachedActiveFilter = sessionStorage.getItem(CACHE_KEY_ACTIVE_FILTER);
                const cachedSelectedMonth = sessionStorage.getItem(CACHE_KEY_SELECTED_MONTH);

                if (cachedDates && cachedFilters && cachedActiveFilter && cachedSelectedMonth) {
                    setDates(JSON.parse(cachedDates));
                    setAvailableFilters(JSON.parse(cachedFilters));
                    setActiveFilter(JSON.parse(cachedActiveFilter));
                    setSelectedMonth(JSON.parse(cachedSelectedMonth));
                    setIsInitialLoad(false);
                    console.log('useFilters: Loaded initial data from cache.');
                    return true;
                }
            } catch (error) {
                console.error('Failed to load filter data from cache', error);
                sessionStorage.removeItem(CACHE_KEY_DATES);
                sessionStorage.removeItem(CACHE_KEY_FILTERS);
                sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
                sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
            }
            return false;
        };

        const fetchInitialFilterData = async () => {
            if (loadFromCache()) {
                return;
            }

            const today = getTodayInShanghai();
            if (today) {
                setActiveFilter({ type: 'date' as const, value: today });
                setSelectedMonth(today.substring(0, 7));
                console.log('fetchInitialFilterData: Initial activeFilter and selectedMonth set to today', today);
            } else {
                setActiveFilter(null);
                console.log('fetchInitialFilterData: Initial activeFilter set to null');
            }

            try {
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(),
                    getAvailableFilters()
                ]);

                const sortedDates = availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                setDates(sortedDates);
                setAvailableFilters(filters);
                sessionStorage.setItem(CACHE_KEY_DATES, JSON.stringify(sortedDates));
                sessionStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(filters));
                // Only cache activeFilter and selectedMonth if they are not null
                if (activeFilter) sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(activeFilter));
                if (selectedMonth) sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(selectedMonth));

                console.log('fetchInitialFilterData: Dates fetched and set', sortedDates);

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
        sessionStorage.removeItem(CACHE_KEY_DATES);
        sessionStorage.removeItem(CACHE_KEY_FILTERS);
        sessionStorage.removeItem(CACHE_KEY_ACTIVE_FILTER);
        sessionStorage.removeItem(CACHE_KEY_SELECTED_MONTH);
        console.log('refreshFilters: Filter cache cleared.');

        try {
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(),
                getAvailableFilters()
            ]);
            const sortedDates = availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setDates(sortedDates);
            setAvailableFilters(filtersNew);
            sessionStorage.setItem(CACHE_KEY_DATES, JSON.stringify(sortedDates));
            sessionStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(filtersNew));
            // Re-cache activeFilter and selectedMonth after refresh
            if (activeFilter) sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(activeFilter));
            if (selectedMonth) sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(selectedMonth));

            console.log('refreshFilters: Dates refreshed', sortedDates);
        } catch (error) {
            console.error('Failed to refresh sidebar data', error);
        }
    }, [activeFilter, selectedMonth]);

    const availableMonths = useMemo(() => {
        console.log('availableMonths useMemo: Recalculating with dates', dates);
        if (dates.length === 0) return [];
        const monthSet = new Set<string>();
        dates.forEach(date => monthSet.add(date.substring(0, 7)));
        const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
        console.log('availableMonths useMemo: Result', months);
        return months;
    }, [dates]);

    const datesForMonth = useMemo(() => {
        console.log('datesForMonth useMemo: Recalculating with dates', dates, 'and selectedMonth', selectedMonth);
        if (!selectedMonth) return [];
        const filteredDates = dates.filter(date => date.startsWith(selectedMonth));
        console.log('datesForMonth useMemo: Result', filteredDates);
        return filteredDates;
    }, [dates, selectedMonth]);

    const handleFilterChange = (filter: Filter) => {
        setActiveFilter(filter);
        if (filter.type === 'date') {
            setSelectedMonth(filter.value.substring(0, 7));
            sessionStorage.setItem(CACHE_KEY_SELECTED_MONTH, JSON.stringify(filter.value.substring(0, 7)));
            console.log('handleFilterChange: selectedMonth updated to', filter.value.substring(0, 7));
        }
        sessionStorage.setItem(CACHE_KEY_ACTIVE_FILTER, JSON.stringify(filter));
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
    };
};
