import { useState, useEffect } from 'react';

export default function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    // Sign state is JSON data. Progress updates must not restart this timer.
    const serialized = JSON.stringify(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(JSON.parse(serialized));
        }, delay);
        return () => clearTimeout(handler);
    }, [serialized, delay]);
    return debouncedValue;
}