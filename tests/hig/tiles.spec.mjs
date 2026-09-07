import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const tileTypes = ['text', 'dynamic_text', 'scrolling_text', 'rich_text', 'marquee', 'typewriter', 'word_art', 'gradient_text', 'animated_text', 'text_shadow', 'image', 'video', 'gif', 'lottie', 'audio', 'slideshow', 'webcam', 'youtube', 'vimeo', 'background_video', 'bar_chart', 'line_chart', 'pie_chart', 'gauge', 'table', 'kpi_card', 'progress_bar', 'heatmap', 'sparklines', 'timeline', 'button', 'qr_code', 'countdown', 'form', 'poll', 'social_feed', 'weather', 'menu_selector', 'promotion_banner', 'loyalty_card', 'container', 'divider', 'grid', 'flex', 'tabs', 'accordion', 'carousel', 'sticky_note', 'shape', 'frame', 'clock', 'calendar', 'rss_feed', 'social_proof', 'testimonial', 'stock_ticker', 'menu_item', 'special_offer', 'event_countdown', 'map'];
test.beforeEach(async ({page})=>{await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort('blockedbyclient'));});
for(const type of tileTypes){test(`specialized inspector ${type}: names and keyboard access`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/admin/slides/slide-1?tile=${type}`);
 await page.getByRole('group',{name:`${type} example`,exact:true}).focus();
 const toggle=page.getByRole('button',{name:'Inspector',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await expect(page.getByLabel('Name',{exact:true})).toHaveValue(`${type} example`);
 await page.getByLabel('Width',{exact:true}).fill('450');await expect(page.getByLabel('Width',{exact:true})).toHaveValue('450');
 const report=await new AxeBuilder({page}).include('#editor-properties').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(report.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});}
