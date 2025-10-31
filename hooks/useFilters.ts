import { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, AvailableFilters } from '../types';
import { getAvailableDates, getAvailableFilters, getTodayInShanghai } from '../services/api';

export const useFilters = () => {
    const [dates, setDates] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter | null>(null);
    const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({ categories: [], tags: [] });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        const fetchInitialFilterData = async () => {
            try {
                const [availableDates, filters] = await Promise.all([
                    getAvailableDates(),
                    getAvailableFilters()
                ]);

                const sortedDates = availableDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                setDates(sortedDates);
                setAvailableFilters(filters);

                if (sortedDates.length > 0) {
                    const latestDate = sortedDates[0];
                    const initialFilter = { type: 'date' as const, value: latestDate };
                    setActiveFilter(initialFilter);
                    setSelectedMonth(latestDate.substring(0, 7));
                } else {
                    setActiveFilter(null);
                }
            } catch (error) {
                console.error("Failed to fetch initial filter data", error);
            } finally {
                setIsInitialLoad(false);
            }
        };
        fetchInitialFilterData();
    }, []);

    const refreshFilters = useCallback(async () => {
        try {
            const [availableDatesNew, filtersNew] = await Promise.all([
                getAvailableDates(),
                getAvailableFilters()
            ]);
            const sortedDates = availableDatesNew.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setDates(sortedDates);
            setAvailableFilters(filtersNew);
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
    };
    
    const handleResetFilter = () => {
        const today = getTodayInShanghai();
        if (!today) return;
        const resetFilter = { type: 'date' as const, value: today };
        setActiveFilter(resetFilter);
        setSelectedMonth(today.substring(0, 7));
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
