import React from 'react';
import {
    FormControl,
    MenuItem,
    Select,
} from '@mui/material';
import { useLanguage } from '../utils/LanguageContext';

const CATEGORY_OPTIONS = [
    'categoryCultureAndNature',
    'categoryInfrastructure',
    'categoryEarningOpportunities',
    'categoryBasicAmenities',
    'categorySocialWelfareSchemes',
    'categoryOther',
];

const SUBCATEGORY_OPTIONS = {
    categoryCultureAndNature: [
        'subcategoryFestivals',
        'subcategoryTreesAndForests',
        'subcategorySoil',
        'subcategoryNaturalWaterResources',
        'subcategoryReligiousPlaces',
    ],
    categoryInfrastructure: [
        'subcategoryLand',
        'subcategoryWater',
        'subcategoryEnergy',
        'subcategoryTransportation',
        'subcategoryCommunication',
    ],
    categoryEarningOpportunities: [
        'subcategoryAgriculture',
        'subcategoryAnimalHusbandry',
        'subcategoryFisheries',
        'subcategorySmallScaleIndustries',
        'subcategoryMinorForestProduce',
        'subcategoryKhadiAndVillageIndustries',
    ],
    categoryBasicAmenities: [
        'subcategoryHealth',
        'subcategoryEducation',
        'subcategoryHousingAndSanitation',
        'subcategorySportsAndEntertainment',
        'subcategoryFood',
    ],
    categorySocialWelfareSchemes: [
        'subcategoryWeakerSections',
        'subcategoryHandicappedWelfare',
        'subcategoryFamilyWelfare',
        'subcategoryWomenAndChildDevelopment',
        'subcategoryPovertyAlleviation',
    ],
    categoryOther: ['subcategoryOther'],
};

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
                    {CATEGORY_OPTIONS.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                            {strings[cat]}
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
                    {(SUBCATEGORY_OPTIONS[category] || []).map((subcat) => (
                        <MenuItem key={subcat} value={subcat}>
                            {strings[subcat]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </>
    );
};

export default CategorySubcategorySelector;
