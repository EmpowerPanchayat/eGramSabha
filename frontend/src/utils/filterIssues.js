import STATUS_KEY_VALUE_MAP from "../constants/issueStatus";

function filterIssues(issues, filters) {
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

export default filterIssues;
