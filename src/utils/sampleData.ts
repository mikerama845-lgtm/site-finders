import { parseCsvString } from './csvParser';
import { SheetFile } from '../types';

const CSV_TECH_DOMAINS = `Serial No,Website,Price,Category,DR,Monthly Traffic,TAT,Link Type,Sample Post
SN-1001,https://techcrunch.com,$350,Technology & AI,92,14.8M,2 Days,DoFollow In-Content,https://techcrunch.com/sample-article
SN-1002,https://www.venturebeat.com,$180,Tech & Gaming,89,3.2M,3 Days,DoFollow Contextual,https://venturebeat.com/guest-post
SN-1003,theverge.com,$260,Gadgets & Tech,91,22.4M,4 Days,DoFollow Contextual,https://theverge.com/tech/review
SN-1004,https://wired.com/,$310,General Tech & Science,93,18.1M,5 Days,DoFollow Permanent,https://wired.com/story/ai-future
SN-1005,https://mashable.com,$195,Tech & Culture,90,9.4M,3 Days,DoFollow In-Content,https://mashable.com/article/tech-update
SN-1006,https://hackernoon.com,$90,Crypto & Software,84,1.8M,2 Days,DoFollow,https://hackernoon.com/p/dev-guide
SN-1007,https://thenextweb.com,$220,Startups & EU Tech,88,2.7M,3 Days,DoFollow,https://thenextweb.com/news/startup
SN-1008,gizmodo.com,$175,Consumer Tech,89,6.5M,4 Days,DoFollow,https://gizmodo.com/gadget-review
SN-1009,zdnet.com,$280,Enterprise IT,91,5.1M,3 Days,DoFollow In-Content,https://zdnet.com/article/cloud-guide
SN-1010,https://forbes.com,$850,Business & Leadership,94,62.0M,5 Days,NoFollow / Brand Mention,https://forbes.com/leadership
SN-1011,https://readwrite.com,$85,IoT & Smart Tech,82,450K,2 Days,DoFollow,https://readwrite.com/iot-smart-trends
SN-1012,siliconangle.com,$140,Cloud & DevOps,83,720K,3 Days,DoFollow Contextual,https://siliconangle.com/devops-news
SN-1013,https://geekwire.com,$110,Pacific Northwest Tech,85,980K,2 Days,DoFollow,https://geekwire.com/tech-startup
SN-1014,https://searchengineland.com,$320,SEO & Digital Marketing,90,1.2M,4 Days,DoFollow,https://searchengineland.com/seo-guide
SN-1015,https://search-engine-journal.com,$290,Search & PPC,89,2.4M,3 Days,DoFollow In-Content,https://searchengineland.com/serp-updates
`;

const CSV_GLOBAL_MEDIA = `ID,Target Site,Reseller Rate,Niche,Domain Rating,Ahrefs Traffic,Delivery Time,Special Conditions
GM-401,https://www.forbes.com,$720,Finance & Global Biz,94,62.0M,4 Days,Requires pre-approval of client anchor
GM-402,https://venturebeat.com/,$210,AI & DeepTech,89,3.2M,2 Days,2 Links per article permitted
GM-403,businessinsider.com,$640,Finance & Enterprise,92,48.5M,5 Days,Editorial team review mandatory
GM-404,https://fintechnews.org,$95,Fintech & Banking,76,320K,2 Days,Fast turnaround 48h
GM-405,investopedia.com,$980,Personal Finance,93,31.2M,7 Days,Strict finance compliance
GM-406,https://entrepreneur.com,$490,Startups & Entrepreneurship,92,11.5M,4 Days,Native sponsored column
GM-407,https://inc.com,$510,Small Business & Scaleups,91,8.9M,4 Days,Author bio or in-content
GM-408,fastcompany.com,$580,Innovation & Design,92,12.3M,5 Days,High editorial standard
GM-409,https://cointelegraph.com,$340,Blockchain & Web3,88,4.1M,2 Days,Casino/Gambling allowed at +30% fee
GM-410,coindesk.com,$390,Cryptocurrency & Bitcoin,89,5.2M,3 Days,Crypto compliant only
GM-411,marketwatch.com,$710,Equities & Trading,92,28.0M,4 Days,Press release or editorial
GM-412,https://bloomberg.com,$1850,Global Markets,94,74.0M,6 Days,Executive placement only
`;

const CSV_VIP_OUTREACH = `SR#,Publisher Domain,Cost (USD),Industry Vertical,DR Score,Estimated Visitors,Turnaround,Backlink Type
VIP-01,techcrunch.com,$290,Technology,92,14.8M,2 Days,DoFollow (Indexed within 24h)
VIP-02,https://wired.com,$340,Science & Tech,93,18.1M,4 Days,DoFollow In-Content
VIP-03,healthline.com,$420,Health & Wellness,92,85.0M,5 Days,Medical doctor review included
VIP-04,https://medicalnewstoday.com,$380,Clinical Health,91,42.0M,4 Days,Strict medical citations
VIP-05,mindbodygreen.com,$240,Holistic Lifestyle,87,3.8M,3 Days,DoFollow In-Content
VIP-06,https://wellandgood.com,$190,Fitness & Nutrition,84,2.9M,3 Days,DoFollow
VIP-07,verywellhealth.com,$310,Healthcare,89,18.4M,4 Days,Evidence-based requirements
VIP-08,https://webmd.com,$620,Medical Authority,93,92.0M,6 Days,Special sponsor disclaimer
VIP-09,https://longevity.technology,$120,Biotech & Anti-aging,74,180K,2 Days,Fast publishing
VIP-10,psychologytoday.com,$450,Mental Health & Psychology,92,26.0M,4 Days,Author profile backlink
`;

const CSV_EURO_LIFESTYLE = `Ref_Code,Website_URL,Price_USD,Category,DR,Organic_Traffic,Turn Around,Link_Attribute,Notes
EU-881,https://healthline.com/,$380,Health & Nutrition,92,85.0M,3 Days,DoFollow,Direct editor access
EU-882,digitalhealthzone.com,$60,Digital Healthcare,68,95K,24 Hours,DoFollow,Same day publishing available
EU-883,https://www.telegraph.co.uk,$680,UK National Press,93,34.0M,4 Days,NoFollow or DoFollow depending on section
EU-884,independent.co.uk,$520,UK News & Lifestyle,92,29.0M,3 Days,DoFollow in Lifestyle section
EU-885,https://standard.co.uk,$390,London & UK Business,90,16.5M,3 Days,DoFollow Contextual
EU-886,euronews.com,$310,European Affairs & Tech,90,8.2M,3 Days,Multi-language options
EU-887,thetimes.co.uk,$950,UK Broadsheet,92,19.0M,5 Days,Premium enterprise tier
EU-888,https://mirror.co.uk,$410,UK Entertainment & Consumer,90,38.0M,3 Days,High volume traffic
EU-889,scotsman.com,$150,Scotland & Regional News,85,3.1M,2 Days,Good local UK citations
EU-890,irishnews.com,$130,Ireland & Dublin,82,1.4M,2 Days,DoFollow Contextual
`;

// Mahnoor's Master Sheet - Tab: "ALL Sites" (from live user spreadsheet)
const CSV_MAHNOOR_ALL_SITES = `Website,DR,Traffic,Price (PKR),Price (USD),Link Insertion (PKR),Link Type
naver.com,93,1223,9700,$45,N/A,Dofollow
harvard.edu,93,18562,18000,$75,N/A,Dofollow
msn.com,92,15.6M,13800,$55,N/A,2 Dofollow
influencersgonewild.us.com,92,8.3k,5500,$25,8000,2 Dofollow
simpcity.us.com,92,2.8k,8300,$35,5000,2 Dofollow
blooket.it.com,92,7.5K,3000,$15,7000,2 Dofollow
bigcartel.com,92,205k,5500,$40,N/A,Dofollow
ok.ru,92,1.22M,5500,$40,N/A,Dofollow
gitlab.com,92,417K,5500,$40,N/A,Nofollow
storymaps.arcgis.com,92,2.88M,5500,$40,N/A,Dofollow
note.com,92,108k,5500,$40,N/A,Nofollow
dailybriefing.it.com,92,2260,5500,$25,8000,Dofollow
digitalpress.it.com,92,1065,970,$45,N/A,2 Dofollow
techcrunch.com,92,14.8M,70000,$250,35000,DoFollow In-Content
venturebeat.com,89,3.2M,45000,$160,22000,DoFollow Contextual
forbes.com,94,62.0M,190000,$680,95000,DoFollow
`;

// Mahnoor's Master Sheet - Tab: "General Link Insertion"
const CSV_MAHNOOR_LINK_INSERTION = `Website,DR,Traffic,Link Insert (USD),Link Insert (PKR),TAT,Category
blooket.it.com,92,7.5K,$15,7000,24 Hours,Education & Tech
influencersgonewild.us.com,92,8.3k,$25,8000,24 Hours,Entertainment
simpcity.us.com,92,2.8k,$20,5000,48 Hours,Gaming & Community
dailybriefing.it.com,92,2260,$25,8000,24 Hours,News & Media
techcrunch.com,92,14.8M,$120,35000,2 Days,Technology
theverge.com,91,22.4M,$110,32000,2 Days,Gadgets
wired.com,93,18.1M,$140,40000,3 Days,Science
`;

// Mahnoor's Master Sheet - Tab: "Premium Sites"
const CSV_MAHNOOR_PREMIUM_SITES = `Website,DR,Ahrefs Traffic,Price (USD),Price (PKR),TAT,Conditions
harvard.edu,93,18562,$75,18000,4 Days,Academic citations only
msn.com,92,15.6M,$55,13800,2 Days,Editorial team approval
naver.com,93,1223,$45,9700,3 Days,Global news section
bigcartel.com,92,205k,$40,5500,2 Days,Ecommerce blog
`;

export function getSampleSheets(): SheetFile[] {
  const s1 = parseCsvString(CSV_MAHNOOR_ALL_SITES, 'Mahnoor - ALL Sites.csv', 'Mahnoor');
  s1.tabName = 'ALL Sites';
  s1.groupName = 'Mahnoor Master Sheets';

  const s2 = parseCsvString(CSV_MAHNOOR_LINK_INSERTION, 'Mahnoor - General Link Insertion.csv', 'Mahnoor');
  s2.tabName = 'General Link Insertion';
  s2.groupName = 'Mahnoor Master Sheets';

  const s3 = parseCsvString(CSV_MAHNOOR_PREMIUM_SITES, 'Mahnoor - Premium Sites.csv', 'Mahnoor');
  s3.tabName = 'Premium Sites';
  s3.groupName = 'Mahnoor Master Sheets';

  return [
    s1,
    s2,
    s3,
    parseCsvString(CSV_TECH_DOMAINS, 'Vendor_Alpha_Tech_2026.csv'),
    parseCsvString(CSV_GLOBAL_MEDIA, 'Mega_Reseller_Links_Global.csv'),
    parseCsvString(CSV_VIP_OUTREACH, 'Outreach_VIP_Inventory.csv'),
  ];
}

