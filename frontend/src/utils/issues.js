import STATUS_KEY_VALUE_MAP from "../constants/issueStatus";

export function filterIssues(issues, filters) {
    const { category, subcategory, status, searchTerm } = filters;

    return issues.filter(issue => {
        // Match searchTerm (case-insensitive partial match)
        const searchLower = searchTerm?.toLowerCase() || '';
        const matchesSearch =
            issue.text?.toLowerCase().includes(searchLower) ||
            issue.category?.toLowerCase().includes(searchLower) ||
            issue.createdFor?.toLowerCase().includes(searchLower);

        // Match category
        const matchesCategory = !category || issue.category === category;

        // Match subcategory
        const matchesSubcategory = !subcategory || issue.subcategory === subcategory;

        // Match status
        const matchesStatus = !status || issue.status === STATUS_KEY_VALUE_MAP[status];

        return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
    });
}

// Get category icon based on category name
export const getCategoryIcon = (category) => {
    switch (category) {
        case 'CULTURE_AND_NATURE':
            return '🌳';
        case 'INFRASTRUCTURE':
            return '🏗️';
        case 'EARNING_OPPORTUNITIES':
            return '💰';
        case 'BASIC_AMENITIES':
            return '🏠';
        case 'SOCIAL_WELFARE_SCHEMES':
            return '🤝';
        case 'OTHER':
            return '📋';
        default:
            return '📋';
    }
};
