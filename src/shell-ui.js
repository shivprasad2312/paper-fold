// Presentation only. This module never writes game state, timing or saves.
import {
  createElement, Box, ArrowRight, ArrowUpRight, ArrowLeft, Settings2,
  LayoutGrid, Sunrise, WifiOff, MoveUpRight, SunMoon, Waves, Volume2,
  Check, X, CircleCheck, LockKeyhole, Move, RotateCw, RotateCcw, Hand,
  Flag, Pause, Play, House, SlidersHorizontal,
} from 'lucide';

const ICONS = {
  box: Box, 'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight,
  'arrow-left': ArrowLeft, settings: Settings2, grid: LayoutGrid,
  sunrise: Sunrise, 'wifi-off': WifiOff, 'move-up-right': MoveUpRight,
  'sun-moon': SunMoon, waves: Waves, 'volume-2': Volume2, check: Check, x: X,
  'circle-check': CircleCheck, lock: LockKeyhole, move: Move,
  'rotate-cw': RotateCw, 'rotate-ccw': RotateCcw, hand: Hand, flag: Flag,
  pause: Pause, play: Play, house: House, 'sliders-horizontal': SlidersHorizontal,
};

export function iconMarkup(name) {
  const node = ICONS[name];
  if (!node) throw new Error(`Unknown shell icon: ${name}`);
  return createElement(node, { class: 'ui-icon', 'aria-hidden': 'true', focusable: 'false', 'stroke-width': 1.7 }).outerHTML;
}

export function mountIcons(root = document) {
  root.querySelectorAll('[data-ui-icon]').forEach(el => {
    const holder = document.createElement('span');
    holder.innerHTML = iconMarkup(el.dataset.uiIcon);
    const svg = holder.firstElementChild;
    // Keep layout hooks without leaking data-ui-icon onto the replacement.
    if (el.className) svg.setAttribute('class', `ui-icon ${el.className}`);
    el.replaceWith(svg);
  });
}

function sculpture() {
  const point = (x, y, h = 0) => [270 + (x-y)*32, 126 + (x+y)*17-h];
  const poly = (ps, cls) => `<polygon points="${ps.map(p=>p.join(',')).join(' ')}" class="${cls}"/>`;
  const block = (x,y,h=16,cls='',lift=0) => {
    const a=point(x,y,lift), b=point(x+1,y,lift), c=point(x+1,y+1,lift), d=point(x,y+1,lift);
    const top=[a,b,c,d].map(([px,py])=>[px,py-h]);
    return `<g class="art-block ${cls}">${poly([top[3],top[2],c,d],'block-left')}${poly([top[2],top[1],b,c],'block-right')}${poly(top,'block-top')}</g>`;
  };
  // An authored illustration, not a screenshot or a level pretending to be
  // playable. Faces use shared theme tokens, no network assets or randomness.
  const tiles=[];
  for(let y=0;y<7;y++) for(let x=0;x<7;x++) {
    const path = (y<2 && x>1) || (x>4 && y<5) || (y>3 && y<6 && x>1) || (x===2&&y>4);
    if(path && !(x===4&&y===4)) tiles.push([x,y]);
  }
  tiles.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1]));
  return `<svg viewBox="0 0 560 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><pattern id="art-grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .52 -1 .52 270 -110)"><rect width="48" height="48" fill="none" stroke="currentColor" stroke-width=".6"/></pattern></defs><rect width="560" height="440" fill="url(#art-grid)" class="art-grid"/><ellipse cx="282" cy="345" rx="160" ry="27" class="art-shadow"/>${tiles.map(([x,y])=>block(x,y,22+(y<2?24:0))).join('')}${block(3,4,23,'accent-tile')}${block(5,1,36,'hero-cube',46)}<path d="M174 328v20m-10-10h20M420 157v16m-8-8h16" class="art-cross"/><path d="m363 295 17-9m-17 16 17-9m-17 16 17-9" class="art-path"/></svg>`;
}

/** UI focus is layered independently of the game's pause state. */
export function initShell({ onHome, onLevels, onSound, acts }) {
  mountIcons();
  document.getElementById('home-sculpture').innerHTML = sculpture();
  const dialogs = ['settings','help'].map(id=>document.getElementById(id));
  let returnFocus = null;
  function closeDialog() {
    dialogs.forEach(d=>d.classList.add('hidden'));
    const target=returnFocus;
    syncLayers();
    if(target?.isConnected && !target.closest('.hidden') && !target.closest('[inert]')) target.focus({preventScroll:true});
  }
  document.querySelectorAll('[data-open-dialog]').forEach(button=>button.addEventListener('click',()=>{
    returnFocus=button;
    document.getElementById(button.dataset.openDialog).classList.remove('hidden');
    syncLayers();
  }));
  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',closeDialog));
  dialogs.forEach(d=>d.addEventListener('click',e=>{ if(e.target===d) closeDialog(); }));
  document.querySelectorAll('[data-action="home"], a.wordmark').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();onHome();}));
  document.querySelectorAll('[data-action="levels"]').forEach(b=>b.addEventListener('click',onLevels));
  document.getElementById('btn-sound-menu').addEventListener('click',onSound);

  const layerIds=['menu','levels','pause','win','help','settings'];
  const layers=layerIds.map(id=>document.getElementById(id));
  const gameplay=['hud','pad'].map(id=>document.getElementById(id));
  let active=null;
  const focusable='button:not(:disabled), a[href], input, select, [tabindex="0"]';
  const focusHistory=new Map();
  function syncLayers() {
    const top=layers.findLast(l=>!l.classList.contains('hidden')) || null;
    for(const l of [...layers,...gameplay]) l.inert=!!top && l!==top;
    if(top!==active) {
      if(active?.contains(document.activeElement)) focusHistory.set(active,document.activeElement);
      active=top;
      if(top) {
        const prior=focusHistory.get(top);
        const candidates=[...top.querySelectorAll(focusable)].filter(el=>el.getClientRects().length && !el.disabled);
        // Daily/final completion can hide Next; never restore focus to an
        // invisible control even when it was the previous run's default.
        const target=candidates.includes(prior) ? prior : candidates.find(el=>el.hasAttribute('autofocus')) || candidates[0];
        target?.focus({preventScroll:true});
      } else {
        document.activeElement?.blur();
      }
    }
  }
  new MutationObserver(syncLayers).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{
    if(dialogs.some(d=>!d.classList.contains('hidden')) && e.key==='Escape') {
      e.preventDefault();e.stopImmediatePropagation();closeDialog();return;
    }
    if(e.key==='Tab' && active?.getAttribute('role') === 'dialog') {
      const buttons=[...active.querySelectorAll(focusable)].filter(b=>b.getClientRects().length && !b.closest('[inert]'));
      if(!buttons.length) return;
      const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey && (document.activeElement===first || !active.contains(document.activeElement))) {e.preventDefault();last.focus();}
      else if(!e.shiftKey && (document.activeElement===last || !active.contains(document.activeElement))) {e.preventDefault();first.focus();}
    }
  },true);
  // Shortcuts must not leak from preferences into a paused game underneath.
  window.addEventListener('keydown',e=>{
    if (!dialogs.some(d=>!d.classList.contains('hidden'))) return;
    if (e.key === 'Escape') {
      e.preventDefault(); closeDialog(); e.stopImmediatePropagation();
    } else if (e.key !== 'Tab') {
      e.stopImmediatePropagation();
    }
  },true);

  const tabs=document.getElementById('world-tabs');
  const worlds=[{id:'daily',label:'Daily'},...acts.map(a=>({id:`world-${a.id}`,label:`${String(a.id).padStart(2,'0')} ${a.name}`})),{id:'vault',label:'The Vault'}];
  worlds.forEach(w=>{
    const b=document.createElement('button');b.textContent=w.label;b.dataset.world=w.id;
    b.addEventListener('click',()=>{
      document.getElementById(w.id)?.scrollIntoView({behavior:document.body.classList.contains('reduce-motion')?'auto':'smooth',block:'start'});
    });tabs.append(b);
  });
  const scroller=document.querySelector('.levels-inner');
  let selectedWorld = null;
  scroller.addEventListener('scroll',()=>{
    const y=scroller.getBoundingClientRect().top;
    const headers=[...document.querySelectorAll('#level-grid > [id]')];
    const current=headers.findLast(h=>h.getBoundingClientRect().top<=y+40) || headers[0];
    for(const b of tabs.children) {
      if(b.dataset.world===current?.id) {
        b.setAttribute('aria-current','location');
        if (selectedWorld !== current.id) tabs.scrollTo({left: Math.max(0, b.offsetLeft-tabs.offsetLeft-16), behavior:'instant'});
      } else b.removeAttribute('aria-current');
    }
    selectedWorld = current?.id;
  },{passive:true});
  tabs.firstElementChild.setAttribute('aria-current','location');
  syncLayers();
  return { syncLayers };
}
