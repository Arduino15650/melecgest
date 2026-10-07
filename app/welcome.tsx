'use client';
import { LockKeyhole } from 'lucide-react';
type Props={online:boolean;onEnter:(category?:string)=>void;onAdmin:()=>void};
export default function Welcome({online,onEnter,onAdmin}:Props){
 return <main className="welcome-page">
  <header className="welcome-banner welcome-surface">
   <img className="welcome-crest" src="/melecgest-crest.png" alt="Écusson de gestion du magasin MELECGEST" width="230" height="260"/>
   <div className="welcome-brand"><h1>MELECGEST</h1><p>Le gestionnaire de magasin MELEC</p><div className={`welcome-connection ${online?'':'offline'}`}><i/>{online?'En ligne · stock synchronisé':'Connexion au magasin…'}</div><div className="welcome-actions"><button className="welcome-button" onClick={()=>onEnter()}>Accès équipe</button><button className="welcome-button" onClick={onAdmin}><LockKeyhole size={18}/> Administration</button></div></div>
  </header>
  <section className="welcome-intro welcome-surface"><h2>Bienvenue sur MELECGEST</h2><p>Le gestionnaire de magasin MELEC : un outil en ligne, simple et rapide, pour suivre le matériel électrique et l’outillage de votre magasin.</p></section>
  <section className="welcome-features" aria-label="Les fonctionnalités du magasin">
   {[{icon:'🔄',title:'Entrées et sorties',text:'Chaque mouvement s’enregistre en quelques clics. Le stock se met à jour immédiatement et se synchronise pour votre équipe.'},{icon:'🗂️',title:'Classement clair',text:'Matériel organisé par type, catégorie, référence et fournisseur : Schneider Electric, Legrand, Hager, ABB et bien d’autres.'},{icon:'⚠️',title:'Alertes de seuil',text:'Repérez d’un coup d’œil les articles bas ou en rupture avant qu’ils ne manquent sur un chantier.'},{icon:'📄',title:'Export PDF',text:'Exportez l’inventaire avec le nom, l’adresse et le logo de l’établissement, puis préparez son envoi dans votre messagerie.'}].map(f=><article key={f.title} className="welcome-feature welcome-surface"><span className="welcome-emoji" aria-hidden="true">{f.icon}</span><h3>{f.title}</h3><p>{f.text}</p></article>)}
  </section>
  <section className="welcome-domains welcome-surface"><h2>Trois domaines, un seul outil</h2><div className="welcome-domain-grid">{[{icon:'🏠',name:'Habitat',category:'Habitat',text:'Logements, rénovation et installations domestiques.',color:'teal'},{icon:'🏢',name:'Tertiaire',category:'Tertiaire',text:'Bureaux, commerces et bâtiments publics.',color:'blue'},{icon:'🏭',name:'Industriel',category:'Industrie',text:'Ateliers, usines, automatismes et maintenance.',color:'gold'}].map(d=><button className={`welcome-domain ${d.color}`} key={d.name} onClick={()=>onEnter(d.category)}><span className="welcome-emoji" aria-hidden="true">{d.icon}</span><h3>{d.name}</h3><p>{d.text}</p></button>)}</div></section>
  <section className="welcome-access welcome-surface"><h2><span aria-hidden="true">🔒</span> Accès réservé</h2><p>L’accès au magasin est protégé par votre connexion ChatGPT.<br/>Les références, les quantités et les mouvements apparaissent après votre choix de type, de catégorie ou de fournisseur.</p><div className="welcome-actions"><button className="welcome-button primary" onClick={()=>onEnter()}>Accès équipe</button><button className="welcome-button" onClick={onAdmin}>Administration</button></div></section>
 </main>;
}
