import React from 'react';
import {
    FormControl,
    MenuItem,
    Select,
} from '@mui/material';
import { useLanguage } from '../utils/LanguageContext';
import { getCategories, getSubcategories } from '../utils/categoryUtils';

const CategorySubcategorySelector = ({ category, subcategory, setCategory, setSubcategory }) => {
    const { strings } = useLanguage();

    const handleCategoryChange = (event) => {
        const selectedCategory = event.target.value;
        setCategory(selectedCategory);
        setSubcategory('');
    };

    const handleSubcategoryChange = (event) => {
        setSubcategory(event.target.value);
    };

    const categories = getCategories();
    const subcategories = getSubcategories(category);

    return (
        <>
            <FormControl size="small">
                <Select
                    value={category}
                    onChange={handleCategoryChange}
                    displayEmpty
                    fullWidth
                >
                    <MenuItem value="" disabled>
                        {strings.issueCategory}
                    </MenuItem>
                    {categories.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                            {strings[cat.labelKey]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl size="small" disabled={!category}>
                <Select
                    value={subcategory}
                    onChange={handleSubcategoryChange}
                    displayEmpty
                    fullWidth
                >
                    <MenuItem value="" disabled>
                        {strings.issueSubcategory}
                    </MenuItem>
                    {subcategories.map((subcat) => (
                        <MenuItem key={subcat.value} value={subcat.value}>
                            {strings[subcat.labelKey]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </>
    );
};

export default CategorySubcategorySelector;
