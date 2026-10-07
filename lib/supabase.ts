import {createClient} from '@supabase/supabase-js';
// Publishable key only. Access is enforced by the database's roles and MFA policies.
export const supabase=createClient('https://bnpfeilsnupfodcggpro.supabase.co','sb_publishable_wk9F5tMD8RLuBek-5rkr3A_LG9mcjx-');
export const asset=(name:string)=>(typeof window!=='undefined'&&(window.location.hostname.endsWith('github.io')||window.location.pathname.startsWith('/melecgest/'))?'/melecgest/':'/')+name;
