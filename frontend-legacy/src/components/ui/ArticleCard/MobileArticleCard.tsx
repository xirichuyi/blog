// MobileArticleCard - Re-exports ArticleCard with mobile variant
// This file exists for backwards compatibility

import React from 'react';
import ArticleCard from './index';
import type { ArticleCardProps } from './index';

export interface MobileArticleCardProps extends Omit<ArticleCardProps, 'variant'> {}

const MobileArticleCard: React.FC<MobileArticleCardProps> = (props) => {
    return <ArticleCard {...props} variant="mobile" />;
};

export default MobileArticleCard;
