import { readFile, stat } from "node:fs/promises";import { join } from "node:path";
const D=join(process.cwd(),"public/data");const o=m=>console.log("  ✅ "+m);const f=m=>{console.error("  ❌ "+m);e.push(m);};const e=[];const u=a=>new Set(a.map(x=>x.id)).size===a.length;
async function L(n){try{const r=await readFile(join(D,n+".json"),"utf8");const d=JSON.parse(r);const s=(await stat(join(D,n+".json"))).size;o(`${n}.json (${Math.round(s/1024)} KB)`);return d;}catch(ex){f(`${n}.json: ${ex.message}`);return null;}}
console.log("\n=== Validate module-computer-network ===\n");console.log("--- Files ---");
const courses=await L("courses"),lessons=await L("lessons"),kps=await L("knowledge-points"),questions=await L("questions");
const exams=await L("exams"),cases=await L("cases"),routes=await L("routes"),glossary=await L("glossary"),faqs=await L("faqs"),tags=await L("tags");
const moduleMeta=await L("module"),searchIdx=await L("search-index");
console.log("\n--- IDs ---");
for(const[n,a]of[["courses",courses],["lessons",lessons],["knowledge-points",kps],["questions",questions],["exams",exams],["cases",cases],["routes",routes],["glossary",glossary],["faqs",faqs],["tags",tags]]){if(a){if(u(a))o(`${n}: ${a.length} unique`);else f(`${n}: duplicates`);}}
console.log("\n--- References ---");
if(courses&&lessons){const cs=new Set(courses.map(c=>c.id));const ls=new Set(lessons.map(l=>l.courseId));if([...ls].filter(x=>!cs.has(x)).length===0)o("All lessons have valid courseIds");else f("orphan lessons");const lid=new Set(lessons.map(l=>l.id));let tr=0,br=0;for(const c of courses)if(c.lessonIds)for(const lid2 of c.lessonIds){tr++;if(!lid.has(lid2))br++;}if(br===0)o(`All ${tr} lessonIds refs valid`);else f(`${br}/${tr} invalid`);}
if(questions){let mf=0;const R=["id","type","difficulty","chapter","knowledge_points","stem","options","answer","explanation","wrong_reason","tags","estimated_time","source_type"];for(const q of questions){for(const r of R){if(q[r]===undefined){mf++;break;}}}if(mf===0)o(`All ${questions.length} questions have required fields`);else f(`${mf} missing fields`);const nc=questions.filter(q=>q.source_type!=="curated-generated");if(nc.length===0)o("All source_type is curated-generated");else f(`${nc.length} not curated`);}
if(exams&&questions){const qid=new Set(questions.map(q=>q.id));let t=0,b=0;for(const e of exams)if(e.questionIds)for(const qi of e.questionIds){t++;if(!qid.has(qi))b++;}if(b===0)o(`All ${t} exam refs valid`);else f(`${b}/${t} invalid`);}
if(cases&&questions){const qid=new Set(questions.map(q=>q.id));let t=0,b=0;for(const c of cases)if(c.relatedQuestionIds)for(const qi of c.relatedQuestionIds){t++;if(!qid.has(qi))b++;}if(b===0)o(`All ${t} case refs valid`);else f(`${b}/${t} invalid`);}
console.log("\n--- Search ---");if(searchIdx){o(`search-index: ${searchIdx.length} entries`);const ht=searchIdx.some(x=>x.type==="lesson")&&searchIdx.some(x=>x.type==="question")&&searchIdx.some(x=>x.type==="glossary")&&searchIdx.some(x=>x.type==="faq");if(ht)o("covers all types");else f("missing types");}else f("search-index missing");
console.log("\n--- Scale ---");
const C=[["courses",courses,14],["lessons",lessons,180],["knowledge-points",kps,800],["questions",questions,3500],["exams",exams,100],["cases",cases,260],["routes",routes,30],["tags",tags,350],["glossary",glossary,350],["faqs",faqs,200]];
for(const[n,d,m]of C){if(d&&d.length>=m)o(`${n}: ${d.length} >= ${m}`);else if(d)f(`${n}: ${d.length} < ${m}`);else f(`${n}: load failed`);}
console.log("\n"+ "=".repeat(50));if(e.length===0){console.log("✅ All passed!\n");process.exit(0);}else{console.log(`❌ ${e.length} errors\n`);process.exit(1);}
