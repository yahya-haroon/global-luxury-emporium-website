import React from 'react';
import { ShopByCategory } from './ShopByCategory';

/**
 * Legacy wrapper: forwards directly to the 100% admin-controlled ShopByCategory component.
 */
export const CategoryGrid: React.FC = () => {
  return <ShopByCategory />;
};

export default CategoryGrid;
