import { readFileSync } from 'node:fs'
export const env={}; for(const l of readFileSync(new URL('.env',import.meta.url),'utf8').split('\n')){const m=l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
export const URL_=env.VITE_SUPABASE_URL, ANON=env.VITE_SUPABASE_ANON_KEY
export function token(file){const s=JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8')); for(const o of s.origins||[])for(const kv of o.localStorage||[])if(/auth-token/.test(kv.name)){try{return JSON.parse(kv.value).access_token}catch{}} return null}
export function hdr(tok){return {apikey:ANON,Authorization:'Bearer '+tok,'Content-Type':'application/json'}}
export async function rest(tok,path,opts={}){const r=await fetch(URL_+'/rest/v1/'+path,{...opts,headers:{...hdr(tok),...(opts.headers||{})}}); let b=null;try{b=await r.json()}catch{} return {status:r.status,body:b,range:r.headers.get('content-range')}}
