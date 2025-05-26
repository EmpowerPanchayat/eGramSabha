import { categories } from '../constants/categories';

// Flatten all categories and subcategories into a single map:
// { [value]: labelKey }
const valueToLabelKeyMap = categories.reduce((acc, category) => {
    acc[category.value] = category.labelKey;
    category.subcategories.forEach(subcat => {
        acc[subcat.value] = subcat.labelKey;
    });
    return acc;
}, {});

const getCategories = () => categories.map(({ value, labelKey }) => ({ value, labelKey }));

const getSubcategories = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.subcategories : [];
};

const getLabelKeyFromValue = (value) => valueToLabelKeyMap[value] || null;

export { getCategories, getSubcategories, getLabelKeyFromValue };

