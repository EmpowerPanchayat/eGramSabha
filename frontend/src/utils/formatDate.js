
import { format } from 'date-fns';

// Format date to readable string
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
        return 'Invalid Date';
    }
};

export default formatDate;