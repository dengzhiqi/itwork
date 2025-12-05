import{d as m,b as f,e as y,f as g,r as i,_ as x,j as e,M as S,g as w,O as j,S as k}from"./components-BacJe0QF.js";/**
 * @remix-run/react v2.17.2
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let a="positions";function M({getKey:o,...l}){let{isSpaMode:c}=m(),r=f(),p=y();g({getKey:o,storageKey:a});let h=i.useMemo(()=>{if(!o)return null;let t=o(r,p);return t!==r.key?t:null},[]);if(c)return null;let u=((t,d)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let n=JSON.parse(sessionStorage.getItem(t)||"{}")[d||window.history.state.key];typeof n=="number"&&window.scrollTo(0,n)}catch(s){console.error(s),sessionStorage.removeItem(t)}}).toString();return i.createElement("script",x({},l,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${u})(${JSON.stringify(a)}, ${JSON.stringify(h)})`}}))}const I=()=>[{rel:"preconnect",href:"https://fonts.googleapis.com"},{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"}];function R(){return e.jsxs("html",{lang:"en",children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),e.jsx(S,{}),e.jsx(w,{})]}),e.jsxs("body",{children:[e.jsx(j,{}),e.jsx(M,{}),e.jsx(k,{})]})]})}export{R as default,I as links};
