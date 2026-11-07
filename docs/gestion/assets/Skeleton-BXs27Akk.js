import{i as e}from"./rolldown-runtime-COiEfhsA.js";import{t,u as n}from"./react-vendor-CMvWLfeZ.js";import{B as r,Ct as i,J as a,L as o,R as s,St as c,at as l,ot as u,st as d}from"./apiClient-CtlSrMjr.js";function f(e){return String(e).match(/[\d.\-+]*\s*(.*)/)[1]||``}function p(e){return parseFloat(e)}var m=e(n(),1);function h(e){return u(`MuiSkeleton`,e)}l(`MuiSkeleton`,[`root`,`text`,`rectangular`,`rounded`,`circular`,`pulse`,`wave`,`withChildren`,`fitContent`,`heightAuto`]);var g=t(),_=e=>{let{classes:t,variant:n,animation:r,hasChildren:i,width:o,height:s}=e;return a({root:[`root`,n,r,i&&`withChildren`,i&&!o&&`fitContent`,i&&!s&&`heightAuto`]},h,t)},v=i`
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }

  100% {
    opacity: 1;
  }
`,y=i`
  0% {
    transform: translateX(-100%);
  }

  50% {
    /* +0.5s of delay between each loop */
    transform: translateX(100%);
  }

  100% {
    transform: translateX(100%);
  }
`,b=typeof v==`string`?null:c`
        animation: ${v} 2s ease-in-out 0.5s infinite;
      `,x=typeof y==`string`?null:c`
        &::after {
          animation: ${y} 2s linear 0.5s infinite;
        }
      `,S=r(`span`,{name:`MuiSkeleton`,slot:`Root`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.root,t[n.variant],n.animation!==!1&&t[n.animation],n.hasChildren&&t.withChildren,n.hasChildren&&!n.width&&t.fitContent,n.hasChildren&&!n.height&&t.heightAuto]}})(s(({theme:e})=>{let t=f(e.shape.borderRadius)||`px`,n=p(e.shape.borderRadius);return{display:`block`,backgroundColor:e.vars?e.vars.palette.Skeleton.bg:e.alpha(e.palette.text.primary,e.palette.mode===`light`?.11:.13),height:`1.2em`,variants:[{props:{variant:`text`},style:{marginTop:0,marginBottom:0,height:`auto`,transformOrigin:`0 55%`,transform:`scale(1, 0.60)`,borderRadius:`${n}${t}/${Math.round(n/.6*10)/10}${t}`,"&:empty:before":{content:`"\\00a0"`}}},{props:{variant:`circular`},style:{borderRadius:`50%`}},{props:{variant:`rounded`},style:{borderRadius:(e.vars||e).shape.borderRadius}},{props:({ownerState:e})=>e.hasChildren,style:{"& > *":{visibility:`hidden`}}},{props:({ownerState:e})=>e.hasChildren&&!e.width,style:{maxWidth:`fit-content`}},{props:({ownerState:e})=>e.hasChildren&&!e.height,style:{height:`auto`}},{props:{animation:`pulse`},style:b||{animation:`${v} 2s ease-in-out 0.5s infinite`}},{props:{animation:`wave`},style:{position:`relative`,overflow:`hidden`,WebkitMaskImage:`-webkit-radial-gradient(white, black)`,"&::after":{background:`linear-gradient(
                90deg,
                transparent,
                ${(e.vars||e).palette.action.hover},
                transparent
              )`,content:`""`,position:`absolute`,transform:`translateX(-100%)`,bottom:0,left:0,right:0,top:0}}},{props:{animation:`wave`},style:x||{"&::after":{animation:`${y} 2s linear 0.5s infinite`}}}]}})),C=m.forwardRef(function(e,t){let n=o({props:e,name:`MuiSkeleton`}),{animation:r=`pulse`,className:i,component:a=`span`,height:s,style:c,variant:l=`text`,width:u,...f}=n,p={...n,animation:r,component:a,variant:l,hasChildren:!!f.children},m=_(p);return(0,g.jsx)(S,{as:a,ref:t,className:d(m.root,i),ownerState:p,...f,style:{width:u,height:s,...c}})});export{C as t};