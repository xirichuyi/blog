import{a as D,r as w,j as l,g as C}from"./index-Cfx8vNNh.js";var k=Object.defineProperty,L=(h,t,s)=>t in h?k(h,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):h[t]=s,R=(h,t,s)=>L(h,typeof t!="symbol"?t+"":t,s);class V{constructor(){R(this,"metrics",[]),R(this,"duplicateTracker",new Map),R(this,"isEnabled",!1),R(this,"webVitals",{}),R(this,"observer"),this.initWebVitalsMonitoring()}initWebVitalsMonitoring(){if(!(!this.isEnabled||typeof window>"u"))try{"PerformanceObserver"in window&&(this.observer=new PerformanceObserver(t=>{for(const s of t.getEntries())s.entryType==="largest-contentful-paint"?this.webVitals.largestContentfulPaint=s.startTime:s.entryType==="first-input"?this.webVitals.firstInputDelay=s.processingStart-s.startTime:s.entryType==="layout-shift"&&!s.hadRecentInput?this.webVitals.cumulativeLayoutShift=(this.webVitals.cumulativeLayoutShift||0)+s.value:s.entryType==="paint"&&s.name==="first-contentful-paint"&&(this.webVitals.firstContentfulPaint=s.startTime)}),this.observer.observe({entryTypes:["largest-contentful-paint","first-input","layout-shift","paint"]})),"performance"in window&&"timing"in performance&&window.addEventListener("load",()=>{setTimeout(()=>{const t=performance.timing;this.webVitals.timeToInteractive=t.domInteractive-t.navigationStart},0)})}catch(t){console.warn("Failed to initialize Web Vitals monitoring:",t)}}startRequest(t,s="GET"){if(!this.isEnabled)return"";const d=`${s}:${t}:${Date.now()}:${Math.random()}`,c=performance.now(),n=`${s}:${t}`,u=this.duplicateTracker.get(n)||0;this.duplicateTracker.set(n,u+1);const p={url:t,method:s,startTime:c,fromCache:!1};return this.metrics[d]=p,d}endRequest(t,s,d=!1,c){if(!this.isEnabled||!t)return;const n=this.metrics[t];if(!n)return;const u=performance.now(),p={...n,endTime:u,duration:u-n.startTime,fromCache:d,status:s,error:c};delete this.metrics[t],this.metrics.push(p),p.duration>1e3&&console.warn(`Slow request detected: ${p.url} took ${p.duration.toFixed(2)}ms`),this.metrics.length>1e3&&(this.metrics=this.metrics.slice(-1e3))}getStats(){const t=this.metrics.length,s=this.metrics.filter(e=>e.fromCache).length,d=t-s,c=t>0?s/t*100:0,n=this.metrics.reduce((e,g)=>e+g.duration,0),u=t>0?n/t:0,p={};this.metrics.forEach(e=>{const g=`${e.method} ${e.url}`;p[g]=(p[g]||0)+1});const v=Array.from(this.duplicateTracker.values()).filter(e=>e>1).reduce((e,g)=>e+g-1,0);return{totalRequests:t,cacheHits:s,cacheMisses:d,cacheHitRate:c,averageResponseTime:u,totalResponseTime:n,duplicateRequests:v,requestsByEndpoint:p,...this.webVitals}}getSlowRequests(t=500){return this.metrics.filter(s=>s.duration>t).sort((s,d)=>d.duration-s.duration).slice(0,10)}getDuplicatePatterns(){return Array.from(this.duplicateTracker.entries()).filter(([,t])=>t>1).map(([t,s])=>({endpoint:t,count:s})).sort((t,s)=>s.count-t.count)}clear(){this.metrics=[],this.duplicateTracker.clear()}generateReport(){const t=this.getStats(),s=this.getSlowRequests(),d=this.getDuplicatePatterns();let c=`=== Performance Report ===
`;return c+=`Total Requests: ${t.totalRequests}
`,c+=`Cache Hit Rate: ${t.cacheHitRate.toFixed(1)}% (${t.cacheHits}/${t.totalRequests})
`,c+=`Average Response Time: ${t.averageResponseTime.toFixed(2)}ms
`,c+=`Duplicate Requests: ${t.duplicateRequests}

`,s.length>0&&(c+=`=== Slow Requests (>500ms) ===
`,s.forEach(n=>{c+=`${n.method} ${n.url}: ${n.duration.toFixed(2)}ms ${n.fromCache?"(cached)":""}
`}),c+=`
`),d.length>0&&(c+=`=== Duplicate Request Patterns ===
`,d.forEach(({endpoint:n,count:u})=>{c+=`${n}: ${u} requests
`}),c+=`
`),c+=`=== Requests by Endpoint ===
`,Object.entries(t.requestsByEndpoint).sort(([,n],[,u])=>u-n).forEach(([n,u])=>{c+=`${n}: ${u}
`}),c}setEnabled(t){this.isEnabled=t}}const $=new V,A=()=>{const{categories:h,tags:t,articles:s,isLoading:d,articlesLoading:c,fetchArticles:n,fetchArticlesByCategory:u,fetchArticlesByTag:p}=D(),[v,e]=w.useState(""),[g,b]=w.useState(!1),S=async()=>{b(!0),e(`Running performance tests...

`);const r=performance.now();try{e(i=>i+`=== Test 1: Cache Effectiveness ===
`);const f=performance.now();await Promise.all([n(1,12),n(1,12),n(1,12)]);const T=performance.now();e(i=>i+`Multiple identical requests took: ${(T-f).toFixed(2)}ms

`),e(i=>i+`=== Test 2: Category/Tag Data Sharing ===
`);const a=performance.now();h.length>0&&await u(h[0].id),t.length>0&&await p(t[0].name);const m=performance.now();e(i=>i+`Category/Tag requests took: ${(m-a).toFixed(2)}ms

`),e(i=>i+`=== Test 3: Cache Statistics ===
`);const o=C.getStats();e(i=>i+`Cache size: ${o.size}/${o.maxSize}
`),e(i=>i+`Cache entries:
`),o.entries.forEach(i=>{e(y=>y+`  ${i.key}: age ${(i.age/1e3).toFixed(1)}s, ttl ${(i.ttl/1e3).toFixed(1)}s
`)}),e(i=>i+`
=== Test 4: Performance Monitor ===
`);const x=$.getStats();if(e(i=>i+`Total requests: ${x.totalRequests}
`),e(i=>i+`Cache hit rate: ${x.cacheHitRate.toFixed(1)}%
`),e(i=>i+`Average response time: ${x.averageResponseTime.toFixed(2)}ms
`),e(i=>i+`Duplicate requests: ${x.duplicateRequests}
`),x.duplicateRequests>0){const i=$.getDuplicatePatterns();e(y=>y+`
Duplicate patterns:
`),i.forEach(({endpoint:y,count:j})=>{e(I=>I+`  ${y}: ${j} times
`)})}const F=performance.now()-r;e(i=>i+`
=== Total Test Time: ${F.toFixed(2)}ms ===
`)}catch(f){e(T=>T+`
Error during testing: ${f}
`)}finally{b(!1)}},P=()=>{C.clear(),$.clear(),e(`Cache and performance data cleared.
`)},E=()=>{const r=$.generateReport();e(r)},q=()=>{e(`=== Web Vitals Report ===

`);const r=$.getStats();if(r.largestContentfulPaint){const a=r.largestContentfulPaint,m=a<2500?"✅ Good":a<4e3?"⚠️ Needs Improvement":"❌ Poor";e(o=>o+`Largest Contentful Paint: ${a.toFixed(0)}ms ${m}
`),e(o=>o+`Target: < 2500ms for good performance

`)}if(r.firstInputDelay){const a=r.firstInputDelay,m=a<100?"✅ Good":a<300?"⚠️ Needs Improvement":"❌ Poor";e(o=>o+`First Input Delay: ${a.toFixed(1)}ms ${m}
`),e(o=>o+`Target: < 100ms for good performance

`)}if(r.cumulativeLayoutShift!==void 0){const a=r.cumulativeLayoutShift,m=a<.1?"✅ Good":a<.25?"⚠️ Needs Improvement":"❌ Poor";e(o=>o+`Cumulative Layout Shift: ${a.toFixed(3)} ${m}
`),e(o=>o+`Target: < 0.1 for good performance

`)}if(r.firstContentfulPaint){const a=r.firstContentfulPaint,m=a<1800?"✅ Good":a<3e3?"⚠️ Needs Improvement":"❌ Poor";e(o=>o+`First Contentful Paint: ${a.toFixed(0)}ms ${m}
`),e(o=>o+`Target: < 1800ms for good performance

`)}if(r.timeToInteractive){const a=r.timeToInteractive,m=a<3800?"✅ Good":a<7300?"⚠️ Needs Improvement":"❌ Poor";e(o=>o+`Time to Interactive: ${a.toFixed(0)}ms ${m}
`),e(o=>o+`Target: < 3800ms for good performance

`)}let f=100;r.largestContentfulPaint&&r.largestContentfulPaint>2500&&(f-=20),r.firstInputDelay&&r.firstInputDelay>100&&(f-=20),r.cumulativeLayoutShift&&r.cumulativeLayoutShift>.1&&(f-=20),r.firstContentfulPaint&&r.firstContentfulPaint>1800&&(f-=20),r.timeToInteractive&&r.timeToInteractive>3800&&(f-=20);const T=f>=90?"🏆 Excellent":f>=70?"✅ Good":f>=50?"⚠️ Fair":"❌ Poor";e(a=>a+`Overall Performance Score: ${f}/100 ${T}
`)};return l.jsxs("div",{style:{padding:"20px",fontFamily:"monospace"},children:[l.jsx("h2",{children:"Performance Test Dashboard"}),l.jsxs("div",{style:{marginBottom:"20px"},children:[l.jsx("button",{onClick:S,disabled:g,style:{marginRight:"10px",padding:"10px 20px"},children:g?"Running Tests...":"Run Performance Tests"}),l.jsx("button",{onClick:E,style:{marginRight:"10px",padding:"10px 20px"},children:"Generate Report"}),l.jsx("button",{onClick:q,style:{marginRight:"10px",padding:"10px 20px"},children:"Web Vitals Report"}),l.jsx("button",{onClick:P,style:{padding:"10px 20px"},children:"Clear Cache"})]}),l.jsxs("div",{style:{marginBottom:"20px"},children:[l.jsx("h3",{children:"Current State:"}),l.jsxs("p",{children:["Categories loaded: ",h.length]}),l.jsxs("p",{children:["Tags loaded: ",t.length]}),l.jsxs("p",{children:["Articles loaded: ",s.length]}),l.jsxs("p",{children:["Loading state: ",d?"Loading basic data":"Ready"]}),l.jsxs("p",{children:["Articles loading: ",c?"Loading articles":"Ready"]})]}),l.jsxs("div",{children:[l.jsx("h3",{children:"Test Results:"}),l.jsx("pre",{style:{background:"#f5f5f5",padding:"15px",borderRadius:"5px",whiteSpace:"pre-wrap",maxHeight:"400px",overflow:"auto"},children:v||'Click "Run Performance Tests" to start testing...'})]})]})};export{A as default};
