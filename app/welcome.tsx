'use client';
import {asset} from '../lib/supabase';
import { LockKeyhole } from 'lucide-react';
type Props={online:boolean;status?:string;onEnter:(category?:string)=>void;onAdmin:()=>void};
export default function Welcome({online,status,onEnter,onAdmin}:Props){
 return <main className="welcome-page">
  <header className="welcome-banner welcome-surface">
   <img className="welcome-crest" src={asset('melecgest-crest.png')} alt="Écusson de gestion du magasin MELECGEST" width="230" height="260"/>
   <div className="welcome-brand"><h1>MELECGEST</h1><p>Le gestionnaire de magasin MELEC</p><div className={`welcome-connection ${online?'':'offline'}`}><i/>{status||(online?'En ligne · stock synchronisé':'Connexion au magasin…')}</div><div className="welcome-actions"><button className="welcome-button" onClick={()=>onEnter()}>Accès équipe</button><button className="welcome-button" onClick={onAdmin}><LockKeyhole size={18}/> Administration</button></div></div>
  </header>
  <section className="welcome-intro welcome-surface"><h2>Bienvenue sur MELECGEST</h2><p>Le gestionnaire de magasin MELEC : un outil en ligne, simple et rapide, pour suivre le matériel électrique et l’outillage de votre magasin.</p></section>
  <section className="welcome-domains welcome-surface"><h2>Trois domaines, un seul outil</h2><div className="welcome-domain-grid">{[{icon:'🏠',name:'Habitat',category:'Habitat',text:'Logements, rénovation et installations domestiques.',color:'teal'},{icon:'🏢',name:'Tertiaire',category:'Tertiaire',text:'Bureaux, commerces et bâtiments publics.',color:'blue'},{icon:'🏭',name:'Industriel',category:'Industrie',text:'Ateliers, usines, automatismes et maintenance.',color:'gold'}].map(d=><button className={`welcome-domain ${d.color}`} key={d.name} onClick={()=>onEnter(d.category)}><span className="welcome-emoji" aria-hidden="true">{d.icon}</span><h3>{d.name}</h3><p>{d.text}</p></button>)}</div></section>
 </main>;
}
