import { useSearchParams } from 'react-router-dom';

const usePortalParam = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const setPortalParam = (value) => {
        if (value) {
            searchParams.set('portal', value)
            setSearchParams(searchParams);
        } else {
            searchParams.delete('portal');
            setSearchParams(searchParams)
        }
    };

    return setPortalParam;
};

export default usePortalParam;
