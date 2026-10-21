import React from 'react';
import {
  Laptop,
  Shirt,
  Footprints,
  Armchair,
  Sparkles,
  Watch,
  Utensils,
  Package,
  type LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  name?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  switch (name?.toLowerCase()) {
    case 'laptop':
    case 'electronics':
      return <Laptop {...props} />;
    case 'shirt':
    case 'clothing':
      return <Shirt {...props} />;
    case 'footprints':
    case 'shoes':
      return <Footprints {...props} />;
    case 'armchair':
    case 'home-furniture':
    case 'home & furniture':
      return <Armchair {...props} />;
    case 'sparkles':
    case 'beauty':
      return <Sparkles {...props} />;
    case 'watch':
    case 'accessories':
      return <Watch {...props} />;
    case 'utensils':
    case 'food':
      return <Utensils {...props} />;
    default:
      return <Package {...props} />;
  }
};
