import { createServiceClient } from '@/lib/supabase/clients';
import { findOutletMentions } from '@/lib/credit';
(async()=>{
 const db=createServiceClient();
 const {data}=await db.from('articles').select('id,title,content,summary,status,event_id').neq('generated_by','human').not('event_id','is',null).limit(2000);
 let n=0;
 for(const a of data!){
  const {data:src}=await db.from('article_sources').select('source_name,is_primary').eq('article_id',a.id);
  const outs=(src??[]).filter((s:any)=>!s.is_primary).map((s:any)=>s.source_name);
  const h=findOutletMentions(`${a.title} ${a.summary??''} ${a.content??''}`,outs);
  if(h.length){n++;const t=`${a.content}`;console.log(a.status,h.join(','),'|',a.title.slice(0,60));}
 }
 console.log('total',n);
})();
