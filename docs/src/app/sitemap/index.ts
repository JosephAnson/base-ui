import { createSitemap } from '@mui/internal-docs-infra/createSitemap';
import Overview from '../(docs)/react/overview/page.mdx';
import Handbook from '../(docs)/react/handbook/page.mdx';
import Components from '../(docs)/react/components/page.mdx';
import LitOverview from '../(docs)/lit/overview/page.mdx';
import LitComponents from '../(docs)/lit/components/page.mdx';
import Utils from '../(docs)/react/utils/page.mdx';
import LitUtils from '../(docs)/lit/utils/page.mdx';

export const sitemap = createSitemap(import.meta.url, {
  Overview,
  Handbook,
  Components,
  Utils,
  'Lit Overview': LitOverview,
  'Lit Components': LitComponents,
  'Lit Utils': LitUtils,
});
